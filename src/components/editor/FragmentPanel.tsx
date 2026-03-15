'use client'

import { useEditorStore } from '@/lib/store/editor'
import { countFragments } from '@/lib/svg/fragment'
import { useToast } from '@/components/ui/Toast'

interface FragmentPanelProps {
  onClose: () => void
}

export function FragmentPanel({ onClose }: FragmentPanelProps) {
  const svgSource       = useEditorStore(s => s.svgSource)
  const isFragmented    = useEditorStore(s => s.isFragmented)
  const fragmentElements = useEditorStore(s => s.fragmentElements)
  const { toast } = useToast()

  const elementCount = svgSource ? countFragments(svgSource) : 0

  const handleFragment = () => {
    fragmentElements()
    toast('SVG fragmented — pick a preset to animate', 'success')
    onClose()
  }

  return (
    <>
      <div className="absolute inset-0 z-20" onClick={onClose} />
      <div className="absolute left-1/2 -translate-x-1/2 top-[68px] z-30 w-[280px] bg-surface/95 backdrop-blur border border-border rounded-2xl shadow-2xl overflow-hidden animate-pop-in">
        <div className="flex items-center px-4 h-[40px] border-b border-border">
          <span className="text-2xs font-semibold uppercase tracking-[0.7px] text-muted">Fragment Vectors</span>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-muted leading-relaxed">
            Splits compound paths and flattens nested groups so each element can be animated individually.
          </p>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-faint">Elements detected:</span>
            <span className="font-semibold text-[var(--text)]">{elementCount}</span>
            {isFragmented && (
              <span className="ml-auto text-success font-medium">Fragmented ✓</span>
            )}
          </div>
          <button
            onClick={handleFragment}
            disabled={!svgSource || isFragmented}
            className="w-full h-[36px] rounded-xl text-xs font-semibold bg-accent hover:bg-accent-hover text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isFragmented ? 'Already fragmented' : 'Fragment SVG'}
          </button>
        </div>
      </div>
    </>
  )
}
