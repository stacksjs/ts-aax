# Configuration Deep-Dive

AAX supports comprehensive configuration through config files, environment variables, and CLI options. This guide covers all configuration options and advanced usage patterns.

## Configuration File

Create an `aax.config.ts` file in your project root:

```typescript
import type { AAXConfig } from 'aax'

export default {
  // Default output format
  format: 'm4b',

  // Default output directory
  output: './converted',

  // Activation bytes (from Audible account)
  activationBytes: process.env.AUDIBLE_ACTIVATION_BYTES,

  // Conversion defaults
  conversion: {
    bitrate: '128k',
    sampleRate: 44100,
    channels: 'stereo',
    quality: 'balanced',
  },

  // Chapter handling
  chapters: {
    preserve: true,
    splitOutput: false,
    naming: '{number:02d} - {title}',
  },

  // Metadata options
  metadata: {
    preserve: true,
    embedCover: true,
    embedChapters: true,
  },

  // Batch processing
  batch: {
    concurrency: 4,
    continueOnError: true,
    skipExisting: true,
  },

  // Performance
  performance: {
    tempDir: '/tmp/aax',
    maxMemory: '2gb',
    useHardwareAccel: true,
  },

  // Logging
  logging: {
    level: 'info',
    file: './aax.log',
  },
} satisfies AAXConfig
```

## Configuration Options

### Core Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `format` | `string` | `'mp3'` | Default output format |
| `output` | `string` | `'.'` | Default output directory |
| `activationBytes` | `string` | - | Audible activation bytes |
| `ffmpegPath` | `string` | - | Custom FFmpeg path |

### Conversion Options

```typescript
export default {
  conversion: {
    // Audio quality
    bitrate: '128k', // CBR bitrate
    vbr: 4, // VBR quality (0-9)
    quality: 'balanced', // Preset: fast, balanced, high, best

    // Audio format
    sampleRate: 44100,
    channels: 'stereo', // 'mono' | 'stereo'
    codec: 'aac', // Audio codec

    // Processing
    normalize: true, // Normalize audio levels
    trim: true, // Trim silence
  },
}
```

### Format-Specific Options

```typescript
export default {
  formats: {
    mp3: {
      bitrate: '192k',
      vbr: 2,
      id3v2: true,
    },
    m4b: {
      quality: 'high',
      chapters: true,
      cover: true,
    },
    flac: {
      compression: 8,
      verify: true,
    },
  },
}
```

### Chapter Options

```typescript
export default {
  chapters: {
    // Preservation
    preserve: true,
    embedInOutput: true,

    // Splitting
    splitOutput: false,
    mergeDuration: 0, // Merge short chapters (seconds)

    // Naming
    naming: '{number:02d} - {title}',
    createCue: false, // Generate cue sheet
  },
}
```

### Metadata Options

```typescript
export default {
  metadata: {
    // Preservation
    preserve: true,
    fields: ['title', 'author', 'narrator', 'cover'],

    // Cover art
    embedCover: true,
    coverSize: 500, // Max dimension
    coverFormat: 'jpeg',

    // Additional
    embedChapterImages: false,
    writeNfo: false,
  },
}
```

### Batch Options

```typescript
export default {
  batch: {
    // Processing
    concurrency: 4,
    sequential: false,

    // Error handling
    continueOnError: true,
    retries: 3,
    retryDelay: 1000,

    // Optimization
    skipExisting: true,
    checksum: false,

    // Progress
    showProgress: true,
    logFile: './batch.log',
  },
}
```

## Environment Variables

AAX reads these environment variables:

| Variable | Description |
|----------|-------------|
| `AUDIBLE_ACTIVATION_BYTES` | Audible activation bytes |
| `AAX_CONFIG` | Path to config file |
| `AAX_OUTPUT_DIR` | Default output directory |
| `AAX_FORMAT` | Default output format |
| `AAX_FFMPEG_PATH` | Custom FFmpeg path |
| `AAX_LOG_LEVEL` | Logging level |
| `AAX_CONCURRENCY` | Batch concurrency |

## CLI Configuration

Override config with CLI flags:

```bash
# Output settings
aax convert file.aax --format mp3 --output ./converted/

# Quality settings
aax convert file.aax --bitrate 192k --quality high

# Chapter handling
aax convert file.aax --chapters --split-chapters

# Metadata
aax convert file.aax --no-metadata --no-cover
```

## Profile Presets

Define reusable presets:

```typescript
export default {
  presets: {
    // Audiobook preset
    audiobook: {
      format: 'm4b',
      chapters: true,
      metadata: true,
      quality: 'balanced',
    },

    // Podcast preset
    podcast: {
      format: 'mp3',
      bitrate: '96k',
      mono: true,
      chapters: false,
    },

    // Archive preset
    archive: {
      format: 'flac',
      quality: 'best',
      metadata: true,
      chapters: true,
    },
  },
}
```

Use presets:

```bash
aax convert file.aax --preset podcast
```

## Per-Directory Config

Create `.aax.config.ts` in specific directories:

```
audiobooks/
  .aax.config.ts    # Applies to this directory
  fiction/
    .aax.config.ts  # Overrides parent
    book1.aax
  nonfiction/
    book2.aax
```

## Configuration Precedence

1. CLI flags (highest)
2. Per-directory config
3. Project config (aax.config.ts)
4. User config (~/.aax/config.ts)
5. Environment variables
6. Default values (lowest)

## Programmatic Configuration

```typescript
import { convert, configure } from 'aax'

// Set global config
configure({
  format: 'm4b',
  quality: 'high',
})

// Override per-call
await convert('audiobook.aax', {
  format: 'mp3', // Overrides global
})
```

## Config Validation

Validate your configuration:

```bash
aax config validate
```

```typescript
import { validateConfig } from 'aax'

const issues = await validateConfig('./aax.config.ts')

if (issues.length > 0) {
  for (const issue of issues) {
    console.warn(`${issue.path}: ${issue.message}`)
  }
}
```

## Debug Configuration

View effective configuration:

```bash
# Show merged config
aax config show

# Show config for specific file
aax config show --for audiobook.aax

# Debug mode
AAX_DEBUG=1 aax convert audiobook.aax
```

## Migration

Migrate from older config formats:

```bash
aax config migrate --from v1
```

## Related

- [Activation Bytes](/advanced/activation-bytes) - Setup activation
- [Performance](/advanced/performance) - Optimization
- [CI/CD Integration](/advanced/ci-cd) - Automated workflows
