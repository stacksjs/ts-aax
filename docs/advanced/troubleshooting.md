# Troubleshooting

This guide helps you resolve common issues with AAX Audio Converter.

## Common Issues

### Activation Code Issues

**Problem**: "Unable to detect activation code" or "Invalid activation code"

**Solutions**:

1. Run the setup command:

   ```bash
   aax setup-audible
   ```

2. Verify the Audible CLI is installed and configured
3. Check if you're logged in to your Audible account
4. Try manually specifying the activation code:

   ```bash
   aax convert audiobook.aax -c YOUR_ACTIVATION_CODE
   ```

### FFmpeg Issues

**Problem**: "FFmpeg not found" or "FFmpeg error"

**Solutions**:

1. Verify FFmpeg is installed:

   ```bash
   ffmpeg -version
   ```

2. Check if FFmpeg is in your PATH
3. Specify a custom FFmpeg path in your config:

   ```typescript
   // aax.config.ts
   export default {
     ffmpegPath: '/path/to/your/ffmpeg',
   }
   ```

### Chapter Issues

**Problem**: "Chapters not preserved" or "Chapter markers missing"

**Solutions**:

1. Ensure chapter support is enabled:

   ```bash
   aax convert audiobook.aax --chapters=true
   ```

2. Check if your output format supports chapters (M4B is best)
3. Verify your media player supports chapter navigation

### File Permission Issues

**Problem**: "Permission denied" or "Cannot write to output directory"

**Solutions**:

1. Check file permissions:

   ```bash
   ls -l audiobook.aax
   ```

2. Ensure write permissions for the output directory:

   ```bash
   chmod +w output-directory
   ```

3. Try running with sudo (not recommended):

   ```bash
   sudo aax convert audiobook.aax
   ```

### Custom Folder Structure Issues

- **Problem**: Incorrect folder structure.
  - **Solution**: Verify the configuration settings for `flatFolderStructure` and `seriesTitleInFolderStructure`.

### Advanced Conversion Settings

- **Problem**: Conversion fails with variable bit rate.
  - **Solution**: Ensure FFmpeg supports variable bit rate encoding.

### Chapter Handling Problems

- **Problem**: Chapters not preserved.
  - **Solution**: Check if `useNamedChapters` is enabled and verify chapter marks.

### Auto Detection Failures

- **Problem**: Activation code not detected.
  - **Solution**: Ensure the Audible CLI is set up correctly and the account is logged in.

## Verbose Logging

Enable verbose logging to get more detailed error information:

```bash
aax convert audiobook.aax -v
```

## Common Error Messages

| Error Message | Possible Cause | Solution |
|--------------|----------------|----------|
| "FFmpeg not found" | FFmpeg not installed or not in PATH | Install FFmpeg or specify custom path |
| "Invalid activation code" | Wrong or expired activation code | Run setup-audible or use correct code |
| "Cannot read input file" | File doesn't exist or no read permissions | Check file path and permissions |
| "Output directory not writable" | No write permissions | Check directory permissions |
| "Chapter extraction failed" | FFmpeg missing required features | Update FFmpeg or disable chapters |

## Getting Help

If you're still experiencing issues:

1. Check the [GitHub Issues](https://github.com/stacksjs/aax/issues)
2. Join the [Discord Community](https://discord.gg/stacksjs)
3. Create a new issue with:
  - Error message
  - Verbose output
  - Steps to reproduce
  - Your system information

::: tip
When reporting issues, always include the verbose output (`-v` flag) as it provides crucial debugging information.
:::

::: warning
Avoid running the converter with sudo unless absolutely necessary, as it can pose security risks.
:::
