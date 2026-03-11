# Configuration

You can configure the AAX converter using an `aax.config.ts` _(or `aax.config.js`)_ file in your project root.

```ts
// aax.config.{ts,js}
import type { AAXConfig } from '@stacksjs/aax'

const config: AAXConfig = {
  /**

   _ Enable verbose logging
   _ Default: true

   */
  verbose: true,

  /**

   _ Output format for converted files
   _ Default: 'mp3'
   _ Options: 'mp3', 'm4a', 'm4b'

   _/
  outputFormat: 'mp3',

  /**

   _ Output directory for converted files
   _ Default: './converted'

   */
  outputDir: './my-audiobooks',

  /**

   _ Enable chapter preservation
   _ Default: true

   */
  chaptersEnabled: true,

  /**

   _ Audio bitrate in kbps
   _ Default: 128

   */
  bitrate: 192,

  /**

   _ Use flat folder structure
   _ Default: false

   */
  flatFolderStructure: false,

  /**

   _ Include series title in folder structure
   _ Default: true

   */
  seriesTitleInFolderStructure: true,

  /**

   _ Use full caption for book folder
   _ Default: false

   */
  fullCaptionForBookFolder: false,

  /**

   _ Prefix for part folders
   _ Default: 'standard'

   */
  partFolderPrefix: 'standard',

  /**

   _ Number of digits for sequence numbers
   _ Default: 2

   */
  sequenceNumberDigits: 2,

  /**

   _ Custom search words for parts
   _ Default: []

   */
  customSearchWords: [],

  /**

   _ Additional punctuation for book titles
   _ Default: ''

   */
  additionalPunctuation: '',

  /**

   _ Intermediate file copy for single file mode
   _ Default: false

   */
  intermediateFileCopy: false,

  /**

   _ Fix AAC encoding for 44.1 kHz
   _ Default: false

   */
  aacEncoding44_1: false,

  /**

   _ Apply variable bit rate
   _ Default: false

   */
  variableBitRate: false,

  /**

   _ Reduce bit rate
   _ Default: 'no'
   _ Options: 'no', 'auto', 'manual'

   _/
  reduceBitRate: 'no',

  /**

   _ File type for MP4 audio
   _ Default: 'm4a'
   _ Options: 'm4a', 'm4b'

   _/
  fileType: 'm4a',

  /**

   _ Use ISO Latin1 encoding for m3u playlist
   _ Default: false

   */
  useISOLatin1: false,

  /**

   _ Extract cover image
   _ Default: true

   */
  extractCoverImage: true,

  /**

   _ Use named chapters if available
   _ Default: true

   */
  useNamedChapters: true,

  /**

   _ Verify and adjust chapter marks
   _ Default: 'all'
   _ Options: 'all', 'none', 'selected'

   _/
  verifyChapterMarks: 'all',

  /**

   _ Prefer embedded chapter times
   _ Default: true

   */
  preferEmbeddedChapterTimes: true,

  /**

   _ Manually set the activation code
   _ Default: auto-detected

   */
  // activationCode: '1a2b3c4d',

  /**

   _ Specify a custom FFmpeg path
   _ Default: uses system FFmpeg

   */
  // ffmpegPath: '/usr/local/bin/ffmpeg',
}

export default config
```

_Then run:_

```bash
aax convert your-audiobook.aax
```

To learn more, head over to the [documentation](https://github.com/stacksjs/aax).
