import type { AnimParams } from '@/types'
import { EASING_CSS } from '@/types'
import { animateElement, animationDirection, injectKeyframes, iterationCount } from '@/lib/svg/animate'
import { AnimationPlanSchema, type AnimationPlan, type CustomKeyframe } from './schema'

const cssNumber = (value: number): string => Number(value.toFixed(3)).toString()

function keyframeDeclarations(frame: CustomKeyframe): string {
  const x = frame.x ?? 0
  const y = frame.y ?? 0
  const rotate = frame.rotate ?? 0
  const scaleX = frame.scaleX ?? 1
  const scaleY = frame.scaleY ?? 1
  const declarations = [
    `transform: translate(${cssNumber(x)}px, ${cssNumber(y)}px) rotate(${cssNumber(rotate)}deg) scale(${cssNumber(scaleX)}, ${cssNumber(scaleY)})`,
  ]
  if (frame.opacity !== undefined) declarations.push(`opacity: ${cssNumber(frame.opacity)}`)
  return declarations.join('; ')
}

/** Applies a validated AI motion plan through the same CSS metadata contract as presets. */
export function applyAnimationPlan(svgEl: SVGSVGElement, rawPlan: AnimationPlan, params: AnimParams): number {
  const plan = AnimationPlanSchema.parse(rawPlan)
  let applied = 0

  plan.tracks.forEach((track, index) => {
    const target = svgEl.querySelector<SVGElement>(`[data-rf-node="${track.targetId}"]`)
    if (!target) return

    const keyframeName = `rf-custom-${index}`
    const body = track.keyframes
      .map(frame => `${cssNumber(frame.offset * 100)}% { ${keyframeDeclarations(frame)} }`)
      .join('\n')
    injectKeyframes(svgEl, `@keyframes ${keyframeName} { ${body} }`)

    target.style.transformBox = 'fill-box'
    target.style.transformOrigin = `${cssNumber(track.origin.x * 100)}% ${cssNumber(track.origin.y * 100)}%`
    target.style.willChange = 'transform, opacity'

    const duration = (plan.duration / params.speed).toFixed(3)
    const delay = params.delay + track.delay
    // The global easing control remains authoritative so custom animations
    // respond to the editor exactly like presets do.
    const easing = EASING_CSS[params.easing] ?? EASING_CSS[track.easing]
    animateElement(
      target,
      `${keyframeName} ${duration}s ${delay.toFixed(3)}s ${iterationCount(params)} ${animationDirection(params)} both ${easing}`,
      delay,
    )
    applied++
  })

  if (applied === 0) throw new Error('The custom animation did not match any SVG layers')
  return applied
}
