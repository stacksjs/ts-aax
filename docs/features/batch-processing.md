# Batch Processing

AAX supports batch conversion for processing multiple audiobooks at once. This guide covers batch operations and optimization techniques.

## Basic Batch Conversion

### CLI Usage

Convert all AAX files in a directory:

```bash
# Convert all files in current directory
aax convert .

# Convert specific directory
aax convert ./audiobooks/

# Recursive conversion
aax convert ./audiobooks/ --recursive
```

### Glob Patterns

```bash
# Specific pattern
aax convert "./audiobooks/*.aax"

# Multiple patterns
aax convert "./audiobooks/**/*.aax" "./downloads/*.aax"
```

## Programmatic API

```typescript
import { batchConvert, convert } from 'aax'

// Using batchConvert helper
const results = await batchConvert('./audiobooks/', {
  format: 'mp3',
  output: './converted/',
})

console.log(`Converted ${results.successful.length} files`)
console.log(`Failed: ${results.failed.length} files`)

// Manual batch with custom logic
import { glob } from 'bun'

const files = await Array.fromAsync(glob('**/*.aax'))
for (const file of files) {
  await convert(file, { format: 'm4b' })
}
```

## Concurrency Control

### Parallel Processing

```bash
# Process 4 files at a time
aax convert ./audiobooks/ --concurrency 4
```

```typescript
await batchConvert('./audiobooks/', {
  concurrency: 4,
  format: 'mp3',
})
```

### Sequential Processing

For systems with limited resources:

```bash
aax convert ./audiobooks/ --concurrency 1
```

## Progress and Reporting

### Overall Progress

```bash
aax convert ./audiobooks/ --progress
```

Output:
```
Converting: [===========         ] 55% (11/20)
Current: The_Great_Gatsby.aax (3:45 remaining)
Completed: 10 | Failed: 1 | Remaining: 9
```

### Programmatic Progress

```typescript
await batchConvert('./audiobooks/', {
  onFileStart: (file) => {
    console.log(`Starting: ${file}`)
  },
  onFileComplete: (file, result) => {
    console.log(`Completed: ${file} -> ${result.outputPath}`)
  },
  onFileError: (file, error) => {
    console.error(`Failed: ${file}: ${error.message}`)
  },
  onProgress: (progress) => {
    console.log(`Overall: ${progress.completed}/${progress.total}`)
  },
})
```

## Error Handling

### Continue on Error

```bash
# Don't stop on errors
aax convert ./audiobooks/ --continue-on-error
```

```typescript
const results = await batchConvert('./audiobooks/', {
  continueOnError: true,
})

// Handle errors after
for (const failure of results.failed) {
  console.error(`${failure.file}: ${failure.error.message}`)
}
```

### Retry Failed

```bash
# Retry failed conversions
aax convert ./audiobooks/ --retry 3
```

```typescript
await batchConvert('./audiobooks/', {
  retries: 3,
  retryDelay: 1000, // ms between retries
})
```

## Output Organization

### Preserve Structure

```bash
# Keep directory structure
aax convert ./audiobooks/ --output ./converted/ --preserve-structure
```

### Flatten Output

```bash
# All files in one directory
aax convert ./audiobooks/ --output ./converted/ --flatten
```

### Custom Organization

```typescript
await batchConvert('./audiobooks/', {
  outputPattern: './converted/{author}/{series}/{title}.{ext}',
})
```

## Filtering

### By Size

```bash
# Only files larger than 100MB
aax convert ./audiobooks/ --min-size 100mb
```

### By Date

```bash
# Only files modified in last 7 days
aax convert ./audiobooks/ --newer-than 7d
```

### Exclude Patterns

```bash
aax convert ./audiobooks/ --exclude "*-sample.aax"
```

```typescript
await batchConvert('./audiobooks/', {
  exclude: ['*-sample.aax', 'temp/*'],
})
```

## Resume Support

### Checkpoint Files

```bash
# Enable checkpointing
aax convert ./audiobooks/ --checkpoint
```

If interrupted, resume with:

```bash
aax convert --resume
```

### Skip Existing

```bash
# Don't reconvert existing files
aax convert ./audiobooks/ --skip-existing
```

```typescript
await batchConvert('./audiobooks/', {
  skipExisting: true,
})
```

## Performance Optimization

### Memory Management

```bash
# Limit memory usage
aax convert ./audiobooks/ --max-memory 2gb
```

### Disk Caching

```bash
# Use temporary directory
aax convert ./audiobooks/ --temp-dir /ssd/temp/
```

### Priority Settings

```bash
# Lower CPU priority
aax convert ./audiobooks/ --nice 10
```

## Logging and Reports

### Log to File

```bash
aax convert ./audiobooks/ --log ./conversion.log
```

### JSON Report

```bash
aax convert ./audiobooks/ --report ./report.json
```

```typescript
const results = await batchConvert('./audiobooks/')

await Bun.write('report.json', JSON.stringify(results, null, 2))
```

## Queue Management

### Add to Queue

```bash
# Queue files for later
aax queue add ./audiobooks/*.aax

# Process queue
aax queue process
```

### View Queue

```bash
aax queue list
aax queue clear
```

## Examples

### Weekend Batch Job

```bash
#!/bin/bash
aax convert ./audiobooks/ \
  --format m4b \
  --quality high \
  --concurrency 2 \
  --continue-on-error \
  --log ./conversion.log \
  --report ./report.json
```

### CI/CD Conversion

```yaml
- name: Convert audiobooks
  run: |
    aax convert ./uploads/ \
      --format mp3 \
      --output ./public/audiobooks/ \
      --skip-existing
```

## Best Practices

1. **Use checkpoints**: Enable for large batch jobs
2. **Set concurrency wisely**: Match to CPU cores minus 1
3. **Skip existing**: Avoid redundant conversions
4. **Log everything**: Track issues for debugging
5. **Test first**: Run with `--dry-run` to preview

## Related

- [Audio Conversion](/features/audio-conversion) - Conversion options
- [Performance](/advanced/performance) - Optimization techniques
- [CI/CD Integration](/advanced/ci-cd) - Automated workflows
