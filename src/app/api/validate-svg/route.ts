/**
 * POST /api/validate-svg
 *
 * Server-side SVG validation — the second pass after DOMPurify on the client.
 * Runs in the Node.js runtime, so we can use regex + XML parsing without
 * worrying about browser APIs.
 *
 * Returns:
 *   200  { valid: true, sanitized: string, layers: SvgLayerInfo, warnings: string[] }
 *   400  { error: string }
 *   413  { error: string }  (caught by middleware before we get here)
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { ValidateSvgResponse, SvgLayerInfo } from '@/types'

// ── Route segment config ──────────────────────────────────────
// Raise the default 4 MB body limit so large SVG files can pass through.
// The middleware and Zod schema independently enforce the final 50 MB cap.
export const dynamic = 'force-dynamic'
export const maxDuration = 30 // seconds (generous for large file processing)
// Next.js App Router body size (applies to the Node.js runtime)
export const runtime = 'nodejs'

// ── Rate limiter ──────────────────────────────────────────────
// Simple in-memory sliding window — 10 requests per IP per minute.
// KNOWN LIMITATION: serverless instances are ephemeral; a burst attack
// distributed across enough concurrent requests will spin up fresh instances
// and bypass this window entirely. For production hardening, replace rateMap
// with a shared KV store (e.g. Vercel KV / Redis). Until then this blocks
// trivial single-IP abuse only.
const rateMap = new Map<string, { count: number; reset: number }>()
const RATE_LIMIT   = 10
const RATE_WINDOW  = 60_000 // ms

function isRateLimited(ip: string): boolean {
  const now   = Date.now()
  const entry = rateMap.get(ip)
  if (!entry || now > entry.reset) {
    rateMap.set(ip, { count: 1, reset: now + RATE_WINDOW })
    return false
  }
  if (entry.count >= RATE_LIMIT) return true
  entry.count++
  return false
}

// ── Request schema ────────────────────────────────────────────
const RequestSchema = z.object({
  svg: z.string().min(1).max(50 * 1024 * 1024), // 50 MB — matches client-side file size cap
})

// ── Forbidden patterns (server-side defence) ──────────────────
//
// FORBIDDEN_ELEMENTS covers:
//   script, foreignObject, iframe, embed, object, link — obvious injection vectors
//   image, feImage — SVG-native elements that load external URLs via href/xlink:href
//   animate, set, animateTransform, animateMotion — SMIL animation; can mutate DOM
//     state and trigger side-effects without script, and bypass CSP in some browsers
//
// Note: <use> is intentionally allowed because it has legitimate SVG sprite uses;
// external hrefs on <use> are caught by EXTERNAL_REFS below.
const FORBIDDEN_ELEMENTS = /<(script|foreignObject|iframe|embed|object|link|image|feImage|animate|set|animateTransform|animateMotion)[\s>/]/gi
const FORBIDDEN_ATTRS = /\s(on\w+|javascript:)/gi
const EXTERNAL_REFS = /\s(href|src|xlink:href)\s*=\s*["'](?!#|data:image\/(png|jpeg|gif|webp|svg\+xml))/gi

// ── Handler ───────────────────────────────────────────────────
export async function POST(request: Request) {
  // Rate limiting — extract IP from Vercel's forwarded header
  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(ip)) {
    return error('Too many requests — please wait a moment', 429)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return error('Invalid JSON body', 400)
  }

  const parse = RequestSchema.safeParse(body)
  if (!parse.success) {
    return error(parse.error.issues[0]?.message ?? 'Invalid request', 400)
  }

  const { svg } = parse.data
  const warnings: string[] = []

  // ── Security checks ───────────────────────────────────────────
  // Always reset lastIndex BEFORE .test() — if .test() returns true and we
  // return early, the global regex retains its lastIndex across requests,
  // causing the next call to start scanning mid-string and miss leading matches.
  FORBIDDEN_ELEMENTS.lastIndex = 0
  if (FORBIDDEN_ELEMENTS.test(svg)) {
    return error('SVG contains forbidden elements (script, foreignObject, image, animate, etc.)', 400)
  }

  let sanitized = svg
    .replace(FORBIDDEN_ELEMENTS, '<!-- removed -->')  // String.replace resets lastIndex
    .replace(FORBIDDEN_ATTRS, ' data-removed$1')

  EXTERNAL_REFS.lastIndex = 0
  if (EXTERNAL_REFS.test(svg)) {
    warnings.push('External references detected and stripped.')
    sanitized = sanitized.replace(EXTERNAL_REFS, ' data-href-removed ')
  }

  // ── Basic structural validation ───────────────────────────────
  if (!sanitized.trim().toLowerCase().includes('<svg')) {
    return error('No <svg> element found', 400)
  }

  // ── Layer extraction (regex-based, no DOM available in Node) ──
  const layers = extractLayersServer(sanitized)

  const responseBody: ValidateSvgResponse = {
    valid: true,
    sanitized,
    layers,
    warnings,
  }

  return NextResponse.json(responseBody, { status: 200 })
}

// ── Server-side layer counter (regex, no DOM) ─────────────────
function extractLayersServer(svg: string): SvgLayerInfo {
  const count = (pattern: RegExp) => (svg.match(pattern) ?? []).length

  // Extract viewBox dimensions
  const vbMatch = svg.match(/viewBox\s*=\s*["']\s*[\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)/)
  const wMatch = svg.match(/\s(?:width)\s*=\s*["']([\d.]+)/)
  const hMatch = svg.match(/\s(?:height)\s*=\s*["']([\d.]+)/)

  return {
    groups:  count(/<g[\s>]/g),
    paths:   count(/<path[\s>]/g),
    shapes:  count(/<(?:circle|rect|ellipse|line|polyline|polygon)[\s>]/g),
    total:   count(/<[a-z]/g),
    hasText: /<text[\s>]/.test(svg),
    viewBox: {
      width:  vbMatch ? parseFloat(vbMatch[1]) : (wMatch ? parseFloat(wMatch[1]) : 400),
      height: vbMatch ? parseFloat(vbMatch[2]) : (hMatch ? parseFloat(hMatch[1]) : 400),
    },
  }
}

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}
