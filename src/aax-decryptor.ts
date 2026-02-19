import { createDecipheriv, createHash } from 'node:crypto'

/** Audible fixed key constant used in DRM key derivation */
const FIXED_KEY = Buffer.from('77214d4b196a87cd520045fd20a51d67', 'hex')

export interface DecryptionKeys {
  fileKey: Uint8Array
  fileIv: Uint8Array
}

/**
 * adrm content layout (after 8-byte box header):
 *   0-7:   header (drm_blob_size[4] + version[4])
 *   8-63:  DRM blob (56 bytes, first 48 decrypted as 3 AES blocks)
 *   64-67: separator (4 bytes)
 *   68-87: file checksum (20 bytes, SHA1)
 *   88+:   additional data
 */

/**
 * Extract the file checksum from the adrm box content (20 bytes at offset 68).
 */
export function extractChecksum(adrmContent: Uint8Array): Uint8Array {
  if (adrmContent.length < 88) {
    throw new Error(`adrm content too short: ${adrmContent.length} bytes, expected at least 88`)
  }
  return adrmContent.slice(68, 88)
}

/**
 * Derive intermediate key and IV from activation bytes.
 * Used for both validation and key derivation.
 */
function deriveIntermediateKeys(activationBytes: Uint8Array): { key: Buffer, iv: Buffer } {
  // intermediate_key = SHA1(FIXED_KEY + activation_bytes) [full 20 bytes]
  const intermediateKeyFull = createHash('sha1')
    .update(FIXED_KEY)
    .update(activationBytes)
    .digest()

  // intermediate_iv = SHA1(FIXED_KEY + intermediate_key_full[20] + activation_bytes)
  const intermediateIvFull = createHash('sha1')
    .update(FIXED_KEY)
    .update(intermediateKeyFull) // full 20 bytes
    .update(activationBytes)
    .digest()

  return {
    key: intermediateKeyFull,
    iv: intermediateIvFull,
  }
}

/**
 * Validate activation bytes against the adrm checksum.
 *
 * Matching ffmpeg's mov_read_adrm:
 *   calculated = SHA1(intermediate_key[0:16] + intermediate_iv[0:16])
 *   valid if calculated == file_checksum
 */
export function validateActivationBytes(adrmContent: Uint8Array, activationBytes: Uint8Array): boolean {
  try {
    const fileChecksum = extractChecksum(adrmContent)
    const { key, iv } = deriveIntermediateKeys(activationBytes)

    const calculated = createHash('sha1')
      .update(key.subarray(0, 16))
      .update(iv.subarray(0, 16))
      .digest()

    return Buffer.from(fileChecksum).equals(calculated)
  }
  catch {
    return false
  }
}

/**
 * Derive file decryption keys from the adrm blob and activation bytes.
 *
 * Algorithm (matching ffmpeg's mov_read_adrm):
 *   1. Derive intermediate_key and intermediate_iv from activation bytes
 *   2. AES-128-CBC decrypt the 48-byte DRM blob (3 blocks from adrm[8:56])
 *   3. Verify decrypted[0:4] == reverse(activation_bytes)
 *   4. file_key = decrypted[8:24]
 *   5. file_iv = SHA1(decrypted[26:42] + file_key + FIXED_KEY)[0:16]
 */
export function deriveKeys(adrmContent: Uint8Array, activationBytes: Uint8Array): DecryptionKeys {
  if (adrmContent.length < 56) {
    throw new Error(`adrm content too short for key derivation: ${adrmContent.length} bytes`)
  }

  const { key, iv } = deriveIntermediateKeys(activationBytes)
  const intermediateKey = key.subarray(0, 16)
  const intermediateIv = iv.subarray(0, 16)

  // Decrypt 48 bytes (3 AES blocks) of the DRM blob at offset 8
  const encryptedBlob = Buffer.from(adrmContent.slice(8, 56))
  const decipher = createDecipheriv('aes-128-cbc', intermediateKey, intermediateIv)
  decipher.setAutoPadding(false)
  const decrypted = Buffer.concat([decipher.update(encryptedBlob), decipher.final()])

  // Extract file_key from decrypted[8:24]
  const fileKey = new Uint8Array(decrypted.subarray(8, 24))

  // Derive file_iv = SHA1(decrypted[26:42] + file_key + FIXED_KEY)[0:16]
  const fileIv = createHash('sha1')
    .update(decrypted.subarray(26, 42))
    .update(fileKey)
    .update(FIXED_KEY)
    .digest()
    .subarray(0, 16)

  return {
    fileKey,
    fileIv: new Uint8Array(fileIv),
  }
}

/**
 * Decrypt an audio sample using AES-128-CBC with the file key and IV.
 * Each sample is independently encrypted.
 */
export function decryptSample(encrypted: Uint8Array, key: Uint8Array, iv: Uint8Array): Uint8Array {
  // AAX audio samples are AES-128-CBC encrypted
  // The ciphertext must be a multiple of 16 bytes
  // Any trailing bytes (< 16) are stored unencrypted
  const blockSize = 16
  const alignedLength = Math.floor(encrypted.length / blockSize) * blockSize
  const remainder = encrypted.length - alignedLength

  if (alignedLength === 0) {
    // Too small to decrypt, return as-is
    return encrypted
  }

  const encryptedPart = encrypted.subarray(0, alignedLength)

  const decipher = createDecipheriv('aes-128-cbc', key, iv)
  decipher.setAutoPadding(false)
  const decrypted = decipher.update(encryptedPart)

  if (remainder > 0) {
    // Append the unencrypted trailing bytes
    const result = new Uint8Array(decrypted.length + remainder)
    result.set(new Uint8Array(decrypted))
    result.set(encrypted.subarray(alignedLength), decrypted.length)
    return result
  }

  return new Uint8Array(decrypted)
}

/**
 * Parse activation bytes from hex string to Uint8Array.
 */
export function parseActivationBytes(hexString: string): Uint8Array {
  const hex = hexString.replace(/\s/g, '')
  if (hex.length !== 8 || !/^[0-9a-f]{8}$/i.test(hex)) {
    throw new Error(`Invalid activation bytes: "${hexString}". Expected 8 hex characters.`)
  }
  return Buffer.from(hex, 'hex')
}
