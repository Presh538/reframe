import 'server-only'

/**
 * What an AI generation costs us, so margin is a measured number rather than a
 * guess.
 *
 * The usage row already stored input and output tokens; without rates nothing
 * could turn them into money, so `estimated_cost_micros` sat null and the
 * question "does a Pro subscriber pay for themselves" had no answer.
 *
 * Rates are per million tokens, in USD, and are a copy of published pricing --
 * they do not update themselves. Re-check them when changing model or when
 * Anthropic changes pricing; a stale rate here silently misreports margin
 * rather than failing.
 *
 * Checked 30 September 2026.
 */
const RATES_PER_MTOK: Record<string, { input: number; output: number }> = {
  'claude-haiku-4-5': { input: 1.0, output: 5.0 },
  'claude-sonnet-5-5': { input: 2.0, output: 10.0 },
  'claude-opus-5-5': { input: 4.0, output: 20.0 },
}

/** The model the animation route calls. Exported so pricing cannot drift from it. */
export const AI_ANIMATE_MODEL = 'claude-haiku-4-5'

/**
 * Cost of one generation in micros (millionths of a dollar), the unit
 * `usage_operation.estimated_cost_micros` stores.
 *
 * Returns undefined rather than 0 when it cannot be computed: 0 would record a
 * free generation, and an average taken over those would quietly understate
 * what the plan costs to serve.
 *
 * Cached input is not modelled. Prompt caching would make these figures an
 * overestimate, which is the safe direction, but revisit this when caching
 * lands or the saving will not show up in the numbers.
 */
export function estimateCostMicros(
  model: string,
  inputTokens: number | undefined,
  outputTokens: number | undefined,
): number | undefined {
  const rate = RATES_PER_MTOK[model]
  if (!rate) return undefined
  if (inputTokens === undefined && outputTokens === undefined) return undefined

  const dollars =
    ((inputTokens ?? 0) * rate.input + (outputTokens ?? 0) * rate.output) / 1_000_000

  return Math.round(dollars * 1_000_000)
}
