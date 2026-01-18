# Performance Optimization

AAX is designed for fast conversion, but there are many ways to optimize performance for large libraries and batch processing.

## Benchmarks

Typical performance on modern hardware:

| Operation | Duration | Notes |
|-----------|----------|-------|
| Single file (5h) | ~3 min | MP3 @ 128k |
| Batch (20 files) | ~15 min | 4 concurrent |
| FLAC conversion | ~5 min | Lossless |
| Chapter split | ~4 min | MP3 output |

## Hardware Acceleration

### Enable GPU Encoding

```bash
aax convert audiobook.aax --hardware-accel
```

```typescript
export default {
  performance: {
    useHardwareAccel: true,
    hwEncoder: 'auto', // 'nvenc' | 'qsv' | 'videotoolbox' | 'auto'
  },
}
```

### NVIDIA NVENC

```bash
# Check NVENC support
aax system check --nvidia

# Enable NVENC
aax convert audiobook.aax --encoder nvenc
```

### Intel Quick Sync

```bash
aax convert audiobook.aax --encoder qsv
```

### Apple VideoToolbox (macOS)

```bash
aax convert audiobook.aax --encoder videotoolbox
```

## Concurrency Optimization

### Optimal Thread Count

```bash
# Auto-detect optimal concurrency
aax convert ./audiobooks/ --auto-concurrency

# Manual setting
aax convert ./audiobooks/ --concurrency 4
```

```typescript
import { cpus } from 'os'

export default {
  batch: {
    concurrency: Math.max(1, cpus().length - 1),
  },
}
```

### Memory-Limited Concurrency

```bash
# Limit based on available memory
aax convert ./audiobooks/ --max-memory 4gb
```

## Disk I/O Optimization

### Use SSD for Temp Files

```bash
# Set temp directory to SSD
aax convert audiobook.aax --temp-dir /ssd/tmp/

# Or via config
export AAX_TEMP_DIR=/ssd/tmp/
```

### RAM Disk for Temp Files

```bash
# Create RAM disk (macOS)
diskutil erasevolume HFS+ "RAMDisk" $(hdiutil attach -nomount ram://4194304)

# Use for conversion
aax convert audiobook.aax --temp-dir /Volumes/RAMDisk/
```

### Reduce Disk Writes

```typescript
export default {
  performance: {
    streamOutput: true, // Stream directly to output
    bufferSize: 64 * 1024 * 1024, // 64MB buffer
  },
}
```

## FFmpeg Optimization

### Custom FFmpeg Build

```bash
# Use optimized FFmpeg
aax convert audiobook.aax --ffmpeg /path/to/optimized/ffmpeg
```

### Thread Control

```typescript
export default {
  ffmpeg: {
    threads: 4,
    threadQueue: 512,
    preset: 'ultrafast', // For MP3
  },
}
```

## Format-Specific Optimizations

### MP3

```typescript
export default {
  formats: {
    mp3: {
      preset: 'fast', // ultrafast, fast, medium, slow
      compression: 2, // 0-9
    },
  },
}
```

### AAC/M4B

```typescript
export default {
  formats: {
    m4b: {
      aacProfile: 'aac_he', // aac_low, aac_he, aac_he_v2
      movflags: 'faststart', // Optimize for streaming
    },
  },
}
```

### FLAC

```typescript
export default {
  formats: {
    flac: {
      compression: 0, // 0 (fastest) to 12 (best compression)
      verify: false, // Skip verification for speed
    },
  },
}
```

## Batch Processing Optimization

### Skip Unchanged Files

```bash
aax convert ./audiobooks/ --skip-existing --checksum
```

### Incremental Processing

```bash
# Only process new files
aax convert ./audiobooks/ --newer-than "2024-01-01"
```

### Parallel I/O

```typescript
export default {
  batch: {
    parallelIO: true,
    ioThreads: 2,
  },
}
```

## Memory Management

### Limit Memory Usage

```bash
aax convert audiobook.aax --max-memory 2gb
```

### Streaming Mode

For very large files:

```bash
aax convert large-audiobook.aax --streaming
```

```typescript
await convert('large-audiobook.aax', {
  streaming: true,
  chunkSize: 128 * 1024 * 1024, // 128MB chunks
})
```

## Profiling

### Enable Profiling

```bash
aax convert audiobook.aax --profile
```

Output:
```
Profile Results:
  Decryption:    45s (30%)
  Transcoding:   90s (60%)
  Metadata:      10s (7%)
  Writing:       5s (3%)
  Total:         150s
```

### Detailed Metrics

```bash
aax convert audiobook.aax --profile --verbose
```

### Programmatic Profiling

```typescript
import { convert, enableProfiling } from 'aax'

enableProfiling()

const result = await convert('audiobook.aax')

console.log(result.profile)
// {
//   decryption: 45000,
//   transcoding: 90000,
//   metadata: 10000,
//   writing: 5000,
//   total: 150000,
// }
```

## Caching

### Enable Caching

```bash
aax convert audiobook.aax --cache
```

### Cache Configuration

```typescript
export default {
  cache: {
    enabled: true,
    directory: '~/.aax/cache',
    maxSize: '10gb',
    ttl: 86400000, // 24 hours
  },
}
```

### Cache Activation Bytes

```bash
aax auth cache --enable
```

## CI/CD Optimization

### Docker Optimization

```dockerfile
FROM oven/bun:latest

# Pre-install FFmpeg
RUN apt-get update && apt-get install -y ffmpeg

# Install AAX
RUN bun install -g aax

# Use tmpfs for temp files
VOLUME /tmp
```

### GitHub Actions

```yaml
- name: Setup cache
  uses: actions/cache@v4
  with:
    path: ~/.aax/cache
    key: aax-cache-${{ runner.os }}

- name: Convert audiobooks
  run: aax convert ./audiobooks/ --skip-existing
```

## Performance Presets

### Fast Preset

```bash
aax convert audiobook.aax --preset fast
```

### Quality Preset

```bash
aax convert audiobook.aax --preset quality
```

### Balanced Preset

```bash
aax convert audiobook.aax --preset balanced
```

## Monitoring

### Real-Time Stats

```bash
aax convert ./audiobooks/ --stats
```

### Export Metrics

```bash
aax convert ./audiobooks/ --metrics ./metrics.json
```

## Best Practices

1. **Use SSD**: Store temp files on fast storage
2. **Hardware accel**: Enable GPU encoding when available
3. **Right concurrency**: Match to CPU cores minus 1
4. **Skip existing**: Avoid redundant conversions
5. **Stream large files**: Use streaming for 10h+ audiobooks
6. **Profile first**: Identify bottlenecks before optimizing

## Related

- [Configuration](/advanced/configuration) - Full config options
- [Batch Processing](/features/batch-processing) - Multi-file processing
- [CI/CD Integration](/advanced/ci-cd) - Automated workflows
