"use client"

import { useMemo, useReducer, useRef } from "react"
import * as THREE from "three"
import { Canvas, useFrame } from "@react-three/fiber"
import { ContactShadows, OrbitControls, RoundedBox } from "@react-three/drei"

// Blodtrycksmätning i 3D: sittande patient med armen på bordet (hjärthöjd) eller hängande,
// manschett på överarmen, stetoskop i armvecket eller fingrar på a. radialis.

export interface ArmSceneProps {
  cuff: number | null
  armAtHeart: boolean | null
  method: "palpate" | "listen"
  pressure: number
}

const SKIN = "#e4b99c"

function useSkin() {
  return useMemo(
    () => new THREE.MeshPhysicalMaterial({ color: SKIN, roughness: 0.6, sheen: 0.5, sheenColor: new THREE.Color("#ffd9c4") }),
    [],
  )
}

/** Armens leder i världskoordinater för de två positionerna */
const POSES = {
  heart: {
    shoulder: new THREE.Vector3(0, 3.2, 0),
    elbow: new THREE.Vector3(0.2, 1.6, 1.4),
    wrist: new THREE.Vector3(0.25, 1.62, 3.9),
  },
  hanging: {
    shoulder: new THREE.Vector3(0, 3.2, 0),
    elbow: new THREE.Vector3(0.05, 0.4, 0.15),
    wrist: new THREE.Vector3(0.1, -2.0, 0.35),
  },
}

function Segment({ from, to, r1, r2, material }: { from: THREE.Vector3; to: THREE.Vector3; r1: number; r2: number; material: THREE.Material }) {
  const len = from.distanceTo(to)
  const mid = from.clone().add(to).multiplyScalar(0.5)
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize())
  return (
    <mesh position={mid} quaternion={q} material={material} castShadow receiveShadow>
      <capsuleGeometry args={[(r1 + r2) / 2, len, 12, 32]} />
    </mesh>
  )
}

function Arm({ cuff, armAtHeart, method, pressure }: ArmSceneProps) {
  const skin = useSkin()
  const t = useRef(armAtHeart === false ? 1 : 0)
  const group = useRef<THREE.Group>(null)
  const joints = useRef({ ...POSES.heart })
  const [, force] = useFrameState()

  useFrame((_, dt) => {
    const goal = armAtHeart === false ? 1 : 0
    const next = THREE.MathUtils.damp(t.current, goal, 5, dt)
    if (Math.abs(next - t.current) > 1e-4) {
      t.current = next
      joints.current = {
        shoulder: POSES.heart.shoulder.clone(),
        elbow: POSES.heart.elbow.clone().lerp(POSES.hanging.elbow, next),
        wrist: POSES.heart.wrist.clone().lerp(POSES.hanging.wrist, next),
      }
      force()
    }
  })

  const { shoulder, elbow, wrist } = joints.current
  const upper = elbow.clone().sub(shoulder)
  const cuffWidth = cuff === 9 ? 0.75 : cuff === 14 ? 1.15 : 0.95
  const cuffColor = cuff === 9 ? "#64748b" : cuff === 14 ? "#1e3a5f" : "#1d4ed8"
  const swell = 1 + Math.min(1, pressure / 220) * 0.12
  const cuffPos = shoulder.clone().add(upper.clone().multiplyScalar(0.48))
  const cuffQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), upper.clone().normalize())
  // Armvecket (a. brachialis) ligger på armens framsida, strax ovanför armbågen
  const fossa = elbow.clone().add(armAtHeart === false ? new THREE.Vector3(0, 0, 0.42) : new THREE.Vector3(0, 0.42, 0))
  const forearm = wrist.clone().sub(elbow).normalize()
  const radial = wrist.clone().sub(forearm.clone().multiplyScalar(0.45)).add(new THREE.Vector3(-0.28, armAtHeart === false ? 0 : 0.2, armAtHeart === false ? 0.2 : 0))

  return (
    <group ref={group}>
      {/* Bål och axel */}
      <mesh position={[-1.4, 2.4, -0.2]} material={skin} castShadow>
        <capsuleGeometry args={[1.35, 2.6, 16, 32]} />
      </mesh>
      <mesh position={shoulder} material={skin} castShadow>
        <sphereGeometry args={[0.55, 32, 32]} />
      </mesh>
      <Segment from={shoulder} to={elbow} r1={0.5} r2={0.42} material={skin} />
      <Segment from={elbow} to={wrist} r1={0.4} r2={0.3} material={skin} />
      <mesh position={wrist.clone().add(forearm.clone().multiplyScalar(0.55))} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), forearm)} scale={[0.36, 0.55, 0.16]} material={skin} castShadow>
        <sphereGeometry args={[1, 24, 24]} />
      </mesh>

      {cuff !== null && (
        <group position={cuffPos} quaternion={cuffQ}>
          <mesh castShadow scale={[swell, 1, swell]}>
            <cylinderGeometry args={[0.6, cuff === 14 ? 0.66 : 0.6, cuffWidth, 40, 1, true]} />
            <meshStandardMaterial color={cuffColor} roughness={0.8} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0.62 * swell, 0, 0]}>
            <boxGeometry args={[0.08, cuffWidth * 0.6, 0.3]} />
            <meshStandardMaterial color="#cbd5e1" />
          </mesh>
        </group>
      )}

      {method === "listen" && cuff !== null && (
        <group position={fossa}>
          <mesh rotation={[armAtHeart === false ? Math.PI / 2 : 0, 0, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.2, 0.08, 40]} />
            <meshStandardMaterial color="#d7dde4" metalness={0.95} roughness={0.2} />
          </mesh>
          <StethoscopeTube />
        </group>
      )}

      {method === "palpate" && (
        <group position={radial}>
          {[-0.12, 0.12].map(x => (
            <mesh key={x} position={[x, 0.12, 0]} rotation={[0, 0, 0.2]} castShadow>
              <capsuleGeometry args={[0.07, 0.45, 8, 16]} />
              <meshStandardMaterial color="#c99474" roughness={0.6} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  )
}

function StethoscopeTube() {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.05, 0),
      new THREE.Vector3(0.1, 0.9, 0.2),
      new THREE.Vector3(1.2, 2.2, 0.6),
      new THREE.Vector3(2.8, 3.4, 0.4),
    ])
    return new THREE.TubeGeometry(curve, 48, 0.04, 10, false)
  }, [])
  return (
    <mesh geometry={geometry} castShadow>
      <meshStandardMaterial color="#20252c" roughness={0.5} />
    </mesh>
  )
}

/** Liten hjälp för att tvinga om-rendering när armen animeras */
function useFrameState() {
  return useReducer((x: number) => x + 1, 0)
}

export default function ArmScene(props: ArmSceneProps) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-[radial-gradient(ellipse_at_top,#2a3b52_0%,#121b28_70%)]">
      <Canvas shadows dpr={[1, 2]} camera={{ fov: 35, position: [9.5, 6.5, 10], near: 0.1, far: 100 }}>
        <hemisphereLight args={["#e9f1ff", "#1b2433", 0.7]} />
        <directionalLight position={[5, 10, 6]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-6, 5, -4]} intensity={0.5} color="#bcd4ff" />
        {/* Bord i hjärthöjd */}
        <RoundedBox args={[3.4, 0.25, 6]} radius={0.06} position={[0.4, 0.95, 2.6]} receiveShadow castShadow>
          <meshStandardMaterial color="#e2e8f0" roughness={0.7} />
        </RoundedBox>
        <mesh position={[0.4, -1.2, 2.6]}>
          <boxGeometry args={[0.2, 4.2, 0.2]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.5} roughness={0.4} />
        </mesh>
        <Arm {...props} />
        <ContactShadows position={[0, -3.3, 0]} opacity={0.4} scale={16} blur={2.5} far={5} />
        <OrbitControls enablePan={false} minDistance={6} maxDistance={16} target={[0.2, 1.5, 1.8]} maxPolarAngle={Math.PI * 0.55} />
      </Canvas>
      <div className="pointer-events-none absolute left-2 top-2 rounded-md bg-black/40 px-2 py-1 text-[11px] text-white/80 backdrop-blur">Dra för att rotera</div>
    </div>
  )
}
