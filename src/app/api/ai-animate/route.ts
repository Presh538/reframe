/**
 * POST /api/ai-animate
 *
 * AI-driven animation suggestion endpoint — not yet implemented.
 * Returns 501 Not Implemented with a clear message so that callers
 * receive a controlled response rather than an implicit Next.js 405/500.
 */

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST() {
  return NextResponse.json(
    { error: 'AI animation is not yet available. Check back soon.' },
    { status: 501 }
  )
}
