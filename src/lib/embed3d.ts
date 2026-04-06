/**
 * embed3d — generates a self-contained interactive WebGL HTML snippet.
 *
 * SVG embed:
 *  - Parses SVG with SVGLoader, extrudes every path (preserving fill colours)
 *  - Lets the viewer drag to rotate / scroll to zoom (OrbitControls, damped)
 *
 * Image embed:
 *  - Embeds the data URL as a texture on a BoxGeometry slab
 *  - Front face = textured; sides/back = neutral grey
 *
 * Both use Three.js r176 + OrbitControls via importmap (unpkg CDN).
 * Output is a single, fully self-contained HTML file.
 */

export type EmbedKind = 'svg' | 'image'

export interface EmbedOptions {
  kind?:         EmbedKind    // defaults to 'svg' for backward compatibility
  svgSource?:    string       // required when kind === 'svg'
  imageDataUrl?: string       // required when kind === 'image'
  materialStyle: 'flat' | 'glass'
  depth:         number
  bgColor?:      string       // CSS colour, defaults to the app canvas colour
}

// ── SVG material source strings ───────────────────────────────────

const SVG_MATERIAL_SRC: Record<string, string> = {
  flat:  `new THREE.MeshToonMaterial({ color, side: THREE.FrontSide })`,
  glass: `new THREE.MeshPhysicalMaterial({ color, transmission: 0.82, roughness: 0.04, metalness: 0, thickness: 2.0, transparent: true, opacity: 0.78, side: THREE.FrontSide })`,
}

// ── Helpers ───────────────────────────────────────────────────────

/** Escape a string for safe use inside a JS template literal. */
function escapeTemplateLiteral(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$')
}

// Split closing </script> so bundlers don't misparse this source file
const CLOSE_SCRIPT = '</' + 'script>'

// ── SVG embed ─────────────────────────────────────────────────────

function generateSvgEmbed(svgSource: string, materialStyle: 'flat' | 'glass', depth: number, bgColor: string): string {
  const materialSrc = SVG_MATERIAL_SRC[materialStyle] ?? SVG_MATERIAL_SRC.flat
  const escapedSvg  = escapeTemplateLiteral(svgSource)

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>3D — made with Reframe</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%;background:${bgColor};overflow:hidden}
canvas{display:block;width:100%;height:100%}
</style>
</head>
<body>
<script type="importmap">
{"imports":{"three":"https://unpkg.com/three@0.176.0/build/three.module.js","three/addons/":"https://unpkg.com/three@0.176.0/examples/jsm/"}}
${CLOSE_SCRIPT}
<script type="module">
import * as THREE from 'three'
import { SVGLoader }     from 'three/addons/loaders/SVGLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const SVG   = \`${escapedSvg}\`
const DEPTH = ${depth}
const ACCENT = new THREE.Color(0x3f37c9)

// ── Renderer ──────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, logarithmicDepthBuffer: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setClearColor(0x000000, 0)
document.body.appendChild(renderer.domElement)

// ── Scene + camera ────────────────────────────────────────────────
const scene  = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 1, 4000)

// ── Three-point lighting ──────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.45))
const key  = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(5, 8, 8);   scene.add(key)
const fill = new THREE.DirectionalLight(0x9ab4ff, 0.55); fill.position.set(-6, 3, 4); scene.add(fill)
const rim  = new THREE.DirectionalLight(0xffffff, 0.9);  rim.position.set(0, -4, -8); scene.add(rim)

// ── SVG → 3D ─────────────────────────────────────────────────────
const loader  = new SVGLoader()
const svgData = loader.parse(SVG)
const group   = new THREE.Group()
let   hasGeom = false

function isWhite(c) { return c && c.r > 0.98 && c.g > 0.98 && c.b > 0.98 }

let pathZ = 0
for (const path of svgData.paths) {
  const raw   = path.color
  const color = (!raw || isWhite(raw)) ? null : raw.clone()
  if (!color) continue
  for (const shape of SVGLoader.createShapes(path)) {
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: DEPTH,
      bevelEnabled: true,
      bevelThickness: Math.max(0.3, DEPTH * 0.025),
      bevelSize: Math.max(0.2, DEPTH * 0.012),
      bevelSegments: 3,
    })
    const mesh = new THREE.Mesh(geo, ${materialSrc})
    mesh.position.z = pathZ
    pathZ += 0.3
    group.add(mesh)
    hasGeom = true
  }
}

// Fallback: render with accent colour if all paths had fill="none"
if (!hasGeom) {
  let fz = 0
  for (const path of svgData.paths) {
    for (const shape of SVGLoader.createShapes(path)) {
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: DEPTH, bevelEnabled: true,
        bevelThickness: Math.max(0.3, DEPTH * 0.025),
        bevelSize: Math.max(0.2, DEPTH * 0.012), bevelSegments: 3,
      })
      const mesh = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ color: ACCENT, side: THREE.FrontSide }))
      mesh.position.z = fz; fz += 0.3
      group.add(mesh)
    }
  }
}

// Centre + flip Y
const box    = new THREE.Box3().setFromObject(group)
const center = box.getCenter(new THREE.Vector3())
const size   = box.getSize(new THREE.Vector3())
group.position.sub(center)
group.scale.y = -1
scene.add(group)

// Frame camera
const maxDim = Math.max(size.x, size.y, 1)
const fovRad = camera.fov * Math.PI / 180
const camZ   = (maxDim / 2 / Math.tan(fovRad / 2)) * 1.6
camera.position.set(0, 0, camZ)

// ── OrbitControls ─────────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.06
controls.enablePan     = false
controls.minDistance   = camZ * 0.35
controls.maxDistance   = camZ * 4
controls.target.set(0, 0, 0)
controls.update()

// ── Resize ────────────────────────────────────────────────────────
function onResize() {
  renderer.setSize(innerWidth, innerHeight)
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
}
window.addEventListener('resize', onResize)
onResize()

// ── Loop ──────────────────────────────────────────────────────────
;(function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
})()
${CLOSE_SCRIPT}
</body>
</html>`
}

// ── Image embed ───────────────────────────────────────────────────

function generateImageEmbed(imageDataUrl: string, materialStyle: 'flat' | 'glass', depth: number, bgColor: string): string {
  const escapedUrl = escapeTemplateLiteral(imageDataUrl)

  const frontMatSrc = materialStyle === 'glass'
    ? `new THREE.MeshPhysicalMaterial({ map: texture, roughness: 0.05, metalness: 0, clearcoat: 0.9, clearcoatRoughness: 0.04 })`
    : `new THREE.MeshStandardMaterial({ map: texture, roughness: 0.25, metalness: 0.04 })`

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>3D — made with Reframe</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%;background:${bgColor};overflow:hidden}
canvas{display:block;width:100%;height:100%}
</style>
</head>
<body>
<script type="importmap">
{"imports":{"three":"https://unpkg.com/three@0.176.0/build/three.module.js","three/addons/":"https://unpkg.com/three@0.176.0/examples/jsm/"}}
${CLOSE_SCRIPT}
<script type="module">
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const IMAGE_URL = \`${escapedUrl}\`
const DEPTH     = ${depth}

// ── Renderer ──────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, logarithmicDepthBuffer: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setClearColor(0x000000, 0)
document.body.appendChild(renderer.domElement)

// ── Scene + camera ────────────────────────────────────────────────
const scene  = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 1, 4000)

// ── Three-point lighting ──────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.45))
const key  = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(5, 8, 8);   scene.add(key)
const fill = new THREE.DirectionalLight(0x9ab4ff, 0.55); fill.position.set(-6, 3, 4); scene.add(fill)
const rim  = new THREE.DirectionalLight(0xffffff, 0.9);  rim.position.set(0, -4, -8); scene.add(rim)

// ── Image → 3D slab ───────────────────────────────────────────────
const texture = await new THREE.TextureLoader().loadAsync(IMAGE_URL)
texture.colorSpace = THREE.SRGBColorSpace

const img    = texture.image
const aspect = (img.naturalWidth || img.width) / (img.naturalHeight || img.height)
const W = 100 * aspect
const H = 100

const frontMat = ${frontMatSrc}
const sideMat  = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.85 })
const backMat  = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9  })

// BoxGeometry face order: +X, -X, +Y, -Y, +Z (front), -Z (back)
const geometry  = new THREE.BoxGeometry(W, H, DEPTH, 1, 1, 1)
const mesh      = new THREE.Mesh(geometry, [sideMat, sideMat, sideMat, sideMat, frontMat, backMat])
const group     = new THREE.Group()
group.add(mesh)
scene.add(group)

// Frame camera
const maxDim = Math.max(W, H, 1)
const fovRad = camera.fov * Math.PI / 180
const camZ   = (maxDim / 2 / Math.tan(fovRad / 2)) * 1.6
camera.position.set(0, 0, camZ)

// ── OrbitControls ─────────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.06
controls.enablePan     = false
controls.minDistance   = camZ * 0.35
controls.maxDistance   = camZ * 4
controls.target.set(0, 0, 0)
controls.update()

// ── Resize ────────────────────────────────────────────────────────
function onResize() {
  renderer.setSize(innerWidth, innerHeight)
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
}
window.addEventListener('resize', onResize)
onResize()

// ── Loop ──────────────────────────────────────────────────────────
;(function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
})()
${CLOSE_SCRIPT}
</body>
</html>`
}

// ── Helpers ───────────────────────────────────────────────────────

const SAFE_CSS_COLOR = /^#[0-9a-fA-F]{3,8}$|^(?:rgb|hsl)a?\([^)]{1,80}\)$|^[a-zA-Z]{1,30}$/

/**
 * Validate a CSS colour string before interpolating it into generated HTML.
 * An unvalidated value could contain quote characters or script that break
 * the inline style in the embed template.
 */
function safeBgColor(color: string, fallback = '#f0f0f4'): string {
  return SAFE_CSS_COLOR.test(color.trim()) ? color.trim() : fallback
}

// ── Public API ────────────────────────────────────────────────────

export function generateEmbed({
  kind = 'svg',
  svgSource,
  imageDataUrl,
  materialStyle,
  depth,
  bgColor = '#f0f0f4',
}: EmbedOptions): string {
  // Sanitise bgColor before it is interpolated into the generated HTML body style.
  const safeColor = safeBgColor(bgColor)
  if (kind === 'image' && imageDataUrl) {
    return generateImageEmbed(imageDataUrl, materialStyle, depth, safeColor)
  }
  if (svgSource) {
    return generateSvgEmbed(svgSource, materialStyle, depth, safeColor)
  }
  throw new Error('embed3d: svgSource or imageDataUrl required')
}
