/**
 * Referral share-code alphabet + helpers.
 *
 * Must match the on-chain validator in `apps/contract/plsa/sources/plsa_share_code.move`
 * (see `is_valid_alphabet`). 54 chars = base62 minus visually confusable
 * glyphs: 0, 1, O, o, I, i, L, l. 8 chars → 54^8 ≈ 7.2 × 10¹³.
 */

export const REFERRAL_CODE_ALPHABET =
  "23456789ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz"

export const REFERRAL_CODE_LENGTH = 8

/** Regex enforcing exactly `REFERRAL_CODE_LENGTH` chars from `REFERRAL_CODE_ALPHABET`. */
export const REFERRAL_CODE_REGEX = /^[2-9A-HJKMNP-Za-hjkmnp-z]{8}$/

export function isValidReferralCode(value: unknown): value is string {
  return typeof value === "string" && REFERRAL_CODE_REGEX.test(value)
}

/** Generate a random 8-char code from the alphabet using the browser/node CSPRNG. */
export function generateReferralCode(): string {
  const bytes = new Uint8Array(REFERRAL_CODE_LENGTH)
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes)
  } else {
    // Non-cryptographic fallback (dev/test only — Node always has crypto)
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
  }
  let out = ""
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
    out += REFERRAL_CODE_ALPHABET[bytes[i] % REFERRAL_CODE_ALPHABET.length]
  }
  return out
}

/**
 * Convert a code string to the ASCII byte array expected by the Move call:
 * `tx.pure.vector("u8", codeToBytes(code))`.
 */
export function codeToBytes(code: string): number[] {
  const bytes: number[] = []
  for (let i = 0; i < code.length; i++) {
    bytes.push(code.charCodeAt(i))
  }
  return bytes
}

/**
 * Convert a byte array (read from `ShareCodeRegistry.addr_to_code`) back to
 * its string representation. Validates alphabet — throws on invalid input to
 * prevent silent display of garbage bytes.
 */
export function bytesToCode(bytes: number[] | Uint8Array | string): string {
  const arr = typeof bytes === "string"
    ? [...bytes].map((c) => c.charCodeAt(0))
    : Array.from(bytes)
  const str = arr.map((b) => String.fromCharCode(b)).join("")
  if (!REFERRAL_CODE_REGEX.test(str)) {
    throw new Error(`Invalid referral code bytes: ${JSON.stringify(arr)}`)
  }
  return str
}
