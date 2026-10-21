import type { AaxFileInfo } from './aax-parser'
import type { DecryptionKeys } from './aax-decryptor'
import type { Source } from 'ts-videos/reader'
import { randomUUID } from 'node:crypto'
import { open, rename, rm } from 'node:fs/promises'
import { decryptSample } from './aax-decryptor'

interface Box {
  type: string
  content: Buffer
}

interface MediaRange {
  start: number
  end: number
  outputStart: number
}

function box(type: string, content: Uint8Array): Buffer {
  const header = Buffer.alloc(8)
  header.writeUInt32BE(content.length + 8)
  header.write(type, 4, 4, 'latin1')
  return Buffer.concat([header, content])
}

function boxes(data: Buffer): Box[] {
  const result: Box[] = []
  let offset = 0
  while (offset < data.length) {
    if (offset + 8 > data.length) throw new Error('Truncated MP4 box header')
    let size = data.readUInt32BE(offset)
    let header = 8
    if (size === 1) {
      if (offset + 16 > data.length) throw new Error('Truncated extended MP4 box header')
      size = Number(data.readBigUInt64BE(offset + 8))
      header = 16
    }
    if (size === 0) size = data.length - offset
    if (!Number.isSafeInteger(size) || size < header || offset + size > data.length) {
      throw new Error('Invalid MP4 box size')
    }
    result.push({ type: data.toString('latin1', offset + 4, offset + 8), content: data.subarray(offset + header, offset + size) })
    offset += size
  }
  return result
}

async function readExact(source: Source, offset: number, size: number): Promise<Buffer> {
  const slice = await source.readSlice(offset, size)
  if (!slice || slice.bytes.length !== size) throw new Error(`Truncated input at offset ${offset}: expected ${size} bytes`)
  return Buffer.from(slice.bytes)
}

/** Rebuild container structure while copying all metadata atoms verbatim. */
function rebuild(data: Buffer, ranges: MediaRange[], chaptersEnabled: boolean, parent = ''): Buffer {
  const children: Buffer[] = []
  for (const { type, content } of boxes(data)) {
    if (!chaptersEnabled && ((parent === 'udta' && type === 'chpl') || (parent === 'tref' && type === 'chap'))) continue
    if (!chaptersEnabled && type === 'trak') {
      const mdia = boxes(content).find(child => child.type === 'mdia')
      const handler = mdia && boxes(mdia.content).find(child => child.type === 'hdlr')
      if (handler?.content.toString('latin1', 8, 12) === 'text') continue
    }

    if (['moov', 'trak', 'mdia', 'minf', 'stbl', 'tref', 'udta'].includes(type)) {
      children.push(box(type, rebuild(content, ranges, chaptersEnabled, type)))
    }
    else if (type === 'stsd') {
      if (content.length < 8) throw new Error('Truncated sample descriptions')
      const entries = boxes(content.subarray(8)).map((entry) => {
        if (entry.type !== 'aavd') return box(entry.type, entry.content)
        if (entry.content.length < 28 || entry.content.readUInt16BE(8) !== 0) {
          throw new Error('Unsupported AAX audio sample entry version')
        }
        const codecBoxes = boxes(entry.content.subarray(28))
          .filter(child => child.type !== 'adrm')
          .map(child => box(child.type, child.content))
        return box('mp4a', Buffer.concat([entry.content.subarray(0, 28), ...codecBoxes]))
      })
      children.push(box(type, Buffer.concat([content.subarray(0, 8), ...entries])))
    }
    else if (type === 'stco' || type === 'co64') {
      if (content.length < 8) throw new Error('Truncated chunk offsets')
      const count = content.readUInt32BE(4)
      const width = type === 'co64' ? 8 : 4
      if (content.length !== 8 + count * width) throw new Error('Invalid chunk offset table')
      const offsets: number[] = []
      for (let i = 0; i < count; i++) {
        const old = width === 8 ? Number(content.readBigUInt64BE(8 + i * width)) : content.readUInt32BE(8 + i * width)
        const range = ranges.find(item => old >= item.start && old < item.end)
        if (!range) throw new Error(`Chunk offset ${old} is outside media data`)
        offsets.push(range.outputStart + old - range.start)
      }
      const wide = width === 8 || offsets.some(value => value > 0xFFFFFFFF)
      const output = Buffer.alloc(8 + count * (wide ? 8 : 4))
      content.copy(output, 0, 0, 8)
      offsets.forEach((value, i) => {
        if (wide) output.writeBigUInt64BE(BigInt(value), 8 + i * 8)
        else output.writeUInt32BE(value, 8 + i * 4)
      })
      children.push(box(wide ? 'co64' : 'stco', output))
    }
    else {
      children.push(box(type, content))
    }
  }
  return Buffer.concat(children)
}

/**
 * Decrypt AAC in bounded buffers and remux the original tracks into an MP4.
 * Keeping the original moov preserves unknown tags, all artwork, edit lists,
 * language, dates, and chapter timing without a lossy metadata translation.
 */
export async function remuxAax(
  info: AaxFileInfo,
  keys: DecryptionKeys,
  outputPath: string,
  format: 'm4b' | 'm4a',
  chaptersEnabled: boolean,
  onProgress?: (percent: number) => void,
): Promise<void> {
  const size = await info.source.getSize()
  if (size === null) throw new Error('Cannot determine input file size')
  const ranges: MediaRange[] = []
  let offset = 0
  while (offset < size) {
    const header = await readExact(info.source, offset, 8)
    let length = header.readUInt32BE(0)
    let headerSize = 8
    if (length === 1) {
      length = Number((await readExact(info.source, offset + 8, 8)).readBigUInt64BE())
      headerSize = 16
    }
    if (length === 0) length = size - offset
    if (!Number.isSafeInteger(length) || length < headerSize || offset + length > size) throw new Error('Invalid top-level MP4 box size')
    if (header.toString('latin1', 4, 8) === 'mdat') ranges.push({ start: offset + headerSize, end: offset + length, outputStart: 0 })
    offset += length
  }
  if (!ranges.length) throw new Error('No media data found')

  const samples = [...info.samples].sort((a, b) => a.offset - b.offset)
  if (!samples.length) throw new Error('No audio samples found')
  let previousEnd = -1
  for (const sample of samples) {
    if (sample.offset < previousEnd || sample.size <= 0 || !ranges.some(range => sample.offset >= range.start && sample.offset + sample.size <= range.end)) {
      throw new Error('Invalid or overlapping audio sample range')
    }
    previousEnd = sample.offset + sample.size
  }

  const brand = format === 'm4b' ? 'M4B ' : 'M4A '
  const ftyp = box('ftyp', Buffer.concat([Buffer.from(brand, 'latin1'), Buffer.from([0, 0, 2, 0]), Buffer.from(`${brand}isommp42`, 'latin1')]))
  const mediaSize = ranges.reduce((total, range) => total + range.end - range.start, 0)
  const mdatHeader = Buffer.alloc(mediaSize + 8 > 0xFFFFFFFF ? 16 : 8)
  mdatHeader.writeUInt32BE(mdatHeader.length === 16 ? 1 : mediaSize + 8)
  mdatHeader.write('mdat', 4)
  if (mdatHeader.length === 16) mdatHeader.writeBigUInt64BE(BigInt(mediaSize + 16), 8)

  // co64 promotion may grow moov, so recalculate until offsets stabilize.
  const originalMoov = Buffer.from(info.moovData)
  let moov: Buffer = originalMoov
  for (let pass = 0; ; pass++) {
    let mediaOffset = ftyp.length + moov.length + mdatHeader.length
    for (const range of ranges) {
      range.outputStart = mediaOffset
      mediaOffset += range.end - range.start
    }
    const next = rebuild(originalMoov, ranges, chaptersEnabled)
    const stable = next.length === moov.length
    moov = next
    if (stable) break
    if (pass >= 8) throw new Error('Unable to stabilize MP4 chunk offsets')
  }

  const temporaryPath = `${outputPath}.${randomUUID()}.tmp`
  const output = await open(temporaryPath, 'wx')
  try {
    await output.writeFile(Buffer.concat([ftyp, moov, mdatHeader]))
    let sampleIndex = 0
    let copied = 0
    for (const range of ranges) {
      let position = range.start
      while (position < range.end) {
        let end = Math.min(range.end, position + 4 * 1024 * 1024)
        let lastSample = sampleIndex
        while (lastSample < samples.length && samples[lastSample].offset < end) {
          end = Math.max(end, samples[lastSample].offset + samples[lastSample].size)
          lastSample++
        }
        const buffer = await readExact(info.source, position, end - position)
        for (; sampleIndex < lastSample; sampleIndex++) {
          const sample = samples[sampleIndex]
          const relative = sample.offset - position
          buffer.set(decryptSample(buffer.subarray(relative, relative + sample.size), keys.fileKey, keys.fileIv), relative)
        }
        await output.writeFile(buffer)
        copied += buffer.length
        position = end
        onProgress?.(copied / mediaSize * 100)
      }
    }
    if (sampleIndex !== samples.length) throw new Error('Not all audio samples were converted')
    await output.close()
    await rename(temporaryPath, outputPath)
  }
  catch (error) {
    await output.close().catch(() => {})
    await rm(temporaryPath, { force: true })
    throw error
  }
}
