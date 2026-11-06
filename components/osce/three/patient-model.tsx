"use client"

import { forwardRef, useEffect, useMemo } from "react"
import * as THREE from "three"
import { MIDLINE, LINES, icsY, ribY, type Point } from "@/lib/osce/anatomy"

// Den virtuella patienten i 3D, modellerad i "stående" koordinater:
// x = patientens vänster (+), y = uppåt (huvud +), z = framåt (bröstet +).
// Gruppen roteras sedan så att patienten ligger på rygg på britsen.
// 1 enhet = 100 px i 2D-anatomin, så samma landmärken används i 2D och 3D.

export const toLocal = (p: Point) => new THREE.Vector3((p.x - MIDLINE) / 100, (300 - p.y) / 100, 0)
export const fromLocal = (v: THREE.Vector3): Point => ({ x: MIDLINE + v.x * 100, y: 300 - v.y * 100 })

/** Bålens radie (i x-led) på höjden y. Djupet är DEPTH × radien. */
export const DEPTH = 0.62
function torsoRadius(y: number) {
  const pts: [number, number][] = [
    [-3.2, 1.32],
    [-2.4, 1.36],
    [-1.6, 1.24],
    [-0.8, 1.3],
    [0.2, 1.42],
    [1.2, 1.46],
    [1.7, 1.48],
    [1.98, 1.36],
    [2.12, 0.95],
    [2.24, 0.5],
    [2.32, 0.36],
  ]
  if (y <= pts[0][0]) return pts[0][1]
  for (let i = 1; i < pts.length; i++) {
    if (y <= pts[i][0]) {
      const [y0, r0] = pts[i - 1]
      const [y1, r1] = pts[i]
      const t = (y - y0) / (y1 - y0)
      const s = t * t * (3 - 2 * t)
      return r0 + (r1 - r0) * s
    }
  }
  return pts[pts.length - 1][1]
}

function buildTorso() {
  // Egen "lathe" med elliptiskt tvärsnitt och lätt tillplattad rygg
  const rows = 90
  const cols = 64
  const yTop = 2.34
  const yBottom = -2.6
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  for (let i = 0; i <= rows; i++) {
    const y = yTop + (yBottom - yTop) * (i / rows)
    const r = torsoRadius(y)
    for (let j = 0; j <= cols; j++) {
      const a = (j / cols) * Math.PI * 2
      const sx = Math.sin(a)
      const cz = Math.cos(a)
      // Bröstmuskulatur: lite mer fyllnad framtill i bröstkorgshöjd
      const chest = y > 0.4 && y < 1.9 && cz > 0 ? 0.05 * Math.sin(((y - 0.4) / 1.5) * Math.PI) * cz * (1 - Math.abs(sx) * 0.3) : 0
      const back = cz < 0 ? 0.9 : 1
      positions.push(r * sx, y, (r * DEPTH * back + chest) * cz)
      uvs.push(j / cols, i / rows)
    }
  }
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const a = i * (cols + 1) + j
      const b = a + cols + 1
      indices.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}

function limb(from: THREE.Vector3, to: THREE.Vector3, r1: number, r2: number) {
  const len = from.distanceTo(to)
  const g = new THREE.CylinderGeometry(r2, r1, len, 28, 1, false)
  const mid = from.clone().add(to).multiplyScalar(0.5)
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize())
  return { g, mid, q }
}

function ribCurve(n: number, side: 1 | -1) {
  const startY = (300 - (n <= 7 ? ribY(n) : ribY(7) + (n - 7) * 22)) / 100
  const startA = n <= 7 ? 0.14 : 0.14 + (n - 7) * 0.24
  const pts: THREE.Vector3[] = []
  for (let k = 0; k <= 24; k++) {
    const a = startA + (Math.PI - 0.3 - startA) * (k / 24)
    // Framtill sluttar revbenen nedåt mot sternum – lateralt ligger de högre
    const y = startY + 0.22 * Math.sin(Math.min(a, Math.PI / 2)) - 0.18 * Math.max(0, a - Math.PI / 2)
    const r = torsoRadius(y) * 0.9
    pts.push(new THREE.Vector3(side * r * Math.sin(a), y, r * DEPTH * Math.cos(a) * (Math.cos(a) < 0 ? 0.9 : 1) * 0.95))
  }
  return new THREE.CatmullRomCurve3(pts)
}

export interface PatientModelProps {
  xray: boolean
  skin?: string
}

/** Kroppen (klickbar) – exporteras med ref så att verktygen kan raycasta mot den */
export const PatientBody = forwardRef<THREE.Group, PatientModelProps>(function PatientBody({ xray, skin = "#e7bea2" }, ref) {
  const torso = useMemo(buildTorso, [])
  const arms = useMemo(() => {
    const out: ReturnType<typeof limb>[] = []
    for (const s of [-1, 1]) {
      const shoulder = new THREE.Vector3(s * 1.72, 1.7, -0.3)
      const elbow = new THREE.Vector3(s * 2.02, -0.95, -0.44)
      const wrist = new THREE.Vector3(s * 2.12, -3.35, -0.5)
      out.push(limb(shoulder, elbow, 0.4, 0.33), limb(elbow, wrist, 0.32, 0.24))
    }
    return out
  }, [])

  const skinMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: skin,
        roughness: 0.62,
        sheen: 0.6,
        sheenRoughness: 0.8,
        sheenColor: new THREE.Color("#ffd9c4"),
        clearcoat: 0.05,
      }),
    [skin],
  )
  useEffect(() => {
    // Byte av transparens kräver att shadern kompileras om
    skinMat.transparent = xray
    skinMat.opacity = xray ? 0.12 : 1
    skinMat.depthWrite = !xray
    skinMat.needsUpdate = true
  }, [xray, skinMat])

  return (
    <group ref={ref} name="patient-body">
      <mesh geometry={torso} material={skinMat} castShadow receiveShadow name="torso" />
      {/* Hals och huvud */}
      <mesh position={[0, 2.6, -0.02]} material={skinMat} castShadow name="neck">
        <cylinderGeometry args={[0.36, 0.42, 0.7, 32]} />
      </mesh>
      <mesh position={[0, 3.42, 0.02]} scale={[0.66, 0.82, 0.74]} material={skinMat} castShadow name="head">
        <sphereGeometry args={[1, 48, 48]} />
      </mesh>
      <mesh position={[0, 3.36, 0.72]} rotation={[0.25, 0, 0]} material={skinMat} name="nose">
        <coneGeometry args={[0.1, 0.28, 16]} />
      </mesh>
      {[-1, 1].map(s => (
        <mesh key={s} position={[s * 0.64, 3.38, -0.02]} scale={[0.1, 0.2, 0.14]} material={skinMat} name="ear">
          <sphereGeometry args={[1, 16, 16]} />
        </mesh>
      ))}
      {/* Axlar och armar */}
      {[-1, 1].map(s => (
        <mesh key={s} position={[s * 1.6, 1.8, -0.2]} scale={[0.5, 0.46, 0.5]} material={skinMat} castShadow name="shoulder">
          <sphereGeometry args={[1, 32, 32]} />
        </mesh>
      ))}
      {arms.map((a, i) => (
        <mesh key={i} geometry={a.g} position={a.mid} quaternion={a.q} material={skinMat} castShadow name="arm" />
      ))}
      {[-1, 1].map(s => (
        <mesh key={s} position={[s * 2.13, -3.62, -0.52]} scale={[0.2, 0.36, 0.12]} material={skinMat} castShadow name="hand">
          <sphereGeometry args={[1, 24, 24]} />
        </mesh>
      ))}
      {!xray && <Landmarks />}
    </group>
  )
})

/** Bröstvårtor och navel – hjälper studenten att orientera sig */
function Landmarks() {
  const r4 = torsoRadius((300 - icsY(4)) / 100)
  const nx = LINES.mcl / 100
  const nz = (r4 * DEPTH + 0.04) * Math.sqrt(Math.max(0, 1 - (nx / r4) ** 2))
  return (
    <group>
      {[-1, 1].map(s => (
        <mesh key={s} position={[s * nx, (300 - icsY(4)) / 100, nz + 0.005]} rotation={[0, s * 0.45, 0]}>
          <circleGeometry args={[0.055, 24]} />
          <meshStandardMaterial color="#b98670" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, (300 - 455) / 100, torsoRadius(-1.55) * DEPTH - 0.01]}>
        <circleGeometry args={[0.04, 16]} />
        <meshStandardMaterial color="#9c6e5b" />
      </mesh>
    </group>
  )
}

/** Skelett och organ som syns i röntgenläget */
export function XrayAnatomy() {
  const ribs = useMemo(() => {
    const list: THREE.TubeGeometry[] = []
    for (let n = 1; n <= 10; n++) for (const s of [-1, 1] as const) list.push(new THREE.TubeGeometry(ribCurve(n, s), 40, 0.035, 8, false))
    return list
  }, [])
  const clavicles = useMemo(
    () =>
      [-1, 1].map(s => {
        const c = new THREE.CatmullRomCurve3([
          new THREE.Vector3(s * 0.16, 1.92, 0.62),
          new THREE.Vector3(s * 0.7, 2.02, 0.55),
          new THREE.Vector3(s * 1.4, 2.0, 0.2),
        ])
        return new THREE.TubeGeometry(c, 24, 0.05, 10, false)
      }),
    [],
  )
  const bone = <meshStandardMaterial color="#dfe7ef" emissive="#9fb4c8" emissiveIntensity={0.25} roughness={0.5} />
  const sternumTop = (300 - 108) / 100
  const sternumBottom = (300 - 300) / 100
  return (
    <group name="xray">
      {ribs.map((g, i) => (
        <mesh key={i} geometry={g}>
          {bone}
        </mesh>
      ))}
      {clavicles.map((g, i) => (
        <mesh key={i} geometry={g}>
          {bone}
        </mesh>
      ))}
      <mesh position={[0, (sternumTop + sternumBottom) / 2, 0.82]}>
        <boxGeometry args={[0.26, sternumTop - sternumBottom, 0.06]} />
        {bone}
      </mesh>
      {/* Ryggraden som separata kotor */}
      {Array.from({ length: 17 }, (_, i) => (
        <mesh key={i} position={[0, 2.5 - i * 0.29, -0.6]}>
          <cylinderGeometry args={[0.11, 0.12, 0.2, 14]} />
          {bone}
        </mesh>
      ))}
      {/* Lungor */}
      {[-1, 1].map(s => (
        <mesh key={s} position={[s * 0.72, 0.8, 0.0]} scale={[0.62, 1.15, 0.62]}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial color="#f2a6b0" transparent opacity={0.38} roughness={0.9} depthWrite={false} />
        </mesh>
      ))}
      {/* Hjärta – spetsen pekar ned åt vänster mot apex */}
      <group position={[0.22, 0.72, 0.28]} rotation={[0.2, 0.3, 0.75]}>
        <mesh scale={[0.5, 0.62, 0.42]}>
          <sphereGeometry args={[1, 40, 40]} />
          <meshStandardMaterial color="#d2344a" roughness={0.45} emissive="#5a0d18" emissiveIntensity={0.3} />
        </mesh>
        <mesh position={[0, 0.55, -0.05]}>
          <cylinderGeometry args={[0.13, 0.13, 0.55, 20]} />
          <meshStandardMaterial color="#c0283d" roughness={0.5} />
        </mesh>
      </group>
    </group>
  )
}

export { torsoRadius }
