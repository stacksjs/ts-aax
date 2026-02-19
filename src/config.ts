import type { AAXConfig } from './types'
import { loadConfig } from 'bunfig'
import { findActivationCode } from './utils/activation'

export const defaultConfig: AAXConfig = {
  verbose: true,
  outputFormat: 'm4b',
  outputDir: './converted',
  chaptersEnabled: true,
  bitrate: 128,
  activationCode: findActivationCode() || undefined,

  // Folder structure defaults
  flatFolderStructure: false,
  seriesTitleInFolderStructure: true,
  fullCaptionForBookFolder: false,
  partFolderPrefix: 'standard',
  sequenceNumberDigits: 2,

  // Conversion defaults
  customSearchWords: [],
  additionalPunctuation: '',
  intermediateFileCopy: false,
  aacEncoding44_1: false,
  variableBitRate: false,
  reduceBitRate: 'no',
  fileType: 'm4b',
  useISOLatin1: false,
  extractCoverImage: true,

  // Chapter settings
  useNamedChapters: true,
  verifyChapterMarks: 'all',
  preferEmbeddedChapterTimes: true,
}

// Lazy-loaded config to avoid top-level await (enables bun --compile)
let _config: AAXConfig | null = null

export async function getConfig(): Promise<AAXConfig> {
  if (!_config) {
    _config = await loadConfig({
  name: 'aax',
  defaultConfig,
})
  }
  return _config
}

// For backwards compatibility - synchronous access with default fallback
export const config: AAXConfig = defaultConfig
