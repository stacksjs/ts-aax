<p align="center"><img src=".github/art/cover.jpg" alt="Social Card of this repo"></p>

[![npm version][npm-version-src]][npm-version-href]
[![GitHub Actions][github-actions-src]][github-actions-href]
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
<!-- [![npm downloads][npm-downloads-src]][npm-downloads-href] -->
<!-- [![Codecov][codecov-src]][codecov-href] -->

# AAX Audio Converter

A TypeScript library and CLI tool for converting Audible AAX audiobooks to standard MP3, M4A, or M4B formats.

![Screenshot](.github/art/screenshot.png)

## Features

- Convert AAX files to MP3, M4A, or M4B formats
- Preserve chapter information
- Automatically detect Audible activation code
- Split audiobooks by chapters
- Simple command-line interface

## Installation

```bash
# Install globally
npm install -g @stacksjs/aax

# Or use with npx
npx @stacksjs/aax
```

## Requirements

- `ffmpeg` & [`audible`](https://github.com/mkb79/audible-cli) must be installed and available in your PATH

_Please read [Using the Audible CLI Integration](#using-the-audible-cli-integration) for more information._

## CLI Usage

### Convert an AAX file to MP3

```bash
aax convert /path/to/audiobook.aax
```

### Convert with custom options

```bash
aax convert /path/to/audiobook.aax --format m4b --output ./my-audiobooks --bitrate 192
```

### Convert and split by chapters

```bash
aax split /path/to/audiobook.aax
```

### Available CLI Options

- `-o, --output <dir>` - Output directory (default: ./converted)
- `-f, --format <format>` - Output format: mp3, m4a, m4b (default: mp3)
- `-c, --code <code>` - Audible activation code (auto-detected if not provided)
- `--chapters` - Preserve chapter information (default: true)
- `-b, --bitrate <kbps>` - Audio bitrate in kbps (default: 'source' to match the original file)
- `-v, --verbose` - Enable verbose logging
- `--flat-folder-structure` - Use flat folder structure
- `--series-title-in-folder-structure` - Include series title in folder structure
- `--variable-bit-rate` - Apply variable bit rate
- `--aac-encoding-44-1` - Fix AAC encoding for 44.1 kHz
- `--use-named-chapters` - Use named chapters if available
- `--skip-short-chapters-duration <seconds>` - Skip short chapters between book parts
- `--skip-very-short-chapter-duration <seconds>` - Skip very short chapters at begin and end

## Library Usage

```typescript
import { convertAAX } from 'aax'

async function convertBook() {
  const result = await convertAAX({
    inputFile: '/path/to/audiobook.aax',
    outputFormat: 'mp3',
    outputDir: './converted',
    chaptersEnabled: true,
    bitrate: 128,
  })

  if (result.success) {
    console.log(`Conversion complete: ${result.outputPath}`)
  }
  else {
    console.error(`Conversion failed: ${result.error}`)
  }
}
```

## Configuration

You can create an `aax.config.ts` or `aax.config.js` file in your project root to customize default settings:

```typescript
export default {
  verbose: true,
  outputFormat: 'mp3',
  outputDir: './my-audiobooks',
  chaptersEnabled: true,
  bitrate: 192,
  // Optional: manually set the activation code
  // activationCode: '1a2b3c4d',
  // Optional: specify a custom FFmpeg path
  // ffmpegPath: '/usr/local/bin/ffmpeg',
  // New options
  flatFolderStructure: false,
  seriesTitleInFolderStructure: true,
  fullCaptionForBookFolder: false,
  partFolderPrefix: 'standard',
  sequenceNumberDigits: 2,
  customSearchWords: [],
  additionalPunctuation: '',
  intermediateFileCopy: false,
  aacEncoding44_1: false,
  variableBitRate: false,
  reduceBitRate: 'no',
  fileType: 'm4a',
  useISOLatin1: false,
  extractCoverImage: true,
  useNamedChapters: true,
  skipShortChaptersDuration: 25,
  skipVeryShortChapterDuration: 10,
  verifyChapterMarks: 'all',
  preferEmbeddedChapterTimes: true,
}
```

## Using the Audible CLI Integration

This tool integrates with the Audible CLI to automatically retrieve activation bytes (activation codes) from Audible's servers using your account credentials. This makes it much easier to convert your AAX audiobooks without manually finding activation codes.

### Prerequisites

1. Download the Audible CLI binary and place it in the root of your project:
   - [Audible CLI Releases](https://github.com/mkb79/audible-cli/releases)
   - Choose the appropriate version for your OS (e.g., `audible-cli-0.2.0-windows-amd64.exe` for Windows)
   - Rename it to `audible` and place it in the project root

### Setting up Audible CLI

Run the setup command:

```bash
aax setup-audible
```

This will:

1. Check if the audible binary exists
2. Make it executable
3. Run the quickstart wizard (you'll need to follow the interactive prompts to log in to your Audible account)
4. Retrieve your activation bytes from Audible's servers
5. Save them for future use

During the setup process, you'll see something like this:

```
Setting up Audible CLI and retrieving activation bytes...
Note: You may be prompted to log in to your Audible account.
Follow the prompts in the terminal to complete the setup.

Attempting to get activation bytes from Audible CLI...
Audible CLI is not configured. Setting up...
Starting Audible CLI quickstart. Please follow the prompts to log in to your Audible account.
# ... (interactive login process)

Fetching activation bytes from Audible server...
✅ Found activation bytes from Audible CLI: 2c******

✅ Successfully retrieved activation bytes: 2c******

You can now use this activation code with the convert command:
aax convert your-audiobook.aax -c 2c1eeb0a

The activation code has been saved and will be used automatically for future conversions.
```

Once set up, your activation code will be automatically used for all future conversions, so you don't need to specify it manually.

### Manual Setup (if the automated setup fails)

If the automated setup fails, you can do it manually:

1. Run: `./audible quickstart`
2. Follow the prompts to log in to your Audible account
3. Once set up, run: `./audible activation-bytes`
4. Note the activation code (a 8-character hex string like `2c1eeb0a`)
5. Use this code with the convert command:

   ```bash
   aax convert your-audiobook.aax -c YOUR_ACTIVATION_CODE
   ```

## Anti-Piracy Notice

Note that this software does not 'crack' the DRM or circumvent it in any other way. The application simply applies the user's own activation code (associated with their personal Audible account) to decrypt the audiobook in the same manner as the official audiobook playing software does.

Please only use this application for gaining full access to your own audiobooks for archiving / conversion / convenience. De-DRMed audiobooks must not be uploaded to open servers, torrents, or other methods of mass distribution. No help will be given to people doing such things. Authors, retailers and publishers all need to make a living, so that they can continue to produce audiobooks for us to listen to and enjoy.

_Amazon's lack of Mac support requires us to act._

## Contributing

Please see [CONTRIBUTING](.github/CONTRIBUTING.md) for details.

## Community

For help, discussion about best practices, or any other conversation that would benefit from being searchable:

[Discussions on GitHub](https://github.com/stacksjs/aax/discussions)

For casual chit-chat with others using this package:

[Join the Stacks Discord Server](https://discord.gg/stacksjs)

## Postcardware

"Software that is free, but hopes for a postcard." We love receiving postcards from around the world showing where Stacks is being used! We showcase them on our website too.

Our address: Stacks.js, 12665 Village Ln #2306, Playa Vista, CA 90094, United States 🌎

## Credits

- [@audiamus](https://github.com/audiamus) for the original [AaxAudioConverter](https://github.com/audiamus/AaxAudioConverter)

## Sponsors

We would like to extend our thanks to the following sponsors for funding Stacks development. If you are interested in becoming a sponsor, please reach out to us.

- [JetBrains](https://www.jetbrains.com/)
- [The Solana Foundation](https://solana.com/)

## License

The MIT License (MIT). Please see [LICENSE](LICENSE.md) for more information.

Made with 💙

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/@stacksjs/aax?style=flat-square
[npm-version-href]: https://npmjs.com/package/@stacksjs/aax
[github-actions-src]: https://img.shields.io/github/actions/workflow/status/stacksjs/aax/ci.yml?style=flat-square&branch=main
[github-actions-href]: https://github.com/stacksjs/aax/actions?query=workflow%3Aci

<!-- [codecov-src]: https://img.shields.io/codecov/c/gh/stacksjs/aax/main?style=flat-square
[codecov-href]: https://codecov.io/gh/stacksjs/aax -->
