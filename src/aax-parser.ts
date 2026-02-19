import type { BookMetadata, Chapter } from './types'
import { FileSource } from 'ts-videos/source'
import { Reader } from 'ts-videos/reader'
import type { Source } from 'ts-videos/reader'
import { parseMp4Metadata } from 'ts-videos/metadata'

// The Reader class has position getter/setter at runtime but the .d.ts
// generated with isolatedDeclarations doesn't include them. This helper
// gives us typed access.
interface ReaderWithPosition extends Reader {
  position: number
}

export interface SampleEntry {
  offset: number
  size: number
  duration: number
  isKeyframe: boolean
}

export interface AaxFileInfo {
  /** Raw adrm box content (after box header) for DRM key derivation */
  adrmContent: Uint8Array
  /** File checksum from adrm (20 bytes, SHA1) */
  checksum: Uint8Array
  /** AAC AudioSpecificConfig bytes from esds */
  esdsConfig: Uint8Array
  /** Audio sample rate (e.g. 44100) */
  sampleRate: number
  /** Audio channel count (e.g. 2) */
  channelCount: number
  /** Media timescale from mdhd */
  timescale: number
  /** Duration in timescale units */
  duration: number
  /** Array of audio sample entries with offsets into mdat */
  samples: SampleEntry[]
  /** Parsed chapters */
  chapters: Chapter[]
  /** Parsed metadata */
  metadata: BookMetadata
  /** Raw moov data for passing to ts-videos parsers */
  moovData: Uint8Array
  /** The source for reading sample data */
  source: Source
}

/** Read a FourCC string at the reader's current position */
async function readBoxHeader(reader: Reader): Promise<{ size: number, type: string } | null> {
  const size = await reader.readU32BE()
  if (size === null) return null
  const type = await reader.readFourCC()
  if (!type) return null

  if (size === 1) {
    // 64-bit extended size
    const hi = await reader.readU32BE()
    const lo = await reader.readU32BE()
    if (hi === null || lo === null) return null
    return { size: hi * 0x100000000 + lo, type }
  }

  return { size, type }
}

/**
 * Parse an AAX file and extract all information needed for conversion.
 */
export async function parseAaxFile(inputPath: string): Promise<AaxFileInfo> {
  const source = new FileSource(inputPath)
  const reader = Reader.fromSource(source) as ReaderWithPosition

  // Read ftyp
  reader.position = 0
  const ftypHeader = await readBoxHeader(reader)
  if (!ftypHeader || ftypHeader.type !== 'ftyp') {
    throw new Error('Not a valid AAX file: missing ftyp box')
  }
  const brand = await reader.readFourCC()
  if (!brand || (brand.trim() !== 'aax' && brand.trim() !== 'M4B')) {
    throw new Error(`Not an AAX file: brand is "${brand}"`)
  }
  // Skip rest of ftyp
  reader.position = ftypHeader.size

  // Find and read moov box
  let moovData: Uint8Array | null = null
  let moovOffset = ftypHeader.size

  while (true) {
    reader.position = moovOffset
    const header = await readBoxHeader(reader)
    if (!header || header.size === 0) break

    if (header.type === 'moov') {
      const headerSize = reader.position - moovOffset
      const contentSize = header.size - headerSize
      const data = await reader.readBytes(contentSize)
      if (!data) throw new Error('Failed to read moov box')
      moovData = data
      break
    }

    moovOffset += header.size
  }

  if (!moovData) {
    throw new Error('No moov box found in AAX file')
  }

  // Build the full moov box with header for ts-videos parsers
  // parseMp4Metadata and parseMp4Chapters expect the full file (they search for moov)
  // We'll build a minimal buffer: ftyp + moov
  const fullMoovBox = new Uint8Array(8 + moovData.length)
  const view = new DataView(fullMoovBox.buffer)
  view.setUint32(0, 8 + moovData.length)
  fullMoovBox[4] = 0x6D // m
  fullMoovBox[5] = 0x6F // o
  fullMoovBox[6] = 0x6F // o
  fullMoovBox[7] = 0x76 // v
  fullMoovBox.set(moovData, 8)

  // Parse moov to extract tracks, adrm, esds, sample table
  const parsed = parseMoov(moovData)

  // Use ts-videos to parse metadata from the moov
  // parseMp4Metadata expects data starting with ftyp or moov at top level
  // Build a minimal buffer with just the moov box
  const { metadata: tsMetadata, artwork } = parseMp4Metadata(fullMoovBox)
  // Convert ts-videos metadata to our BookMetadata type
  const metadata: BookMetadata = {
    title: tsMetadata.title,
    author: tsMetadata.artist,
    narrator: tsMetadata.albumArtist,
    duration: parsed.duration / parsed.timescale,
    publisher: tsMetadata.publisher,
    copyright: tsMetadata.copyright,
    description: tsMetadata.description,
    publishingYear: tsMetadata.year,
    coverImage: artwork.length > 0 ? Buffer.from(artwork[0].data) : undefined,
  }

  // Read chapters from text track (if present)
  const chapters: Chapter[] = await readChaptersFromTextTrack(parsed, reader)

  if (!parsed.adrmContent) {
    throw new Error('No adrm box found — this AAX file may not be DRM encrypted')
  }

  return {
    adrmContent: parsed.adrmContent,
    checksum: parsed.checksum!,
    esdsConfig: parsed.esdsConfig!,
    sampleRate: parsed.sampleRate,
    channelCount: parsed.channelCount,
    timescale: parsed.timescale,
    duration: parsed.duration,
    samples: parsed.samples,
    chapters,
    metadata,
    moovData: fullMoovBox,
    source,
  }
}

interface ChapterSampleInfo {
  timescale: number
  samples: SampleEntry[]
}

interface ParsedMoov {
  adrmContent: Uint8Array | null
  checksum: Uint8Array | null
  esdsConfig: Uint8Array | null
  sampleRate: number
  channelCount: number
  timescale: number
  duration: number
  samples: SampleEntry[]
  chapterTrack: ChapterSampleInfo | null
}

function parseMoov(data: Uint8Array): ParsedMoov {
  const result: ParsedMoov = {
    adrmContent: null,
    checksum: null,
    esdsConfig: null,
    sampleRate: 44100,
    channelCount: 2,
    timescale: 44100,
    duration: 0,
    chapterTrack: null,
    samples: [],
  }

  // Parse top-level boxes in moov
  let offset = 0
  while (offset < data.length - 8) {
    const size = readU32(data, offset)
    const type = readFourCC(data, offset + 4)
    if (size < 8 || offset + size > data.length) break

    if (type === 'trak') {
      parseTrak(data.subarray(offset + 8, offset + size), result)
    }
    else if (type === 'udta') {
      // udta may contain chapters (chpl)
      // Already handled by ts-videos parseMp4Chapters
    }

    offset += size
  }

  return result
}

function parseTrak(data: Uint8Array, result: ParsedMoov): void {
  let offset = 0
  let mdiaData: Uint8Array | null = null

  // First pass: find mdia
  while (offset < data.length - 8) {
    const size = readU32(data, offset)
    const type = readFourCC(data, offset + 4)
    if (size < 8 || offset + size > data.length) break

    if (type === 'mdia') {
      mdiaData = data.subarray(offset + 8, offset + size)
      const handler = getHandlerType(mdiaData)
      if (handler === 'soun') {
        parseMdia(mdiaData, result)
      } else if (handler === 'text') {
        // Chapter text track — extract sample table for reading chapter titles
        const chapterResult: ParsedMoov = {
          adrmContent: null, checksum: null, esdsConfig: null,
          sampleRate: 0, channelCount: 0, timescale: 44100,
          duration: 0, samples: [], chapterTrack: null,
        }
        parseMdia(mdiaData, chapterResult)
        result.chapterTrack = {
          timescale: chapterResult.timescale,
          samples: chapterResult.samples,
        }
      }
    }

    offset += size
  }
}

function getHandlerType(mdiaData: Uint8Array): string | null {
  let offset = 0
  while (offset < mdiaData.length - 8) {
    const size = readU32(mdiaData, offset)
    const type = readFourCC(mdiaData, offset + 4)
    if (size < 8 || offset + size > mdiaData.length) break

    if (type === 'hdlr') {
      // hdlr box: version(4) + pre_defined(4) + handler_type(4)
      if (offset + 20 <= mdiaData.length) {
        return readFourCC(mdiaData, offset + 16)
      }
    }

    offset += size
  }
  return null
}

function parseMdia(data: Uint8Array, result: ParsedMoov): void {
  let offset = 0
  while (offset < data.length - 8) {
    const size = readU32(data, offset)
    const type = readFourCC(data, offset + 4)
    if (size < 8 || offset + size > data.length) break

    if (type === 'mdhd') {
      parseMdhd(data.subarray(offset + 8, offset + size), result)
    }
    else if (type === 'minf') {
      parseMinf(data.subarray(offset + 8, offset + size), result)
    }

    offset += size
  }
}

function parseMdhd(data: Uint8Array, result: ParsedMoov): void {
  if (data.length < 4) return
  const version = data[0]

  if (version === 0) {
    // Version 0: u32 creation, u32 modification, u32 timescale, u32 duration
    if (data.length < 20) return
    result.timescale = readU32(data, 12)
    result.duration = readU32(data, 16)
  }
  else if (version === 1) {
    // Version 1: u64 creation, u64 modification, u32 timescale, u64 duration
    if (data.length < 32) return
    result.timescale = readU32(data, 20)
    // Read 64-bit duration
    const hi = readU32(data, 24)
    const lo = readU32(data, 28)
    result.duration = hi * 0x100000000 + lo
  }
}

function parseMinf(data: Uint8Array, result: ParsedMoov): void {
  let offset = 0
  while (offset < data.length - 8) {
    const size = readU32(data, offset)
    const type = readFourCC(data, offset + 4)
    if (size < 8 || offset + size > data.length) break

    if (type === 'stbl') {
      parseStbl(data.subarray(offset + 8, offset + size), result)
    }

    offset += size
  }
}

function parseStbl(data: Uint8Array, result: ParsedMoov): void {
  let sttsData: Uint8Array | null = null
  let stscData: Uint8Array | null = null
  let stszData: Uint8Array | null = null
  let stcoData: Uint8Array | null = null
  let co64Data: Uint8Array | null = null

  let offset = 0
  while (offset < data.length - 8) {
    const size = readU32(data, offset)
    const type = readFourCC(data, offset + 4)
    if (size < 8 || offset + size > data.length) break

    const content = data.subarray(offset + 8, offset + size)

    switch (type) {
      case 'stsd':
        parseStsd(content, result)
        break
      case 'stts':
        sttsData = content
        break
      case 'stsc':
        stscData = content
        break
      case 'stsz':
        stszData = content
        break
      case 'stco':
        stcoData = content
        break
      case 'co64':
        co64Data = content
        break
    }

    offset += size
  }

  // Build sample table from parsed boxes
  if (sttsData && stszData && (stcoData || co64Data)) {
    buildSampleTable(sttsData, stscData, stszData, stcoData, co64Data, result)
  }
}

function parseStsd(data: Uint8Array, result: ParsedMoov): void {
  // stsd: version(1) + flags(3) + entry_count(4) + entries
  if (data.length < 8) return
  const entryCount = readU32(data, 4)

  let offset = 8
  for (let i = 0; i < entryCount && offset < data.length - 8; i++) {
    const entrySize = readU32(data, offset)
    const entryType = readFourCC(data, offset + 4)
    if (entrySize < 8 || offset + entrySize > data.length) break

    if (entryType === 'aavd' || entryType === 'mp4a') {
      parseAudioSampleEntry(data.subarray(offset, offset + entrySize), result)
    }

    offset += entrySize
  }
}

function parseAudioSampleEntry(data: Uint8Array, result: ParsedMoov): void {
  // QuickTime-style audio sample entry:
  // size(4) + type(4) + reserved(6) + data_ref_index(2) = 16 bytes
  // version(2) + revision(2) + vendor(4) = 8 bytes
  // channel_count(2) + sample_size(2) + compression_id(2) + packet_size(2) = 8 bytes
  // sample_rate(4, 16.16 fixed-point) = 4 bytes
  // = 36 bytes total header

  if (data.length < 36) return

  const channelCount = readU16(data, 24)
  const sampleRateFixed = readU32(data, 32)
  const sampleRate = sampleRateFixed >>> 16

  result.channelCount = channelCount
  result.sampleRate = sampleRate

  // Parse child boxes within the sample entry (after 36 bytes)
  let offset = 36
  while (offset < data.length - 8) {
    const size = readU32(data, offset)
    const type = readFourCC(data, offset + 4)
    if (size < 8 || offset + size > data.length) break

    if (type === 'esds') {
      parseEsds(data.subarray(offset + 8, offset + size), result)
    }
    else if (type === 'adrm') {
      // adrm content (after box header)
      result.adrmContent = new Uint8Array(data.subarray(offset + 8, offset + size))
      // Extract checksum at offset 68 within adrm content
      if (result.adrmContent.length >= 88) {
        result.checksum = new Uint8Array(result.adrmContent.subarray(68, 88))
      }
    }

    offset += size
  }
}

function parseEsds(data: Uint8Array, result: ParsedMoov): void {
  // esds box content: version(4) + ES_Descriptor
  // Store the full esds content so the muxer can write a proper esds box
  if (data.length < 4) return
  result.esdsConfig = new Uint8Array(data)
}

/**
 * Read chapter titles and timings from a text track's sample table.
 * Each text sample has a 2-byte big-endian length prefix followed by UTF-8 text.
 */
async function readChaptersFromTextTrack(parsed: ParsedMoov, reader: ReaderWithPosition): Promise<Chapter[]> {
  if (!parsed.chapterTrack || parsed.chapterTrack.samples.length === 0) return []

  const chapters: Chapter[] = []
  const { timescale, samples } = parsed.chapterTrack
  let cumulativeTime = 0

  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i]
    const startTimeSec = cumulativeTime / timescale
    cumulativeTime += sample.duration

    // Read the text sample from mdat
    reader.position = sample.offset
    const data = await reader.readBytes(sample.size)
    if (!data || data.length < 2) continue

    // Text sample: [length:2 BE][utf8 text]
    const textLen = (data[0] << 8) | data[1]
    const title = new TextDecoder('utf-8').decode(data.subarray(2, 2 + textLen))

    const endTimeSec = cumulativeTime / timescale
    chapters.push({ title, startTime: startTimeSec, endTime: endTimeSec })
  }

  return chapters
}

function buildSampleTable(
  sttsData: Uint8Array,
  stscData: Uint8Array | null,
  stszData: Uint8Array,
  stcoData: Uint8Array | null,
  co64Data: Uint8Array | null,
  result: ParsedMoov,
): void {
  // Parse stts (sample-to-time)
  const sttsVersion = sttsData.length >= 4 ? readU32(sttsData, 0) : 0
  const sttsEntryCount = sttsData.length >= 8 ? readU32(sttsData, 4) : 0
  const sttsDurations: Array<{ count: number, delta: number }> = []

  let sttsOffset = 8
  for (let i = 0; i < sttsEntryCount && sttsOffset + 8 <= sttsData.length; i++) {
    const count = readU32(sttsData, sttsOffset)
    const delta = readU32(sttsData, sttsOffset + 4)
    sttsDurations.push({ count, delta })
    sttsOffset += 8
  }

  // Parse stsz (sample sizes)
  // version(4) + sample_size(4) + sample_count(4) + [sizes]
  const defaultSampleSize = stszData.length >= 8 ? readU32(stszData, 4) : 0
  const sampleCount = stszData.length >= 12 ? readU32(stszData, 8) : 0
  const sampleSizes: number[] = []

  if (defaultSampleSize === 0) {
    let szOffset = 12
    for (let i = 0; i < sampleCount && szOffset + 4 <= stszData.length; i++) {
      sampleSizes.push(readU32(stszData, szOffset))
      szOffset += 4
    }
  }
  else {
    for (let i = 0; i < sampleCount; i++) {
      sampleSizes.push(defaultSampleSize)
    }
  }

  // Parse stco or co64 (chunk offsets)
  const chunkOffsets: number[] = []
  if (co64Data) {
    const co64Count = co64Data.length >= 8 ? readU32(co64Data, 4) : 0
    let coOffset = 8
    for (let i = 0; i < co64Count && coOffset + 8 <= co64Data.length; i++) {
      const hi = readU32(co64Data, coOffset)
      const lo = readU32(co64Data, coOffset + 4)
      chunkOffsets.push(hi * 0x100000000 + lo)
      coOffset += 8
    }
  }
  else if (stcoData) {
    const stcoCount = stcoData.length >= 8 ? readU32(stcoData, 4) : 0
    let coOffset = 8
    for (let i = 0; i < stcoCount && coOffset + 4 <= stcoData.length; i++) {
      chunkOffsets.push(readU32(stcoData, coOffset))
      coOffset += 4
    }
  }

  // Parse stsc (sample-to-chunk mapping)
  // version(4) + entry_count(4) + entries[first_chunk(4), samples_per_chunk(4), sample_description_index(4)]
  interface StscEntry { firstChunk: number, samplesPerChunk: number }
  const stscEntries: StscEntry[] = []

  if (stscData) {
    const stscCount = stscData.length >= 8 ? readU32(stscData, 4) : 0
    let scOffset = 8
    for (let i = 0; i < stscCount && scOffset + 12 <= stscData.length; i++) {
      stscEntries.push({
        firstChunk: readU32(stscData, scOffset),
        samplesPerChunk: readU32(stscData, scOffset + 4),
      })
      scOffset += 12
    }
  }

  // Build sample entries by combining chunk offsets + stsc + stsz + stts
  // Map each sample to its file offset
  const samples: SampleEntry[] = []
  let sampleIndex = 0

  // Expand stts to per-sample durations
  const durations: number[] = []
  for (const entry of sttsDurations) {
    for (let i = 0; i < entry.count; i++) {
      durations.push(entry.delta)
    }
  }

  // Walk through chunks and assign sample offsets
  for (let chunkIdx = 0; chunkIdx < chunkOffsets.length && sampleIndex < sampleSizes.length; chunkIdx++) {
    const chunkOffset = chunkOffsets[chunkIdx]

    // Determine samples per chunk from stsc
    let samplesInChunk = 1
    for (let i = stscEntries.length - 1; i >= 0; i--) {
      if (chunkIdx + 1 >= stscEntries[i].firstChunk) {
        samplesInChunk = stscEntries[i].samplesPerChunk
        break
      }
    }

    let withinChunkOffset = 0
    for (let s = 0; s < samplesInChunk && sampleIndex < sampleSizes.length; s++) {
      samples.push({
        offset: chunkOffset + withinChunkOffset,
        size: sampleSizes[sampleIndex],
        duration: sampleIndex < durations.length ? durations[sampleIndex] : 0,
        isKeyframe: true, // AAC frames are all keyframes
      })
      withinChunkOffset += sampleSizes[sampleIndex]
      sampleIndex++
    }
  }

  result.samples = samples
}

// Low-level binary helpers
function readU32(data: Uint8Array, offset: number): number {
  return ((data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3]) >>> 0
}

function readU16(data: Uint8Array, offset: number): number {
  return (data[offset] << 8) | data[offset + 1]
}

function readFourCC(data: Uint8Array, offset: number): string {
  return String.fromCharCode(data[offset], data[offset + 1], data[offset + 2], data[offset + 3])
}
