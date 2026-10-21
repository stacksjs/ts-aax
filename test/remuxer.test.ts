import type { AaxFileInfo } from '../src/aax-parser'
import { afterEach, describe, expect, it } from 'bun:test'
import { createCipheriv } from 'node:crypto'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { BufferSource } from 'ts-videos/source'
import { remuxAax } from '../src/aax-remuxer'

const directories: string[] = []
const keys = { fileKey: Buffer.alloc(16, 0x42), fileIv: Buffer.alloc(16, 0x24) }

afterEach(async () => {
  await Promise.all(directories.splice(0).map(directory => rm(directory, { recursive: true, force: true })))
})

function box(type: string, ...parts: Uint8Array[]): Buffer {
  const content = Buffer.concat(parts)
  const header = Buffer.alloc(8)
  header.writeUInt32BE(content.length + 8)
  header.write(type, 4, 4, 'latin1')
  return Buffer.concat([header, content])
}

function u32(...values: number[]): Buffer {
  const result = Buffer.alloc(values.length * 4)
  values.forEach((value, i) => result.writeUInt32BE(value, i * 4))
  return result
}

function find(data: Buffer, ...path: string[]): Buffer {
  for (let offset = 0; offset + 8 <= data.length;) {
    const size = data.readUInt32BE(offset)
    if (size < 8 || offset + size > data.length) throw new Error('Invalid test output')
    if (data.toString('latin1', offset + 4, offset + 8) === path[0]) {
      const content = data.subarray(offset + 8, offset + size)
      return path.length > 1 ? find(content, ...path.slice(1)) : content
    }
    offset += size
  }
  throw new Error(`Missing box: ${path.join('/')}`)
}

function encrypt(plain: Buffer): Buffer {
  const aligned = plain.length - plain.length % 16
  const cipher = createCipheriv('aes-128-cbc', keys.fileKey, keys.fileIv)
  cipher.setAutoPadding(false)
  return Buffer.concat([cipher.update(plain.subarray(0, aligned)), cipher.final(), plain.subarray(aligned)])
}

function fixture(padding = 0): { info: AaxFileInfo, plain: Buffer[], udta: Buffer, chapter: Buffer } {
  const plain = [Buffer.alloc(31, 0x12), Buffer.alloc(47, 0x34)]
  const chapter = Buffer.concat([Buffer.from([0, 9]), Buffer.from('Chapter 1')])
  const ftyp = box('ftyp', Buffer.from('aax '), u32(1), Buffer.from('aax M4B '))
  const first = box('mdat', Buffer.alloc(padding), encrypt(plain[0]), chapter)
  const second = box('mdat', encrypt(plain[1]))
  const offsets = [ftyp.length + 8 + padding, ftyp.length + first.length + 8]
  const chapterOffset = offsets[0] + plain[0].length
  const art = box('covr', box('data', u32(14, 0), Buffer.from([0x89, 0x50, 0x4E, 0x47])))
  const udta = box('udta', box('meta', u32(0), box('ilst',
    box('\xA9alb', box('data', u32(1, 0), Buffer.from('Original series'))),
    box('----', box('mean', u32(0), Buffer.from('com.apple.iTunes')), box('name', u32(0), Buffer.from('ASIN')), box('data', u32(1, 0), Buffer.from('Test identifier'))),
    art, art,
  )), box('chpl', Buffer.from('Original chapter metadata')))
  const audio = box('trak', box('tref', box('chap', u32(2))), box('mdia',
    box('hdlr', u32(0, 0), Buffer.from('soun')),
    box('minf', box('stbl',
      box('stsd', u32(0, 1), box('aavd', Buffer.alloc(28), box('esds', Buffer.from('Original codec configuration')), box('adrm', Buffer.alloc(88)))),
      box('stco', u32(0, 2, ...offsets)),
      box('stts', u32(0, 1, 2, 1024)),
    )),
  ))
  const wideOffset = Buffer.alloc(8)
  wideOffset.writeBigUInt64BE(BigInt(chapterOffset))
  const text = box('trak', box('mdia', box('hdlr', u32(0, 0), Buffer.from('text')), box('minf', box('stbl', box('co64', u32(0, 1), wideOffset)))))
  const moov = box('moov', audio, text, udta)
  offsets[1] += moov.length
  find(moov, 'moov', 'trak', 'mdia', 'minf', 'stbl', 'stco').writeUInt32BE(offsets[1], 12)
  return {
    plain, udta, chapter,
    info: {
      source: new BufferSource(Buffer.concat([ftyp, first, moov, second])),
      samples: plain.map((data, i) => ({ offset: offsets[i], size: data.length, duration: 1024, isKeyframe: true })),
      moovData: moov,
      metadata: {}, chapters: [], adrmContent: new Uint8Array(88), checksum: new Uint8Array(20), esdsConfig: new Uint8Array(),
      sampleRate: 44100, channelCount: 2, timescale: 44100, duration: 2048,
    },
  }
}

async function destination(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'aax-remux-'))
  directories.push(directory)
  return join(directory, 'book.m4b')
}

describe('Lossless AAX remuxer', () => {
  it.each([0, 4 * 1024 * 1024 - 10])('preserves metadata, artwork, chapters and AAC across media ranges (padding %i)', async (padding) => {
    const { info, plain, udta, chapter } = fixture(padding)
    const outputPath = await destination()
    await remuxAax(info, keys, outputPath, 'm4b', true)
    const output = await readFile(outputPath)
    expect(find(output, 'ftyp').toString('latin1', 0, 4)).toBe('M4B ')
    expect(find(output, 'moov', 'udta')).toEqual(udta.subarray(8))
    const stbl = find(output, 'moov', 'trak', 'mdia', 'minf', 'stbl')
    const stsd = find(stbl, 'stsd')
    expect(stsd.toString('latin1', 12, 16)).toBe('mp4a')
    expect(stsd.includes(Buffer.from('adrm'))).toBe(false)
    expect(find(stsd.subarray(44), 'esds').toString()).toBe('Original codec configuration')
    const offsets = find(stbl, 'stco')
    plain.forEach((data, i) => {
      const position = offsets.readUInt32BE(8 + i * 4)
      expect(output.subarray(position, position + data.length)).toEqual(Buffer.from(data))
    })
    const chapterMarker = output.indexOf(Buffer.from('co64'))
    const chapterOffset = Number(output.readBigUInt64BE(chapterMarker + 12))
    expect(output.subarray(chapterOffset, chapterOffset + chapter.length)).toEqual(Buffer.from(chapter))
    expect(output.indexOf(Buffer.from('moov'))).toBeLessThan(output.indexOf(Buffer.from('mdat')))
  })

  it('writes M4A branding and removes chapter tracks, references and markers when disabled', async () => {
    const { info } = fixture()
    const outputPath = await destination()
    await remuxAax(info, keys, outputPath, 'm4a', false)
    const output = await readFile(outputPath)
    expect(find(output, 'ftyp').toString('latin1', 0, 4)).toBe('M4A ')
    const moov = find(output, 'moov')
    expect(moov.includes(Buffer.from('chpl'))).toBe(false)
    expect(moov.includes(Buffer.from('chap'))).toBe(false)
    expect(moov.includes(Buffer.from('text'))).toBe(false)
    expect(moov.includes(Buffer.from('Original series'))).toBe(true)
  })

  it('rejects truncated media without replacing an existing output or leaving temporary files', async () => {
    const { info } = fixture()
    const source = info.source
    info.source = {
      getSize: () => source.getSize(),
      readSlice: async (offset, length) => length > 16 ? null : source.readSlice(offset, length),
    }
    const outputPath = await destination()
    await writeFile(outputPath, 'existing output')
    await expect(remuxAax(info, keys, outputPath, 'm4b', true)).rejects.toThrow('Truncated input')
    expect(await readFile(outputPath, 'utf8')).toBe('existing output')
    expect(await readdir(join(outputPath, '..'))).toEqual(['book.m4b'])
  })
})
