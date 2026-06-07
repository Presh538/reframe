/**
 * share.ts — Cryptographically signed, time-limited share tokens.
 *
 * Token format (URL-safe, no percent-encoding needed):
 *   {base64url(gzip(svg))}.{expiryUnixSeconds}.{base64url(hmac-sha256)}
 *
 * Security guarantees:
 *  – HMAC-SHA256 signature  prevents any token tampering or forgery
 *  – Expiry field           links auto-expire after TTL_DAYS
 *  – Stateless              no server-side storage; safe under serverless cold starts
 *  – Defense-in-depth       SVG is sanitized on creation (API) AND on render (client)
 *
 * Prerequisites:
 *  – SHARE_SECRET env var (≥ 32 chars) in .env.local and Vercel env settings
 *
 * Node.js runtime only (uses Buffer + CompressionStream).
 * Do NOT import this in Edge functions or client components.
 */

const ALG_NAME = 'HMAC' as const
const ALG_HASH = 'SHA-256' as const

export const SHARE_TTL_DAYS  = 7
const        SHARE_TTL_SECS  = SHARE_TTL_DAYS * 24 * 60 * 60

/** 5 MB raw SVG limit — prevents abuse of server compute */
const MAX_RAW_BYTES  = 5 * 1024 * 1024
/** 500 KB compressed limit — prevents extremely long share URLs */
const MAX_GZIP_BYTES = 500 * 1024

// ── Signing key (cached per process / warm instance) ─────────────
let _key: CryptoKey | null = null

async function getKey(): Promise<CryptoKey> {
  if (_key) return _key

  const secret = process.env.SHARE_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      'SHARE_SECRET env var is missing or too short. ' +
      'Add SHARE_SECRET=<random-64-char-hex> to .env.local and to Vercel env settings.',
    )
  }

  _key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: ALG_NAME, hash: ALG_HASH },
    false,
    ['sign', 'verify'],
  )
  return _key
}

// ── Base64url (Node.js Buffer — handles large payloads safely) ────
const b64uEncode = (buf: Uint8Array): string =>
  Buffer.from(buf).toString('base64url')

const b64uDecode = (str: string): Uint8Array =>
  new Uint8Array(Buffer.from(str, 'base64url'))

// crypto.subtle requires a true ArrayBuffer (not SharedArrayBuffer).
// Copies a Uint8Array into a guaranteed ArrayBuffer for sign/verify calls.
const toArrayBuffer = (u8: Uint8Array): ArrayBuffer =>
  u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer

// ── gzip helpers (Web Streams, available Node.js 18+ / Vercel) ───
async function gzipCompress(text: string): Promise<Uint8Array> {
  const cs     = new CompressionStream('gzip')
  const writer = cs.writable.getWriter()
  writer.write(new TextEncoder().encode(text))
  writer.close()
  return new Uint8Array(await new Response(cs.readable).arrayBuffer())
}

async function gzipDecompress(data: Uint8Array): Promise<string> {
  const ds     = new DecompressionStream('gzip')
  const writer = ds.writable.getWriter()
  writer.write(toArrayBuffer(data))
  writer.close()
  return new TextDecoder().decode(await new Response(ds.readable).arrayBuffer())
}

// ── Security: strip any residual dangerous SVG constructs ─────────
// These patterns mirror src/app/api/validate-svg/route.ts.
// Sanitization happens both here (server) and in PreviewCanvas (DOMPurify).
const FORBIDDEN_ELEMENTS = /<(script|foreignObject|iframe|embed|object|link|image|feImage|animate|set|animateTransform|animateMotion)[\s>/]/gi
const FORBIDDEN_ATTRS    = /\s(on\w+|javascript:)/gi
const EXTERNAL_REFS      = /\s(href|src|xlink:href)\s*=\s*["'](?!#|data:image\/(png|jpeg|gif|webp))/gi

function serverSanitize(svg: string): string {
  FORBIDDEN_ELEMENTS.lastIndex = 0
  FORBIDDEN_ATTRS.lastIndex    = 0
  EXTERNAL_REFS.lastIndex      = 0
  return svg
    .replace(FORBIDDEN_ELEMENTS, '<!-- removed -->')
    .replace(FORBIDDEN_ATTRS,    ' data-removed-attr')
    .replace(EXTERNAL_REFS,      ' data-href-removed ')
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Create a signed share token from an animated SVG string.
 * Sanitizes the SVG, compresses it, and signs it with HMAC-SHA256.
 *
 * @throws if SVG is too large, SHARE_SECRET is misconfigured, or compression fails
 */
export async function createShareToken(svg: string): Promise<string> {
  if (svg.length > MAX_RAW_BYTES) {
    throw new Error('SVG is too large to share (max 5 MB)')
  }

  const sanitized  = serverSanitize(svg)
  const compressed = await gzipCompress(sanitized)

  if (compressed.length > MAX_GZIP_BYTES) {
    throw new Error(
      `SVG compresses to ${Math.ceil(compressed.length / 1024)} KB — ` +
      'exceeds the 500 KB share link limit. Try a simpler SVG.',
    )
  }

  const payload = b64uEncode(compressed)
  const expiry  = Math.floor(Date.now() / 1000) + SHARE_TTL_SECS
  const message = `${payload}.${expiry}`

  const key    = await getKey()
  const sigBuf = await crypto.subtle.sign(ALG_NAME, key, new TextEncoder().encode(message))
  const sig    = b64uEncode(new Uint8Array(sigBuf))

  return `${message}.${sig}`
}

export type VerifyResult =
  | { ok: true;  svg: string }
  | { ok: false; reason: 'expired' | 'invalid' }

/**
 * Verify a share token's HMAC signature and expiry, then decompress the SVG.
 * Timing-safe — crypto.subtle.verify is constant-time.
 */
export async function verifyShareToken(token: string): Promise<VerifyResult> {
  // Token must be exactly 3 dot-separated segments.
  // Base64url (A-Za-z0-9-_) and unix timestamps never contain dots,
  // so splitting on '.' gives exactly: [payload, expiry, sig].
  const parts = token.split('.')
  if (parts.length !== 3) return { ok: false, reason: 'invalid' }

  const [payload, expiryStr, sig] = parts

  // Reject obviously malformed components
  if (!payload || !expiryStr || !sig) return { ok: false, reason: 'invalid' }

  // Validate expiry before hitting crypto (fast-path for expired tokens)
  const expiry = parseInt(expiryStr, 10)
  if (isNaN(expiry)) return { ok: false, reason: 'invalid' }
  if (Date.now() / 1000 > expiry) return { ok: false, reason: 'expired' }

  // Verify HMAC signature — constant-time
  let key: CryptoKey
  try { key = await getKey() }
  catch { return { ok: false, reason: 'invalid' } }

  let valid = false
  try {
    valid = await crypto.subtle.verify(
      ALG_NAME,
      key,
      toArrayBuffer(b64uDecode(sig)),
      toArrayBuffer(new TextEncoder().encode(`${payload}.${expiryStr}`)),
    )
  } catch { return { ok: false, reason: 'invalid' } }

  if (!valid) return { ok: false, reason: 'invalid' }

  // Decompress and return the SVG
  try {
    const svg = await gzipDecompress(b64uDecode(payload))
    return { ok: true, svg }
  } catch {
    return { ok: false, reason: 'invalid' }
  }
}
