"use client"

import { Suspense, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react"
import * as THREE from "three"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { ContactShadows, Html, OrbitControls, RoundedBox } from "@react-three/drei"
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js"
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib"
import { Move3d, Focus, Eye } from "lucide-react"
import { cn } from "@/lib/utils"
import { LINES, MIDLINE, icsY, type Point } from "@/lib/osce/anatomy"
import { DEPTH, PatientBody, XrayAnatomy, torsoRadius } from "./patient-model"
import { ModelBoundary, PatientGLB } from "./patient-glb"
import { SurfaceMap } from "./surface"
import type { MeshSurface } from "./mesh-surface"
import type { PatientMarker, PatientViewProps } from "./markers"

// 3D-scen i stil med ett kliniskt simuleringsprogram:
// patienten ligger på rygg på en brits med draperi, mjukt studioljus och mörk bakgrund.

const MATTRESS_TOP = 0
const LIE_HEIGHT = MATTRESS_TOP + 0.84
const PATIENT_ROT = new THREE.Euler(-Math.PI / 2, 0, 0)

const VIEWS = {
  overview: { pos: new THREE.Vector3(-17, 19, 7.5), target: new THREE.Vector3(0, 1, 2.4) },
  chest: { pos: new THREE.Vector3(-5.6, 9.4, 1.2), target: new THREE.Vector3(0.15, 1.8, -0.9) },
  top: { pos: new THREE.Vector3(0.01, 13.5, -0.5), target: new THREE.Vector3(0, 1.8, -0.6) }
  ,neck: { pos: new THREE.Vector3(-3.2, 7.2, 0.4), target: new THREE.Vector3(0.05, 1.2, -3.1) },
}
type ViewId = keyof typeof VIEWS

/** Punkt på hudens yta (lokala koordinater) + normal, beräknad analytiskt ur bålens form */
export function surfaceAt(p: Point) {
  const x = (p.x - MIDLINE) / 100
  const y = (300 - p.y) / 100
  if (y > 2.25) {
    const r = 0.4
    const cx = Math.max(-r, Math.min(r, x))
    const z = Math.sqrt(Math.max(0, r * r - cx * cx))
    return { pos: new THREE.Vector3(cx, y, z), normal: new THREE.Vector3(cx, 0, z).normalize() }
  }
  const r = torsoRadius(y)
  const cx = Math.max(-r * 0.995, Math.min(r * 0.995, x))
  const k = Math.sqrt(Math.max(0, 1 - (cx / r) ** 2))
  const chest = y > 0.4 && y < 1.9 ? 0.05 * Math.sin(((y - 0.4) / 1.5) * Math.PI) * k : 0
  const z = r * DEPTH * k + chest
  const normal = new THREE.Vector3(cx / (r * r), 0, z / (r * DEPTH) ** 2).normalize()
  return { pos: new THREE.Vector3(cx, y, z), normal }
}

/** Dockans yta som höjdkarta (används tills den riktiga modellen laddats, eller som reserv) */
const DUMMY_SURFACE = SurfaceMap.fromFunction((x, y) => {
  if (y > 2.95 || y < -2.6) return null
  if (y > 2.25) return Math.abs(x) <= 0.4 ? surfaceAt({ x: MIDLINE + x * 100, y: 300 - y * 100 }).pos.z : null
  return Math.abs(x) <= torsoRadius(y) * 0.995 ? surfaceAt({ x: MIDLINE + x * 100, y: 300 - y * 100 }).pos.z : null
})

const SurfaceCtx = createContext<SurfaceMap | MeshSurface>(DUMMY_SURFACE)
const useSurfaceAt = () => {
  const surface = useContext(SurfaceCtx)
  return (p: Point, radius = 0) => surface.at(p, radius)
}

function orient(normal: THREE.Vector3) {
  return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
}

/* ------------------------------------------------------------------ */
/* Markörer                                                            */
/* ------------------------------------------------------------------ */

function Stethoscope({ p, piece }: { p: Point; piece: "membrane" | "bell" }) {
  const { pos, normal } = useSurfaceAt()(p, piece === "bell" ? 0.12 : 0.17)
  const q = orient(normal)
  const tube = useMemo(() => {
    const a = pos.clone().add(normal.clone().multiplyScalar(0.14))
    // Slangen lyfter rakt från huden och fortsätter i en mjuk båge ut mot examinatorn
    const curve = new THREE.CatmullRomCurve3([
      a,
      a.clone().add(normal.clone().multiplyScalar(0.55)),
      new THREE.Vector3(pos.x + normal.x * 1.1 - 0.5, pos.y + 0.4, Math.max(pos.z + 1.3, 2.3)),
      new THREE.Vector3(pos.x - 3, pos.y + 1, Math.max(pos.z + 2.6, 3.4)),
      new THREE.Vector3(-9, pos.y + 1.5, 6),
    ])
    return new THREE.TubeGeometry(curve, 90, 0.035, 10, false)
  }, [pos.x, pos.y, pos.z, normal.x, normal.y, normal.z])
  useEffect(() => () => tube.dispose(), [tube])
  const metal = <meshStandardMaterial color="#d7dde4" metalness={0.95} roughness={0.22} />
  return (
    <group>
      <group position={pos} quaternion={q}>
        {piece === "membrane" ? (
          <>
            <mesh position={[0, 0, 0.04]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.17, 0.17, 0.07, 40]} />
              {metal}
            </mesh>
            <mesh position={[0, 0, 0.004]}>
              <circleGeometry args={[0.15, 40]} />
              <meshStandardMaterial color="#e9edf1" roughness={0.3} side={THREE.DoubleSide} />
            </mesh>
          </>
        ) : (
          <mesh position={[0, 0, 0.08]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.12, 0.16, 32, 1, true]} />
            {metal}
          </mesh>
        )}
        <mesh position={[0, 0, 0.13]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          {metal}
        </mesh>
      </group>
      <mesh geometry={tube} castShadow>
        <meshStandardMaterial color="#20252c" roughness={0.5} />
      </mesh>
    </group>
  )
}

function PalpatingHand({ p }: { p: Point }) {
  const { pos, normal } = useSurfaceAt()(p)
  const ring = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (!ring.current) return
    const s = 1 + 0.25 * Math.max(0, Math.sin(clock.elapsedTime * 7.1))
    ring.current.scale.setScalar(s)
  })
  return (
    <group position={pos} quaternion={orient(normal)}>
      <mesh ref={ring} position={[0, 0, 0.02]}>
        <torusGeometry args={[0.16, 0.018, 12, 48]} />
        <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.8} />
      </mesh>
      {/* Två fingertoppar (pek- och långfinger) */}
      {[-0.06, 0.06].map(x => (
        <mesh key={x} position={[x, 0.18, 0.07]} rotation={[0.5, 0, 0]} castShadow>
          <capsuleGeometry args={[0.05, 0.3, 8, 16]} />
          <meshStandardMaterial color="#c99474" roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

function Electrode({ p, label, color }: { p: Point; label: string; color: string }) {
  const { pos, normal } = useSurfaceAt()(p, 0.12)
  return (
    <group position={pos} quaternion={orient(normal)}>
      <mesh position={[0, 0, 0.012]}>
        <circleGeometry args={[0.12, 32]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0, 0.04]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 0.06, 20]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
      </mesh>
      <Html position={[0, 0.3, 0.12]} center distanceFactor={7} zIndexRange={[20, 0]}>
        <span className="pointer-events-none rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-bold text-white">{label}</span>
      </Html>
    </group>
  )
}

function AedPad({ p, index }: { p: Point; index: number }) {
  const { pos, normal } = useSurfaceAt()(p, 0.36)
  return (
    <group position={pos} quaternion={orient(normal)} rotation-z={index === 1 ? 0.35 : 0}>
      <RoundedBox args={[0.46, 0.64, 0.03]} radius={0.012} position={[0, 0, 0.02]} castShadow>
        <meshStandardMaterial color="#f1f5f9" roughness={0.6} />
      </RoundedBox>
      <mesh position={[0, 0, 0.04]} rotation={[0, 0, 0.5]}>
        <planeGeometry args={[0.06, 0.38]} />
        <meshStandardMaterial color="#eab308" />
      </mesh>
    </group>
  )
}

function RescuerHands({ p }: { p: Point }) {
  const { pos, normal } = useSurfaceAt()(p, 0.28)
  return (
    <group position={pos} quaternion={orient(normal)}>
      <mesh position={[0, 0, 0.09]} scale={[0.32, 0.22, 0.1]} castShadow>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#b9825f" roughness={0.6} />
      </mesh>
      <mesh position={[0.02, 0.03, 0.21]} scale={[0.3, 0.21, 0.09]} rotation={[0, 0, 0.4]} castShadow>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#c08b68" roughness={0.6} />
      </mesh>
    </group>
  )
}

function Ring({ p, color, label, dashed }: { p: Point; color: string; label?: string; dashed?: boolean }) {
  const { pos, normal } = useSurfaceAt()(p)
  return (
    <group position={pos} quaternion={orient(normal)}>
      <mesh position={[0, 0, 0.015]}>
        <torusGeometry args={[0.11, dashed ? 0.01 : 0.016, 8, dashed ? 12 : 48]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
      </mesh>
      {label && (
        <Html position={[0, 0.3, 0.12]} center distanceFactor={7} zIndexRange={[20, 0]}>
          <span className="pointer-events-none whitespace-nowrap rounded bg-black/60 px-1 text-[10px] font-semibold text-white">{label}</span>
        </Html>
      )}
    </group>
  )
}

function Marker({ m }: { m: PatientMarker }) {
  switch (m.kind) {
    case "stethoscope":
      return <Stethoscope p={m.p} piece={m.piece} />
    case "hand":
      return <PalpatingHand p={m.p} />
    case "electrode":
      return <Electrode p={m.p} label={m.label} color={m.color} />
    case "pad":
      return <AedPad p={m.p} index={m.index} />
    case "cpr-hands":
      return <RescuerHands p={m.p} />
    case "ring":
      return <Ring p={m.p} color={m.color} label={m.label} dashed={m.dashed} />
  }
}

/** Interkostalrum och medioklavikularlinje som tunna linjer på huden */
function Guides() {
  const surface = useContext(SurfaceCtx)
  const surfaceAt = (p: Point) => surface.at(p)
  const lines = useMemo(() => {
    const material = new THREE.LineBasicMaterial({ color: "#38bdf8", transparent: true, opacity: 0.7 })
    const lift = (p: Point) => {
      const s = surfaceAt(p)
      return s.pos.add(s.normal.multiplyScalar(0.01))
    }
    const out: THREE.Line[] = []
    for (let n = 1; n <= 6; n++) {
      for (const side of [-1, 1]) {
        const pts: THREE.Vector3[] = []
        for (let x = 22; x <= 125; x += 5) pts.push(lift({ x: MIDLINE + side * x, y: icsY(n) }))
        out.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), material))
      }
    }
    for (const side of [-1, 1]) {
      const pts: THREE.Vector3[] = []
      for (let y = 105; y <= 330; y += 8) pts.push(lift({ x: MIDLINE + side * LINES.mcl, y }))
      out.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), material))
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surface])
  return (
    <group>
      {lines.map((l, i) => (
        <primitive key={i} object={l} />
      ))}
      {[1, 2, 3, 4, 5, 6].map(n => (
        <Html key={n} position={surfaceAt({ x: MIDLINE - 130, y: icsY(n) }).pos} center distanceFactor={8} zIndexRange={[20, 0]}>
          <span className="pointer-events-none text-[10px] font-bold text-sky-300">I{n}</span>
        </Html>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Miljö: brits, kudde, draperi                                        */
/* ------------------------------------------------------------------ */

/** Draperi som följer höfter och ben och faller ned mot britsens kanter */
function Drape({ xray, surface }: { xray: boolean; surface: SurfaceMap | null }) {
  const geometry = useMemo(() => {
    const W = 2.6
    const Z0 = 1.85
    const Z1 = 10.4
    const nx = 70
    const nz = 120
    const pos: number[] = []
    const heights: number[] = []
    const required: number[] = []
    const idx: number[] = []
    const smoothMax = (a: number, b: number, k = 0.25) => {
      const h = Math.max(0, Math.min(1, 0.5 + (0.5 * (a - b)) / k))
      return b + (a - b) * h + k * h * (1 - h)
    }
    for (let i = 0; i <= nz; i++) {
      const z = Z0 + (Z1 - Z0) * (i / nz)
      for (let j = 0; j <= nx; j++) {
        const x = -W - 0.25 + (2 * W + 0.5) * (j / nx)
        const ax = Math.min(1, Math.abs(x) / W)
        // Höfter: bred kupol som täcker bål och armar
        const hipFade = 1 - smoothstep(2.9, 4.2, z)
        const hips = 1.72 * Math.pow(Math.max(0, 1 - ax ** 2.6), 1 / 2.6) * hipFade
        // Ben: två åsar som smalnar av mot fötterna, med fötter som lyfter tyget i slutet
        const legH = 0.78 - 0.2 * smoothstep(4.5, 9.5, z) + 0.32 * Math.exp(-((z - 9.6) ** 2) / 0.12)
        const legs = Math.max(...[-0.55, 0.55].map(c => legH * Math.exp(-(((x - c) / 0.7) ** 2)))) * smoothstep(2.6, 3.8, z)
        const base = Math.abs(x) > W ? -0.35 * smoothstep(W, W + 0.25, Math.abs(x)) : 0.05
        const body = surface ? bodyTop(surface, x, -z) : Math.max(hips, legs)
        let h = smoothMax(body, base)
        // Dockan: mjuk kant mot bröstkorgen. Riktiga kroppen: tyget vilar direkt på huden.
        if (!surface) h *= smoothstep(Z0 - 0.05, Z0 + 0.35, z) * 0.35 + 0.65
        heights.push(h)
        required.push(surface ? body + 0.03 : -Infinity)
        pos.push(x, 0, z)
      }
    }
    // Släta ut tyget (särskilt över den riktiga kroppen, vars yta är detaljerad)
    const passes = surface ? 6 : 1
    for (let pass = 0; pass < passes; pass++) {
      const copy = heights.slice()
      for (let i = 1; i < nz; i++)
        for (let j = 1; j < nx; j++) {
          const k = i * (nx + 1) + j
          heights[k] = (copy[k] * 4 + copy[k - 1] + copy[k + 1] + copy[k - nx - 1] + copy[k + nx + 1]) / 8
        }
    }
    // Tyget får aldrig hamna under huden
    for (let k = 0; k < heights.length; k++) heights[k] = Math.max(heights[k], required[k])
    for (let k = 0; k < heights.length; k++) {
      const x = pos[k * 3]
      const z = pos[k * 3 + 2]
      const h = heights[k]
      pos[k * 3 + 1] = MATTRESS_TOP + h + 0.025 * Math.sin(z * 3.1 + x * 1.7) * smoothstep(0.2, 1, h)
    }
    for (let i = 0; i < nz; i++) {
      for (let j = 0; j < nx; j++) {
        const a = i * (nx + 1) + j
        const b = a + nx + 1
        idx.push(a, b, a + 1, b, b + 1, a + 1)
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
    g.setIndex(idx)
    g.computeVertexNormals()
    return g
  }, [surface])
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={xray ? "#1c2838" : "#9cc3ea"} roughness={0.92} side={THREE.DoubleSide} transparent={xray} opacity={xray ? 0.5 : 1} />
    </mesh>
  )
}

/** Kroppens högsta punkt runt (x, y) – "utvidgad" så att tyget spänner över skrevor och mellan benen */
function bodyTop(surface: SurfaceMap, x: number, y: number) {
  let top = -Infinity
  for (const dx of [-0.36, -0.18, 0, 0.18, 0.36])
    for (const dy of [-0.3, 0, 0.3]) {
      const h = surface.height(x + dx, y + dy)
      if (h === null || h === -Infinity) continue
      const v = h - 0.25 * (Math.abs(dx) + Math.abs(dy))
      if (v > top) top = v
    }
  return top === -Infinity ? 0 : LIE_HEIGHT + top + 0.08
}

function smoothstep(a: number, b: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function ExamTable({ xray, drape }: { xray: boolean; drape: boolean }) {
  return (
    <group>
      {/* Madrass */}
      <RoundedBox args={[7.4, 0.5, 18]} radius={0.18} position={[0, MATTRESS_TOP - 0.25, 2.6]} receiveShadow>
        <meshStandardMaterial color={xray ? "#0f1824" : "#3d6fb3"} roughness={0.75} />
      </RoundedBox>
      {/* Lakan */}
      <RoundedBox args={[7, 0.06, 17.4]} radius={0.03} position={[0, MATTRESS_TOP + 0.01, 2.6]} receiveShadow>
        <meshStandardMaterial color={xray ? "#162131" : "#eef3f8"} roughness={0.9} />
      </RoundedBox>
      {/* Underrede */}
      <mesh position={[0, MATTRESS_TOP - 1.0, 2.6]} receiveShadow>
        <boxGeometry args={[6.2, 1.0, 16.4]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.4} roughness={0.5} />
      </mesh>
      {/* Kudde */}
      <RoundedBox args={[3, 0.42, 2.2]} radius={0.2} smoothness={5} position={[0, MATTRESS_TOP + 0.17, -3.75]} receiveShadow castShadow>
        <meshStandardMaterial color={xray ? "#1a2535" : "#ffffff"} roughness={0.95} />
      </RoundedBox>
      {/* Draperiet behövs bara för dockan, som saknar ben */}
      {drape && <Drape xray={xray} surface={null} />}
      {/* Golv */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, MATTRESS_TOP - 1.5, 1.6]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#15202e" roughness={1} />
      </mesh>
    </group>
  )
}

function Lighting() {
  const { gl, scene } = useThree()
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = env
    scene.environmentIntensity = 0.55
    return () => {
      env.dispose()
      pmrem.dispose()
    }
  }, [gl, scene])
  return (
    <>
      <hemisphereLight args={["#e9f1ff", "#1b2433", 0.55]} />
      <directionalLight
        position={[-5, 12, 4]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0004}
        shadow-normalBias={0.12}
      />
      <directionalLight position={[6, 6, -6]} intensity={0.55} color="#bcd4ff" />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Kamera och interaktion                                              */
/* ------------------------------------------------------------------ */

interface Bridge {
  camera: THREE.Camera | null
  body: THREE.Group | null
  size: { width: number; height: number }
}

function BridgeWriter({ bridge }: { bridge: MutableRefObject<Bridge> }) {
  const { camera, size } = useThree()
  bridge.current.camera = camera
  bridge.current.size = size
  return null
}

function CameraRig({ view, controls }: { view: ViewId; controls: MutableRefObject<OrbitControlsImpl | null> }) {
  const { camera } = useThree()
  const animating = useRef(true)
  useEffect(() => {
    animating.current = true
  }, [view])
  useFrame((_, dt) => {
    if (!animating.current || !controls.current) return
    const goal = VIEWS[view]
    const k = 1 - Math.pow(0.002, dt)
    camera.position.lerp(goal.pos, k)
    controls.current.target.lerp(goal.target, k)
    controls.current.update()
    if (camera.position.distanceTo(goal.pos) < 0.02) animating.current = false
  })
  useEffect(() => {
    const c = controls.current
    if (!c) return
    const stop = () => (animating.current = false)
    c.addEventListener("start", stop)
    return () => c.removeEventListener("start", stop)
  }, [controls])
  return null
}

export default function PatientScene({ xray = false, markers = [], onPoint, guides = false, focus = "chest", ariaLabel, className, highlight }: PatientViewProps) {
  const bridge = useRef<Bridge>({ camera: null, body: null, size: { width: 1, height: 1 } })
  const bodyRef = useRef<THREE.Group>(null)
  const controls = useRef<OrbitControlsImpl | null>(null)
  const wrapper = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const [view, setView] = useState<ViewId>(focus)
  useEffect(() => setView(focus), [focus])
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const [realSurface, setRealSurface] = useState<MeshSurface | null>(null)
  const surface = realSurface ?? DUMMY_SURFACE
  const onModelSurface = useCallback((map: MeshSurface) => setRealSurface(map), [])

  const pick = (clientX: number, clientY: number): Point | null => {
    const el = wrapper.current
    const cam = bridge.current.camera
    const body = bodyRef.current
    if (!el || !cam || !body) return null
    const rect = el.getBoundingClientRect()
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
    raycaster.setFromCamera(ndc, cam)
    // Strålen till patientens lokala koordinater och mot höjdkartan – snabbt även för tunga modeller
    const origin = body.worldToLocal(raycaster.ray.origin.clone())
    const dir = body.worldToLocal(raycaster.ray.origin.clone().add(raycaster.ray.direction)).sub(origin)
    return surface.intersect(origin, dir)
  }

  // Fångas innan OrbitControls hinner reagera: klick på huden = verktyget, annars rotera kameran
  const onPointerDownCapture = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!onPoint || (e.target as HTMLElement).closest("button, a")) return
    const p = pick(e.clientX, e.clientY)
    if (!p) return
    e.stopPropagation()
    e.preventDefault()
    dragging.current = true
    wrapper.current?.setPointerCapture(e.pointerId)
    onPoint(p, "down")
  }
  const onPointerMoveCapture = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || !onPoint) return
    e.stopPropagation()
    const p = pick(e.clientX, e.clientY)
    if (p) onPoint(p, "move")
  }
  const onPointerUpCapture = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    e.stopPropagation()
    dragging.current = false
    const p = pick(e.clientX, e.clientY)
    if (p && onPoint) onPoint(p, "up")
  }

  return (
    <div
      ref={wrapper}
      role="img"
      aria-label={ariaLabel ?? "Virtuell patient i 3D"}
      className={cn(
        "relative h-full w-full touch-none select-none overflow-hidden rounded-xl bg-[radial-gradient(ellipse_at_top,#2a3b52_0%,#121b28_70%)]",
        highlight && "ring-2 ring-accent",
        className,
      )}
      onPointerDownCapture={onPointerDownCapture}
      onPointerMoveCapture={onPointerMoveCapture}
      onPointerUpCapture={onPointerUpCapture}
    >
      <Canvas shadows dpr={[1, 2]} camera={{ fov: 32, position: VIEWS[focus].pos.toArray(), near: 0.1, far: 100 }} gl={{ antialias: true, alpha: true }}>
        <BridgeWriter bridge={bridge} />
        <Lighting />
        <ExamTable xray={xray} drape={!realSurface} />
        <SurfaceCtx.Provider value={surface}>
          <group position={[0, LIE_HEIGHT, 0]} rotation={PATIENT_ROT}>
            <ModelBoundary fallback={<PatientBody ref={bodyRef} xray={xray} />}>
              <Suspense fallback={null}>
                <PatientGLB ref={bodyRef} xray={xray} onSurface={onModelSurface} />
              </Suspense>
            </ModelBoundary>
            {xray && <XrayAnatomy />}
            {guides && <Guides />}
            {markers.map((m, i) => (
              <Marker key={`${m.kind}-${i}`} m={m} />
            ))}
          </group>
        </SurfaceCtx.Provider>
        <ContactShadows position={[0, MATTRESS_TOP + 0.05, 0]} opacity={0.35} scale={14} blur={2.4} far={2} />
        <OrbitControls
          ref={controls as any}
          makeDefault
          enablePan={false}
          minDistance={3.5}
          maxDistance={30}
          minPolarAngle={0.05}
          maxPolarAngle={Math.PI * 0.46}
          target={VIEWS[focus].target.toArray()}
        />
        <CameraRig view={view} controls={controls} />
      </Canvas>

      <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1.5 rounded-md bg-black/40 px-2 py-1 text-[11px] text-white/80 backdrop-blur">
        <Move3d className="h-3.5 w-3.5" /> Dra utanför kroppen för att rotera
      </div>
      {realSurface && (
        <a
          href="https://poly.pizza/m/eWGDnQ0jzmH"
          target="_blank"
          rel="noreferrer"
          onPointerDownCapture={e => e.stopPropagation()}
          className="absolute bottom-2 left-2 max-w-[45%] truncate text-[10px] text-white/45 hover:text-white/80"
        >
          3D-modell: "Male base" av Артур Мигранов, CC BY 3.0
        </a>
      )}
      <div className="absolute bottom-2 right-2 flex gap-1">
        {(
          [
            ["overview", "Översikt", Eye],
            ["chest", "Bröstkorg", Focus],
            ["top", "Ovanifrån", Focus],
            ["neck", "Hals", Focus],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onPointerDownCapture={e => e.stopPropagation()}
            onClick={() => setView(id)}
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium backdrop-blur transition-colors",
              view === id ? "bg-white text-slate-900" : "bg-black/40 text-white/85 hover:bg-black/60",
            )}
          >
            <Icon className="h-3 w-3" /> {label}
          </button>
        ))}
      </div>
    </div>
  )
}
