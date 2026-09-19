import { z } from 'zod'

const finiteNumber = z.number().finite()

export const SceneNodeSchema = z.object({
  id: z.string().regex(/^rf-node-\d+$/),
  tag: z.enum(['g', 'path', 'circle', 'rect', 'ellipse', 'line', 'polyline', 'polygon', 'text']),
  parentId: z.string().regex(/^rf-node-\d+$/).nullable(),
  label: z.string().max(120),
  depth: z.number().int().min(0).max(16),
  childCount: z.number().int().min(0).max(500),
  bbox: z.object({
    x: finiteNumber,
    y: finiteNumber,
    width: finiteNumber.nonnegative(),
    height: finiteNumber.nonnegative(),
  }),
})

export const SceneManifestSchema = z.object({
  width: finiteNumber.positive(),
  height: finiteNumber.positive(),
  nodes: z.array(SceneNodeSchema).min(1).max(120),
})

export const CustomKeyframeSchema = z.object({
  offset: finiteNumber.min(0).max(1),
  x: finiteNumber.min(-2000).max(2000).optional(),
  y: finiteNumber.min(-2000).max(2000).optional(),
  rotate: finiteNumber.min(-1080).max(1080).optional(),
  scaleX: finiteNumber.min(0.05).max(10).optional(),
  scaleY: finiteNumber.min(0.05).max(10).optional(),
  opacity: finiteNumber.min(0).max(1).optional(),
}).strict()

export const CustomTrackSchema = z.object({
  targetId: z.string().regex(/^rf-node-\d+$/),
  origin: z.object({
    x: finiteNumber.min(0).max(1),
    y: finiteNumber.min(0).max(1),
  }).default({ x: 0.5, y: 0.5 }),
  delay: finiteNumber.min(0).max(10).default(0),
  easing: z.enum(['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'spring', 'back', 'snappy']),
  keyframes: z.array(CustomKeyframeSchema).min(2).max(16),
}).strict().superRefine((track, ctx) => {
  if (track.keyframes[0]?.offset !== 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'First keyframe offset must be 0', path: ['keyframes', 0, 'offset'] })
  }
  if (track.keyframes.at(-1)?.offset !== 1) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Last keyframe offset must be 1', path: ['keyframes', track.keyframes.length - 1, 'offset'] })
  }
  for (let i = 1; i < track.keyframes.length; i++) {
    if (track.keyframes[i].offset <= track.keyframes[i - 1].offset) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Keyframe offsets must increase', path: ['keyframes', i, 'offset'] })
    }
  }
})

export const AnimationPlanSchema = z.object({
  version: z.literal(1),
  name: z.string().min(1).max(80),
  duration: finiteNumber.min(0.2).max(20),
  tracks: z.array(CustomTrackSchema).min(1).max(40),
}).strict()

export type SceneNode = z.infer<typeof SceneNodeSchema>
export type SceneManifest = z.infer<typeof SceneManifestSchema>
export type CustomKeyframe = z.infer<typeof CustomKeyframeSchema>
export type CustomTrack = z.infer<typeof CustomTrackSchema>
export type AnimationPlan = z.infer<typeof AnimationPlanSchema>

/** Removes hallucinated targets and returns null when no executable tracks remain. */
export function constrainPlanToScene(plan: AnimationPlan, scene: SceneManifest | null): AnimationPlan | null {
  const validIds = new Set(scene?.nodes.map(node => node.id) ?? [])
  const tracks = plan.tracks.filter(track => validIds.has(track.targetId))
  return tracks.length > 0 ? { ...plan, tracks } : null
}
