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
function sanitizeName(name: string): string {
  return name
    .replace(/:/g, ' -')
    .replace(/[/\\?*"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function generateOutputPath(metadata: any, options: ConversionOptions): string {
  const outputDir = options.outputDir || config.outputDir || '.'
  const outputFormat = options.outputFormat || config.outputFormat || 'm4b'

  let basePath = outputDir

  // Handle folder structure
  if (!options.flatFolderStructure) {
    if (metadata.author) {
      basePath = path.join(basePath, sanitizeName(metadata.author))
    }

    if (options.seriesTitleInFolderStructure && metadata.series) {
      basePath = path.join(basePath, sanitizeName(metadata.series))
    }

    const bookFolder = options.fullCaptionForBookFolder
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
  if (metadata.seriesIndex && options.sequenceNumberDigits) {
    const partNum = String(metadata.seriesIndex).padStart(options.sequenceNumberDigits, '0')
    filename = `${options.partFolderPrefix || ''}${partNum} - ${filename}`
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

    // Validate the activation bytes
    const isValid = validateActivationBytes(aaxInfo.adrmContent, activationBytes)
    if (!isValid) {
      // Try lowercase
      try {
        const lowerBytes = parseActivationBytes(activationCode.toLowerCase())
        const isValidLower = validateActivationBytes(aaxInfo.adrmContent, lowerBytes)
        if (isValidLower) {
          activationBytes = lowerBytes
          logger.debug('Lowercase activation code validated successfully')
        }
        else {
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
      }
      catch {
        return {
          success: false,
          error: 'Activation code does not match this AAX file',
        }
      }
    }

    const keys = deriveKeys(aaxInfo.adrmContent, activationBytes)
    logger.info('Decryption keys derived successfully')

    // Determine output format and path
    const outputFormat = options.outputFormat || config.outputFormat || 'm4b'
    if (outputFormat as string === 'mp3') {
      reportError(new Error('MP3 output not supported'), {
        heading: 'MP3 output is not currently supported.',
        details: 'AAC-to-MP3 transcoding requires an audio decoder/encoder pipeline that is not yet available.',
        hints: [
          'Use m4b or m4a format instead (no transcoding needed, just decryption)',
          'Set outputFormat: "m4b" in aax.config.ts',
        ],
      })
      return {
        success: false,
        error: 'MP3 output is not currently supported. Use m4b or m4a format.',
      }
    }

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

    // Add chapters
    for (const chapter of aaxInfo.chapters) {
      muxer.addChapter(chapter.title, chapter.startTime * 1000)
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

    // Extract cover image if requested
    if (options.extractCoverImage && metadata.coverImage) {
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
 * Split an AAX file into chapters
 */
export async function splitToChapters(options: ConversionOptions): Promise<ConversionResult> {
  logger.info('Converting and splitting audiobook by chapters...')
  const chaptersEnabled = true
  return convertAAX({ ...options, chaptersEnabled })
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}
