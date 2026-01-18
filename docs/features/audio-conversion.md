# Audio Conversion

AAX provides powerful audio conversion capabilities for transforming Audible AAX audiobooks into standard audio formats. This guide covers the core conversion features.

## Supported Formats

AAX can convert your audiobooks to the following formats:

| Format | Extension | Description |
|--------|-----------|-------------|
| MP3 | `.mp3` | Universal compatibility, adjustable bitrate |
| M4A | `.m4a` | AAC audio, good quality/size ratio |
| M4B | `.m4b` | Audiobook format with chapter support |
| FLAC | `.flac` | Lossless audio, larger file size |

## Basic Conversion

### CLI Usage

Convert a single audiobook:

```bash
# Convert to MP3 (default)
aax convert audiobook.aax

# Convert to specific format
aax convert audiobook.aax --format m4b

# Specify output directory
aax convert audiobook.aax --output ./converted/
```

### Programmatic API

```typescript
import { convert } from 'aax'

// Basic conversion
const result = await convert('audiobook.aax', {
  format: 'mp3',
  output: './converted/',
})

console.log('Converted:', result.outputPath)
```

## Format Options

### MP3 Settings

```bash
# Set bitrate
aax convert audiobook.aax --format mp3 --bitrate 128k

# Variable bitrate
aax convert audiobook.aax --format mp3 --vbr 4
```

```typescript
await convert('audiobook.aax', {
  format: 'mp3',
  bitrate: '192k',
  vbr: 2, // 0-9, lower is better quality
})
```

### M4A/M4B Settings

```bash
# AAC quality
aax convert audiobook.aax --format m4b --quality high
```

```typescript
await convert('audiobook.aax', {
  format: 'm4b',
  quality: 'high', // 'low' | 'medium' | 'high' | 'best'
  preserveChapters: true,
})
```

### FLAC Settings

```bash
# Lossless conversion
aax convert audiobook.aax --format flac --compression 8
```

```typescript
await convert('audiobook.aax', {
  format: 'flac',
  compression: 8, // 0-12, higher is smaller
})
```

## Conversion Options

### Quality Presets

| Preset | Description |
|--------|-------------|
| `fast` | Quick conversion, lower quality |
| `balanced` | Good quality/speed balance |
| `high` | High quality, slower conversion |
| `best` | Maximum quality, slowest |

```bash
aax convert audiobook.aax --preset balanced
```

### Sample Rate

```bash
# Resample audio
aax convert audiobook.aax --sample-rate 44100
```

### Mono/Stereo

```bash
# Convert to mono (smaller file)
aax convert audiobook.aax --mono

# Force stereo
aax convert audiobook.aax --stereo
```

## Chapter Handling

### Preserve Chapters

Keep chapter markers in M4B format:

```bash
aax convert audiobook.aax --format m4b --chapters
```

### Split by Chapters

Create separate files for each chapter:

```bash
aax convert audiobook.aax --split-chapters
```

```typescript
await convert('audiobook.aax', {
  splitChapters: true,
  chapterFormat: 'mp3',
  chapterNaming: '{title} - Chapter {number}',
})
```

## Metadata Preservation

By default, AAX preserves all metadata:

```bash
# Include cover art
aax convert audiobook.aax --cover

# Skip metadata
aax convert audiobook.aax --no-metadata
```

```typescript
await convert('audiobook.aax', {
  preserveMetadata: true,
  embedCover: true,
  embedChapterImages: true,
})
```

## Output Naming

### Custom Naming Patterns

```bash
aax convert audiobook.aax --pattern "{author} - {title}"
```

Available placeholders:
- `{title}` - Book title
- `{author}` - Author name
- `{narrator}` - Narrator name
- `{year}` - Publication year
- `{series}` - Series name
- `{number}` - Series number

```typescript
await convert('audiobook.aax', {
  outputPattern: '{author}/{series}/{title}',
})
```

## Progress Tracking

### CLI Progress

```bash
aax convert audiobook.aax --progress
```

### Programmatic Progress

```typescript
await convert('audiobook.aax', {
  onProgress: (progress) => {
    console.log(`${progress.percent}% - ${progress.timeRemaining}s remaining`)
  },
})
```

## Error Handling

```typescript
import { convert, ConversionError } from 'aax'

try {
  await convert('audiobook.aax')
} catch (error) {
  if (error instanceof ConversionError) {
    console.error('Conversion failed:', error.message)
    console.error('Stage:', error.stage)
  }
}
```

## Best Practices

1. **Choose the right format**: M4B for audiobooks, MP3 for maximum compatibility
2. **Preserve chapters**: Use M4B format to keep chapter navigation
3. **Quality vs size**: Use 128k for speech, 192k+ for music
4. **Backup originals**: Keep AAX files until conversion is verified

## Related

- [Batch Processing](/features/batch-processing) - Convert multiple files
- [Chapter Extraction](/features/chapter-extraction) - Work with chapters
- [Metadata Handling](/features/metadata) - Manage audiobook metadata
