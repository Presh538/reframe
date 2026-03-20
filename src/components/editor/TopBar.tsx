'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { clsx } from 'clsx'
import { useEditorStore, selectCanExport } from '@/lib/store/editor'
import { runExport } from '@/lib/export/runExport'
import { SPRING } from '@/lib/motion'
import { useToast } from '@/components/ui/Toast'
import type { ExportFormat } from '@/types'

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: 'gif',    label: 'Export GIF' },
  { value: 'css',    label: 'Export CSS' },
  { value: 'lottie', label: 'Export Lottie' },
]

export function TopBar() {
  const [formatOpen, setFormatOpen] = useState(false)

  const format         = useEditorStore(s => s.format)
  const exportState    = useEditorStore(s => s.export)
  const activePresetId = useEditorStore(s => s.activePresetId)
  const params         = useEditorStore(s => s.params)
  const canExport      = useEditorStore(selectCanExport)
  const setFormat      = useEditorStore(s => s.setFormat)
  const setExportState = useEditorStore(s => s.setExportState)

  const { toast } = useToast()

  const handleExport = async () => {
    if (!canExport || !activePresetId) return
    setExportState({ isRunning: true, progress: 0, error: null })
    await runExport({
      format,
      activePresetId,
      params,
      onProgress: (p) => setExportState({ progress: p }),
      onError:    (msg) => { setExportState({ error: msg }); toast(msg, 'error') },
      onSuccess:  (msg) => toast(msg, 'success'),
    })
    setExportState({ isRunning: false, progress: 0 })
  }

  const exportLabel = exportState.isRunning
    ? (exportState.progress < 78 ? 'Capturing…' : 'Encoding…')
    : `Export ${format.toUpperCase()}`

  return (
    <motion.div
      className="absolute top-0 right-0 flex items-start px-4 pt-6 pointer-events-none z-30"
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING.entrance, delay: 0.03 }}
    >
      {/* ── Export button ──────────────────────────────────────── */}
      <div className="pointer-events-auto relative">
        <motion.div
          className="flex items-center gap-[6px] px-[14px] py-[9px] backdrop-blur-sm cursor-pointer"
          style={{
            borderRadius: 74,
            background: '#3f37c9',
            opacity: canExport ? 1 : 0.45,
            cursor: canExport && !exportState.isRunning ? 'pointer' : canExport ? 'default' : 'not-allowed',
            transition: 'opacity 0.2s',
          }}
          onClick={canExport && !exportState.isRunning ? handleExport : undefined}
          whileHover={canExport ? { scale: 1.02 } : undefined}
        >
          <span
            className="whitespace-nowrap"
            style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontWeight: 500, fontSize: 14, lineHeight: '20px', color: 'white' }}
          >
            {canExport ? exportLabel : 'Export GIF'}
          </span>

          <div
            className="w-[16px] h-[16px] flex items-center justify-center flex-shrink-0"
            onClick={e => { e.stopPropagation(); setFormatOpen(o => !o) }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 5L7 9L11 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </motion.div>

        <AnimatePresence>
          {formatOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setFormatOpen(false)} />
              <motion.div
                className="absolute right-0 top-[calc(100%+8px)] bg-white border border-[#e5e5e5] rounded-2xl shadow-xl overflow-hidden min-w-[160px] z-50"
                initial={{ opacity: 0, scale: 0.90, y: -8, filter: 'blur(6px)' }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.95, y: -4, filter: 'blur(3px)' }}
                transition={SPRING.dropdown}
                style={{ transformOrigin: 'top right' }}
              >
                {FORMATS.map((fmt, idx) => (
                  <motion.button
                    key={fmt.value}
                    onClick={() => { setFormat(fmt.value); setFormatOpen(false) }}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...SPRING.stagger, delay: idx * 0.05 }}
                    className={clsx(
                      'w-full text-left px-4 py-2.5 text-[14px] font-medium transition-colors block',
                      format === fmt.value
                        ? 'text-[#3f37c9] bg-[#3f37c9]/8'
                        : 'text-[#545454] hover:bg-[#f5f5f5]'
                    )}
                  >
                    {fmt.label}
                  </motion.button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
