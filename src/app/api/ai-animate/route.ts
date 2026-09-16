/**
 * POST /api/ai-animate
 *
 * Interprets a natural-language animation prompt and returns a
 * specific preset + parameter set to apply to the SVG editor.
 *
 * Uses Claude Haiku via the Vercel AI SDK for fast, cheap structured output.
 */

import { randomUUID }              from 'crypto'
import { after, type NextRequest } from 'next/server'
import { NextResponse }            from 'next/server'
import { generateText, Output }    from 'ai'
import { anthropic }               from '@ai-sdk/anthropic'
import { z }                       from 'zod'
import { getPostHogClient }        from '@/lib/posthog-server'
import { checkRateLimit, RateLimitUnavailableError } from '@/lib/rate-limit'
import {
  AiMeterDeniedError,
  beginAiGeneration,
  refundAiGeneration,
  settleAiGeneration,
  type AiMeter,
} from '@/lib/billing/ai-metering'
import { AnimationPlanSchema, SceneManifestSchema, constrainPlanToScene } from '@/lib/custom-animation/schema'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// ── Response schema ───────────────────────────────────────────

const PresetIdSchema = z.enum([
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
])

const AnimParamsSchema = z.object({
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
})

const AnimateResponseSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('preset'),
    presetId: PresetIdSchema.describe('The preset that best matches the user request'),
    params: AnimParamsSchema,
    explanation: z.string().describe('One short sentence beginning with Applied or Set'),
  }),
  z.object({
    kind: z.literal('custom'),
    plan: AnimationPlanSchema,
    params: AnimParamsSchema,
    explanation: z.string().describe('One short sentence describing the coordinated custom motion'),
  }),
])

export type AnimateResponse = z.infer<typeof AnimateResponseSchema>

// ── Request schema ────────────────────────────────────────────

const RequestSchema = z.object({
  prompt: z.string().min(1).max(500),
  /** Per-submission key. Repeats must not charge a second credit. */
  idempotencyKey: z.string().uuid().optional(),
  context: z.object({
    currentPresetId: z.string().nullable(),
    currentPlan: AnimationPlanSchema.nullable().default(null),
    currentParams: AnimParamsSchema,
    svgLayers: z.object({
      groups: z.number(),
      paths:  z.number(),
      total:  z.number(),
    }).nullable(),
    svgFileName: z.string(),
    scene: SceneManifestSchema.nullable().default(null),
  }),
})

// ── System prompt ─────────────────────────────────────────────

const SYSTEM = `You are the motion director inside Reframe, a browser-native SVG animation tool.
Turn the user's request into either an existing preset or a safe custom multi-layer motion plan.

DECISION:
  - Return kind="preset" for a request that one preset already expresses well.
  - Return kind="custom" when the request needs coordinated parts, choreography, distinct directions,
    staged actions, or semantic movement such as walking, waving, nodding, orbiting, or assembling.
  - Never return custom merely to imitate an existing preset.
  - A custom track may target only IDs present in SCENE. Prefer top-level groups; do not animate both a
    parent and its descendants unless the requested motion clearly needs layered movement.
  - If the scene has no separable parts, use the closest honest whole-object preset.
  - When CURRENT CUSTOM PLAN exists and the user asks for a refinement (faster, softer, more dramatic,
    change the loop, etc.), preserve its targets and choreography unless the request explicitly changes them.

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

CUSTOM PLAN RULES:
  - duration is the length of one cycle, normally 0.6–3 seconds.
  - Every track begins at offset 0 and ends at offset 1; offsets strictly increase.
  - Use x/y in SVG display pixels, rotation in degrees, normalized transform origins from 0 to 1.
  - Make loops seamless: the final transform must equal the first transform.
  - For a walk/run cycle, counter-swing limbs, use hip/shoulder origins, and add subtle torso/head bob.
  - Keep motion tasteful: translations usually under 15% of the artwork size and rotations under 35°.
  - Never invent target IDs or output CSS, JavaScript, selectors, SVG, or path data.

PARAMETER RULES:
  - Keep params close to current values unless the request implies a change
  - "subtle" → speed 0.5–0.7, ease-in-out easing
  - "dramatic/bold" → speed 1.5–2, back or spring easing
  - "loop/continuous/idle" → loop: "loop"
  - "slow/gentle" → speed 0.5
  - "fast/snappy/quick" → speed 1.5–2.5, snappy easing
  - Custom cycles normally use loop="loop", direction="in", scope="all".
  - explanation starts with a verb: "Applied…", "Created…", or "Set…"`

// ── Error classification ──────────────────────────────────────

type AiFailure = { reason: string; userMessage: string; status: number }

/**
 * Maps an upstream AI error to (a) a precise `reason` for logs + analytics and
 * (b) a safe user-facing message.
 *
 * End users never see billing or configuration details — but the `reason` makes
 * the true cause obvious in server logs and in the PostHog `ai_animate_failed`
 * event, so "out of credits" is never again indistinguishable from "bad config".
 */
function classifyAiError(err: unknown): AiFailure {
  const e = err as { statusCode?: number; message?: string; responseBody?: string } | undefined
  const status = typeof e?.statusCode === 'number' ? e.statusCode : 0
  const text = `${e?.message ?? ''} ${e?.responseBody ?? ''}`.toLowerCase()

  const BUSY = 'The AI is busy right now — please try again in a moment.'
  const DOWN = 'AI features are temporarily unavailable. Please try again later.'

  // Billing first: Anthropic reports an exhausted balance as a 400, so the
  // message is the only reliable signal.
  if (text.includes('credit') || text.includes('billing') || text.includes('quota')) {
    return { reason: 'credits_exhausted', userMessage: DOWN, status: 503 }
  }
  if (status === 429) return { reason: 'rate_limited', userMessage: BUSY, status: 429 }
  if (status === 529 || status === 503) return { reason: 'overloaded', userMessage: BUSY, status: 503 }
  if (status === 401 || status === 403) return { reason: 'auth_invalid', userMessage: DOWN, status: 503 }
  // 404 = unknown model, or a base URL missing its /v1 segment.
  if (status === 404) return { reason: 'model_or_base_url_misconfigured', userMessage: DOWN, status: 503 }
  if (text.includes('timeout') || text.includes('aborted')) {
    return { reason: 'timeout', userMessage: BUSY, status: 503 }
  }
  return { reason: 'unknown', userMessage: DOWN, status: 500 }
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

  let rateLimit
  try {
    rateLimit = await checkRateLimit(request, { name: 'ai-animate', limit: 20, window: '10 m' })
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return NextResponse.json({ error: 'AI features are temporarily unavailable.' }, { status: 503 })
    }
    throw error
  }
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many AI requests — please wait a few minutes.' },
      { status: 429, headers: { 'Retry-After': String(Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000))) } },
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

  // Reserve billing capacity BEFORE spending anything upstream. A denial here
  // must never fall through to an unmetered generation.
  let meter: AiMeter
  try {
    meter = await beginAiGeneration(request, parsed.data.idempotencyKey ?? randomUUID())
  } catch (error) {
    if (error instanceof AiMeterDeniedError) {
      const { status, error: message, reason } = error.denial
      after(() => {
        try {
          getPostHogClient()?.capture({
            distinctId: 'server_ai',
            event:      'ai_animate_denied',
            properties: { reason, statusCode: status },
          })
        } catch { /* non-critical */ }
      })
      return NextResponse.json({ error: message, reason }, { status })
    }
    console.error('[ai-animate] metering failed', error)
    return NextResponse.json(
      { error: 'AI features are temporarily unavailable. Please try again later.' },
      { status: 503 },
    )
  }

  const userMessage = [
    `File: "${context.svgFileName || 'untitled.svg'}"`,
    context.svgLayers
      ? `SVG: ${context.svgLayers.total} elements (${context.svgLayers.groups} groups, ${context.svgLayers.paths} paths)`
      : 'SVG structure: unknown',
    `Current preset: ${context.currentPresetId ?? 'none'}`,
    context.currentPlan
      ? `CURRENT CUSTOM PLAN:\n${JSON.stringify(context.currentPlan)}`
      : 'CURRENT CUSTOM PLAN: none',
    `Current params: speed=${context.currentParams.speed}x, delay=${context.currentParams.delay}s, loop=${context.currentParams.loop}, direction=${context.currentParams.direction}, easing=${context.currentParams.easing}`,
    context.scene
      ? `SCENE (only these target IDs are valid):\n${JSON.stringify(context.scene)}`
      : 'SCENE: unavailable; return a preset',
    '',
    `Request: "${prompt}"`,
  ].join('\n')

  try {
    const { output: generated, usage, response } = await generateText({
      model: anthropic('claude-haiku-4-5'),
      output: Output.object({ schema: AnimateResponseSchema }),
      system: SYSTEM,
      prompt: userMessage,
    })

    // Defense in depth: structured output validates the ID format, while this
    // check ensures the model can only target nodes from this exact SVG.
    let output: AnimateResponse = generated
    if (generated.kind === 'custom') {
      const plan = constrainPlanToScene(generated.plan, context.scene)
      if (!plan) {
        // The user got nothing usable, so the credit goes back.
        await refundAiGeneration(meter, 'unusable_scene')
        return NextResponse.json(
          { error: 'I couldn’t identify independently movable parts in this SVG. Try grouping the illustration layers first.' },
          { status: 422 },
        )
      }
      output = { ...generated, plan }
    }

    await settleAiGeneration(meter, {
      inputTokens:  usage?.inputTokens,
      outputTokens: usage?.outputTokens,
      providerRequestId: response?.id,
    })

    after(() => {
      try {
        getPostHogClient()?.capture({
          distinctId: 'server_ai',
          event:      'ai_animate_succeeded',
          properties: {
            kind: output.kind,
            presetId: output.kind === 'preset' ? output.presetId : null,
            trackCount: output.kind === 'custom' ? output.plan.tracks.length : 0,
            promptLength: prompt.length,
          },
        })
      } catch { /* non-critical */ }
    })

    return NextResponse.json(output)
  } catch (err) {
    const { reason, userMessage, status } = classifyAiError(err)
    // Precise reason up front so the cause is obvious at a glance in logs.
    console.error(`[ai-animate] FAILED reason=${reason}`, err)

    // The generation failed, so the reservation must not become a charge.
    await refundAiGeneration(meter, reason)

    after(() => {
      try {
        getPostHogClient()?.capture({
          distinctId: 'server_ai',
          event:      'ai_animate_failed',
          properties: { reason, statusCode: status, promptLength: prompt.length },
        })
      } catch { /* non-critical */ }
    })

    return NextResponse.json({ error: userMessage }, { status })
  }
}
