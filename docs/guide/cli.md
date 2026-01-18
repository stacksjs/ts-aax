# CLI Reference

Complete reference for all AAX command-line options and commands.

## Commands

### convert

Convert an AAX file to another format.

```bash
aax convert <input-file> [options]
```

**Arguments:**
- `<input-file>` - Path to the AAX file to convert

**Options:**

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--output` | `-o` | Output directory | `./converted` |
| `--format` | `-f` | Output format (mp3, m4a, m4b) | `mp3` |
| `--code` | `-c` | Audible activation code | Auto-detected |
| `--chapters` | | Preserve chapter information | `true` |
| `--bitrate` | `-b` | Audio bitrate in kbps | Source bitrate |
| `--verbose` | `-v` | Enable verbose logging | `false` |
| `--flat-folder-structure` | | Use flat folder structure | `false` |
| `--series-title-in-folder-structure` | | Include series title in folder structure | `false` |
| `--variable-bit-rate` | | Apply variable bit rate | `false` |
| `--aac-encoding-44-1` | | Fix AAC encoding for 44.1 kHz | `false` |
| `--use-named-chapters` | | Use named chapters if available | `false` |
| `--skip-short-chapters-duration` | | Skip short chapters (seconds) | `0` |
| `--skip-very-short-chapter-duration` | | Skip very short chapters (seconds) | `0` |

**Examples:**

```bash
# Basic conversion to MP3
aax convert audiobook.aax

# Convert to M4B with custom output
aax convert audiobook.aax --format m4b --output ~/Audiobooks

# High quality conversion with verbose output
aax convert audiobook.aax --format m4b --bitrate 256 --verbose

# Convert with VBR and named chapters
aax convert audiobook.aax --variable-bit-rate --use-named-chapters
```

### split

Split an audiobook into separate chapter files.

```bash
aax split <input-file> [options]
```

**Arguments:**
- `<input-file>` - Path to the AAX file to split

**Options:**

All options from `convert` apply, plus the output will be organized by chapter.

**Examples:**

```bash
# Split into MP3 chapter files
aax split audiobook.aax

# Split into M4B chapters with custom naming
aax split audiobook.aax --format m4b --use-named-chapters
```

### setup-audible

Set up Audible CLI and retrieve activation bytes.

```bash
aax setup-audible
```

This command will:
1. Check if the Audible CLI binary exists
2. Make it executable
3. Run the quickstart wizard for authentication
4. Retrieve and save your activation bytes

**Example:**

```bash
aax setup-audible
# Follow the interactive prompts to log in to your Audible account
```

### help

Display help information.

```bash
aax help
aax --help
aax convert --help
```

### version

Display version information.

```bash
aax --version
```

## Global Options

These options work with all commands:

| Option | Description |
|--------|-------------|
| `--help` | Show help for command |
| `--version` | Show version number |
| `--verbose` | Enable verbose output |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `AAX_ACTIVATION_CODE` | Your Audible activation code |
| `AAX_OUTPUT_DIR` | Default output directory |
| `AAX_FORMAT` | Default output format |
| `FFMPEG_PATH` | Custom path to FFmpeg binary |

## Exit Codes

| Code | Description |
|------|-------------|
| `0` | Success |
| `1` | General error |
| `2` | Invalid arguments |
| `3` | File not found |
| `4` | Conversion failed |
| `5` | Missing activation code |

## Batch Processing

Convert multiple files using shell scripting:

```bash
# Convert all AAX files in a directory
for file in *.aax; do
  aax convert "$file" --format m4b
done

# Using find for recursive conversion
find . -name "*.aax" -exec aax convert {} --format m4b \;
```

## Activation Code

### Automatic Detection

AAX automatically detects your activation code if you've set up the Audible CLI:

```bash
# Set up once
aax setup-audible

# Then convert without specifying code
aax convert audiobook.aax
```

### Manual Specification

If automatic detection fails, provide the code manually:

```bash
aax convert audiobook.aax --code YOUR_ACTIVATION_CODE
```

### Finding Your Activation Code

1. Run `aax setup-audible` to set up automatically
2. Or manually run `./audible activation-bytes` after authenticating
3. The code is an 8-character hexadecimal string (e.g., `2c1eeb0a`)

## Folder Structure Options

### Flat Structure

All files in a single directory:

```bash
aax convert audiobook.aax --flat-folder-structure
# Output: ./converted/audiobook.mp3
```

### Organized Structure (Default)

Files organized by author and title:

```bash
aax convert audiobook.aax
# Output: ./converted/Author Name/Book Title/audiobook.mp3
```

### With Series Title

Include series information in the path:

```bash
aax convert audiobook.aax --series-title-in-folder-structure
# Output: ./converted/Author Name/Series Name/Book 1 - Title/audiobook.mp3
```

## Troubleshooting

### FFmpeg Not Found

```
Error: ffmpeg not found in PATH
```

Solution: Install FFmpeg and ensure it's in your PATH.

### Invalid Activation Code

```
Error: Invalid activation code
```

Solution: Run `aax setup-audible` to refresh your activation bytes.

### Conversion Fails

```
Error: Conversion failed
```

Try:
1. Check that the AAX file is not corrupted
2. Ensure you have sufficient disk space
3. Run with `--verbose` for more details

## Next Steps

- Learn about [Output Formats](/guide/formats)
- Configure defaults in [Configuration](/config)
