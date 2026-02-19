import type { BookMetadata, Chapter } from '../types'
import { parseAaxFile } from '../aax-parser'

/**
 * Extract all metadata from an AAX file using the custom AAX parser + ts-videos.
 */
export async function getBookMetadata(filePath: string): Promise<BookMetadata> {
  const info = await parseAaxFile(filePath)
  await info.source.close?.()
  return {
    ...info.metadata,
    chapters: info.chapters,
  }
}
