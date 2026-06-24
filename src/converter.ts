import type { ConversionOptions, ConversionResult } from './types'
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { FileTarget } from 'ts-videos/target'
import { Reader } from 'ts-videos/reader'
import { Mp4Muxer } from '@ts-videos/mp4/muxer'
import { parseAaxFile } from './aax-parser'
import { decryptSample, deriveKeys, parseActivationBytes, validateActivationBytes } from './aax-decryptor'
import { config } from './config'
import { getActivationBytesFromAudibleCli } from './utils/activation'
import { logger, reportError } from './utils/logger'
import { getBookMetadata } from './utils/metadata'

/** Sanitize a string for use as a filename or directory name on macOS/Windows/Linux */
function sanitizeName(_input: string): string {
  return _input
    .replace(/:/g, ' -')
    .replace(/[/\\?*\x22<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function generateOutputPath(metadata: any, options: ConversionOptions): string {
  const outputDir = options.outputDir || config.outputDir || '.'
  const outputFormat = options.outputFormat || config.outputFormat || 'm4b'

  // Fall back to config for folder-structure options: the CLI builds a partial
  // options object, so without this these settings in aax.config.ts are ignored.
  const flatFolderStructure = options.flatFolderStructure ?? config.flatFolderStructure
  const seriesTitleInFolderStructure = options.seriesTitleInFolderStructure ?? config.seriesTitleInFolderStructure
  const fullCaptionForBookFolder = options.fullCaptionForBookFolder ?? config.fullCaptionForBookFolder
  const sequenceNumberDigits = options.sequenceNumberDigits ?? config.sequenceNumberDigits
  const partFolderPrefix = options.partFolderPrefix ?? config.partFolderPrefix

  let basePath = outputDir

  // Handle folder structure
  if (!flatFolderStructure) {
    if (metadata.author) {
      basePath = path.join(basePath, sanitizeName(metadata.author))
    }

    if (seriesTitleInFolderStructure && metadata.series) {
      basePath = path.join(basePath, sanitizeName(metadata.series))
    }

    const bookFolder = fullCaptionForBookFolder
      ? metadata.title
      : metadata.title?.split(':')[0]

    if (bookFolder) {
      basePath = path.join(basePath, sanitizeName(bookFolder))
    }
  }

  // Create output directory structure
  mkdirSync(basePath, { recursive: true })

  // Generate filename
  let filename = metadata.title || path.basename(options.inputFile, path.extname(options.inputFile))
  filename = sanitizeName(filename)

  // Add part number if available
  if (metadata.seriesIndex && sequenceNumberDigits) {
    const partNum = String(metadata.seriesIndex).padStart(sequenceNumberDigits, '0')
    filename = `${partFolderPrefix || ''}${partNum} - ${filename}`
  }

  return path.join(basePath, `${filename}.${outputFormat}`)
}

/**
 * Convert an AAX file to M4B (decrypted AAC passthrough)
 */
export async function convertAAX(options: ConversionOptions): Promise<ConversionResult> {
  // Validate input file
  if (!options.inputFile) {
    logger.error('No input file provided. Please specify an AAX file to convert.')
    return {
      success: false,
      error: 'No input file provided',
    }
  }

  if (!existsSync(options.inputFile)) {
    logger.error(`Input file does not exist: ${options.inputFile}`)
    return {
      success: false,
      error: `Input file does not exist: ${options.inputFile}`,
    }
  }

  // Validate the requested output format up front, before any expensive parsing
  // or decryption work. Conversion is a lossless decrypt-and-remux of the source
  // AAC stream, so only AAC-in-MP4 containers (m4b/m4a) are supported; MP3 would
  // require a transcode step that does not exist here.
  const outputFormat = options.outputFormat || config.outputFormat || 'm4b'
  if (outputFormat !== 'm4b' && outputFormat !== 'm4a') {
    reportError(new Error(`Unsupported output format: ${outputFormat}`), {
      heading: `Output format "${outputFormat}" is not supported.`,
      details: 'AAX conversion remuxes the original AAC audio without transcoding, so only m4b and m4a are available.',
      hints: [
        'Use m4b (recommended for audiobooks) or m4a',
        'Set outputFormat: "m4b" in aax.config.ts',
      ],
    })
    return {
      success: false,
      error: `Output format "${outputFormat}" is not supported. Use m4b or m4a.`,
    }
  }

  // Get activation code
  const activationCode = options.activationCode || config.activationCode || await getActivationBytesFromAudibleCli()

  if (!activationCode) {
    reportError(new Error('Missing activation code'), {
      heading: 'No activation code provided for decryption.',
      details: 'Audible AAX files require an 8-character activation code (activation bytes) to decrypt.',
      hints: [
        'Provide activationCode in options or in aax.config.ts',
        'Use Audible CLI to fetch: audible activation-bytes (run audible quickstart first)',
        'Try environment overrides and run with AAX_LOG_LEVEL=debug for more output',
      ],
    })
    return {
      success: false,
      error: 'No activation code provided. This is required to convert AAX files.',
    }
  }

  logger.info(`Using activation code: ${activationCode.substring(0, 2)}******`)

  try {
    // Parse the AAX file
    logger.info('Parsing AAX file structure...')
    const aaxInfo = await parseAaxFile(options.inputFile)

    // Log book info from parsed metadata
    const metadata = aaxInfo.metadata
    if (metadata.title) logger.info(`Title: ${metadata.title}`)
    if (metadata.author) logger.info(`Author: ${metadata.author}`)
    if (metadata.narrator) logger.info(`Narrator: ${metadata.narrator}`)
    if (metadata.duration) {
      const hours = Math.floor(metadata.duration / 3600)
      const minutes = Math.floor((metadata.duration % 3600) / 60)
      const seconds = Math.floor(metadata.duration % 60)
      logger.info(`Duration: ${hours}h ${minutes}m ${seconds}s`)
    }
    if (aaxInfo.chapters.length) {
      logger.info(`Chapters: ${aaxInfo.chapters.length}`)
    }

    // Derive decryption keys
    logger.info('Deriving decryption keys...')
    let activationBytes: Uint8Array
    try {
      activationBytes = parseActivationBytes(activationCode)
    }
    catch (e) {
      return {
        success: false,
        error: `Invalid activation code format: ${(e as Error).message}`,
      }
    }

    // Validate the activation bytes against this file's DRM. Activation codes are
    // hex, and parseActivationBytes is case-insensitive, so there is no separate
    // lowercase variant to retry — equal hex yields identical bytes.
    if (!validateActivationBytes(aaxInfo.adrmContent, activationBytes)) {
      reportError(new Error('Invalid activation code'), {
        heading: 'Activation code validation failed.',
        details: 'The provided activation code does not match this AAX file\'s DRM.',
        hints: [
          'Verify the activation code is correct',
          'Try a different activation code',
          'Use `aax setup-audible` to fetch your activation bytes',
        ],
      })
      return {
        success: false,
        error: 'Activation code does not match this AAX file',
      }
    }

    const keys = deriveKeys(aaxInfo.adrmContent, activationBytes)
    logger.info('Decryption keys derived successfully')

    // Output format was validated at the top of convertAAX
    const outputPath = generateOutputPath(metadata, options)
    const shortPath = path.basename(outputPath)
    logger.info(`Output format: ${outputFormat}`)
    logger.info(`Output path: ${shortPath}`)
    logger.debug(`Full output path: ${outputPath}`)

    // Create output M4B using ts-videos Mp4Muxer
    logger.info('Starting conversion...')
    const target = new FileTarget(outputPath)
    const muxer = new Mp4Muxer(target, {
      fastStart: true, // moov-before-mdat for maximum compatibility
      brand: 'M4B ',
    })

    // Add audio track with AAC config from the original file
    const audioTrack = muxer.addAudioTrack({
      codec: 'aac',
      sampleRate: aaxInfo.sampleRate,
      channels: aaxInfo.channelCount,
      codecDescription: aaxInfo.esdsConfig,
    })

    // Set metadata for the output file
    muxer.setMetadata({
      title: metadata.title,
      artist: metadata.author,
      albumArtist: metadata.narrator,
      album: metadata.title,
      genre: 'Audiobook',
      year: metadata.publishingYear ? Number(metadata.publishingYear) : undefined,
      copyright: metadata.copyright,
      narrator: metadata.narrator,
      publisher: metadata.publisher,
      description: metadata.description,
    })

    // Set cover art
    if (metadata.coverImage) {
      const isJpeg = metadata.coverImage[0] === 0xFF && metadata.coverImage[1] === 0xD8
      muxer.setArtwork(metadata.coverImage, isJpeg ? 'jpeg' : 'png')
    }

    // Add chapters (unless explicitly disabled via chaptersEnabled)
    const chaptersEnabled = options.chaptersEnabled ?? config.chaptersEnabled ?? true
    if (chaptersEnabled) {
      for (const chapter of aaxInfo.chapters) {
        muxer.addChapter(chapter.title, chapter.startTime * 1000)
      }
    }

    await muxer.start()

    // Create a reader source to read encrypted samples
    const reader = new Reader(aaxInfo.source) as Reader & { position: number }
    const totalSamples = aaxInfo.samples.length
    let processedSamples = 0
    let timestamp = 0 // Running timestamp in seconds

    // Set up progress bar
    const progressBar = logger.progress(100, 'Decrypting and remuxing...')

    for (const sample of aaxInfo.samples) {
      // Read encrypted sample data from source
      reader.position = sample.offset
      const encrypted = await reader.readBytes(sample.size)
      if (!encrypted) {
        logger.warn(`Failed to read sample at offset ${sample.offset}, skipping`)
        continue
      }

      // Decrypt the sample
      const decrypted = decryptSample(encrypted, keys.fileKey, keys.fileIv)

      // Calculate duration in seconds
      const durationSec = sample.duration / aaxInfo.timescale

      // Write decrypted sample to muxer
      await muxer.writePacket(audioTrack.id, {
        data: decrypted,
        timestamp,
        duration: durationSec,
        isKeyframe: true,
      })

      timestamp += durationSec
      processedSamples++

      // Update progress
      if (processedSamples % 1000 === 0 || processedSamples === totalSamples) {
        const percent = Math.min(99, (processedSamples / totalSamples) * 100)
        const timeStr = formatDuration(timestamp)
        const totalStr = formatDuration(aaxInfo.duration / aaxInfo.timescale)
        progressBar.update(percent, `Decrypting ${timeStr} / ${totalStr} (${processedSamples}/${totalSamples} samples)`)
      }
    }

    // Finalize the muxer (writes moov + closes file)
    await muxer.finalize()
    await target.close?.()
    await aaxInfo.source.close?.()

    progressBar.update(100, 'Conversion complete')

    // Extract cover image to a sidecar file if requested (falls back to config,
    // since the CLI does not pass this option through)
    const extractCoverImage = options.extractCoverImage ?? config.extractCoverImage
    if (extractCoverImage && metadata.coverImage) {
      const coverPath = path.join(path.dirname(outputPath), 'cover.jpg')
      try {
        const { writeFileSync } = await import('node:fs')
        writeFileSync(coverPath, metadata.coverImage)
        logger.info(`Cover art saved to: ${path.basename(coverPath)}`)
      }
      catch (e) {
        logger.warn(`Failed to save cover art: ${(e as Error).message}`)
      }
    }

    logger.success(`Conversion completed! Output saved to: ${outputPath}`)
    return {
      success: true,
      outputPath,
    }
  }
  catch (error) {
    reportError(error, {
      heading: 'Unexpected error during conversion.',
      hints: [
        'Re-run with AAX_LOG_LEVEL=debug to include stack traces',
      ],
    })
    return {
      success: false,
      error: `Error during conversion: ${(error as Error).message}`,
    }
  }
}

/**
 * Convert an AAX file and split it into one output file per chapter.
 * Each chapter file contains only that chapter's (decrypted) AAC samples, with
 * the chapter title as its track title and the book's cover art and metadata.
 * Falls back to a single file when the book has no usable chapter marks.
 */
export async function splitToChapters(options: ConversionOptions): Promise<ConversionResult> {
  if (!options.inputFile) {
    logger.error('No input file provided. Please specify an AAX file to convert.')
    return { success: false, error: 'No input file provided' }
  }
  if (!existsSync(options.inputFile)) {
    logger.error(`Input file does not exist: ${options.inputFile}`)
    return { success: false, error: `Input file does not exist: ${options.inputFile}` }
  }

  const outputFormat = options.outputFormat || config.outputFormat || 'm4b'
  if (outputFormat !== 'm4b' && outputFormat !== 'm4a') {
    reportError(new Error(`Unsupported output format: ${outputFormat}`), {
      heading: `Output format "${outputFormat}" is not supported.`,
      details: 'AAX conversion remuxes the original AAC audio without transcoding, so only m4b and m4a are available.',
      hints: ['Use m4b (recommended for audiobooks) or m4a'],
    })
    return { success: false, error: `Output format "${outputFormat}" is not supported. Use m4b or m4a.` }
  }

  const activationCode = options.activationCode || config.activationCode || await getActivationBytesFromAudibleCli()
  if (!activationCode) {
    reportError(new Error('Missing activation code'), {
      heading: 'No activation code provided for decryption.',
      details: 'Audible AAX files require an 8-character activation code (activation bytes) to decrypt.',
      hints: [
        'Provide activationCode in options or in aax.config.ts',
        'Use Audible CLI to fetch: audible activation-bytes (run audible quickstart first)',
      ],
    })
    return { success: false, error: 'No activation code provided. This is required to convert AAX files.' }
  }

  logger.info(`Using activation code: ${activationCode.substring(0, 2)}******`)

  try {
    logger.info('Parsing AAX file structure...')
    const aaxInfo = await parseAaxFile(options.inputFile)
    const metadata = aaxInfo.metadata

    let activationBytes: Uint8Array
    try {
      activationBytes = parseActivationBytes(activationCode)
    }
    catch (e) {
      await aaxInfo.source.close?.()
      return { success: false, error: `Invalid activation code format: ${(e as Error).message}` }
    }

    if (!validateActivationBytes(aaxInfo.adrmContent, activationBytes)) {
      await aaxInfo.source.close?.()
      reportError(new Error('Invalid activation code'), {
        heading: 'Activation code validation failed.',
        details: 'The provided activation code does not match this AAX file\'s DRM.',
        hints: ['Verify the activation code is correct', 'Use `aax setup-audible` to fetch your activation bytes'],
      })
      return { success: false, error: 'Activation code does not match this AAX file' }
    }

    const keys = deriveKeys(aaxInfo.adrmContent, activationBytes)
    logger.info('Decryption keys derived successfully')

    const chapters = aaxInfo.chapters
    if (chapters.length <= 1) {
      logger.warn('No usable chapter marks found — producing a single file instead of splitting.')
      await aaxInfo.source.close?.()
      return convertAAX(options)
    }

    // Reuse the single-file path logic to determine the destination folder.
    const outDir = path.dirname(generateOutputPath(metadata, options))
    logger.info(`Splitting into ${chapters.length} chapters -> ${outDir}`)

    const samples = aaxInfo.samples
    const { timescale } = aaxInfo

    // Precompute each sample's start time (seconds). Samples are in time order,
    // so chapter boundaries can be applied with a simple monotonic scan.
    const sampleStart = new Array<number>(samples.length)
    let cursor = 0
    for (let i = 0; i < samples.length; i++) {
      sampleStart[i] = cursor
      cursor += samples[i].duration / timescale
    }

    const reader = new Reader(aaxInfo.source) as Reader & { position: number }
    const isJpeg = !!metadata.coverImage && metadata.coverImage[0] === 0xFF && metadata.coverImage[1] === 0xD8
    const digits = Math.max(2, String(chapters.length).length)
    const outputs: string[] = []
    const progressBar = logger.progress(100, 'Splitting...')
    let processed = 0

    for (let c = 0; c < chapters.length; c++) {
      const chapter = chapters[c]
      const chapterEnd = c + 1 < chapters.length ? chapters[c + 1].startTime : Number.POSITIVE_INFINITY
      const titlePart = sanitizeName(chapter.title || `Chapter ${c + 1}`)
      const fileName = `${String(c + 1).padStart(digits, '0')} - ${titlePart}.${outputFormat}`
      const filePath = path.join(outDir, fileName)

      const target = new FileTarget(filePath)
      const muxer = new Mp4Muxer(target, { fastStart: true, brand: 'M4B ' })
      const track = muxer.addAudioTrack({
        codec: 'aac',
        sampleRate: aaxInfo.sampleRate,
        channels: aaxInfo.channelCount,
        codecDescription: aaxInfo.esdsConfig,
      })
      muxer.setMetadata({
        title: chapter.title || `Chapter ${c + 1}`,
        artist: metadata.author,
        albumArtist: metadata.narrator,
        album: metadata.title,
        genre: 'Audiobook',
        year: metadata.publishingYear ? Number(metadata.publishingYear) : undefined,
        copyright: metadata.copyright,
        narrator: metadata.narrator,
        publisher: metadata.publisher,
      })
      if (metadata.coverImage) {
        muxer.setArtwork(metadata.coverImage, isJpeg ? 'jpeg' : 'png')
      }
      await muxer.start()

      for (let i = 0; i < samples.length; i++) {
        if (sampleStart[i] < chapter.startTime) continue
        if (sampleStart[i] >= chapterEnd) break

        const sample = samples[i]
        reader.position = sample.offset
        const encrypted = await reader.readBytes(sample.size)
        if (!encrypted) {
          logger.warn(`Failed to read sample at offset ${sample.offset}, skipping`)
          continue
        }
        const decrypted = decryptSample(encrypted, keys.fileKey, keys.fileIv)
        await muxer.writePacket(track.id, {
          data: decrypted,
          timestamp: sampleStart[i] - chapter.startTime, // reset clock per chapter file
          duration: sample.duration / timescale,
          isKeyframe: true,
        })

        processed++
        if (processed % 1000 === 0) {
          const percent = Math.min(99, (processed / samples.length) * 100)
          progressBar.update(percent, `Chapter ${c + 1}/${chapters.length} — ${formatDuration(sampleStart[i])}`)
        }
      }

      await muxer.finalize()
      await target.close?.()
      outputs.push(filePath)
      logger.info(`  ✓ ${fileName}`)
    }

    await aaxInfo.source.close?.()
    progressBar.update(100, 'Split complete')
    logger.success(`Split into ${outputs.length} chapter files in: ${outDir}`)
    return { success: true, outputPath: outDir }
  }
  catch (error) {
    reportError(error, {
      heading: 'Unexpected error while splitting.',
      hints: ['Re-run with AAX_LOG_LEVEL=debug to include stack traces'],
    })
    return { success: false, error: `Error during split: ${(error as Error).message}` }
  }
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}
