"use client"

import { Component, forwardRef, useEffect, useMemo, type ReactNode } from "react"
import * as THREE from "three"
import { useGLTF } from "@react-three/drei"
import { MeshSurface } from "./mesh-surface"
import { createSkinMaterial } from "./skin-material"

// Patientmodellen "Male base" (CC BY 3.0), förbehandlad i scripts/osce-model.
// Placeras i samma lokala koordinatsystem som 2D-anatomin:
// x = patientens vänster, y = mot huvudet, z = framåt, 1 enhet = 100 px.

export const PATIENT_MODEL_URL = "/osce/models/patient.glb"

/**
 * Kalibrering mot 2D-anatomin, uppmätt på modellen (1 modellenhet ≈ 8,5 cm):
 * jugulum (y = 17,2) → 1,92, skala 0,72 så att I5 hamnar ca 15 cm under jugulum
 * och bröstkorgen räcker ut till V6. Ryggen (z = −1,75) vilar på britsen (z ≈ −0,84).
 * Modellen tittar redan mot +z med patientens vänster mot +x.
 */
const SCALE = 0.72
const OFFSET = new THREE.Vector3(0, 1.92 - 17.2 * SCALE, 0.42)

export const PatientGLB = forwardRef<THREE.Group, { xray: boolean; onSurface: (surface: MeshSurface) => void }>(function PatientGLB({ xray, onSurface }, ref) {
  const { scene } = useGLTF(PATIENT_MODEL_URL)

  const { object, material, surface } = useMemo(() => {
    const object = scene.clone(true)
    const material = createSkinMaterial()
    let surface: MeshSurface | null = null
    object.traverse(o => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.name = "torso"
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.material = material
      surface = new MeshSurface(mesh.geometry, SCALE, OFFSET)
    })
    return { object, material, surface }
  }, [scene])

  useEffect(() => {
    if (surface) onSurface(surface)
  }, [surface, onSurface])

  useEffect(() => {
    material.transparent = xray
    material.opacity = xray ? 0.14 : 1
    material.depthWrite = !xray
    material.needsUpdate = true
  }, [xray, material])

  return (
    <group ref={ref} name="patient-body">
      <group position={OFFSET} scale={SCALE}>
        <primitive object={object} />
      </group>
    </group>
  )
})

/** Faller tillbaka på den modellerade dockan om modellfilen inte går att ladda */
export class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.warn("Patientmodellen kunde inte laddas – visar dockan i stället.", error)
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
