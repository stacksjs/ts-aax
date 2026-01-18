# Metadata Handling

AAX provides comprehensive tools for reading, modifying, and preserving audiobook metadata during conversion.

## View Metadata

### CLI Usage

```bash
aax info audiobook.aax
```

Output:
```
Title:       The Great Gatsby
Author:      F. Scott Fitzgerald
Narrator:    Jake Gyllenhaal
Duration:    4h 52m
Publisher:   Audible Studios
Release:     2024-01-15
Genre:       Fiction, Classics
ASIN:        B08XYZ1234
Chapters:    15
```

### Detailed View

```bash
aax info audiobook.aax --detailed
```

### JSON Output

```bash
aax info audiobook.aax --json
```

### Programmatic API

```typescript
import { getMetadata } from 'aax'

const metadata = await getMetadata('audiobook.aax')

console.log({
  title: metadata.title,
  author: metadata.author,
  narrator: metadata.narrator,
  duration: metadata.duration,
  chapters: metadata.chapterCount,
})
```

## Metadata Fields

| Field | Description |
|-------|-------------|
| `title` | Book title |
| `author` | Author name(s) |
| `narrator` | Narrator name(s) |
| `publisher` | Publisher name |
| `releaseDate` | Publication date |
| `duration` | Total runtime |
| `genre` | Genre categories |
| `description` | Book description |
| `asin` | Amazon Standard ID |
| `copyright` | Copyright text |
| `chapters` | Chapter information |

## Cover Art

### Extract Cover

```bash
# Extract to file
aax cover audiobook.aax --output cover.jpg

# Specify format
aax cover audiobook.aax --format png --output cover.png
```

```typescript
import { getCover } from 'aax'

const cover = await getCover('audiobook.aax')
await Bun.write('cover.jpg', cover)
```

### View Cover

```bash
# Open in default viewer
aax cover audiobook.aax --view
```

## Preserve During Conversion

### Keep All Metadata

```bash
aax convert audiobook.aax --preserve-metadata
```

```typescript
await convert('audiobook.aax', {
  preserveMetadata: true,
  embedCover: true,
})
```

### Select Specific Fields

```bash
aax convert audiobook.aax --metadata title,author,narrator
```

```typescript
await convert('audiobook.aax', {
  metadata: ['title', 'author', 'narrator', 'cover'],
})
```

## Modify Metadata

### Update Fields

```bash
# Update title
aax metadata set audiobook.aax --title "New Title"

# Multiple fields
aax metadata set audiobook.aax \
  --title "New Title" \
  --author "New Author" \
  --narrator "New Narrator"
```

```typescript
import { setMetadata } from 'aax'

await setMetadata('audiobook.aax', {
  title: 'New Title',
  author: 'New Author',
  genre: ['Fiction', 'Drama'],
})
```

### From JSON

```bash
aax metadata apply audiobook.aax --from metadata.json
```

```json
// metadata.json
{
  "title": "The Great Gatsby",
  "author": "F. Scott Fitzgerald",
  "narrator": "Jake Gyllenhaal",
  "genre": ["Fiction", "Classics"]
}
```

### Update Cover

```bash
aax metadata set audiobook.aax --cover new-cover.jpg
```

```typescript
await setMetadata('audiobook.aax', {
  cover: await Bun.file('new-cover.jpg').arrayBuffer(),
})
```

## Export Metadata

### To JSON

```bash
aax info audiobook.aax --json > metadata.json
```

### To NFO

```bash
aax info audiobook.aax --nfo > audiobook.nfo
```

### To Markdown

```bash
aax info audiobook.aax --markdown > README.md
```

## Batch Metadata

### Apply to Multiple Files

```bash
aax metadata apply ./audiobooks/ --from template.json
```

### Export All

```bash
aax info ./audiobooks/ --json > library.json
```

```typescript
import { glob } from 'bun'

const library = []

for await (const file of glob('**/*.aax')) {
  const metadata = await getMetadata(file)
  library.push({ file, ...metadata })
}

await Bun.write('library.json', JSON.stringify(library, null, 2))
```

## Online Lookup

### From Audible

```bash
# Lookup by ASIN
aax metadata fetch --asin B08XYZ1234

# Update file with online data
aax metadata fetch audiobook.aax --apply
```

```typescript
import { fetchMetadata } from 'aax'

const metadata = await fetchMetadata({
  asin: 'B08XYZ1234',
})

await setMetadata('audiobook.aax', metadata)
```

### Custom Sources

```typescript
await fetchMetadata({
  isbn: '978-0743273565',
  source: 'goodreads',
})
```

## Metadata Templates

### Create Template

```bash
aax metadata template create fiction-template.json
```

```json
{
  "genre": ["Fiction"],
  "copyright": "All rights reserved",
  "publisher": "My Publisher"
}
```

### Apply Template

```bash
aax metadata apply ./new-books/ --template fiction-template.json
```

## Validation

### Check Metadata

```bash
aax metadata validate audiobook.aax
```

Output:
```
Validation Results:
  Title:      OK
  Author:     OK
  Narrator:   MISSING
  Cover:      OK (1200x1200)
  Chapters:   OK (15 chapters)
```

```typescript
import { validateMetadata } from 'aax'

const issues = await validateMetadata('audiobook.aax')

for (const issue of issues) {
  console.warn(`${issue.field}: ${issue.message}`)
}
```

## Metadata Cleanup

### Normalize Fields

```bash
# Standardize author names
aax metadata normalize audiobook.aax --field author

# Fix encoding issues
aax metadata normalize audiobook.aax --encoding
```

### Remove Fields

```bash
aax metadata remove audiobook.aax --field description
```

## Examples

### Create Library Index

```typescript
import { glob } from 'bun'
import { getMetadata } from 'aax'

interface Book {
  file: string
  title: string
  author: string
  duration: number
}

const books: Book[] = []

for await (const file of glob('**/*.aax')) {
  const meta = await getMetadata(file)
  books.push({
    file,
    title: meta.title,
    author: meta.author,
    duration: meta.duration,
  })
}

// Group by author
const byAuthor = books.reduce((acc, book) => {
  (acc[book.author] ??= []).push(book)
  return acc
}, {})

await Bun.write('library-index.json', JSON.stringify(byAuthor, null, 2))
```

### Batch Cover Update

```bash
#!/bin/bash
for file in ./audiobooks/*.aax; do
  aax cover "$file" --output "./covers/$(basename "$file" .aax).jpg"
done
```

## Best Practices

1. **Preserve all**: Keep original metadata during conversion
2. **Validate first**: Check metadata before processing
3. **Backup covers**: Export covers before modifications
4. **Use templates**: Standardize metadata across collections
5. **Normalize names**: Ensure consistent author/narrator naming

## Related

- [Audio Conversion](/features/audio-conversion) - Conversion options
- [Chapter Extraction](/features/chapter-extraction) - Chapter metadata
- [Batch Processing](/features/batch-processing) - Process multiple files
