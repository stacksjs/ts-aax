# Output Formats

AAX supports converting audiobooks to three popular audio formats, each with its own advantages.

## Supported Formats

### MP3

The most widely compatible audio format.

```bash
aax convert audiobook.aax --format mp3
```

**Pros:**
- Universal compatibility with all devices
- Smaller file sizes at lower bitrates
- Widely supported by all audio players

**Cons:**
- Does not natively support chapters (chapter marks stored separately)
- Lossy compression at all quality levels

**Recommended for:**
- Devices with limited storage
- Sharing with others
- Maximum compatibility

### M4A (AAC)

High-quality audio in an MP4 container.

```bash
aax convert audiobook.aax --format m4a
```

**Pros:**
- Better audio quality than MP3 at the same bitrate
- Supports chapter markers
- Good device compatibility (Apple devices, modern players)

**Cons:**
- Not as universally compatible as MP3
- Slightly larger file sizes

**Recommended for:**
- Apple devices (iPhone, iPad, Mac)
- When quality matters more than compatibility

### M4B

The audiobook-specific format based on M4A.

```bash
aax convert audiobook.aax --format m4b
```

**Pros:**
- Native chapter support with navigation
- Remembers playback position
- Recognized as audiobook by most players
- Same quality as M4A

**Cons:**
- Limited to audiobook-aware players
- Some devices may not recognize the format

**Recommended for:**
- Dedicated audiobook players
- Apple Books
- When chapter navigation is important

## Bitrate Options

Control the audio quality and file size with the bitrate option:

```bash
# High quality (larger files)
aax convert audiobook.aax --bitrate 256

# Standard quality (balanced)
aax convert audiobook.aax --bitrate 128

# Low quality (smaller files)
aax convert audiobook.aax --bitrate 64

# Match source bitrate (default)
aax convert audiobook.aax --bitrate source
```

### Bitrate Comparison

| Bitrate | Quality | File Size (10hr book) | Recommended Use |
|---------|---------|----------------------|-----------------|
| 64 kbps | Acceptable | ~280 MB | Limited storage |
| 96 kbps | Good | ~420 MB | General listening |
| 128 kbps | Very Good | ~560 MB | Quality listening |
| 192 kbps | Excellent | ~840 MB | High-end systems |
| 256 kbps | Studio | ~1.1 GB | Archival quality |

## Variable Bit Rate (VBR)

Enable variable bit rate encoding for better quality-to-size ratio:

```bash
aax convert audiobook.aax --variable-bit-rate
```

VBR adjusts the bitrate based on audio complexity, using higher bitrates for complex passages and lower bitrates for silence or simple speech.

## Chapter Handling

### Preserve Chapters

By default, AAX preserves chapter information:

```bash
aax convert audiobook.aax --chapters
```

### Named Chapters

Use the original chapter names from the audiobook:

```bash
aax convert audiobook.aax --use-named-chapters
```

### Skip Short Chapters

Skip very short chapters that may be intros or outros:

```bash
# Skip chapters shorter than 25 seconds
aax convert audiobook.aax --skip-short-chapters-duration 25

# Skip very short chapters (< 10 seconds) at beginning/end
aax convert audiobook.aax --skip-very-short-chapter-duration 10
```

## Format Comparison

| Feature | MP3 | M4A | M4B |
|---------|-----|-----|-----|
| Chapter Support | Partial | Yes | Yes |
| Position Memory | No | No | Yes |
| Audio Quality | Good | Better | Better |
| Compatibility | Universal | High | Moderate |
| File Extension | `.mp3` | `.m4a` | `.m4b` |

## AAC Encoding Options

For M4A and M4B formats, you can fine-tune the AAC encoding:

```bash
# Fix AAC encoding for 44.1 kHz sample rate
aax convert audiobook.aax --format m4b --aac-encoding-44-1
```

This option helps with compatibility on some older devices that have issues with certain AAC encoding parameters.

## Splitting by Chapters

Create separate files for each chapter:

```bash
# Split into chapter files
aax split audiobook.aax

# Split with custom format
aax split audiobook.aax --format m4a

# Split with custom output directory
aax split audiobook.aax --output ./chapters
```

Each chapter becomes a separate file with the chapter name included in the filename.

## Best Practices

1. **For Apple devices**: Use M4B for the best audiobook experience
2. **For maximum compatibility**: Use MP3 at 128 kbps
3. **For archiving**: Use M4B at source bitrate
4. **For limited storage**: Use MP3 at 64 kbps with VBR

## Next Steps

- Learn all available options in the [CLI Reference](/guide/cli)
- Set up default formats in your [Configuration](/config)
