# Chapter Extraction

AAX supports comprehensive chapter handling, allowing you to extract, split, and manage chapter information from your audiobooks.

## Chapter Information

### View Chapters

List all chapters in an audiobook:

```bash
aax chapters audiobook.aax
```

Output:
```
Chapter 1: Opening Credits      00:00:00 - 00:02:15
Chapter 2: Introduction         00:02:15 - 00:15:30
Chapter 3: The Beginning        00:15:30 - 00:45:22
...
```

### Detailed Info

```bash
aax chapters audiobook.aax --detailed
```

```typescript
import { getChapters } from 'aax'

const chapters = await getChapters('audiobook.aax')

for (const chapter of chapters) {
  console.log({
    title: chapter.title,
    start: chapter.startTime,
    end: chapter.endTime,
    duration: chapter.duration,
  })
}
```

## Split by Chapters

### Basic Split

Create separate files for each chapter:

```bash
aax split audiobook.aax
```

### With Format

```bash
aax split audiobook.aax --format mp3 --output ./chapters/
```

### Custom Naming

```bash
aax split audiobook.aax --pattern "{number:02d} - {title}"
```

Output: `01 - Introduction.mp3`, `02 - Chapter One.mp3`, etc.

### Programmatic API

```typescript
import { splitByChapters } from 'aax'

const files = await splitByChapters('audiobook.aax', {
  format: 'mp3',
  output: './chapters/',
  naming: '{number:02d} - {title}',
})

console.log(`Created ${files.length} chapter files`)
```

## Merge Chapters

Combine multiple chapters into larger segments:

```bash
# Merge every 3 chapters
aax split audiobook.aax --merge 3

# Merge by duration (30 minutes each)
aax split audiobook.aax --merge-duration 30m
```

```typescript
await splitByChapters('audiobook.aax', {
  mergeCount: 3,
  // or
  mergeDuration: 30 * 60, // 30 minutes in seconds
})
```

## Select Specific Chapters

### By Range

```bash
# Chapters 5-10
aax split audiobook.aax --chapters 5-10

# Multiple ranges
aax split audiobook.aax --chapters 1-3,10-15
```

### By Title

```bash
# Match chapter titles
aax split audiobook.aax --match "Chapter*"
```

```typescript
await splitByChapters('audiobook.aax', {
  chapters: [5, 6, 7, 8, 9, 10],
  // or
  chapterFilter: (chapter) => chapter.title.includes('Part 1'),
})
```

## Chapter Metadata

### Extract Chapter List

```bash
# JSON output
aax chapters audiobook.aax --json > chapters.json

# CSV output
aax chapters audiobook.aax --csv > chapters.csv
```

### Custom Fields

```typescript
const chapters = await getChapters('audiobook.aax', {
  includeImages: true,
  includeTitles: true,
})

for (const chapter of chapters) {
  if (chapter.image) {
    await Bun.write(`chapter-${chapter.number}.jpg`, chapter.image)
  }
}
```

## Chapter Images

Some audiobooks include chapter-specific images:

```bash
# Extract chapter images
aax chapters audiobook.aax --extract-images ./images/
```

```typescript
await getChapters('audiobook.aax', {
  extractImages: './images/',
  imageFormat: 'png',
})
```

## Create Chapter File

Generate a chapter file for use with other tools:

```bash
# FFMPEG chapter format
aax chapters audiobook.aax --format ffmpeg > chapters.txt

# Audacity labels
aax chapters audiobook.aax --format audacity > labels.txt

# Cue sheet
aax chapters audiobook.aax --format cue > audiobook.cue
```

## Modify Chapters

### Rename Chapters

```bash
aax chapters rename audiobook.aax --pattern "Part {number}: {title}"
```

### Adjust Timing

```bash
# Shift all chapters by 30 seconds
aax chapters shift audiobook.aax --offset 30
```

### From External File

```bash
# Apply chapters from JSON
aax chapters apply audiobook.aax --from chapters.json
```

```typescript
import { applyChapters } from 'aax'

const customChapters = [
  { title: 'Intro', start: 0, end: 120 },
  { title: 'Chapter 1', start: 120, end: 3600 },
  // ...
]

await applyChapters('audiobook.aax', customChapters, {
  output: 'audiobook-with-chapters.m4b',
})
```

## Preserve During Conversion

### With Chapters

```bash
# Keep chapters in M4B
aax convert audiobook.aax --format m4b --chapters
```

### Embed as Cue

```bash
# Embed cue sheet in MP3
aax convert audiobook.aax --format mp3 --embed-cue
```

## Chapter Validation

Check chapter consistency:

```bash
aax chapters validate audiobook.aax
```

```typescript
import { validateChapters } from 'aax'

const issues = await validateChapters('audiobook.aax')

for (const issue of issues) {
  console.warn(`Chapter ${issue.chapter}: ${issue.message}`)
}
```

## Examples

### Extract Favorite Chapters

```typescript
const chapters = await getChapters('audiobook.aax')
const favorites = chapters.filter((c) =>
  ['Introduction', 'Conclusion'].some((t) => c.title.includes(t))
)

await splitByChapters('audiobook.aax', {
  chapters: favorites.map((c) => c.number),
  format: 'mp3',
})
```

### Create Podcast Episodes

```bash
#!/bin/bash
aax split audiobook.aax \
  --format mp3 \
  --bitrate 96k \
  --mono \
  --output ./podcast/ \
  --pattern "Episode {number:02d} - {title}"
```

### Merge Short Chapters

```typescript
const chapters = await getChapters('audiobook.aax')

// Merge chapters shorter than 5 minutes with next
const mergeGroups: number[][] = []
let currentGroup: number[] = []

for (const chapter of chapters) {
  currentGroup.push(chapter.number)
  if (chapter.duration >= 300) { // 5 minutes
    mergeGroups.push([...currentGroup])
    currentGroup = []
  }
}

// Use merge groups for conversion
```

## Best Practices

1. **Use M4B format**: Best chapter support for audiobooks
2. **Validate first**: Check chapter data before splitting
3. **Meaningful names**: Use descriptive chapter naming patterns
4. **Preserve metadata**: Include chapter info in conversions
5. **Backup chapters**: Export chapter list before modifications

## Related

- [Audio Conversion](/features/audio-conversion) - Conversion options
- [Metadata Handling](/features/metadata) - Audiobook metadata
- [Batch Processing](/features/batch-processing) - Process multiple files
