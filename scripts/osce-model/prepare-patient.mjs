// Förbereder patientmodellen "Male base" (Артур Мигранов, CC BY 3.0):
// vinklar in armarna mot kroppen och sänker händerna så att de vilar på britsen.
// Färgen ligger inte i filen utan målas i components/osce/three/skin-material.ts.
// Kör: node prepare-patient.mjs model.glb ../../public/osce/models/patient.glb
// (kräver @gltf-transform/core)
import { NodeIO } from "@gltf-transform/core"

const [, , input, output] = process.argv
const io = new NodeIO()
const doc = await io.read(input)

const JOINT = { x: 2.7, y: 16.0 }
const ANGLE = (10 * Math.PI) / 180
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

for (const mesh of doc.getRoot().listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute("POSITION")
    const nor = prim.getAttribute("NORMAL")
    const v = [0, 0, 0]
    const n = [0, 0, 0]
    for (let i = 0; i < pos.getCount(); i++) {
      pos.getElement(i, v)
      const side = Math.sign(v[0]) || 1
      const ax = Math.abs(v[0])
      // Armen: utanför bålen, under axeln. Benen (lågt y) ligger aldrig så långt ut.
      const w = smooth(2.1, 2.8, ax) * (v[1] > 8 ? smooth(16.6, 15.2, v[1]) : 0)
      if (w <= 0) continue
      const a = side * ANGLE * w
      const c = Math.cos(a)
      const s = Math.sin(a)
      const dx = v[0] - side * JOINT.x
      const dy = v[1] - JOINT.y
      v[0] = side * JOINT.x + dx * c - dy * s
      v[1] = JOINT.y + dx * s + dy * c
      // Sänk underarmen mot britsen
      v[2] -= 0.5 * smooth(14, 10.5, v[1]) * w
      pos.setElement(i, v)
      if (nor) {
        nor.getElement(i, n)
        const nx = n[0] * c - n[1] * s
        const ny = n[0] * s + n[1] * c
        n[0] = nx
        n[1] = ny
        nor.setElement(i, n)
      }
    }
  }
}
await io.write(output, doc)
console.log("ok")
