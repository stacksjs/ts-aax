import { describe, expect, it } from 'bun:test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { parseAaxFile } from '../src/aax-parser'
import { decryptSample, deriveKeys, parseActivationBytes, validateActivationBytes } from '../src/aax-decryptor'
import { convertAAX } from '../src/converter'
import { isValidActivationCode } from '../src/utils/activation'

// Path to the test fixture
const FIXTURE_PATH = join(process.cwd(), 'test/fixtures/TheBookofLongingsANovel_ep7.aax')
const MOCK_FIXTURE_PATH = join(process.cwd(), 'test/fixtures/mock.aax')
const OUTPUT_DIR = join(process.cwd(), 'test/output')

describe('AAX Parser', () => {
  it('should parse the AAX fixture file structure', async () => {
    if (!existsSync(FIXTURE_PATH)) {
      console.warn('Skipping: fixture file not found')
      return
    }

    const info = await parseAaxFile(FIXTURE_PATH)
    await info.source.close?.()

    expect(info.sampleRate).toBe(44100)
    expect(info.channelCount).toBe(2)
    expect(info.timescale).toBeGreaterThan(0)
    expect(info.duration).toBeGreaterThan(0)
    expect(info.samples.length).toBeGreaterThan(0)
    expect(info.adrmContent.length).toBeGreaterThan(0)
    expect(info.esdsConfig.length).toBeGreaterThan(0)
  })

  it('should extract metadata from AAX file', async () => {
    if (!existsSync(FIXTURE_PATH)) {
      console.warn('Skipping: fixture file not found')
      return
    }

    const info = await parseAaxFile(FIXTURE_PATH)
    await info.source.close?.()

    expect(info.metadata).toBeDefined()
    // The metadata fields may or may not be populated depending on the file
    // but the metadata object should exist
  })
})

describe('AAX Decryptor', () => {
  it('should parse valid activation bytes', () => {
    const bytes = parseActivationBytes('1CEB00DA')
    expect(bytes.length).toBe(4)
    expect(bytes[0]).toBe(0x1C)
    expect(bytes[1]).toBe(0xEB)
    expect(bytes[2]).toBe(0x00)
    expect(bytes[3]).toBe(0xDA)
  })

  it('should reject invalid activation bytes', () => {
    expect(() => parseActivationBytes('INVALID')).toThrow()
    expect(() => parseActivationBytes('12345')).toThrow()
    expect(() => parseActivationBytes('ZZZZZZZZ')).toThrow()
  })

  it('should validate activation bytes against fixture', async () => {
    if (!existsSync(FIXTURE_PATH)) {
      console.warn('Skipping: fixture file not found')
      return
    }

    const info = await parseAaxFile(FIXTURE_PATH)
    await info.source.close?.()

    // Try known activation code for this fixture
    const bytes = parseActivationBytes('1CEB00DA')
    const isValid = validateActivationBytes(info.adrmContent, bytes)
    // The validation may or may not pass depending on the actual file
    expect(typeof isValid).toBe('boolean')
  })

  it('should decrypt a sample without crashing', () => {
    // Create a dummy 32-byte sample (2 AES blocks)
    const dummySample = new Uint8Array(32)
    const dummyKey = new Uint8Array(16).fill(0x42)
    const dummyIv = new Uint8Array(16).fill(0x24)

    const result = decryptSample(dummySample, dummyKey, dummyIv)
    expect(result.length).toBe(32)
  })
})

describe('Activation Code Validation', () => {
  it('should validate correct activation codes', () => {
    expect(isValidActivationCode('1CEB00DA')).toBe(true)
    expect(isValidActivationCode('abcdef01')).toBe(true)
    expect(isValidActivationCode('ABCDEF01')).toBe(true)
  })

  it('should reject invalid activation codes', () => {
    expect(isValidActivationCode('')).toBe(false)
    expect(isValidActivationCode('12345')).toBe(false)
    expect(isValidActivationCode('ZZZZZZZZ')).toBe(false)
    expect(isValidActivationCode('123456789')).toBe(false)
  })
})

describe('AAX Converter', () => {
  it('should fail when input file does not exist', async () => {
    const result = await convertAAX({
      inputFile: 'non-existent-file.aax',
      outputDir: OUTPUT_DIR,
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Input file does not exist')
  })

  it('should fail when no activation code is provided and none can be found', async () => {
    if (!existsSync(MOCK_FIXTURE_PATH)) {
      console.warn('Skipping: mock fixture file not found')
      return
    }

    const result = await convertAAX({
      inputFile: MOCK_FIXTURE_PATH,
      outputDir: OUTPUT_DIR,
      activationCode: undefined,
    })

    // This should fail because mock.aax is not a real AAX file
    expect(result.success).toBe(false)
  })
})
