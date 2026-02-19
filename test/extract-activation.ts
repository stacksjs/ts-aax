#!/usr/bin/env bun
/**
 * This is a test script to extract activation codes from AAX files.
 * It tries multiple approaches to find the right activation code.
 */

import { existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { parseAaxFile } from '../src/aax-parser'
import { parseActivationBytes, validateActivationBytes } from '../src/aax-decryptor'
import { extractAaxChecksum, extractActivationFromFile } from '../src/utils/activation'

// Get AAX file path from command line argument or use the real fixture
const aaxFilePath = process.argv[2] || path.join(process.cwd(), 'test/fixtures/TheBookofLongingsANovel_ep7.aax')

if (!existsSync(aaxFilePath)) {
  console.error('Please provide a valid AAX file path')
  process.exit(1)
}

console.warn(`\nTesting activation code extraction for: ${path.basename(aaxFilePath)}`)

async function main() {
  // Parse the AAX file to get adrm info
  console.warn('\nParsing AAX file...')
  const info = await parseAaxFile(aaxFilePath)
  await info.source.close?.()

  console.warn(`  Sample rate: ${info.sampleRate}`)
  console.warn(`  Channels: ${info.channelCount}`)
  console.warn(`  Samples: ${info.samples.length}`)
  console.warn(`  Duration: ${(info.duration / info.timescale).toFixed(1)}s`)
  if (info.chapters.length > 0) {
    console.warn(`  Chapters: ${info.chapters.length}`)
  }
  if (info.metadata.title) {
    console.warn(`  Title: ${info.metadata.title}`)
  }

  // Extract checksum
  const checksum = await extractAaxChecksum(aaxFilePath)
  if (checksum) {
    console.warn(`\nExtracted checksum: ${checksum}`)
  }

  // Try all known codes
  console.warn('\nTesting known activation codes...')
  const knownCodes = ['1CEB00DA', '4F087621', '7B95D5DA', 'A9EDBB73', '9A1DC7AE']

  for (const code of knownCodes) {
    try {
      const bytes = parseActivationBytes(code)
      const isValid = validateActivationBytes(info.adrmContent, bytes)
      console.warn(`  ${code}: ${isValid ? 'VALID' : 'invalid'}`)

      if (isValid) {
        console.warn(`\nFound working activation code: ${code}`)
        return
      }
    }
    catch (error) {
      console.warn(`  ${code}: error - ${(error as Error).message}`)
    }
  }

  // Try lowercase variants
  for (const code of knownCodes) {
    const lower = code.toLowerCase()
    try {
      const bytes = parseActivationBytes(lower)
      const isValid = validateActivationBytes(info.adrmContent, bytes)
      console.warn(`  ${lower}: ${isValid ? 'VALID' : 'invalid'}`)

      if (isValid) {
        console.warn(`\nFound working activation code: ${lower}`)
        return
      }
    }
    catch (error) {
      console.warn(`  ${lower}: error - ${(error as Error).message}`)
    }
  }

  console.warn('\nNo working activation code found among known codes')
}

main().catch(console.error)
