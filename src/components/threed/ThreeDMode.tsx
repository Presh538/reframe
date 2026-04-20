'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SPRING } from '@/lib/motion'
import { useEditorStore } from '@/lib/store/editor'
import { useThreeDStore } from '@/lib/store/threed'
import { MATERIAL_OPTIONS, type MaterialStyle, type ThreeDAsset } from '@/lib/presets3d'
import { generateEmbed } from '@/lib/embed3d'
import { SceneRenderer, type SceneRendererRef, type CameraPreset } from './SceneRenderer'
import { LibraryBrowser } from '@/components/editor/LibraryBrowser'
import { Tooltip } from '@/components/ui/Tooltip'
import { useToast } from '@/components/ui/Toast'

// ── Constants ─────────────────────────────────────────────────────

// Scene-parameter defaults live in useThreeDStore's initial state.

type ExportStatus = 'idle' | 'rendering' | 'done' | 'error'
type Active3D     = 'speed' | 'delay' | 'depth' | 'light' | 'motion' | 'camera' | 'export' | 'bg' | null

// ── Shared pill styles — mirrors BottomBar ────────────────────────

const pillStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.6)',
  border: '1px solid white',
  borderRadius: 34,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '7px 10px',
  cursor: 'pointer',
  fontFamily: 'var(--font-geist-sans), sans-serif',
  fontWeight: 500,
  fontSize: 14,
  lineHeight: '20px',
  color: '#545454',
  whiteSpace: 'nowrap' as const,
  transition: 'background 0.12s',
  flexShrink: 0,
}

const pillActiveStyle: React.CSSProperties = {
  ...pillStyle,
  background: 'rgba(255,255,255,0.95)',
  border: '1px solid rgba(63,55,201,0.2)',
  boxShadow: '0 0 0 1.5px #3f37c9',
  color: '#3f37c9',
}

const iconPillStyle: React.CSSProperties = {
  ...pillStyle,
  padding: 9,
}

// ── Empty state (wraps LibraryBrowser + file upload) ─────────────

interface EmptyStateProps {
  onFileSelected: (asset: ThreeDAsset) => void
}

function EmptyState({ onFileSelected }: EmptyStateProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()

    if (file.type === 'image/svg+xml' || file.name.endsWith('.svg')) {
      reader.onload = ev => {
        const text = ev.target?.result
        if (typeof text === 'string')
          onFileSelected({ kind: 'svg', data: text, name: file.name })
      }
      reader.readAsText(file)
    } else {
      reader.onload = ev => {
        const url = ev.target?.result
        if (typeof url === 'string')
          onFileSelected({ kind: 'image', data: url, name: file.name })
      }
      reader.readAsDataURL(file)
    }
    e.target.value = ''
  }, [onFileSelected])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'absolute', inset: 0 }}
    >
      {/* Hidden file input — triggered by the LibraryBrowser's "Upload" button */}
      <input
        ref={inputRef}
        type="file"
        accept=".svg,image/svg+xml,image/png,image/jpeg,image/webp"
        style={{ display: 'none' }}
        onChange={handleChange}
      />

      <LibraryBrowser
        uploadLabel="Upload SVG or Image"
        onUpload={() => inputRef.current?.click()}
        onSelectSvg={(svg, name) => onFileSelected({ kind: 'svg', data: svg, name })}
      />
    </motion.div>
  )
}

// ── Popover (mirrors BottomBar popover) ───────────────────────────

function Popover({ children }: { children: React.ReactNode }) {
  return (
    <div
      // Stop mousedown from bubbling to the document-level click-outside handler,
      // which would otherwise close this popover the moment the user touches a slider.
      onMouseDown={e => e.stopPropagation()}
      style={{
        position: 'fixed',
        bottom: 72,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.90, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0,  scale: 1,    filter: 'blur(0px)' }}
        exit={{    opacity: 0, y: 8,  scale: 0.94, filter: 'blur(4px)' }}
        transition={SPRING.dropdown}
        style={{
          transformOrigin: 'center bottom',
          background: 'rgba(251,251,251,0.72)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(0,0,0,0.06)',
          borderRadius: 14,
          boxShadow: '0 8px 32px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.06)',
          padding: 16,
          minWidth: 200,
        }}
      >
        {children}
      </motion.div>
    </div>
  )
}

// ── Slider popover row ────────────────────────────────────────────

function SliderRow({
  label, min, max, step, value, onChange, unit = '',
}: {
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
  unit?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{
          fontFamily: 'var(--font-geist-sans), sans-serif',
          fontSize: 12, fontWeight: 600,
          color: '#888', letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          {label}
        </span>
        <span style={{
          fontFamily: 'var(--font-geist-mono, monospace)',
          fontSize: 12, color: '#aaa',
        }}>
          {value}{unit}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#3f37c9' }}
      />
    </div>
  )
}

// ── Divider ───────────────────────────────────────────────────────

function Divider() {
  return (
    <div style={{
      width: 1, height: 26,
      background: 'rgba(0,0,0,0.08)',
      flexShrink: 0, marginLeft: 2, marginRight: 2,
    }} />
  )
}

// ── Controls bar ──────────────────────────────────────────────────

interface ControlsProps {
  material:       MaterialStyle
  onMaterial:     (m: MaterialStyle) => void
  depth:          number
  onDepth:        (d: number) => void
  light:          number
  onLight:        (l: number) => void
  orbitSpeed:     number           // drag rotation sensitivity
  onOrbitSpeed:   (s: number) => void
  dampingFactor:  number           // orbit inertia / smoothness
  onDampingFactor:(d: number) => void
  isPlaying:      boolean
  motionType:     'spin' | 'float' | 'sway' | 'breathe' | 'wobble'
  onMotionType:   (t: 'spin' | 'float' | 'sway' | 'breathe' | 'wobble') => void
  onPlayToggle:   () => void
  exportStatus:   ExportStatus
  onExportGIF:    () => void
  onExportWebM:   () => void
  onResetView:    () => void
  onOpenLibrary:  () => void
  onSnapCamera:   (preset: CameraPreset) => void
  onCopyEmbed:    () => void
  isSvgAsset:     boolean
  bgColor:        string
  onBgColor:      (c: string) => void
}

const MOTION_OPTIONS: { id: 'spin' | 'float' | 'sway' | 'breathe' | 'wobble'; label: string; icon: React.ReactNode }[] = [
  { id: 'spin',    label: 'Spin',    icon: <MotionSpinIcon />    },
  { id: 'float',   label: 'Float',   icon: <MotionFloatIcon />   },
  { id: 'sway',    label: 'Sway',    icon: <MotionSwayIcon />    },
  { id: 'breathe', label: 'Breathe', icon: <MotionBreatheIcon /> },
  { id: 'wobble',  label: 'Wobble',  icon: <MotionWobbleIcon />  },
]

function Controls({
  material, onMaterial,
  depth, onDepth,
  light, onLight,
  orbitSpeed, onOrbitSpeed,
  dampingFactor, onDampingFactor,
  isPlaying, motionType, onMotionType, onPlayToggle,
  exportStatus, onExportGIF, onExportWebM,
  onResetView, onOpenLibrary, onSnapCamera,
  onCopyEmbed, isSvgAsset,
  bgColor, onBgColor,
}: ControlsProps) {
  const [active, setActive] = useState<Active3D>(null)
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setActive(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (c: Active3D) => setActive(prev => prev === c ? null : c)

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
      <motion.div
        ref={barRef}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING.entrance, delay: 0.05 }}
      >
        {/* ── Popovers ── */}
        <AnimatePresence>
          {active === 'speed' && (
            <Popover key="speed">
              <SliderRow
                label="Orbit Speed"
                min={0.3} max={3} step={0.1}
                value={orbitSpeed}
                onChange={onOrbitSpeed}
                unit="x"
              />
            </Popover>
          )}
          {active === 'delay' && (
            <Popover key="delay">
              <SliderRow
                label="Damping"
                min={0.01} max={0.25} step={0.01}
                value={dampingFactor}
                onChange={onDampingFactor}
              />
            </Popover>
          )}
          {active === 'depth' && (
            <Popover key="depth">
              <SliderRow
                label="Extrusion Depth"
                min={6} max={80} step={2}
                value={depth}
                onChange={onDepth}
              />
            </Popover>
          )}
          {active === 'light' && (
            <Popover key="light">
              <SliderRow
                label="Light Intensity"
                min={0.3} max={2} step={0.1}
                value={light}
                onChange={onLight}
              />
            </Popover>
          )}
          {active === 'camera' && (
            <Popover key="camera">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: 11, fontWeight: 600, color: '#888', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '2px 0 4px' }}>Camera Angle</span>
                {(['front', 'three-quarter', 'side', 'top'] as CameraPreset[]).map(preset => (
                  <button
                    key={preset}
                    onClick={() => { onSnapCamera(preset); setActive(null) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: 'transparent',
                      fontFamily: 'var(--font-geist-sans), sans-serif',
                      fontSize: 13, fontWeight: 500, color: '#545454',
                      transition: 'background 0.12s',
                      textTransform: 'capitalize',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {preset.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </Popover>
          )}
          {active === 'export' && (
            <Popover key="export">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: 11, fontWeight: 600, color: '#888', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '2px 0 4px' }}>Export As</span>
                <button onClick={() => { onExportGIF(); setActive(null) }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: 13, fontWeight: 500, color: '#545454', transition: 'background 0.12s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  GIF (transparent)
                </button>
                <button onClick={() => { onExportWebM(); setActive(null) }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: 13, fontWeight: 500, color: '#545454', transition: 'background 0.12s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  WebM (video)
                </button>
              </div>
            </Popover>
          )}
          {active === 'bg' && (
            <Popover key="bg">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: 11, fontWeight: 600, color: '#888', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Export Background</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {/* Transparent option */}
                  <button
                    onClick={() => onBgColor('transparent')}
                    style={{
                      width: 28, height: 28, borderRadius: 7, border: bgColor === 'transparent' ? '2px solid #3f37c9' : '2px solid rgba(0,0,0,0.12)',
                      background: 'white', cursor: 'pointer', position: 'relative', overflow: 'hidden',
                      boxShadow: bgColor === 'transparent' ? '0 0 0 1px #3f37c9' : 'none',
                    }}
                    title="Transparent"
                  >
                    <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-conic-gradient(#ddd 0% 25%, white 0% 50%)', backgroundSize: '8px 8px' }} />
                  </button>
                  {/* Color swatch */}
                  <div style={{ position: 'relative' }}>
                    <button
                      style={{
                        width: 28, height: 28, borderRadius: 7, border: bgColor !== 'transparent' ? '2px solid #3f37c9' : '2px solid rgba(0,0,0,0.12)',
                        background: bgColor !== 'transparent' ? bgColor : '#1a1a2e',
                        cursor: 'pointer',
                        boxShadow: bgColor !== 'transparent' ? '0 0 0 1px #3f37c9' : 'none',
                      }}
                      onClick={() => document.getElementById('3d-bg-picker')?.click()}
                    />
                    <input
                      id="3d-bg-picker"
                      type="color"
                      defaultValue={bgColor !== 'transparent' ? bgColor : '#1a1a2e'}
                      onChange={e => onBgColor(e.target.value)}
                      style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
                    />
                  </div>
                  <span style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: 12, color: '#888' }}>
                    {bgColor === 'transparent' ? 'Transparent' : bgColor}
                  </span>
                </div>
              </div>
            </Popover>
          )}
          {active === 'motion' && (
            <Popover key="motion">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{
                  fontFamily: 'var(--font-geist-sans), sans-serif',
                  fontSize: 12, fontWeight: 600,
                  color: '#888', letterSpacing: '0.06em',
                  textTransform: 'uppercase', marginBottom: 4,
                }}>
                  Motion Style
                </span>
                {MOTION_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { onMotionType(opt.id) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: motionType === opt.id ? 'rgba(63,55,201,0.08)' : 'transparent',
                      fontFamily: 'var(--font-geist-sans), sans-serif',
                      fontSize: 13, fontWeight: 500,
                      color: motionType === opt.id ? '#3f37c9' : '#545454',
                      transition: 'background 0.12s, color 0.12s',
                    }}
                    onMouseEnter={e => { if (motionType !== opt.id) e.currentTarget.style.background = 'rgba(0,0,0,0.04)' }}
                    onMouseLeave={e => { if (motionType !== opt.id) e.currentTarget.style.background = 'transparent' }}
                  >
                    <span style={{ opacity: motionType === opt.id ? 1 : 0.55, flexShrink: 0 }}>{opt.icon}</span>
                    {opt.label}
                    {motionType === opt.id && (
                      <span style={{ marginLeft: 'auto', fontSize: 10, color: '#3f37c9', fontWeight: 600, opacity: 0.7 }}>
                        active
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </Popover>
          )}
        </AnimatePresence>

        {/* ── Main bar ── */}
        <div
          className="flex items-center gap-[6px] px-[6px] py-[5px] backdrop-blur-md"
          style={{ borderRadius: 74, background: 'rgba(251,251,251,0.6)' }}
        >
          {/* Material toggle — Flat / Glass */}
          <div style={{
            display: 'flex', gap: 3,
            background: 'rgba(0,0,0,0.05)',
            borderRadius: 10, padding: 3,
          }}>
            {MATERIAL_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => onMaterial(opt.id)}
                style={{
                  borderRadius: 8, padding: '4px 12px', border: 'none',
                  fontFamily: 'var(--font-geist-sans), sans-serif',
                  fontSize: 14, fontWeight: 500, cursor: 'pointer',
                  background: material === opt.id ? 'white' : 'transparent',
                  color:      material === opt.id ? '#3f37c9' : '#545454',
                  boxShadow:  material === opt.id ? '0 0 0 1.5px #3f37c9' : 'none',
                  transition: 'background 0.12s, color 0.12s, box-shadow 0.12s',
                  lineHeight: '20px',
                }}
              >
                {opt.name}
              </button>
            ))}
          </div>

          <Divider />

          {/* Speed */}
          <Tooltip label="Rotation speed" disabled={active === 'speed'}>
            <motion.button
              style={active === 'speed' ? pillActiveStyle : pillStyle}
              onClick={() => toggle('speed')}
              initial="rest" whileHover="hover"
            >
              <SpeedometerIcon color={active === 'speed' ? '#3f37c9' : '#AFAFAF'} />
              Speed
            </motion.button>
          </Tooltip>

          {/* Delay */}
          <Tooltip label="Orbit damping" disabled={active === 'delay'}>
            <motion.button
              style={active === 'delay' ? pillActiveStyle : pillStyle}
              onClick={() => toggle('delay')}
              initial="rest" whileHover="hover"
            >
              <DelayIcon color={active === 'delay' ? '#3f37c9' : '#AFAFAF'} />
              Delay
            </motion.button>
          </Tooltip>

          {/* Depth */}
          <Tooltip label="Extrusion depth" disabled={active === 'depth'}>
            <motion.button
              style={active === 'depth' ? pillActiveStyle : pillStyle}
              onClick={() => toggle('depth')}
              initial="rest" whileHover="hover"
            >
              <DepthIcon color={active === 'depth' ? '#3f37c9' : '#AFAFAF'} />
              Depth
            </motion.button>
          </Tooltip>

          {/* Light */}
          <Tooltip label="Light intensity" disabled={active === 'light'}>
            <motion.button
              style={active === 'light' ? pillActiveStyle : pillStyle}
              onClick={() => toggle('light')}
              initial="rest" whileHover="hover"
            >
              <LightIcon color={active === 'light' ? '#3f37c9' : '#AFAFAF'} />
              Light
            </motion.button>
          </Tooltip>

          <Divider />

          {/* Motion type selector */}
          <Tooltip label="Motion style" disabled={active === 'motion'}>
            <motion.button
              style={active === 'motion' ? pillActiveStyle : (isPlaying ? { ...pillStyle, color: '#3f37c9' } : pillStyle)}
              onClick={() => toggle('motion')}
              initial="rest" whileHover="hover"
            >
              <MotionIcon color={active === 'motion' || isPlaying ? '#3f37c9' : '#AFAFAF'} />
              Motion
            </motion.button>
          </Tooltip>

          <Divider />

          {/* Zoom / Reset view — shows 100% as placeholder */}
          <Tooltip label="Reset view">
            <motion.button
              style={pillStyle}
              onClick={onResetView}
              initial="rest" whileHover="hover"
            >
              <ZoomIcon />
              <span style={{ minWidth: 32, textAlign: 'center' }}>100%</span>
            </motion.button>
          </Tooltip>

          {/* Camera presets */}
          <Tooltip label="Camera angle" disabled={active === 'camera'}>
            <motion.button
              style={active === 'camera' ? pillActiveStyle : pillStyle}
              onClick={() => toggle('camera')}
              initial="rest" whileHover="hover"
            >
              <CameraIcon color={active === 'camera' ? '#3f37c9' : '#AFAFAF'} />
              View
            </motion.button>
          </Tooltip>

          {/* Background color */}
          <Tooltip label="Export background" disabled={active === 'bg'}>
            <motion.button
              style={active === 'bg' ? pillActiveStyle : iconPillStyle}
              onClick={() => toggle('bg')}
              initial="rest" whileHover="hover"
            >
              <div style={{
                width: 16, height: 16, borderRadius: 4,
                background: bgColor === 'transparent'
                  ? 'repeating-conic-gradient(#aaa 0% 25%, white 0% 50%)'
                  : bgColor,
                backgroundSize: '8px 8px',
                border: '1px solid rgba(0,0,0,0.15)',
                flexShrink: 0,
              }} />
            </motion.button>
          </Tooltip>

          {/* Library — browse SVG templates */}
          <Tooltip label="Browse templates">
            <motion.button
              style={iconPillStyle}
              onClick={onOpenLibrary}
              initial="rest" whileHover="hover"
            >
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="1" width="5" height="5" rx="1.5" fill="#AFAFAF"/>
                <rect x="8" y="1" width="5" height="5" rx="1.5" fill="#AFAFAF"/>
                <rect x="1" y="8" width="5" height="5" rx="1.5" fill="#AFAFAF"/>
                <rect x="8" y="8" width="5" height="5" rx="1.5" fill="#AFAFAF"/>
              </svg>
            </motion.button>
          </Tooltip>

          {/* Reset view */}
          <Tooltip label="Reset camera">
            <motion.button
              style={iconPillStyle}
              onClick={onResetView}
              initial="rest" whileHover="hover"
            >
              <ResetIcon />
            </motion.button>
          </Tooltip>

          {/* Export dropdown */}
          <Tooltip label="Export" disabled={active === 'export'}>
            <motion.button
              style={active === 'export' ? { ...iconPillStyle, background: 'rgba(63,55,201,0.1)', border: '1px solid rgba(63,55,201,0.2)' } : iconPillStyle}
              onClick={() => toggle('export')}
              initial="rest" whileHover="hover"
            >
              <ExportIcon color={active === 'export' ? '#3f37c9' : '#AFAFAF'} />
            </motion.button>
          </Tooltip>

          {/* Embed CTA — hero button for SVG assets */}
          {isSvgAsset && (
            <Tooltip label="Copy live 3D embed code">
              <motion.button
                onClick={onCopyEmbed}
                initial="rest" whileHover="hover"
                whileTap={{ scale: 0.92 }}
                transition={SPRING.snappy}
                style={{
                  ...pillStyle,
                  background: 'linear-gradient(135deg, #3f37c9 0%, #6c63ff 100%)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: 'white',
                  padding: '7px 14px',
                  boxShadow: '0 2px 12px rgba(63,55,201,0.35)',
                  fontWeight: 600,
                  gap: 5,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <path d="M4 5L1.5 7L4 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 5L12.5 7L10 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 2.5L6 11.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Embed
              </motion.button>
            </Tooltip>
          )}

          {/* Play / Pause */}
          <Tooltip label={isPlaying ? `Pause ${motionType}` : `Play ${motionType}`} kbd="⎵">
            <motion.button
              style={{
                ...iconPillStyle,
                background: exportStatus === 'rendering'
                  ? 'rgba(63,55,201,0.5)'
                  : '#3f37c9',
                border: '1px solid white',
                cursor: exportStatus !== 'idle' ? 'default' : 'pointer',
              }}
              onClick={exportStatus === 'idle' ? onPlayToggle : undefined}
              initial="rest"
              whileHover={exportStatus === 'idle' ? { scale: 1.06 } : {}}
              whileTap={exportStatus === 'idle' ? { scale: 0.84 } : {}}
              transition={SPRING.snappy}
            >
              {exportStatus === 'rendering' ? <SpinnerIcon /> : isPlaying ? <PauseIcon /> : <PlayIcon />}
            </motion.button>
          </Tooltip>
        </div>
      </motion.div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────

export interface ThreeDModeProps {
  onExportReady?:      (fn: () => void) => void
  onCopyEmbedReady?:   (fn: () => void) => void
  onAssetChange?:      (hasAsset: boolean, fileName?: string, kind?: 'svg' | 'image') => void
  onRequestFileInput?: (fn: () => void) => void
}

export function ThreeDMode({ onExportReady, onCopyEmbedReady, onAssetChange, onRequestFileInput }: ThreeDModeProps) {
  const svgSource   = useEditorStore(s => s.svgSource)
  const svgFileName = useEditorStore(s => s.svgFileName)

  // ── Scene params from shared 3D store (panels can also write here) ─
  const material         = useThreeDStore(s => s.material)
  const depth            = useThreeDStore(s => s.depth)
  const light            = useThreeDStore(s => s.light)
  const orbitSpeed       = useThreeDStore(s => s.orbitSpeed)
  const dampingFactor    = useThreeDStore(s => s.dampingFactor)
  const isPlaying        = useThreeDStore(s => s.isPlaying)
  const motionType       = useThreeDStore(s => s.motionType)
  const setMaterial      = useThreeDStore(s => s.setMaterial)
  const setDepth         = useThreeDStore(s => s.setDepth)
  const setLight         = useThreeDStore(s => s.setLight)
  const setOrbitSpeed    = useThreeDStore(s => s.setOrbitSpeed)
  const setDampingFactor = useThreeDStore(s => s.setDampingFactor)
  const setIsPlaying     = useThreeDStore(s => s.setIsPlaying)
  const togglePlaying    = useThreeDStore(s => s.togglePlaying)
  const setMotionType    = useThreeDStore(s => s.setMotionType)

  // ── Local state (asset + export UI) ──────────────────────────────
  const [asset,          setAsset]          = useState<ThreeDAsset | null>(null)
  const [exportStatus,   setExportStatus]   = useState<ExportStatus>('idle')
  const [exportProgress, setExportProgress] = useState(0)
  const [isLibraryOpen,  setIsLibraryOpen]  = useState(false)
  const [bgColor,        setBgColor]        = useState<string>('transparent')
  const { toast } = useToast()

  const sceneRef = useRef<SceneRendererRef>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Bootstrap from editor store SVG
  useEffect(() => {
    if (svgSource && !asset) {
      setAsset({ kind: 'svg', data: svgSource, name: svgFileName ?? 'upload.svg' })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── GIF export ────────────────────────────────────────────────
  const handleExportGIF = useCallback(async () => {
    if (!sceneRef.current || exportStatus !== 'idle') return
    // Pause the preview so captureGIF owns the turntable, restore after
    const wasPlaying = isPlaying
    setIsPlaying(false)
    setExportStatus('rendering')
    setExportProgress(0)
    try {
      const blob = await sceneRef.current.captureGIF(72, 24, p => setExportProgress(p))
      const url  = URL.createObjectURL(blob)
      const a    = Object.assign(document.createElement('a'), {
        href: url,
        download: `reframe-3d-${asset?.name?.replace(/\.[^.]+$/, '') ?? 'export'}.gif`,
      })
      a.click()
      URL.revokeObjectURL(url)
      setExportStatus('done')
      setTimeout(() => { setExportStatus('idle'); if (wasPlaying) setIsPlaying(true) }, 2400)
    } catch {
      setExportStatus('error')
      setTimeout(() => { setExportStatus('idle'); if (wasPlaying) setIsPlaying(true) }, 2400)
    }
  }, [exportStatus, asset, isPlaying, setIsPlaying])

  // Register export function with parent
  useEffect(() => {
    onExportReady?.(handleExportGIF)
  }, [onExportReady, handleExportGIF])

  // Notify parent when asset presence changes (pass name + kind for toolbar)
  useEffect(() => {
    onAssetChange?.(asset !== null, asset?.name, asset?.kind)
  }, [asset, onAssetChange])

  // Expose file-picker trigger to parent (for the TopBar "Change" button)
  useEffect(() => {
    onRequestFileInput?.(() => inputRef.current?.click())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRequestFileInput])

  // ── WebM export ───────────────────────────────────────────────
  const handleExportWebM = useCallback(async () => {
    if (!sceneRef.current || exportStatus !== 'idle') return
    const wasPlaying = isPlaying
    setIsPlaying(false)
    setExportStatus('rendering')
    setExportProgress(0)
    try {
      const blob = await sceneRef.current.captureWebM(90, 30, p => setExportProgress(p))
      const url  = URL.createObjectURL(blob)
      const a    = Object.assign(document.createElement('a'), {
        href: url,
        download: `reframe-3d-${asset?.name?.replace(/\.[^.]+$/, '') ?? 'export'}.webm`,
      })
      a.click()
      URL.revokeObjectURL(url)
      setExportStatus('done')
      setTimeout(() => { setExportStatus('idle'); if (wasPlaying) setIsPlaying(true) }, 2400)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'WebM export failed', 'error')
      setExportStatus('error')
      setTimeout(() => { setExportStatus('idle'); if (wasPlaying) setIsPlaying(true) }, 2400)
    }
  }, [exportStatus, asset, isPlaying, setIsPlaying, toast])

  // ── Camera preset snap ────────────────────────────────────────
  const handleSnapCamera = useCallback((preset: CameraPreset) => {
    sceneRef.current?.snapCamera(preset)
  }, [])

  // ── Embed copy ────────────────────────────────────────────────
  const handleCopyEmbed = useCallback(async () => {
    if (!asset || asset.kind !== 'svg') return
    try {
      await navigator.clipboard.writeText(
        generateEmbed({ svgSource: asset.data, materialStyle: material, depth })
      )
      toast('Embed code copied!', 'success')
    } catch {
      toast('Could not copy to clipboard', 'error')
    }
  }, [asset, material, depth, toast])

  // Register embed copy function with parent (so TopBar dropdown can trigger it)
  useEffect(() => {
    onCopyEmbedReady?.(handleCopyEmbed)
  }, [onCopyEmbedReady, handleCopyEmbed])

  // ── File reading ──────────────────────────────────────────────
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    if (file.type === 'image/svg+xml' || file.name.endsWith('.svg')) {
      reader.onload = ev => {
        const text = ev.target?.result
        if (typeof text === 'string') setAsset({ kind: 'svg', data: text, name: file.name })
      }
      reader.readAsText(file)
    } else {
      reader.onload = ev => {
        const url = ev.target?.result
        if (typeof url === 'string') setAsset({ kind: 'image', data: url, name: file.name })
      }
      reader.readAsDataURL(file)
    }
    e.target.value = ''
  }, [])

  // ── Export progress overlay ───────────────────────────────────
  const isExporting = exportStatus === 'rendering'

  // ── Keyboard: space = play / pause preview rotation ───────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat &&
          !(e.target instanceof HTMLInputElement) &&
          !(e.target instanceof HTMLTextAreaElement) &&
          asset !== null) {
        e.preventDefault()
        togglePlaying()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [asset, togglePlaying])

  return (
    <motion.div
      key="threed-mode"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      style={{ position: 'absolute', inset: 0, background: 'var(--bg, #f5f5f5)', zIndex: 10 }}
    >
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept=".svg,image/svg+xml,image/png,image/jpeg,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <AnimatePresence mode="wait">
        {asset ? (
          <motion.div
            key="canvas"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0 }}
          >
            <SceneRenderer
              ref={sceneRef}
              asset={asset}
              materialStyle={material}
              depth={depth}
              lightIntensity={light}
              orbitSpeed={orbitSpeed}
              dampingFactor={dampingFactor}
              autoRotate={isPlaying}
              motionType={motionType}
            />
          </motion.div>
        ) : (
          <EmptyState key="empty" onFileSelected={setAsset} />
        )}
      </AnimatePresence>

      {/* Export progress overlay */}
      <AnimatePresence>
        {isExporting && (
          <motion.div
            key="export-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              background: 'rgba(245,245,245,0.7)',
              backdropFilter: 'blur(8px)',
              zIndex: 30,
              gap: 12,
            }}
          >
            <p style={{
              fontFamily: 'var(--font-geist-sans), sans-serif',
              fontSize: 14, fontWeight: 600, color: '#3f37c9', margin: 0,
            }}>
              Rendering GIF… {Math.round(exportProgress * 100)}%
            </p>
            <div style={{
              width: 200, height: 4,
              background: 'rgba(63,55,201,0.15)',
              borderRadius: 99, overflow: 'hidden',
            }}>
              <motion.div
                style={{ height: '100%', background: '#3f37c9', borderRadius: 99 }}
                animate={{ width: `${exportProgress * 100}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <AnimatePresence>
        {asset && (
          <Controls
            key="controls"
            material={material}        onMaterial={setMaterial}
            depth={depth}              onDepth={setDepth}
            light={light}              onLight={setLight}
            orbitSpeed={orbitSpeed}    onOrbitSpeed={setOrbitSpeed}
            dampingFactor={dampingFactor} onDampingFactor={setDampingFactor}
            isPlaying={isPlaying}      motionType={motionType}  onMotionType={setMotionType}
            onPlayToggle={togglePlaying}
            exportStatus={exportStatus} onExportGIF={handleExportGIF} onExportWebM={handleExportWebM}
            onResetView={() => sceneRef.current?.resetView()}
            onOpenLibrary={() => setIsLibraryOpen(true)}
            onSnapCamera={handleSnapCamera}
            bgColor={bgColor} onBgColor={setBgColor}
            onCopyEmbed={handleCopyEmbed}
            isSvgAsset={asset?.kind === 'svg'}
          />
        )}
      </AnimatePresence>

      {/* Library browser — mid-session overlay */}
      <AnimatePresence>
        {isLibraryOpen && (
          <LibraryBrowser
            key="3d-library"
            isModal
            onClose={() => setIsLibraryOpen(false)}
            uploadLabel="Upload SVG or Image"
            onUpload={() => { setIsLibraryOpen(false); inputRef.current?.click() }}
            onSelectSvg={(svg, name) => { setAsset({ kind: 'svg', data: svg, name }); setIsLibraryOpen(false) }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────

function CameraIcon({ color = '#AFAFAF' }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="5" width="14" height="9" rx="2" stroke={color} strokeWidth="1.4"/>
      <circle cx="8" cy="9.5" r="2.5" stroke={color} strokeWidth="1.3"/>
      <path d="M5 5V4a1 1 0 011-1h4a1 1 0 011 1v1" stroke={color} strokeWidth="1.3"/>
    </svg>
  )
}

function ExportIcon({ color = '#AFAFAF' }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2v8M5 7l3 3 3-3" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 12h12" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function SpeedometerIcon({ color = '#AFAFAF' }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M 1.5,11.5 A 6.5,6.5 0 0,1 14.5,11.5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="1.5" y1="11.5" x2="2.6" y2="8.9" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="14.5" y1="11.5" x2="13.4" y2="8.9" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="8" y1="11.5" x2="8" y2="4.5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="8" cy="11.5" r="1.5" fill={color}/>
    </svg>
  )
}

function DelayIcon({ color = '#AFAFAF' }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="9" r="5.5" stroke={color} strokeWidth="1.5"/>
      <path d="M8 6v3l2 1.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 2h4" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function DepthIcon({ color = '#AFAFAF' }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="6" width="8" height="8" rx="1" stroke={color} strokeWidth="1.5"/>
      <path d="M6 6V4m0 0h6v6h-2" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 4L10 2h4v4L10 4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function LightIcon({ color = '#AFAFAF' }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="3" stroke={color} strokeWidth="1.5"/>
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"
        stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function ZoomIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M9.16667 3.125C5.82995 3.125 3.125 5.82995 3.125 9.16667C3.125 12.5034 5.82995 15.2083 9.16667 15.2083C10.7906 15.2083 12.2637 14.5638 13.3481 13.5168L13.5168 13.3481C14.5638 12.2637 15.2083 10.7906 15.2083 9.16667C15.2083 5.82995 12.5034 3.125 9.16667 3.125ZM1.875 9.16667C1.875 5.13959 5.13959 1.875 9.16667 1.875C13.1937 1.875 16.4583 5.13959 16.4583 9.16667C16.4583 10.9518 15.8217 12.5889 14.7654 13.8722L17.9464 17.0533C18.1905 17.2973 18.1905 17.6927 17.9464 17.9367C17.7024 18.1808 17.307 18.1808 17.063 17.9367L13.8819 14.7557C12.5986 15.812 11.0216 16.4583 9.16667 16.4583C5.13959 16.4583 1.875 13.1937 1.875 9.16667ZM9.16667 6.45833C9.51184 6.45833 9.79167 6.73816 9.79167 7.08333V8.54167H11.25C11.5952 8.54167 11.875 8.82149 11.875 9.16667C11.875 9.51184 11.5952 9.79167 11.25 9.79167H9.79167V11.25C9.79167 11.5952 9.51184 11.875 9.16667 11.875C8.82149 11.875 8.54167 11.5952 8.54167 11.25V9.79167H7.08333C6.73816 9.79167 6.45833 9.51184 6.45833 9.16667C6.45833 8.82149 6.73816 8.54167 7.08333 8.54167H8.54167V7.08333C8.54167 6.73816 8.82149 6.45833 9.16667 6.45833Z" fill="#AFAFAF"/>
    </svg>
  )
}

function ResetIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"
        stroke="#AFAFAF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 3v5h5" stroke="#AFAFAF" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}


function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
      <path d="M7 5.5L15 10L7 14.5V5.5Z" fill="white"/>
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <g>
        <animateTransform attributeName="transform" type="rotate"
          from="0 12 12" to="360 12 12" dur="0.7s" repeatCount="indefinite"/>
        <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5"/>
        <path d="M12 3a9 9 0 0 1 9 9" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      </g>
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
      <rect x="6" y="5" width="3" height="10" rx="1" fill="white"/>
      <rect x="11" y="5" width="3" height="10" rx="1" fill="white"/>
    </svg>
  )
}

// ── Motion type icons (shown in pill + popover) ───────────────────

function MotionIcon({ color = '#AFAFAF' }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 5.5C12 6.88071 10.8807 8 9.5 8C8.11929 8 7 6.88071 7 5.5M12 5.5C12 4.11929 10.8807 3 9.5 3C8.11929 3 7 4.11929 7 5.5M12 5.5H21M7 5.5H3M19 12C19 13.3807 17.8807 14.5 16.5 14.5C15.1193 14.5 14 13.3807 14 12M19 12C19 10.6193 17.8807 9.5 16.5 9.5C15.1193 9.5 14 10.6193 14 12M19 12H21M14 12H3M10 18.5C10 19.8807 8.88071 21 7.5 21C6.11929 21 5 19.8807 5 18.5M10 18.5C10 17.1193 8.88071 16 7.5 16C6.11929 16 5 17.1193 5 18.5M10 18.5H21M5 18.5H3" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function MotionSpinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M13.5 8A5.5 5.5 0 1 1 10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M10 1v3.5H13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function MotionFloatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      {/* Object */}
      <rect x="4" y="6" width="8" height="5" rx="1.5" fill="currentColor" opacity="0.9"/>
      {/* Up arrow */}
      <path d="M8 3.5V1.5M6.5 3 L8 1.5 L9.5 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Shadow ellipse */}
      <ellipse cx="8" cy="13" rx="3.5" ry="1" stroke="currentColor" strokeWidth="1.1" opacity="0.4"/>
    </svg>
  )
}

function MotionSwayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      {/* Centre bar */}
      <rect x="5" y="6" width="6" height="4" rx="1.2" fill="currentColor" opacity="0.9"/>
      {/* Left arc */}
      <path d="M3 8 Q1.5 4 3 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.4"/>
      {/* Right arc */}
      <path d="M13 8 Q14.5 4 13 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.4"/>
      {/* Pendulum pin */}
      <line x1="8" y1="1" x2="8" y2="5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
    </svg>
  )
}

function MotionBreatheIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      {/* Outer ring — expanded */}
      <rect x="1.5" y="3.5" width="13" height="9" rx="2.5" stroke="currentColor" strokeWidth="1.1" opacity="0.35"/>
      {/* Inner rect — resting */}
      <rect x="4" y="5.5" width="8" height="5" rx="1.5" fill="currentColor" opacity="0.9"/>
    </svg>
  )
}

function MotionWobbleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      {/* Tilted/rotated rectangle to suggest organic rotation */}
      <rect
        x="4" y="5" width="8" height="6" rx="1.5"
        fill="currentColor" opacity="0.9"
        transform="rotate(-8 8 8)"
      />
      {/* Small rotation arrows around it */}
      <path d="M2.5 5 Q2 8 3 11" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" fill="none" opacity="0.4"/>
      <path d="M13.5 5 Q14 8 13 11" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" fill="none" opacity="0.4"/>
    </svg>
  )
}

