"use client"

import { useMemo } from "react"
import * as THREE from "three"
import { Canvas } from "@react-three/fiber"
import { ContactShadows, Html, OrbitControls, RoundedBox } from "@react-three/drei"
import { TUBE_RESULTS, TUBE_TESTS, type Hemolysis } from "../tools/microbiology"

// Laboratoriebänk i 3D: blodagarplattor med hemolys och ett ställ med biokemiska rör.

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const glass = (
  <meshPhysicalMaterial color="#ffffff" transmission={0.92} roughness={0.08} thickness={0.05} transparent opacity={0.35} />
)

function PetriDish({ type, seed, position, label }: { type: Hemolysis; seed: number; position: [number, number, number]; label: string }) {
  const colonies = useMemo(() => {
    const rand = mulberry32(seed)
    return Array.from({ length: 46 }, () => {
      const a = rand() * Math.PI * 2
      const r = Math.sqrt(rand()) * 1.25
      return { x: Math.cos(a) * r, z: Math.sin(a) * r, s: 0.04 + rand() * 0.05 }
    })
  }, [seed])
  const halo = type === "beta" ? "#f3c9a8" : type === "alpha" ? "#556b2f" : null
  return (
    <group position={position}>
      {/* Glasskål */}
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[1.6, 1.6, 0.24, 64, 1, true]} />
        {glass}
      </mesh>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.6, 64]} />
        {glass}
      </mesh>
      {/* Blodagar */}
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <cylinderGeometry args={[1.55, 1.55, 0.14, 64]} />
        <meshPhysicalMaterial color="#8a1620" roughness={0.35} clearcoat={0.6} clearcoatRoughness={0.2} />
      </mesh>
      {halo &&
        colonies.map((c, i) => (
          <mesh key={`h${i}`} position={[c.x, 0.153 + i * 0.00002, c.z]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[c.s * (type === "beta" ? 3.2 : 2.4), 24]} />
            <meshStandardMaterial color={halo} transparent opacity={type === "beta" ? 0.75 : 0.6} depthWrite={false} />
          </mesh>
        ))}
      {colonies.map((c, i) => (
        <mesh key={i} position={[c.x, 0.155, c.z]} scale={[1, 0.45, 1]} castShadow>
          <sphereGeometry args={[c.s, 16, 12]} />
          <meshStandardMaterial color={type === "gamma" ? "#e5dfcf" : "#f2efe6"} roughness={0.4} />
        </mesh>
      ))}
      <Html position={[0, 0.2, 1.95]} center distanceFactor={9}>
        <span className="pointer-events-none whitespace-nowrap rounded bg-white/90 px-2 py-0.5 text-xs font-semibold text-slate-800 shadow">{label}</span>
      </Html>
    </group>
  )
}

function TestTube({ x, test, positive }: { x: number; test: (typeof TUBE_TESTS)[number]; positive: boolean }) {
  const isIndol = test.id === "indol"
  const isMotility = test.id === "rorlighet"
  const liquid = isIndol ? "#fde68a" : isMotility ? "#f5e6b8" : positive ? test.pos : test.neg
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 1.4, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 2.8, 32, 1, true]} />
        {glass}
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <sphereGeometry args={[0.32, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        {glass}
      </mesh>
      <mesh position={[0, 0.85, 0]}>
        <cylinderGeometry args={[0.29, 0.29, 1.7, 32]} />
        <meshPhysicalMaterial color={liquid} roughness={0.2} transmission={0.3} transparent opacity={0.92} />
      </mesh>
      {isIndol && (
        <mesh position={[0, 1.75, 0]}>
          <cylinderGeometry args={[0.295, 0.295, 0.12, 32]} />
          <meshStandardMaterial color={positive ? "#e11d48" : "#fef9c3"} />
        </mesh>
      )}
      {isMotility &&
        (positive ? (
          <mesh position={[0, 0.85, 0]}>
            <cylinderGeometry args={[0.27, 0.27, 1.6, 24]} />
            <meshStandardMaterial color="#b48c3c" transparent opacity={0.45} />
          </mesh>
        ) : (
          <mesh position={[0, 0.9, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 1.6, 8]} />
            <meshStandardMaterial color="#8a6420" />
          </mesh>
        ))}
      {/* Kork */}
      <mesh position={[0, 2.9, 0]}>
        <cylinderGeometry args={[0.34, 0.3, 0.3, 24]} />
        <meshStandardMaterial color="#9ca3af" roughness={0.7} />
      </mesh>
      <Html position={[0, -0.45, 0.5]} center distanceFactor={9}>
        <span className="pointer-events-none block whitespace-nowrap rounded bg-white/90 px-1.5 py-0.5 text-center text-[11px] font-semibold leading-tight text-slate-800 shadow">
          {test.name}
        </span>
      </Html>
    </group>
  )
}

function Bench() {
  return (
    <>
      <RoundedBox args={[16, 0.3, 8]} radius={0.08} position={[0, -0.16, 0]} receiveShadow>
        <meshStandardMaterial color="#e8edf2" roughness={0.6} />
      </RoundedBox>
    </>
  )
}

export default function LabScene({ plates, tubes }: { plates?: Hemolysis[]; tubes?: string }) {
  const list = plates ?? []
  const results = tubes ? TUBE_RESULTS[tubes] ?? TUBE_RESULTS.ecoli : null
  const spacing = 3.6
  return (
    <div className="relative h-[320px] w-full overflow-hidden rounded-xl bg-[radial-gradient(ellipse_at_top,#2a3b52_0%,#121b28_70%)] md:h-[380px]">
      <Canvas shadows dpr={[1, 2]} camera={{ fov: 32, position: results ? [0, 6, 11] : [0, 8, 9], near: 0.1, far: 100 }}>
        <hemisphereLight args={["#f1f6ff", "#1b2433", 0.8]} />
        <directionalLight position={[4, 10, 6]} intensity={1.7} castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-6, 4, -3]} intensity={0.4} color="#bcd4ff" />
        <Bench />
        {list.map((p, i) => (
          <PetriDish
            key={i}
            type={p}
            seed={i * 17 + 5}
            position={[(i - (list.length - 1) / 2) * spacing, 0, 0]}
            label={list.length > 1 ? `Platta ${String.fromCharCode(65 + i)}` : "Platta"}
          />
        ))}
        {results && (
          <group position={[0, 0, 0]}>
            <RoundedBox args={[TUBE_TESTS.length * 1.1 + 0.6, 0.25, 1]} radius={0.05} position={[0, 0.3, 0]}>
              <meshStandardMaterial color="#cbd5e1" />
            </RoundedBox>
            {TUBE_TESTS.map((t, i) => (
              <TestTube key={t.id} x={(i - (TUBE_TESTS.length - 1) / 2) * 1.1} test={t} positive={results[t.id]} />
            ))}
          </group>
        )}
        <ContactShadows position={[0, 0.01, 0]} opacity={0.35} scale={18} blur={2.2} far={3} />
        <OrbitControls enablePan={false} minDistance={5} maxDistance={18} maxPolarAngle={Math.PI * 0.47} target={results ? [0, 1.2, 0] : [0, 0, 0]} />
      </Canvas>
      <div className="pointer-events-none absolute left-2 top-2 rounded-md bg-black/40 px-2 py-1 text-[11px] text-white/80 backdrop-blur">Dra för att rotera · scrolla för att zooma</div>
    </div>
  )
}

