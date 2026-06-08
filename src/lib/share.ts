/**
 * share.ts — Server-side storage for shareable animation previews.
 *
 * Design (replaces the old payload-in-URL token scheme):
 *   • The sanitized + gzipped SVG is stored in Vercel Blob (private access).
 *   • The share URL contains only a short, unguessable random ID: /s/{id}
 *   • An expiry timestamp is embedded in the stored envelope and enforced on read.
 *
 * Why this design:
 *   • Old scheme embedded the whole gzipped SVG in the URL → URLs blew past
 *     browser/CDN length limits for real-world SVGs, so links hung and failed.
 *   • A 22-char random ID keeps URLs short and loads instant regardless of SVG size.
 *
 * Security:
 *   • ID is 16 random bytes (base64url) — unguessable, acts as a bearer capability.
 *   • Blob is PUBLIC store access. The blob URL is a long, unguessable path
 *     (never shown to users) — security comes from the unguessable 16-byte random ID.
 *   • SVG is sanitized here (server) AND again in PreviewCanvas (DOMPurify) — defense in depth.
 *
 * Requires the BLOB_READ_WRITE_TOKEN env var (auto-injected when a Vercel Blob
 * store is connected to the project; run `vercel env pull` for local dev).
 *
 * Node.js runtime only (uses Buffer + zlib). Do NOT import in Edge/client code.
 */

import { randomBytes }              from 'crypto'
import { gzipSync, gunzipSync }      from 'zlib'
import { put, get, list, del }      from '@vercel/blob'

export const SHARE_TTL_DAYS = 7
const        SHARE_TTL_SECS = SHARE_TTL_DAYS * 24 * 60 * 60

/** 5 MB raw SVG limit — prevents abuse of server compute */
const MAX_RAW_BYTES = 5 * 1024 * 1024
/** 2 MB stored (compressed) limit — generous; storage, not URL, is the only constraint now */
const MAX_STORED_BYTES = 2 * 1024 * 1024

/** Blob key prefix for shared SVGs */
const BLOB_PREFIX = 'shares/'

// ── gzip helpers (Node.js zlib — synchronous, reliable in serverless) ───
function gzipCompress(text: string): Buffer {
  return gzipSync(Buffer.from(text, 'utf8'))
}

function gzipDecompress(data: Uint8Array): string {
  return gunzipSync(Buffer.from(data)).toString('utf8')
}

// ── Security: strip any residual dangerous SVG constructs ─────────
// Mirrors src/app/api/validate-svg/route.ts. Sanitization happens both
// here (server) and in PreviewCanvas (DOMPurify) — defense in depth.
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

/** Stored envelope: expiry + sanitized SVG, gzipped together. */
interface ShareEnvelope {
  v:   1
  exp: number  // unix seconds
  svg: string
}

/** ID format: base64url chars only, length bounded. Validated before any Blob call. */
const VALID_ID_RE = /^[A-Za-z0-9_-]{16,64}$/

/** Generates a short, unguessable share ID (16 random bytes → ~22 base64url chars). */
function generateId(): string {
  return randomBytes(16).toString('base64url')
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Sanitize, compress, and store an animated SVG in Vercel Blob.
 * Returns the short share ID to embed in the URL (/s/{id}).
 *
 * @throws if the SVG is too large or Blob storage is unavailable/misconfigured.
 */
export async function createShare(svg: string): Promise<string> {
  if (svg.length > MAX_RAW_BYTES) {
    throw new Error('SVG is too large to share (max 5 MB)')
  }

  const sanitized = serverSanitize(svg)
  const exp       = Math.floor(Date.now() / 1000) + SHARE_TTL_SECS
  const envelope: ShareEnvelope = { v: 1, exp, svg: sanitized }
  const compressed = gzipCompress(JSON.stringify(envelope))

  if (compressed.length > MAX_STORED_BYTES) {
    throw new Error(
      `SVG compresses to ${Math.ceil(compressed.length / 1024)} KB — ` +
      'exceeds the 2 MB share limit. Try a simpler SVG.',
    )
  }

  const id = generateId()

  await put(`${BLOB_PREFIX}${id}`, compressed, {
    access:             'public',
    addRandomSuffix:    false,          // deterministic pathname so we can read by ID
    contentType:        'application/gzip',
    cacheControlMaxAge: SHARE_TTL_SECS,
  })

  return id
}

export type VerifyResult =
  | { ok: true;  svg: string }
  | { ok: false; reason: 'expired' | 'invalid' }

/**
 * Look up a share ID in Blob storage, enforce expiry, and return the SVG.
 * Returns { ok: false } for missing, expired, malformed, or corrupt entries.
 */
export async function verifyShare(id: string): Promise<VerifyResult> {
  if (!VALID_ID_RE.test(id)) return { ok: false, reason: 'invalid' }

  let result: Awaited<ReturnType<typeof get>>
  try {
    result = await get(`${BLOB_PREFIX}${id}`, { access: 'public' })
  } catch {
    // BlobNotFoundError (and any transient failure) → treat as invalid link
    return { ok: false, reason: 'invalid' }
  }

  if (!result || result.statusCode !== 200 || !result.stream) {
    return { ok: false, reason: 'invalid' }
  }

  try {
    const bytes = new Uint8Array(await new Response(result.stream).arrayBuffer())
    const env   = JSON.parse(gzipDecompress(bytes)) as ShareEnvelope

    if (env.v !== 1 || typeof env.exp !== 'number' || typeof env.svg !== 'string') {
      return { ok: false, reason: 'invalid' }
    }
    if (Date.now() / 1000 > env.exp) {
      return { ok: false, reason: 'expired' }
    }
    return { ok: true, svg: env.svg }
  } catch {
    return { ok: false, reason: 'invalid' }
  }
}

// ── Maintenance: purge expired share blobs ────────────────────────

/**
 * Deletes every share blob older than the TTL. Vercel Blob has no native
 * expiry, so this is run on a schedule (see /api/cron/cleanup-shares).
 *
 * Cheap by design: it uses each blob's `uploadedAt` metadata from list()
 * — no blob is downloaded. Since a blob expires TTL days after creation,
 * `uploadedAt` age is an exact proxy for the embedded `exp` field.
 *
 * @returns counts for observability.
 */
export async function deleteExpiredShares(): Promise<{ scanned: number; deleted: number }> {
  const cutoffMs = Date.now() - SHARE_TTL_DAYS * 24 * 60 * 60 * 1000

  let scanned = 0
  let deleted = 0
  let cursor: string | undefined

  do {
    const res = await list({ prefix: BLOB_PREFIX, cursor, limit: 1000 })
    scanned += res.blobs.length

    const expiredUrls = res.blobs
      .filter(b => b.uploadedAt.getTime() < cutoffMs)
      .map(b => b.url)

    if (expiredUrls.length > 0) {
      // del() accepts an array — batch-delete in one call.
      await del(expiredUrls)
      deleted += expiredUrls.length
    }

    cursor = res.hasMore ? res.cursor : undefined
  } while (cursor)

  return { scanned, deleted }
}
