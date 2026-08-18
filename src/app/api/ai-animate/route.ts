/**
 * POST /api/ai-animate
 *
 * Interprets a natural-language animation prompt and returns a
 * specific preset + parameter set to apply to the SVG editor.
 *
 * Uses Claude Haiku via the Vercel AI SDK for fast, cheap structured output.
 */

import { after, type NextRequest } from 'next/server'
import { NextResponse }            from 'next/server'
import { generateText, Output }    from 'ai'
import { anthropic }               from '@ai-sdk/anthropic'
import { z }                       from 'zod'
import { getPostHogClient }        from '@/lib/posthog-server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// ── Response schema ───────────────────────────────────────────

const AnimateResponseSchema = z.object({
  presetId: z.enum([
    // Logo
    'draw-on', 'fade-up-scale', 'bounce-in', 'blur-rise', 'skew-reveal',
    'fill-reveal', 'slide-in', 'zoom-in', 'cascade',
    // Icon
    'wiggle', 'pulse-breathe', 'spin-loop', 'path-in', 'pop-settle',
    'tada', 'bounce-loop', 'flip', 'glow-pulse', 'color-pop',
    // Illustration
    'float-loop', 'shake', 'wave-path', 'scale-stagger', 'parallax-drift',
    'liquid-morph', 'hue-sweep', 'stagger-reveal',
    // UI
    'checkmark-draw', 'loading-spin', 'arrow-slide-in', 'typewriter',
    'elastic-unfold', 'progress-fill', 'ping', 'fade-blur',
  ]).describe('The preset that best matches the user request'),

  params: z.object({
    speed: z.number().min(0.25).max(4)
      .describe('Speed multiplier: 0.5=slow, 1=normal, 2=fast'),
    delay: z.number().min(0).max(2)
      .describe('Pre-animation delay in seconds'),
    loop: z.enum(['once', 'loop', 'bounce'])
      .describe('once=plays once, loop=repeats, bounce=forward then backward'),
    direction: z.enum(['in', 'out', 'in-out'])
      .describe('in=entrance, out=exit, in-out=both'),
    scope: z.enum(['all', 'groups', 'paths'])
      .describe('Which SVG elements to animate'),
    easing: z.enum(['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'spring', 'back', 'snappy'])
      .describe('CSS timing function'),
  }),

  explanation: z.string()
    .describe('One short sentence: what was applied and why, e.g. "Applied Bounce In at half speed"'),
})

export type AnimateResponse = z.infer<typeof AnimateResponseSchema>

// ── Request schema ────────────────────────────────────────────

const RequestSchema = z.object({
  prompt: z.string().min(1).max(500),
  context: z.object({
    currentPresetId: z.string().nullable(),
    currentParams: z.object({
      speed: z.number(),
      delay: z.number(),
      loop: z.enum(['once', 'loop', 'bounce']),
      direction: z.enum(['in', 'out', 'in-out']),
      scope: z.enum(['all', 'groups', 'paths']),
      easing: z.string(),
    }),
    svgLayers: z.object({
      groups: z.number(),
      paths:  z.number(),
      total:  z.number(),
    }).nullable(),
    svgFileName: z.string(),
  }),
})

// ── System prompt ─────────────────────────────────────────────

const SYSTEM = `You are an animation assistant inside Reframe, a browser-native SVG animation tool.
The user describes how they want their SVG to animate. Pick the single best preset and tune parameters to match.

PRESETS (pick exactly one):

Logo — entrance/reveal, best for logotypes:
  draw-on          Traces paths then fills — hand-drawn reveal
  fade-up-scale    Rises and scales up — smooth classic entrance
  bounce-in        Drops from above with elastic bounce — energetic
  blur-rise        Materialises from soft blur — premium, cinematic
  skew-reveal      Slides in with snap skew — sharp, modern
  fill-reveal      Wipes left-to-right — cinematic reveal
  slide-in         Sharp horizontal slide with fast stagger — bold
  zoom-in          Scales from 75% to full — confident, no spring
  cascade          Each element wipes from bottom, tight stagger — editorial

Icon — loops and micro-interactions:
  wiggle           Left-right shake — notification / attention
  pulse-breathe    Gentle scale loop — live indicators
  spin-loop        Continuous 360° rotation — loading
  path-in          Stroke-trace per element
  pop-settle       Scale overshoot then settles — snappy
  tada             Scale spike + rotation shake — celebration
  bounce-loop      Continuous elastic bounce — playful idle
  flip             Y-axis perspective flip — coin-toss reveal
  glow-pulse       Drop-shadow glow loop — highlights
  color-pop        Desaturated → full color + scale — dramatic

Illustration — ambient and multi-element stagger:
  float-loop       Slow organic up-down drift — hero illustrations
  shake            Rapid jitter — error state, urgency
  wave-path        Organic skew ripple — layered scenes
  scale-stagger    Each element scales in with spring
  parallax-drift   Layers at different depths — 3D parallax
  liquid-morph     Blob-to-sharp form — filter morphing
  hue-sweep        Hue rotation wash on entrance
  stagger-reveal   Layers appear sequentially — progressive

UI — functional animations:
  checkmark-draw   Stroke dashoffset reveal — success
  loading-spin     Arc rotation loop — loading indicator
  arrow-slide-in   Directional slide alternating sides
  typewriter       Clip-path stepped reveal — typing effect
  elastic-unfold   ScaleY accordion expansion
  progress-fill    Scales 0→full from left — progress bars
  ping             Scale + opacity ripple loop — radar pulse
  fade-blur        Defocus-to-focus reveal — premium, minimal

PARAMETER TUNING:
  speed   slow=0.5  normal=1  fast=2  very fast=3+
  delay   0.2–0.5s for "delayed", 0 otherwise
  loop    "loop" for continuous/idle, "once" for entrance, "bounce" for ping-pong
  direction  "in" for entrance, "out" for exit, "in-out" for both
  scope   "all" default; "paths" for shapes only; "groups" for layers
  easing  spring/back=bouncy; snappy=sharp; ease-in-out=smooth; linear=robotic

RULES:
  - Always pick exactly one preset
  - Keep params close to current values unless the request implies a change
  - "subtle" → speed 0.5–0.7, ease-in-out easing
  - "dramatic/bold" → speed 1.5–2, back or spring easing
  - "loop/continuous/idle" → loop: "loop"
  - "slow/gentle" → speed 0.5
  - "fast/snappy/quick" → speed 1.5–2.5, snappy easing
  - explanation starts with a verb: "Applied…" or "Set…"`

// ── Rate limiting ─────────────────────────────────────────────
// This route calls a paid model (Anthropic) on every request, so it's the
// prime denial-of-wallet target. Basic per-IP throttle mirrors the share/
// validate-svg routes. In-memory: per-instance, resets on cold start — good
// enough as a guardrail. NOTE: For production hardening replace with Vercel KV
// (and fold into the planned account-less usage limits).
const rateMap    = new Map<string, { count: number; reset: number }>()
const RATE_LIMIT  = 20                // requests…
const RATE_WINDOW = 10 * 60_000       // …per 10 minutes, per IP

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

// ── Handler ───────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[ai-animate] ANTHROPIC_API_KEY is not configured')
    return NextResponse.json(
      { error: 'AI features are temporarily unavailable. Please try again later.' },
      { status: 503 }
    )
  }

  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many AI requests — please wait a few minutes.' },
      { status: 429 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { prompt, context } = parsed.data

  const userMessage = [
    `File: "${context.svgFileName || 'untitled.svg'}"`,
    context.svgLayers
      ? `SVG: ${context.svgLayers.total} elements (${context.svgLayers.groups} groups, ${context.svgLayers.paths} paths)`
      : 'SVG structure: unknown',
    `Current preset: ${context.currentPresetId ?? 'none'}`,
    `Current params: speed=${context.currentParams.speed}x, delay=${context.currentParams.delay}s, loop=${context.currentParams.loop}, direction=${context.currentParams.direction}, easing=${context.currentParams.easing}`,
    '',
    `Request: "${prompt}"`,
  ].join('\n')

  try {
    const { output } = await generateText({
      model: anthropic('claude-haiku-4-5'),
      output: Output.object({ schema: AnimateResponseSchema }),
      system: SYSTEM,
      prompt: userMessage,
    })

    after(() => {
      try {
        getPostHogClient()?.capture({
          distinctId: 'server_ai',
          event:      'ai_animate_succeeded',
          properties: { presetId: output.presetId, promptLength: prompt.length },
        })
      } catch { /* non-critical */ }
    })

    return NextResponse.json(output)
  } catch (err) {
    console.error('[ai-animate]', err)
    return NextResponse.json(
      { error: 'Failed to generate animation. Please try again.' },
      { status: 500 }
    )
  }
}
