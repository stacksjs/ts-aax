# Getting Started

This guide will help you get started with AAX Audio Converter, a tool for converting Audible AAX audiobooks to standard audio formats.

## Prerequisites

Before using AAX, you need to have the following installed:

- **FFmpeg** - Required for audio processing
- **Audible CLI** - Required for retrieving activation bytes

### Installing FFmpeg

::: code-group

```bash [macOS]
brew install ffmpeg
```

```bash [Ubuntu/Debian]
sudo apt install ffmpeg
```

```bash [Windows]
winget install ffmpeg
```

:::

### Installing Audible CLI

Download the Audible CLI binary from [GitHub Releases](https://github.com/mkb79/audible-cli/releases) and place it in your PATH.

## Installation

Install AAX globally using your preferred package manager:

::: code-group

```bash [npm]
npm install -g @stacksjs/aax
```

```bash [bun]
bun add -g @stacksjs/aax
```

```bash [yarn]
yarn global add @stacksjs/aax
```

```bash [pnpm]
pnpm add -g @stacksjs/aax
```

:::

## Quick Start

### 1. Set Up Audible CLI

First, configure the Audible CLI to retrieve your activation bytes:

```bash
aax setup-audible
```

This will guide you through logging in to your Audible account and retrieving your activation bytes.

### 2. Convert Your First Audiobook

Convert an AAX file to MP3:

```bash
aax convert /path/to/audiobook.aax
```

The converted file will be saved in the `./converted` directory by default.

### 3. Choose Your Format

Convert to different formats:

```bash
# Convert to M4B (recommended for audiobooks)
aax convert /path/to/audiobook.aax --format m4b

# Convert to M4A
aax convert /path/to/audiobook.aax --format m4a
```

### 4. Split by Chapters

Create separate files for each chapter:

```bash
aax split /path/to/audiobook.aax
```

## Library Usage

You can also use AAX programmatically in your TypeScript projects:

```typescript
import { convertAAX } from '@stacksjs/aax'

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

convertBook()
```

## Common Options

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output` | Output directory | `./converted` |
| `-f, --format` | Output format (mp3, m4a, m4b) | `mp3` |
| `-b, --bitrate` | Audio bitrate in kbps | Source bitrate |
| `--chapters` | Preserve chapter information | `true` |
| `-v, --verbose` | Enable verbose logging | `false` |

## Next Steps

- Learn about [Output Formats](/guide/formats) to choose the best format for your needs
- Explore the full [CLI Reference](/guide/cli) for all available commands
- Configure default settings in your [Configuration](/config) file
