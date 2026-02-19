import type { Buffer } from 'node:buffer'

export interface AAXConfig {
  verbose: boolean
  outputDir?: string
  outputFormat?: 'm4a' | 'm4b'
  chaptersEnabled?: boolean
  bitrate?: number | 'source'
  activationCode?: string

  // Folder structure options
  flatFolderStructure?: boolean
  seriesTitleInFolderStructure?: boolean
  fullCaptionForBookFolder?: boolean
  partFolderPrefix?: string
  sequenceNumberDigits?: number

  // Conversion options
  customSearchWords?: string[]
  additionalPunctuation?: string
  intermediateFileCopy?: boolean
  aacEncoding44_1?: boolean
  variableBitRate?: boolean
  reduceBitRate?: 'no' | 'auto' | 'manual'
  fileType?: 'm4a' | 'm4b'
  useISOLatin1?: boolean
  extractCoverImage?: boolean

  // Chapter settings
  useNamedChapters?: boolean
  verifyChapterMarks?: 'all' | 'none' | 'selected'
  preferEmbeddedChapterTimes?: boolean
}

export interface ConversionOptions extends Partial<AAXConfig> {
  inputFile: string
}

export interface ConversionResult {
  success: boolean
  outputPath?: string
  error?: string
}

export interface FileNaming {
  pattern: string
  titlePattern: string
  trackNumberingPattern: string
  addTotalTracks: boolean
  genreNaming: string
  customGenre?: string
  chapterFolderPrefix?: string
  customChapterFolder?: string
  seriesTitleSuffix?: boolean
  longBookTitle?: boolean
}

export interface BookMetadata {
  title?: string
  author?: string
  narrator?: string
  duration?: number
  chapters?: Chapter[]
  series?: string
  seriesIndex?: number
  publishingYear?: number
  publisher?: string
  copyright?: string
  description?: string
  coverImage?: Buffer
}

export interface Chapter {
  title: string
  startTime: number
  endTime: number
}
