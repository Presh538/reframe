import {
  AnimationPlanSchema,
  constrainPlanToScene,
  type AnimationPlan,
  type SceneManifest,
} from '@/lib/custom-animation/schema'

const PLAN: AnimationPlan = {
  version: 1,
  name: 'Walk cycle',
  duration: 1.2,
  tracks: [{
    targetId: 'rf-node-2',
    origin: { x: 0.5, y: 0.1 },
    delay: 0,
    easing: 'ease-in-out',
    keyframes: [
      { offset: 0, rotate: -18 },
      { offset: 0.5, rotate: 18 },
      { offset: 1, rotate: -18 },
    ],
  }],
}

const SCENE: SceneManifest = {
  width: 100,
  height: 100,
  nodes: [{
    id: 'rf-node-2', tag: 'path', parentId: null, label: 'left-leg',
    depth: 0, childCount: 0, bbox: { x: 20, y: 45, width: 20, height: 50 },
  }],
}

describe('Custom animation plan safety', () => {
  test('accepts a bounded transform-only plan', () => {
    expect(AnimationPlanSchema.parse(PLAN)).toEqual(PLAN)
  })

  test('rejects arbitrary CSS or script-shaped properties', () => {
    const unsafe = structuredClone(PLAN) as unknown as Record<string, unknown>
    const tracks = unsafe.tracks as Array<Record<string, unknown>>
    const keyframes = tracks[0].keyframes as Array<Record<string, unknown>>
    keyframes[0].css = 'url(javascript:alert(1))'
    expect(AnimationPlanSchema.safeParse(unsafe).success).toBe(false)
  })

  test('rejects unordered keyframe offsets', () => {
    const invalid = structuredClone(PLAN)
    invalid.tracks[0].keyframes[1].offset = 0
    expect(AnimationPlanSchema.safeParse(invalid).success).toBe(false)
  })

  test('removes target IDs that do not exist in the current SVG', () => {
    const plan = {
      ...PLAN,
      tracks: [
        ...PLAN.tracks,
        { ...PLAN.tracks[0], targetId: 'rf-node-99' },
      ],
    }
    expect(constrainPlanToScene(plan, SCENE)?.tracks).toHaveLength(1)
    expect(constrainPlanToScene(plan, SCENE)?.tracks[0].targetId).toBe('rf-node-2')
  })

  test('returns null when the plan has no valid targets', () => {
    const invalid = { ...PLAN, tracks: [{ ...PLAN.tracks[0], targetId: 'rf-node-99' }] }
    expect(constrainPlanToScene(invalid, SCENE)).toBeNull()
  })
})

