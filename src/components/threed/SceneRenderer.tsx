'use client'

/**
 * SceneRenderer — Three.js WebGL canvas for the 3D mode.
 *
 * Two rendering paths share the same scene/camera/lighting/controls:
 *
 *  SVG   → SVGLoader parses paths → ExtrudeGeometry per path, original fill
 *          colours preserved. One geometry per SVG path, staggered 0.3 units
 *          in Z to eliminate z-fighting on overlapping fills.
 *
 *  Image → TextureLoader loads the data URL → BoxGeometry slab. The image
 *          appears on the front face; sides and back use a neutral material.
 *          Flat/Glass style adjusts the surface finish of the front face.
 *
 * Rendering quality:
 *  - ACESFilmic tone mapping for natural highlights and rich shadows
 *  - PMREMGenerator + RoomEnvironment for physically-correct env lighting
 *    (critical for the Glass preset — gives real reflections/refractions)
 *  - Three-point lighting (key, fill, rim) + env map for ambient reflections
 *  - 6-segment bevels on SVG paths for smooth, rounded extruded edges
 *
 * Interaction: OrbitControls (damped). Nothing auto-rotates.
 * GIF export:  programmatic 360° Y-axis turntable then returns to user view.
 */

import {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from 'react'
import * as THREE from 'three'
import { SVGLoader }        from 'three/examples/jsm/loaders/SVGLoader.js'
import { OrbitControls }    from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment }  from 'three/examples/jsm/environments/RoomEnvironment.js'
import GIF from 'gif.js'
import {
  type ThreeDAsset,
  type MaterialStyle,
  makeMaterial,
  FALLBACK_COLOR,
} from '@/lib/presets3d'

// ── Ref API ───────────────────────────────────────────────────────

export interface SceneRendererRef {
  captureGIF(frames: number, fps: number, onProgress: (p: number) => void): Promise<Blob>
  captureWebM(frames: number, fps: number, bgColor: string, onProgress: (p: number) => void): Promise<Blob>
  resetView(): void
  snapCamera(preset: CameraPreset): void
}

export type CameraPreset = 'front' | 'three-quarter' | 'side' | 'top'

// ── Props ─────────────────────────────────────────────────────────

export type MotionType = 'spin' | 'float' | 'sway' | 'breathe' | 'wobble'

interface SceneRendererProps {
  asset:           ThreeDAsset
  materialStyle:   MaterialStyle
  depth:           number
  lightIntensity:  number
  orbitSpeed?:     number     // controls.rotateSpeed   — manual drag sensitivity
  dampingFactor?:  number     // controls.dampingFactor — orbit inertia
  autoRotate?:     boolean    // whether motion is currently playing
  motionType?:     MotionType // which motion style to apply when playing
}

// ── Internal scene state ──────────────────────────────────────────

interface SceneState {
  renderer:       THREE.WebGLRenderer
  scene:          THREE.Scene
  camera:         THREE.PerspectiveCamera
  controls:       OrbitControls
  group:          THREE.Group
  lights: {
    ambient: THREE.AmbientLight
    key:     THREE.DirectionalLight
    fill:    THREE.DirectionalLight
    rim:     THREE.DirectionalLight
  }
  rafId:          number
  meshes:         THREE.Mesh[]
  /** GPU textures that must be explicitly disposed. */
  textures:       THREE.Texture[]
  defaultCameraZ: number
  defaultTargetY: number
  /** Original group transform — motion restores to this when playback stops. */
  origGroupPos:   THREE.Vector3
  origGroupScale: THREE.Vector3
  /** Object size, used to scale motion amplitudes proportionally. */
  objectSize:     THREE.Vector3
}

// ── Helpers ───────────────────────────────────────────────────────

function isWhite(c: THREE.Color) {
  return c.r > 0.98 && c.g > 0.98 && c.b > 0.98
}

/**
 * Build extruded meshes from SVG source.
 * Uses 6-segment bevels for smooth, rounded extruded edges.
 */
function buildSvgMeshes(
  svgSource: string,
  depth: number,
  materialStyle: MaterialStyle,
): { group: THREE.Group; meshes: THREE.Mesh[]; size: THREE.Vector3 } {
  const loader  = new SVGLoader()
  const svgData = loader.parse(svgSource)
  const group   = new THREE.Group()
  const meshes: THREE.Mesh[] = []
  let pathZ = 0

  for (const path of svgData.paths) {
    const rawColor = path.color
    if (!rawColor || isWhite(rawColor)) continue

    for (const shape of SVGLoader.createShapes(path)) {
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled:   true,
        bevelThickness: Math.max(0.4, depth * 0.028),
        bevelSize:      Math.max(0.3, depth * 0.015),
        bevelSegments:  6,   // was 3 — smoother rounded edges
      })
      const mesh = new THREE.Mesh(geometry, makeMaterial(materialStyle, rawColor.clone()))
      mesh.castShadow    = true
      mesh.receiveShadow = true
      mesh.position.z    = pathZ
      pathZ += 0.3
      group.add(mesh)
      meshes.push(mesh)
    }
  }

  // Fallback for fill-less SVGs
  if (meshes.length === 0) {
    let fz = 0
    const d2 = new SVGLoader()
    for (const path of d2.parse(svgSource).paths) {
      for (const shape of SVGLoader.createShapes(path)) {
        const geometry = new THREE.ExtrudeGeometry(shape, {
          depth,
          bevelEnabled:   true,
          bevelThickness: Math.max(0.4, depth * 0.028),
          bevelSize:      Math.max(0.3, depth * 0.015),
          bevelSegments:  6,
        })
        const mesh = new THREE.Mesh(geometry, makeMaterial(materialStyle, FALLBACK_COLOR.clone()))
        mesh.castShadow    = true
        mesh.receiveShadow = true
        mesh.position.z    = fz; fz += 0.3
        group.add(mesh)
        meshes.push(mesh)
      }
    }
  }

  // Centre + flip Y (SVG coordinates have Y pointing down).
  //
  // We compute bounds from geometry data directly instead of Box3.setFromObject
  // because setFromObject relies on matrixWorld being up to date.  The group
  // hasn't been added to a scene yet, and Three.js only propagates matrices to
  // *children* during rendering — so mesh.position.z (pathZ) offsets are
  // invisible to setFromObject, making the combined centre wrong.
  //
  // geometry.computeBoundingBox() works entirely in geometry-local space (no
  // matrix dependency), so we add the mesh's own position.z manually.
  const combinedBox = new THREE.Box3()
  for (const mesh of meshes) {
    mesh.geometry.computeBoundingBox()
    if (mesh.geometry.boundingBox) {
      const b = mesh.geometry.boundingBox.clone()
      b.min.z += mesh.position.z
      b.max.z += mesh.position.z
      combinedBox.union(b)
    }
  }
  const center = combinedBox.isEmpty()
    ? new THREE.Vector3()
    : combinedBox.getCenter(new THREE.Vector3())
  const size = combinedBox.isEmpty()
    ? new THREE.Vector3()
    : combinedBox.getSize(new THREE.Vector3())

  // Flip Y and centre at world origin.
  // With scale.y = −1 a child at local (x, y, z) maps to world (−cx+x, cy−y, −cz+z).
  // At the bounding-box centre (cx, cy, cz) that evaluates to (0, 0, 0). ✓
  group.scale.y = -1
  group.position.set(-center.x, center.y, -center.z)

  return { group, meshes, size }
}

/**
 * Preprocess an image data URL before creating a Three.js texture:
 *
 *  • If the image has real PNG alpha (transparent background) → already fine,
 *    just return as-is so alphaTest can clip the empty pixels.
 *
 *  • If corners are white/near-white (JPEG or flat-bg PNG) → flood-fill BFS
 *    from every edge pixel, converting the background to transparent so the
 *    alpha cutout technique removes it the same way.
 *
 * Everything runs on an offscreen canvas — no server round-trip needed.
 */
async function preprocessImageAlpha(
  dataUrl:   string,
  threshold: number = 30,   // RGB distance from pure white to call "background"
): Promise<string> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const W = img.naturalWidth  || img.width
      const H = img.naturalHeight || img.height
      const canvas = document.createElement('canvas')
      canvas.width  = W
      canvas.height = H
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!
      ctx.drawImage(img, 0, 0)

      const imgData = ctx.getImageData(0, 0, W, H)
      const d       = imgData.data

      // ── 1. Is there genuine alpha already? ──────────────────────
      // Sample all four corners; if any are transparent the PNG already
      // carries an alpha channel — just return it unchanged.
      const cornerIdxs = [0, (W - 1), (H - 1) * W, (H - 1) * W + (W - 1)]
      const hasRealAlpha = cornerIdxs.some(i => d[i * 4 + 3] < 200)
      if (hasRealAlpha) { resolve(dataUrl); return }

      // ── 2. Is the background white/near-white? ───────────────────
      const nearWhite = (i: number) => d[i*4] > 255-threshold && d[i*4+1] > 255-threshold && d[i*4+2] > 255-threshold
      const whiteBg   = cornerIdxs.every(nearWhite)
      if (!whiteBg) { resolve(dataUrl); return }

      // ── 3. BFS flood-fill from every edge pixel ──────────────────
      const visited = new Uint8Array(W * H)
      const queue: number[] = []

      const enqueue = (x: number, y: number) => {
        if (x < 0 || x >= W || y < 0 || y >= H) return
        const i = y * W + x
        if (visited[i]) return
        if (!nearWhite(i)) return
        visited[i] = 1
        queue.push(i)
      }

      // Seed from all four edges
      for (let x = 0; x < W; x++) { enqueue(x, 0); enqueue(x, H - 1) }
      for (let y = 1; y < H - 1; y++) { enqueue(0, y); enqueue(W - 1, y) }

      let qi = 0
      while (qi < queue.length) {
        const idx = queue[qi++]
        d[idx * 4 + 3] = 0     // punch out — fully transparent
        const x = idx % W
        const y = (idx / W) | 0
        enqueue(x - 1, y); enqueue(x + 1, y)
        enqueue(x, y - 1); enqueue(x, y + 1)
      }

      ctx.putImageData(imgData, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.src = dataUrl
  })
}

/** Build a textured 3D slab from a raster image data URL. */
async function buildImageMeshes(
  dataUrl: string,
  depth: number,
  materialStyle: MaterialStyle,
  cancelled: () => boolean,
): Promise<{ group: THREE.Group; meshes: THREE.Mesh[]; textures: THREE.Texture[]; size: THREE.Vector3 } | null> {
  // Strip white/near-white backgrounds and respect existing PNG alpha
  // before handing the data URL to TextureLoader.
  const processedUrl = await preprocessImageAlpha(dataUrl)
  if (cancelled()) return null

  const texture = await new THREE.TextureLoader().loadAsync(processedUrl)
  if (cancelled()) { texture.dispose(); return null }

  texture.colorSpace = THREE.SRGBColorSpace

  const img    = texture.image as HTMLImageElement
  const aspect = (img.naturalWidth || img.width) / (img.naturalHeight || img.height)
  const W = 100 * aspect
  const H = 100

  // ── Front face — alpha cutout so transparent pixels are never drawn ──
  // alphaTest: 0.5  →  hard clip (no sorting artefacts, no blending needed)
  // transparent: true is required for alphaTest to take effect in Three.js
  const frontMat: THREE.Material = materialStyle === 'glass'
    ? new THREE.MeshPhysicalMaterial({
        map:                texture,
        transparent:        true,
        alphaTest:          0.5,
        roughness:          0.05,
        metalness:          0,
        clearcoat:          1.0,
        clearcoatRoughness: 0.08,
        envMapIntensity:    1.0,
        side:               THREE.FrontSide,
      })
    : new THREE.MeshStandardMaterial({
        map:             texture,
        transparent:     true,
        alphaTest:       0.5,
        roughness:       0.18,
        metalness:       0.04,
        envMapIntensity: 0.6,
        side:            THREE.FrontSide,
      })

  // ── Sides + back — near-black "mount" edge ───────────────────────────
  // Looks like a physical photo print or mounted canvas; keeps depth
  // without a garish coloured frame dominating around the subject.
  const mountColor = materialStyle === 'glass'
    ? new THREE.Color(0x2a2a2a)
    : new THREE.Color(0x1a1a1a)

  const sideMat = new THREE.MeshStandardMaterial({
    color:           mountColor,
    roughness:       materialStyle === 'glass' ? 0.3 : 0.85,
    metalness:       materialStyle === 'glass' ? 0.15 : 0.0,
    envMapIntensity: materialStyle === 'glass' ? 0.5  : 0.1,
  })

  const backMat = new THREE.MeshStandardMaterial({
    color:     new THREE.Color(0x111111),
    roughness: 0.95,
  })

  // BoxGeometry face order: +X, −X, +Y, −Y, +Z (front), −Z (back)
  const geometry  = new THREE.BoxGeometry(W, H, depth, 1, 1, 1)
  const materials = [sideMat, sideMat, sideMat, sideMat, frontMat, backMat]
  const mesh      = new THREE.Mesh(geometry, materials)
  mesh.castShadow    = true
  mesh.receiveShadow = true

  const group = new THREE.Group()
  group.add(mesh)

  return { group, meshes: [mesh], textures: [texture], size: new THREE.Vector3(W, H, depth) }
}

// ── Component ─────────────────────────────────────────────────────

export const SceneRenderer = forwardRef<SceneRendererRef, SceneRendererProps>(
  function SceneRenderer({
    asset, materialStyle, depth, lightIntensity,
    orbitSpeed = 1.0, dampingFactor = 0.06,
    autoRotate = false, motionType = 'spin',
  }, ref) {
    const canvasRef         = useRef<HTMLCanvasElement>(null)
    const stateRef          = useRef<SceneState | null>(null)
    const lightIntensityRef = useRef(lightIntensity)
    const orbitSpeedRef     = useRef(orbitSpeed)
    const dampingFactorRef  = useRef(dampingFactor)
    const autoRotateRef     = useRef(autoRotate)
    const motionTypeRef     = useRef<MotionType>(motionType)
    /** Monotonic clock used to drive procedural motion (never resets on pause). */
    const motionClockRef    = useRef(0.0)

    // Camera preservation — save position/target before teardown so that when only
    // depth or materialStyle changes (preset selection), the user's current orbit
    // view is restored rather than snapping back to the default framing.
    const savedCameraRef  = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null)
    const prevAssetKeyRef = useRef<string | null>(null)

    // ── Reactive: light intensity ─────────────────────────────────
    useEffect(() => {
      lightIntensityRef.current = lightIntensity
      const state = stateRef.current
      if (!state) return
      const li = lightIntensity
      state.lights.ambient.intensity = 0.4  * li
      state.lights.key.intensity     = 2.2  * li
      state.lights.fill.intensity    = 0.5  * li
      state.lights.rim.intensity     = 0.85 * li
    }, [lightIntensity])

    // ── Reactive: orbit speed ─────────────────────────────────────
    useEffect(() => {
      orbitSpeedRef.current = orbitSpeed
      const state = stateRef.current
      if (!state) return
      state.controls.rotateSpeed = orbitSpeed
    }, [orbitSpeed])

    // ── Reactive: damping factor ──────────────────────────────────
    useEffect(() => {
      dampingFactorRef.current = dampingFactor
      const state = stateRef.current
      if (!state) return
      state.controls.dampingFactor = dampingFactor
    }, [dampingFactor])

    // ── Reactive: auto-rotate / motion toggle ────────────────────
    useEffect(() => {
      autoRotateRef.current = autoRotate
      // controls.autoRotate is managed each frame inside the rAF loop
      // so we don't set it here — the loop will pick up the new value.
    }, [autoRotate])

    // ── Reactive: motion type ─────────────────────────────────────
    useEffect(() => {
      motionTypeRef.current = motionType
      // Reset the group to its resting state when type changes
      // so there's no visual jump on the next frame
      const state = stateRef.current
      if (!state) return
      const { group, origGroupPos, origGroupScale } = state
      group.position.copy(origGroupPos)
      group.scale.copy(origGroupScale)
      group.rotation.set(0, 0, 0)
    }, [motionType])

    // ── Main effect: rebuild on asset / depth / material change ───
    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      const W = canvas.clientWidth  || 800
      const H = canvas.clientHeight || 600

      const currentAssetKey = asset.kind + '\x00' + asset.data
      const isNewAsset      = prevAssetKeyRef.current !== currentAssetKey

      let rafId    = 0
      let cancelled = false

      // ── Renderer ─────────────────────────────────────────────────
      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        // Straight (non-premultiplied) alpha — the canvas framebuffer stores
        // rgba as-is without baking the alpha into the RGB channels.
        // This eliminates both dark and bright fringing when ctx2d.drawImage()
        // composites the WebGL canvas during WebM export, because the 2D
        // canvas can read the edge pixels correctly without un-premultiplying.
        premultipliedAlpha: false,
        preserveDrawingBuffer: true,
        logarithmicDepthBuffer: true,
      })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(W, H)
      renderer.setClearColor(0x000000, 0)

      // NeutralToneMapping (Khronos PBR Neutral, r165+) handles HDR without
      // distorting hues — ACESFilmic looked great but shifted/compressed SVG
      // colours away from their original values, which broke colour fidelity.
      renderer.toneMapping         = THREE.NeutralToneMapping
      renderer.toneMappingExposure = 1.0

      // Soft shadows
      renderer.shadowMap.enabled = false

      const scene  = new THREE.Scene()
      // No scene.background — the canvas stays transparent so the CSS parent
      // colour shows through in the live view, and captureGIF composites a
      // chroma-key sentinel for GIF transparency.
      const camera = new THREE.PerspectiveCamera(45, W / H, 1, 4000)

      // ── Environment (PMREMGenerator + RoomEnvironment) ────────────
      // Gives materials physically correct indirect illumination and reflections.
      // This is what makes the Glass preset look like real glass rather than flat translucency.
      const pmrem = new THREE.PMREMGenerator(renderer)
      pmrem.compileEquirectangularShader()
      const envTexture = pmrem.fromScene(new RoomEnvironment()).texture
      scene.environment = envTexture   // applies to all MeshStandard/Physical materials
      pmrem.dispose()

      // ── Three-point lighting ──────────────────────────────────────
      // Intensities are slightly lower than before because the env map adds
      // a base level of soft fill light — prevents over-exposure under ACES.
      const li   = lightIntensityRef.current
      const ambient = new THREE.AmbientLight(0xffffff, 0.40 * li)

      const key  = new THREE.DirectionalLight(0xfffaf0, 2.2 * li)
      key.position.set(5, 8, 8)
      key.castShadow = false

      const fill = new THREE.DirectionalLight(0x9ab4ff, 0.50 * li)
      fill.position.set(-6, 3, 4)

      const rim  = new THREE.DirectionalLight(0xffffff, 0.85 * li)
      rim.position.set(0, -4, -8)

      scene.add(ambient, key, fill, rim)

      // ── Build geometry (async for images) ────────────────────────
      async function setup() {
        let group:    THREE.Group
        let meshes:   THREE.Mesh[]
        let textures: THREE.Texture[] = []
        let size:     THREE.Vector3

        if (asset.kind === 'svg') {
          const result = buildSvgMeshes(asset.data, depth, materialStyle)
          group  = result.group
          meshes = result.meshes
          size   = result.size
        } else {
          const result = await buildImageMeshes(asset.data, depth, materialStyle, () => cancelled)
          if (!result) return
          group    = result.group
          meshes   = result.meshes
          textures = result.textures
          size     = result.size
        }

        if (cancelled) return

        scene.add(group)

        // Store the group's resting transform so motion can always restore it.
        const origGroupPos   = group.position.clone()
        const origGroupScale = group.scale.clone()


        // ── Frame camera ──────────────────────────────────────────
        const aspect  = W / H
        const fovRad  = camera.fov * (Math.PI / 180)
        const camZX   = (size.x / 2 / (Math.tan(fovRad / 2) * aspect)) * 1.8
        const camZY   = (size.y / 2 / Math.tan(fovRad / 2)) * 1.8
        const camZ    = Math.max(camZX, camZY, (size.z / 2 / Math.tan(fovRad / 2)) * 1.8)
        camera.position.set(0, 0, camZ)
        camera.lookAt(0, 0, 0)

        // ── OrbitControls ─────────────────────────────────────────
        const controls = new OrbitControls(camera, canvas)
        controls.enableDamping   = true
        controls.dampingFactor   = dampingFactorRef.current
        controls.rotateSpeed     = orbitSpeedRef.current
        controls.autoRotate      = autoRotateRef.current
        controls.autoRotateSpeed = 4.0
        controls.enablePan       = false
        controls.minDistance     = camZ * 0.35
        controls.maxDistance     = camZ * 4
        controls.target.set(0, 0, 0)
        controls.update()

        // Restore camera if same asset, different preset/depth
        if (!isNewAsset && savedCameraRef.current) {
          camera.position.copy(savedCameraRef.current.position)
          controls.target.copy(savedCameraRef.current.target)
          camera.lookAt(controls.target)
          controls.update()
        }
        prevAssetKeyRef.current = currentAssetKey
        savedCameraRef.current  = null

        // ── rAF loop ──────────────────────────────────────────────
        // Each motion type writes directly to `group` every frame.
        // Amplitudes are proportional to the longest object dimension so
        // the motion looks consistent across tiny icons and large artwork.
        const motionScale = Math.max(size.x, size.y) * 0.04  // ~4 % of size

        function animate() {
          rafId = requestAnimationFrame(animate)

          const playing = autoRotateRef.current
          const mtype   = motionTypeRef.current

          // ── Spin: delegate to OrbitControls auto-rotate ──────
          controls.autoRotate      = playing && mtype === 'spin'
          controls.autoRotateSpeed = 4.0
          controls.update()

          // ── Procedural motion on the group ───────────────────
          if (playing && mtype !== 'spin') {
            const t = (motionClockRef.current += 0.016)   // ~60 fps tick

            switch (mtype) {
              case 'float':
                // Sine-wave Y bob — calm, alive feeling
                group.position.copy(origGroupPos)
                group.position.y += Math.sin(t * 0.9) * motionScale
                break

              case 'sway':
                // Pendulum rock around Z axis with slight X lean
                group.position.copy(origGroupPos)
                group.scale.copy(origGroupScale)
                group.rotation.z = Math.sin(t * 0.65) * 0.14
                group.rotation.x = Math.sin(t * 0.65) * 0.03
                break

              case 'breathe':
                // Rhythmic scale pulse — X and Z only; Y scale carries
                // the SVG flip (−1) so we must multiply rather than replace
                group.position.copy(origGroupPos)
                group.rotation.set(0, 0, 0)
                {
                  const s = 1 + Math.sin(t * 1.3) * 0.035
                  group.scale.set(
                    origGroupScale.x * s,
                    origGroupScale.y * s,  // preserves SVG −1 flip
                    origGroupScale.z * s,
                  )
                }
                break

              case 'wobble':
                // Organic multi-axis drift using incommensurate frequencies
                group.position.copy(origGroupPos)
                group.scale.copy(origGroupScale)
                group.rotation.x = Math.sin(t * 0.71 + 1.3) * 0.09
                group.rotation.y = Math.sin(t * 0.53 + 0.7) * 0.13
                group.rotation.z = Math.sin(t * 0.89 + 2.1) * 0.07
                break
            }
          } else if (!playing) {
            // Snap group back to its resting transform when paused
            group.position.copy(origGroupPos)
            group.scale.copy(origGroupScale)
            group.rotation.set(0, 0, 0)
          }

          renderer.render(scene, camera)
        }
        animate()

        stateRef.current = {
          renderer, scene, camera, controls, group,
          lights: { ambient, key, fill, rim },
          rafId, meshes, textures, defaultCameraZ: camZ, defaultTargetY: 0,
          origGroupPos, origGroupScale, objectSize: size,
        }

        // ── Resize ────────────────────────────────────────────────
        const ro = new ResizeObserver(() => {
          const w = canvas!.clientWidth
          const h = canvas!.clientHeight
          renderer.setSize(w, h)
          camera.aspect = w / h
          camera.updateProjectionMatrix()
        })
        ro.observe(canvas!)
        ;(stateRef.current as SceneState & { _ro?: ResizeObserver })._ro = ro
      }

      setup()

      return () => {
        cancelled = true
        const s = stateRef.current as (SceneState & { _ro?: ResizeObserver }) | null
        if (s) {
          savedCameraRef.current = {
            position: s.camera.position.clone(),
            target:   s.controls.target.clone(),
          }
        }
        cancelAnimationFrame(rafId)
        s?._ro?.disconnect()
        s?.controls.dispose()
        if (s) {
          const seenMats = new Set<THREE.Material>()
          for (const mesh of s.meshes) {
            mesh.geometry.dispose()
            const mats = Array.isArray(mesh.material)
              ? mesh.material
              : [mesh.material as THREE.Material]
            for (const mat of mats) {
              if (!seenMats.has(mat)) { mat.dispose(); seenMats.add(mat) }
            }
          }
          s.textures.forEach(t => t.dispose())
        }
        // Dispose the env texture
        envTexture.dispose()
        renderer.dispose()
        stateRef.current = null
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [asset.kind, asset.data, depth, materialStyle])

    // ── GIF: motion-aware export ──────────────────────────────────
    //
    // Captures one complete cycle of the active motion type so the exported
    // GIF loops seamlessly.  Each motion type defines a natural period (in
    // the same "t-tick" units the live animate() loop uses); we spread
    // `frames` evenly across that period so the last frame == first frame.
    //
    //  spin    → 360° Y-rotation turntable (unchanged)
    //  float   → sine-wave Y bob,        period = 2π / 0.9  ≈ 6.98 ticks
    //  sway    → pendulum Z/X rotation,  period = 2π / 0.65 ≈ 9.67 ticks
    //  breathe → rhythmic scale pulse,   period = 2π / 1.3  ≈ 4.83 ticks
    //  wobble  → multi-axis drift,       period driven by slowest freq (0.53)
    //
    const captureGIF = useCallback(
      (frames: number, fps: number, onProgress: (p: number) => void): Promise<Blob> =>
        new Promise((resolve, reject) => {
          const state = stateRef.current
          if (!state) return reject(new Error('Scene not initialised'))

          const {
            renderer, scene, camera, controls, group,
            origGroupPos, origGroupScale, objectSize,
          } = state

          cancelAnimationFrame(state.rafId)
          controls.enabled    = false
          const wasAutoRotate = controls.autoRotate
          controls.autoRotate = false

          // Save current group + camera state — both restored after encoding
          const savedPos    = group.position.clone()
          const savedScale  = group.scale.clone()
          const savedRot    = group.rotation.clone()
          const savedCamPos = camera.position.clone()
          const savedTarget = controls.target.clone()

          const mtype      = motionTypeRef.current
          const mScale     = Math.max(objectSize.x, objectSize.y) * 0.04

          // One-cycle t-range for each procedural motion type.
          // t starts at 0 so frame[0] matches the resting pose and
          // frame[frames-1] returns to it, giving a perfect loop.
          const cycleTRange: Record<Exclude<MotionType, 'spin'>, number> = {
            float:   (2 * Math.PI) / 0.9,   // ≈ 6.98 ticks
            sway:    (2 * Math.PI) / 0.65,  // ≈ 9.67 ticks
            breathe: (2 * Math.PI) / 1.3,   // ≈ 4.83 ticks
            wobble:  (2 * Math.PI) / 0.53,  // ≈ 11.85 ticks (slowest freq)
          }

          const canvas = renderer.domElement

          // ── Transparency compositing ──────────────────────────────
          // GIF supports 1-bit transparency via a "transparent colour index".
          // We pick a distinctive sentinel — pure lime (#00ff00) — and replace
          // every WebGL pixel whose alpha < 128 with it, then tell gif.js that
          // colour is transparent.  We also nudge any foreground pixel that
          // accidentally lands on #00ff00 by 1 so it won't be punched out.
          const CHROMA_R = 0x00
          const CHROMA_G = 0xff
          const CHROMA_B = 0x00
          const CHROMA_KEY = (CHROMA_R << 16) | (CHROMA_G << 8) | CHROMA_B  // 0x00ff00

          const offscreen = document.createElement('canvas')
          offscreen.width  = canvas.width
          offscreen.height = canvas.height
          const ctx2d = offscreen.getContext('2d', { willReadFrequently: true })!

          const gif = new GIF({
            workers: 2,
            quality: 8,
            width:   canvas.width,
            height:  canvas.height,
            workerScript: '/gif.worker.js',
            transparent: CHROMA_KEY,
          })

          const delay = Math.round(1000 / fps)

          for (let i = 0; i < frames; i++) {
            // Reset group to its resting transform each frame so the
            // individual motion branches only need to write their delta.
            group.position.copy(origGroupPos)
            group.scale.copy(origGroupScale)
            group.rotation.set(0, 0, 0)

            if (mtype === 'spin') {
              // Mirror OrbitControls auto-rotate exactly: orbit the CAMERA around
              // the scene target rather than rotating the group.
              //
              // Rotating the group would appear wrong because the SVG group has
              // scale.y = −1 (Y-flip), which reverses the apparent spin direction.
              // Moving the camera instead is a 1:1 match with the live preview.
              //
              // We pre-compute the orbit radius and starting angle from the saved
              // camera position so the first GIF frame always matches the live pose.
              const tgt    = savedTarget
              const dx0    = savedCamPos.x - tgt.x
              const dz0    = savedCamPos.z - tgt.z
              const radius = Math.sqrt(dx0 * dx0 + dz0 * dz0)
              const startA = Math.atan2(dx0, dz0)
              const angle  = startA + (i / frames) * Math.PI * 2
              camera.position.set(
                tgt.x + Math.sin(angle) * radius,
                savedCamPos.y,
                tgt.z + Math.cos(angle) * radius,
              )
              camera.lookAt(tgt)
            } else {
              // Sample one complete cycle of the procedural motion
              const T = cycleTRange[mtype]
              const t = (i / frames) * T   // t ∈ [0, T)

              switch (mtype) {
                case 'float':
                  group.position.y += Math.sin(t * 0.9) * mScale
                  break

                case 'sway':
                  group.rotation.z = Math.sin(t * 0.65) * 0.14
                  group.rotation.x = Math.sin(t * 0.65) * 0.03
                  break

                case 'breathe': {
                  const s = 1 + Math.sin(t * 1.3) * 0.035
                  group.scale.set(
                    origGroupScale.x * s,
                    origGroupScale.y * s,
                    origGroupScale.z * s,
                  )
                  break
                }

                case 'wobble':
                  group.rotation.x = Math.sin(t * 0.71 + 1.3) * 0.09
                  group.rotation.y = Math.sin(t * 0.53 + 0.7) * 0.13
                  group.rotation.z = Math.sin(t * 0.89 + 2.1) * 0.07
                  break
              }
            }

            renderer.render(scene, camera)

            // Draw the transparent WebGL frame into the 2D offscreen canvas,
            // then bake chroma-key: background (alpha < 128) → lime sentinel,
            // foreground (alpha ≥ 128) → fully opaque (fix partial AA pixels).
            ctx2d.clearRect(0, 0, offscreen.width, offscreen.height)
            ctx2d.drawImage(canvas, 0, 0)
            const imgData = ctx2d.getImageData(0, 0, offscreen.width, offscreen.height)
            const d = imgData.data
            for (let p = 0; p < d.length; p += 4) {
              if (d[p + 3] < 128) {
                // Background pixel → chroma key (fully opaque so GIF sees the colour)
                d[p]     = CHROMA_R
                d[p + 1] = CHROMA_G
                d[p + 2] = CHROMA_B
                d[p + 3] = 0xff
              } else {
                // Foreground pixel → make fully opaque
                d[p + 3] = 0xff
                // Prevent accidental collision with the chroma-key colour
                if (d[p] === CHROMA_R && d[p + 1] === CHROMA_G && d[p + 2] === CHROMA_B) {
                  d[p + 1] = 0xfe   // nudge G by 1 — visually imperceptible
                }
              }
            }
            ctx2d.putImageData(imgData, 0, 0)

            gif.addFrame(offscreen, { copy: true, delay })
            onProgress(i / frames)
          }

          gif.on('finished', (blob: Blob) => {
            // Restore group + camera to where they were before the export
            group.position.copy(savedPos)
            group.scale.copy(savedScale)
            group.rotation.copy(savedRot)
            camera.position.copy(savedCamPos)
            camera.lookAt(savedTarget)
            controls.target.copy(savedTarget)
            controls.update()
            controls.enabled    = true
            controls.autoRotate = wasAutoRotate
            const s = stateRef.current
            if (s) {
              const { renderer: r, scene: sc, camera: cam, controls: ctrl } = s
              function resume() {
                s!.rafId = requestAnimationFrame(resume)
                ctrl.update()
                r.render(sc, cam)
              }
              resume()
            }
            resolve(blob)
          })

          gif.on('error', (err: Error) => reject(err))
          gif.render()
        }),
      []
    )

    // ── WebM capture ──────────────────────────────────────────────
    const captureWebM = useCallback(
      (frames: number, fps: number, bgColor: string, onProgress: (p: number) => void): Promise<Blob> =>
        new Promise((resolve, reject) => {
          const state = stateRef.current
          if (!state) return reject(new Error('Scene not initialised'))
          if (typeof MediaRecorder === 'undefined') return reject(new Error('MediaRecorder not available'))

          const { renderer, scene, camera, controls, group, origGroupPos, origGroupScale, objectSize } = state
          cancelAnimationFrame(state.rafId)
          controls.enabled    = false
          const wasAutoRotate = controls.autoRotate
          controls.autoRotate = false

          const savedPos    = group.position.clone()
          const savedScale  = group.scale.clone()
          const savedRot    = group.rotation.clone()
          const savedCamPos = camera.position.clone()
          const savedTarget = controls.target.clone()

          const mtype  = motionTypeRef.current
          const mScale = Math.max(objectSize.x, objectSize.y) * 0.04
          const cycleTRange: Record<Exclude<MotionType, 'spin'>, number> = {
            float:   (2 * Math.PI) / 0.9,
            sway:    (2 * Math.PI) / 0.65,
            breathe: (2 * Math.PI) / 1.3,
            wobble:  (2 * Math.PI) / 0.53,
          }

          // ── HD export: render at 1920×1080 regardless of viewport ──
          // Save current renderer dimensions and camera aspect so we can restore after.
          const canvas      = renderer.domElement
          const prevW       = canvas.width
          const prevH       = canvas.height
          const prevAspect  = camera.aspect
          const EXPORT_W    = 1920
          const EXPORT_H    = 1080

          // Render at 1:1 pixel ratio (no display scaling needed for file output)
          renderer.setPixelRatio(1)
          renderer.setSize(EXPORT_W, EXPORT_H)
          camera.aspect = EXPORT_W / EXPORT_H
          camera.updateProjectionMatrix()

          // ── Composite canvas: fixes pre-multiplied alpha black halos ──
          // WebGL with alpha:true renders transparent pixels with premultiplied
          // black baked into the RGB. MediaRecorder has no alpha channel, so
          // capturing the raw canvas produces dark halos around anti-aliased edges.
          // Solution: draw each frame onto a 2D canvas with a solid background
          // first, then stream that composited canvas to the recorder.
          const composite = document.createElement('canvas')
          composite.width  = EXPORT_W
          composite.height = EXPORT_H
          const ctx2d = composite.getContext('2d')!

          const fillColor = (bgColor && bgColor !== 'transparent') ? bgColor : '#000000'

          const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
            ? 'video/webm;codecs=vp9'
            : 'video/webm'

          // Stream the composite canvas — NOT the raw WebGL canvas
          const stream   = composite.captureStream(0)
          const track    = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack & { requestFrame?: () => void }
          // 20 Mbps VP9 gives broadcast-quality 1080p
          const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 20_000_000 })
          const chunks: Blob[] = []
          recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }

          recorder.onstop = () => {
            // Restore renderer to original viewport size and aspect
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
            renderer.setSize(prevW / Math.min(window.devicePixelRatio, 2), prevH / Math.min(window.devicePixelRatio, 2), false)
            camera.aspect = prevAspect
            camera.updateProjectionMatrix()

            // Restore scene state
            group.position.copy(savedPos)
            group.scale.copy(savedScale)
            group.rotation.copy(savedRot)
            camera.position.copy(savedCamPos)
            camera.lookAt(savedTarget)
            controls.target.copy(savedTarget)
            controls.enabled    = true
            controls.autoRotate = wasAutoRotate
            controls.update()
            const s = stateRef.current
            if (s) {
              const { renderer: r, scene: sc, camera: cam, controls: ctrl } = s
              function resume() { s!.rafId = requestAnimationFrame(resume); ctrl.update(); r.render(sc, cam) }
              resume()
            }
            resolve(new Blob(chunks, { type: 'video/webm' }))
          }

          recorder.start()

          const frameDurationMs = 1000 / fps

          const drawFrame = (i: number) => {
            if (i >= frames) { setTimeout(() => recorder.stop(), frameDurationMs); return }

            group.position.copy(origGroupPos)
            group.scale.copy(origGroupScale)
            group.rotation.set(0, 0, 0)

            if (mtype === 'spin') {
              const tgt    = savedTarget
              const dx0    = savedCamPos.x - tgt.x
              const dz0    = savedCamPos.z - tgt.z
              const radius = Math.sqrt(dx0 * dx0 + dz0 * dz0)
              const startA = Math.atan2(dx0, dz0)
              const angle  = startA + (i / frames) * Math.PI * 2
              camera.position.set(tgt.x + Math.sin(angle) * radius, savedCamPos.y, tgt.z + Math.cos(angle) * radius)
              camera.lookAt(tgt)
            } else if (mtype === 'float' || mtype === 'sway' || mtype === 'breathe' || mtype === 'wobble') {
              const tRange = cycleTRange[mtype]
              const t      = (i / frames) * tRange
              if (mtype === 'float')   group.position.y = origGroupPos.y + Math.sin(0.9 * t) * mScale * 1.5
              if (mtype === 'sway')    group.rotation.z = Math.sin(0.65 * t) * 0.15
              if (mtype === 'breathe') { const s = 1 + Math.sin(1.3 * t) * 0.08; group.scale.set(s, s, s) }
              if (mtype === 'wobble')  { group.rotation.x = Math.sin(0.8 * t) * 0.12; group.rotation.z = Math.sin(0.53 * t) * 0.1 }
            }

            controls.update()
            renderer.render(scene, camera)

            // Composite: fill background first, then draw WebGL frame on top.
            // This converts premultiplied-alpha edge pixels into properly
            // anti-aliased pixels against the chosen background — no black halos.
            ctx2d.fillStyle = fillColor
            ctx2d.fillRect(0, 0, EXPORT_W, EXPORT_H)
            ctx2d.drawImage(canvas, 0, 0, EXPORT_W, EXPORT_H)

            if (typeof track.requestFrame === 'function') track.requestFrame()

            onProgress((i + 1) / frames)
            setTimeout(() => drawFrame(i + 1), frameDurationMs)
          }

          drawFrame(0)
        }),
      []
    )

    // ── Camera preset snap ────────────────────────────────────────
    const snapCamera = useCallback((preset: CameraPreset) => {
      const state = stateRef.current
      if (!state) return
      const { camera, controls, defaultCameraZ, defaultTargetY } = state
      const r = defaultCameraZ

      switch (preset) {
        case 'front':
          camera.position.set(0, defaultTargetY, r)
          break
        case 'three-quarter':
          camera.position.set(r * 0.65, defaultTargetY + r * 0.25, r * 0.75)
          break
        case 'side':
          camera.position.set(r, defaultTargetY, 0)
          break
        case 'top':
          camera.position.set(0, r * 1.4, 0.01)
          break
      }
      camera.lookAt(0, defaultTargetY, 0)
      controls.target.set(0, defaultTargetY, 0)
      controls.update()
    }, [])

    // ── Reset view ────────────────────────────────────────────────
    const resetView = useCallback(() => {
      const state = stateRef.current
      if (!state) return
      const { camera, controls, group, defaultCameraZ, defaultTargetY } = state
      group.rotation.set(0, 0, 0)
      camera.position.set(0, 0, defaultCameraZ)
      camera.lookAt(0, defaultTargetY, 0)
      controls.target.set(0, defaultTargetY, 0)
      controls.update()
    }, [])

    useImperativeHandle(ref, () => ({ captureGIF, captureWebM, resetView, snapCamera }), [captureGIF, captureWebM, resetView, snapCamera])

    return (
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block', cursor: 'grab' }}
      />
    )
  }
)
