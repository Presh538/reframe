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

// ── Request schema ────────────────────────────────────────────
const RequestSchema = z.object({
  svg: z.string().min(1).max(2 * 1024 * 1024), // 2 MB string limit
})

// ── Forbidden patterns (server-side defence) ──────────────────
const FORBIDDEN_ELEMENTS = /<(script|foreignObject|iframe|embed|object|link)[\s>]/gi
const FORBIDDEN_ATTRS = /\s(on\w+|javascript:)/gi
const EXTERNAL_REFS = /\s(href|src|xlink:href)\s*=\s*["'](?!#|data:image\/(png|jpeg|gif|webp|svg\+xml))/gi

// ── Handler ───────────────────────────────────────────────────
export async function POST(request: Request) {
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
  if (FORBIDDEN_ELEMENTS.test(svg)) {
    return error('SVG contains forbidden elements (script, foreignObject, etc.)', 400)
  }

  // Reset lastIndex after global regex test
  FORBIDDEN_ATTRS.lastIndex = 0
  EXTERNAL_REFS.lastIndex = 0

  let sanitized = svg
    .replace(FORBIDDEN_ELEMENTS, '<!-- removed -->')
    .replace(FORBIDDEN_ATTRS, ' data-removed$1')

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
