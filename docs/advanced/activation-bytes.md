# Activation Bytes

AAX files are encrypted with DRM protection. To convert them, you need your Audible account's activation bytes. This guide covers obtaining and using activation bytes.

## What Are Activation Bytes?

Activation bytes are a unique 8-character hexadecimal code tied to your Audible account. They're used to decrypt the audio content in AAX files.

## Obtaining Activation Bytes

### Method 1: Automatic Extraction

AAX can attempt to extract activation bytes automatically:

```bash
# Auto-detect from system
aax auth auto

# From Audible app data
aax auth extract
```

### Method 2: From Audible Manager

1. Install Audible Manager (Windows)
2. Download any audiobook
3. Run extraction:

```bash
aax auth extract --source audible-manager
```

### Method 3: Manual Extraction

Extract from registry (Windows):

```bash
aax auth extract --source registry
```

Extract from configuration (macOS):

```bash
aax auth extract --source macos-config
```

### Method 4: Online Tools

Use the RainbowCrack tables (legal for personal use):

```bash
aax auth compute --checksum XXXXXXXX
```

## Storing Activation Bytes

### Environment Variable

```bash
# Add to shell profile
export AUDIBLE_ACTIVATION_BYTES=XXXXXXXX
```

### Configuration File

```typescript
// aax.config.ts
export default {
  activationBytes: process.env.AUDIBLE_ACTIVATION_BYTES,
}
```

### Secure Storage

```bash
# Store in keychain (macOS)
aax auth store --keychain

# Store in credential manager (Windows)
aax auth store --credential-manager
```

```typescript
import { getActivationBytes } from 'aax'

// Retrieves from secure storage
const bytes = await getActivationBytes()
```

## Using Activation Bytes

### CLI Usage

```bash
# Via environment
AUDIBLE_ACTIVATION_BYTES=XXXXXXXX aax convert audiobook.aax

# Via flag
aax convert audiobook.aax --activation-bytes XXXXXXXX

# From file
aax convert audiobook.aax --activation-file ./activation.txt
```

### Programmatic API

```typescript
import { convert } from 'aax'

await convert('audiobook.aax', {
  activationBytes: 'XXXXXXXX',
})
```

## Multiple Accounts

If you have multiple Audible accounts:

```typescript
// aax.config.ts
export default {
  accounts: {
    personal: {
      activationBytes: process.env.AUDIBLE_PERSONAL,
    },
    work: {
      activationBytes: process.env.AUDIBLE_WORK,
    },
  },
}
```

```bash
# Use specific account
aax convert audiobook.aax --account personal
```

## Validation

### Verify Activation Bytes

```bash
aax auth verify XXXXXXXX
```

### Test with File

```bash
aax auth test audiobook.aax
```

```typescript
import { validateActivation } from 'aax'

const isValid = await validateActivation('audiobook.aax', 'XXXXXXXX')
console.log('Activation valid:', isValid)
```

## Troubleshooting

### Invalid Activation Bytes

```
Error: Activation bytes invalid for this file
```

Causes:
- Wrong account's activation bytes
- File from different Audible region
- Corrupted activation bytes

Solutions:
```bash
# Re-extract activation bytes
aax auth extract --force

# Try auto-detection
aax auth auto --verbose
```

### Region Mismatch

```bash
# Check file region
aax info audiobook.aax --region

# Extract for specific region
aax auth extract --region us  # us, uk, de, etc.
```

### File Compatibility

```bash
# Check file format
aax info audiobook.aax --format

# AAX vs AAXC
aax auth check audiobook.aax
```

## Security Best Practices

1. **Never share**: Activation bytes are tied to your account
2. **Use env vars**: Don't hardcode in config files
3. **Secure storage**: Use keychain/credential manager
4. **Git ignore**: Add activation files to .gitignore

```gitignore
# .gitignore
activation.txt
*.activation
.aax-auth
```

## AAXC Files

Newer AAXC format uses different encryption:

```bash
# Check if file is AAXC
aax info audiobook.aaxc --encryption

# AAXC requires voucher
aax auth voucher audiobook.aaxc
```

## Caching

AAX caches validated activation bytes:

```bash
# View cache
aax auth cache list

# Clear cache
aax auth cache clear

# Disable caching
aax convert audiobook.aax --no-cache-auth
```

## Legal Considerations

- Activation bytes are for personal backup only
- Only use with audiobooks you've purchased
- Converting for distribution is illegal
- Keep your activation bytes private

## Automation

For batch processing without manual intervention:

```bash
#!/bin/bash
export AUDIBLE_ACTIVATION_BYTES=$(aax auth get)
aax convert ./audiobooks/ --batch
```

```typescript
import { getActivationBytes, batchConvert } from 'aax'

const activationBytes = await getActivationBytes({ autoDetect: true })

await batchConvert('./audiobooks/', {
  activationBytes,
})
```

## Related

- [Configuration](/advanced/configuration) - Full config options
- [Audio Conversion](/features/audio-conversion) - Conversion guide
- [Batch Processing](/features/batch-processing) - Multiple files
