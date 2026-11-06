import * as THREE from "three"
import { MIDLINE, type Point } from "@/lib/osce/anatomy"

// Höjdkarta över dockans framsida i lokala koordinater (x = patientens vänster, y = huvud, z = framåt).
// Den riktiga patientmodellen använder i stället mesh-surface.ts.

const X0 = -4.4
const X1 = 4.4
const Y0 = -8.0
const Y1 = 4.4
const RES = 0.04

export class SurfaceMap {
  readonly w = Math.round((X1 - X0) / RES) + 1
  readonly h = Math.round((Y1 - Y0) / RES) + 1
  readonly z = new Float32Array(this.w * this.h).fill(-Infinity)

  static fromFunction(fn: (x: number, y: number) => number | null) {
    const map = new SurfaceMap()
    for (let j = 0; j < map.h; j++)
      for (let i = 0; i < map.w; i++) {
        const z = fn(X0 + i * RES, Y0 + j * RES)
        if (z !== null) map.z[j * map.w + i] = z
      }
    return map
  }

  /** Fyll enstaka tomma celler med grannarnas värden */
  private fillHoles() {
    for (let pass = 0; pass < 3; pass++) {
      const copy = this.z.slice()
      for (let j = 1; j < this.h - 1; j++)
        for (let i = 1; i < this.w - 1; i++) {
          const k = j * this.w + i
          if (copy[k] !== -Infinity) continue
          let sum = 0
          let n = 0
          for (const d of [-1, 1, -this.w, this.w]) {
            if (copy[k + d] !== -Infinity) {
              sum += copy[k + d]
              n++
            }
          }
          if (n >= 2) this.z[k] = sum / n
        }
    }
  }

  /** Hudens höjd (z) i en punkt, bilinjärt interpolerad, eller null utanför kroppen */
  height(x: number, y: number): number | null {
    const fx = (x - X0) / RES
    const fy = (y - Y0) / RES
    const i = Math.floor(fx)
    const j = Math.floor(fy)
    if (i < 0 || j < 0 || i >= this.w - 1 || j >= this.h - 1) return null
    const k = j * this.w + i
    const a = this.z[k]
    const b = this.z[k + 1]
    const c = this.z[k + this.w]
    const d = this.z[k + this.w + 1]
    const vals = [a, b, c, d].filter(v => v !== -Infinity)
    if (vals.length < 4) return vals.length ? Math.max(...vals) : null
    const tx = fx - i
    const ty = fy - j
    return a * (1 - tx) * (1 - ty) + b * tx * (1 - ty) + c * (1 - tx) * ty + d * tx * ty
  }

  /**
   * Punkt på huden + utåtriktad normal för en punkt i 2D-anatomin.
   * Med radie: läget för ett platt föremål som vilar på huden, lyft så mycket
   * att ingen del av föremålet går in i kroppen.
   */
  at(p: Point, radius = 0) {
    const x = (p.x - MIDLINE) / 100
    const y = (300 - p.y) / 100
    const e = Math.max(0.14, radius * 0.8)
    const z = this.height(x, y) ?? 0
    const zx1 = this.height(x + e, y) ?? z
    const zx0 = this.height(x - e, y) ?? z
    const zy1 = this.height(x, y + e) ?? z
    const zy0 = this.height(x, y - e) ?? z
    const normal = new THREE.Vector3(-(zx1 - zx0) / (2 * e), -(zy1 - zy0) / (2 * e), 1).normalize()
    let lift = 0
    if (radius > 0) {
      for (let r = radius * 0.5; r <= radius + 1e-6; r += radius * 0.5) {
        for (let k = 0; k < 12; k++) {
          const a = (k / 12) * Math.PI * 2
          const dx = Math.cos(a) * r
          const dy = Math.sin(a) * r
          const h = this.height(x + dx, y + dy)
          if (h === null || h === -Infinity) continue
          const plane = z - (normal.x * dx + normal.y * dy) / normal.z
          lift = Math.max(lift, h - plane)
        }
      }
    }
    return { pos: new THREE.Vector3(x, y, z + lift), normal }
  }

  /** Stråle (i lokala koordinater) mot huden – ger träffpunkten i 2D-anatomins koordinater */
  intersect(origin: THREE.Vector3, dir: THREE.Vector3): Point | null {
    if (dir.z >= 0) return null
    // Börja där strålen når kroppens högsta möjliga z och stega framåt
    const p = origin.clone()
    const step = 0.02
    const d = dir.clone().normalize()
    const tStart = Math.max(0, (origin.z - 3) / -d.z)
    p.addScaledVector(d, tStart)
    for (let n = 0; n < 600; n++) {
      const h = this.height(p.x, p.y)
      if (h !== null && h !== -Infinity && p.z <= h) {
        // Förfina med ett halvt steg tillbaka
        p.addScaledVector(d, -step / 2)
        return { x: MIDLINE + p.x * 100, y: 300 - p.y * 100 }
      }
      if (p.z < -2) return null
      p.addScaledVector(d, step)
    }
    return null
  }
}
