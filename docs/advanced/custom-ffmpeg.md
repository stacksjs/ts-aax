# Custom FFmpeg

AAX Audio Converter uses FFmpeg for audio conversion. You can customize the FFmpeg installation and configuration to suit your needs.

## Requirements

- FFmpeg version 4.0 or higher
- Required codecs: AAC, MP3
- Required features: Chapter metadata support, Cover art extraction

## Default FFmpeg

By default, the converter uses the FFmpeg binary found in your system's PATH. This is the recommended setup for most users.

## Custom FFmpeg Path

If you have a custom FFmpeg installation, you can specify its path in your configuration:

```typescript
// aax.config.ts
export default {
  ffmpegPath: '/path/to/your/ffmpeg',
}
```

## FFmpeg Requirements

The converter requires FFmpeg with the following features:

- AAC encoder support
- MP3 encoder support
- Chapter metadata support
- Cover art extraction

## Verifying FFmpeg Installation

You can check if your FFmpeg installation meets the requirements:

```bash
# Check FFmpeg version and features
ffmpeg -version

# Check for required codecs
ffmpeg -codecs | grep -E 'aac|mp3'
```

## Installing FFmpeg

### macOS

```bash
# Using Homebrew
brew install ffmpeg

# Using MacPorts
sudo port install ffmpeg
```

### Ubuntu/Debian

```bash
sudo apt update
sudo apt install ffmpeg
```

### Windows

1. Download the FFmpeg build from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/)
2. Extract the files
3. Add the `bin` directory to your PATH

## Custom FFmpeg Builds

If you need specific features, you can build FFmpeg from source:

```bash
# Clone FFmpeg
git clone https://git.ffmpeg.org/ffmpeg.git ffmpeg
cd ffmpeg

# Configure with required features
./configure --enable-libmp3lame --enable-libfdk-aac

# Build and install
make
sudo make install
```

## Troubleshooting

If you encounter issues with FFmpeg:

1. Check the FFmpeg version and features
2. Verify the FFmpeg path in your configuration
3. Ensure all required codecs are installed
4. Check the verbose output for FFmpeg errors:

  ```bash
  aax convert audiobook.aax -v
  ```

::: tip
For most users, the default FFmpeg installation from your package manager will work perfectly.
:::

::: warning
Custom FFmpeg builds may require additional dependencies and configuration. Make sure to test your build before using it with the converter.
:::

## Custom FFmpeg Options

The AAX converter allows you to customize FFmpeg settings for advanced users:

- **Custom FFmpeg Path**: Specify a custom path to the FFmpeg binary if it's not in your system PATH.
- **Intermediate File Copy**: Enable intermediate file copy for single file mode to improve conversion reliability.
- **AAC Encoding for 44.1 kHz**: Fix AAC encoding for 44.1 kHz to ensure compatibility with certain players.
- **Variable Bit Rate**: Apply variable bit rate for more efficient encoding.
- **ISO Latin1 Encoding**: Use ISO Latin1 encoding for m3u playlists if needed.
