'use client'

import { useEditorStore } from '@/lib/store/editor'
import { getPreset } from '@/lib/presets'
import { Slider } from '@/components/ui/Slider'
import { Segmented } from '@/components/ui/Segmented'
import type { AnimParams } from '@/types'

export function ControlsPanel() {
  const params         = useEditorStore(s => s.params)
  const svgLayers      = useEditorStore(s => s.svgLayers)
  const activePresetId = useEditorStore(s => s.activePresetId)
  const isFragmented   = useEditorStore(s => s.isFragmented)
  const updateParam    = useEditorStore(s => s.updateParam)

  const activePreset = activePresetId ? getPreset(activePresetId) : null
  const set = <K extends keyof AnimParams>(key: K) => (value: AnimParams[K]) => updateParam(key, value)

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      {svgLayers && (
        <div className="flex items-center gap-3 px-3 h-[30px] border-b border-border bg-surface-2/40">
          <Stat label="G" value={svgLayers.groups} />
          <span className="text-[var(--text-very-faint)]">·</span>
          <Stat label="P" value={svgLayers.paths} />
          <span className="text-[var(--text-very-faint)]">·</span>
          <Stat label="S" value={svgLayers.shapes} />
          {isFragmented && (
            <>
              <span className="text-[var(--text-very-faint)]">·</span>
              <span className="text-2xs font-medium text-success">fragmented</span>
            </>
          )}
        </div>
      )}

      {!activePreset ? (
        <div className="p-4 text-center">
          <p className="text-xs text-muted leading-relaxed">Pick a preset to see controls</p>
        </div>
      ) : (
        <>
          <Section label="Timing">
            <PropRow label="Speed" value={`${params.speed}×`}>
              <Slider label="Speed" value={params.speed} min={0.25} max={3} step={0.25}
                displayValue={`${params.speed}×`} onChange={set('speed')} compact />
            </PropRow>
            <PropRow label="Delay" value={`${params.delay.toFixed(1)}s`}>
              <Slider label="Delay" value={params.delay} min={0} max={2} step={0.1}
                displayValue={`${params.delay.toFixed(1)}s`} onChange={set('delay')} compact />
            </PropRow>
          </Section>

          <Section label="Playback">
            <PropRow label="Loop">
              <Segmented
                options={[{value:'once',label:'Once'},{value:'loop',label:'Loop'},{value:'bounce',label:'Bounce'}]}
                value={params.loop} onChange={set('loop')} />
            </PropRow>
            <PropRow label="Direction">
              <Segmented
                options={[{value:'in',label:'In'},{value:'out',label:'Out'},{value:'in-out',label:'In↔Out'}]}
                value={params.direction} onChange={set('direction')} />
            </PropRow>
          </Section>

          <Section label="Target">
            <Segmented
              options={[{value:'all',label:'All'},{value:'groups',label:'Groups'},{value:'paths',label:'Paths'}]}
              value={params.scope} onChange={set('scope')} />
          </Section>

          <Section label="Preset">
            <p className="text-xs font-medium text-[var(--text)]">{activePreset.name}</p>
            <p className="text-2xs text-muted leading-relaxed mt-0.5">{activePreset.description}</p>
            <p className="text-2xs text-faint mt-1">{activePreset.category} · {activePreset.baseDuration}s base</p>
          </Section>
        </>
      )}
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-3 py-2.5 border-b border-border">
      <p className="text-2xs font-semibold uppercase tracking-[0.7px] text-faint mb-2">{label}</p>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function PropRow({ label, value, children }: { label: string; value?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-muted">{label}</span>
        {value && <span className="text-xs tabular-nums text-faint">{value}</span>}
      </div>
      {children}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span className="text-2xs text-muted">
      <span className="text-[var(--text-very-faint)]">{label} </span>
      <span className="font-medium text-muted">{value}</span>
    </span>
  )
}
