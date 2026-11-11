import * as THREE from "three"
import { MeshBVH } from "three-mesh-bvh"
import { MIDLINE, type Point } from "@/lib/osce/anatomy"

// Ytan på den riktiga patientmodellen. Allt träffas mot själva 3D-nätet (via en BVH, så att
// det är snabbt även vid drag), med riktig ytnormal. Därför fungerar även branta ytor och
// fördjupningar som sidan av bröstkorgen, armhålan och halsen.

export interface SurfaceSpot {
  pos: THREE.Vector3
  normal: THREE.Vector3
}

export class MeshSurface {
  private readonly bvh: MeshBVH
  private readonly normals: THREE.BufferAttribute
  private readonly positions: THREE.BufferAttribute
  private readonly ray = new THREE.Ray()

  /** toLocal/scale: modellkoordinater → patientens lokala koordinater (ren skala + förskjutning) */
  constructor(
    geometry: THREE.BufferGeometry,
    private readonly scale: number,
    private readonly offset: THREE.Vector3,
  ) {
    this.bvh = new MeshBVH(geometry)
    this.positions = geometry.getAttribute("position") as THREE.BufferAttribute
    this.normals = geometry.getAttribute("normal") as THREE.BufferAttribute
  }

  /** Första träffen längs en stråle i lokala koordinater */
  private cast(origin: THREE.Vector3, dir: THREE.Vector3): SurfaceSpot | null {
    this.ray.origin.copy(origin).sub(this.offset).divideScalar(this.scale)
    this.ray.direction.copy(dir).normalize()
    const hit = this.bvh.raycastFirst(this.ray, THREE.FrontSide) as THREE.Intersection | null
    if (!hit?.face) return null
    const { a, b, c } = hit.face
    const pa = new THREE.Vector3().fromBufferAttribute(this.positions, a)
    const pb = new THREE.Vector3().fromBufferAttribute(this.positions, b)
    const pc = new THREE.Vector3().fromBufferAttribute(this.positions, c)
    const bary = THREE.Triangle.getBarycoord(hit.point, pa, pb, pc, new THREE.Vector3())
    const normal = bary
      ? new THREE.Vector3()
          .addScaledVector(new THREE.Vector3().fromBufferAttribute(this.normals, a), bary.x)
          .addScaledVector(new THREE.Vector3().fromBufferAttribute(this.normals, b), bary.y)
          .addScaledVector(new THREE.Vector3().fromBufferAttribute(this.normals, c), bary.z)
          .normalize()
      : hit.face.normal.clone()
    return { pos: hit.point.clone().multiplyScalar(this.scale).add(this.offset), normal }
  }

  /** Klick/drag: träffpunkten i 2D-anatomins koordinater, med exakt 3D-läge bifogat */
  intersect(origin: THREE.Vector3, dir: THREE.Vector3): Point | null {
    const spot = this.cast(origin, dir)
    if (!spot) return null
    return {
      x: MIDLINE + spot.pos.x * 100,
      y: 300 - spot.pos.y * 100,
      spot: { pos: spot.pos.toArray(), normal: spot.normal.toArray() },
      // Ytan vetter bakåt: klicket är på ryggen
      back: spot.normal.z < -0.2,
    }
  }

  /**
   * Läget på huden för en punkt. Med radie: läget för ett platt föremål som vilar på huden.
   * Föremålet lutas efter ytan runt omkring och lyfts bara så mycket som behövs,
   * så att det varken går in i kroppen eller svävar i fördjupningar.
   */
  at(p: Point, radius = 0): SurfaceSpot {
    const base = p.spot
      ? { pos: new THREE.Vector3().fromArray(p.spot.pos), normal: new THREE.Vector3().fromArray(p.spot.normal) }
      : (this.cast(new THREE.Vector3((p.x - MIDLINE) / 100, (300 - p.y) / 100, p.back ? -6 : 6), new THREE.Vector3(0, 0, p.back ? 1 : -1)) ?? {
          pos: new THREE.Vector3((p.x - MIDLINE) / 100, (300 - p.y) / 100, 0),
          normal: new THREE.Vector3(0, 0, p.back ? -1 : 1),
        })
    if (radius <= 0) return base

    const u = new THREE.Vector3(0, 1, 0).cross(base.normal)
    if (u.lengthSq() < 1e-4) u.set(1, 0, 0)
    u.normalize()
    const v = base.normal.clone().cross(u).normalize()
    const down = base.normal.clone().negate()
    const rim: THREE.Vector3[] = []
    const normal = base.normal.clone().multiplyScalar(2)
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2
      const origin = base.pos
        .clone()
        .addScaledVector(u, Math.cos(a) * radius)
        .addScaledVector(v, Math.sin(a) * radius)
        .addScaledVector(base.normal, 0.5)
      const hit = this.cast(origin, down)
      // Träffar långt bort är en annan kroppsdel (t.ex. armen) – inte ytan under föremålet
      if (!hit || hit.pos.distanceTo(base.pos) > radius * 2) continue
      rim.push(hit.pos)
      normal.add(hit.normal)
    }
    normal.normalize()
    // Lyft så att fälgen inte går genom huden, men aldrig mer än föremålet i sig kräver
    let lift = 0
    for (const h of rim) lift = Math.max(lift, h.clone().sub(base.pos).dot(normal))
    return { pos: base.pos.clone().addScaledVector(normal, Math.min(lift, radius * 0.6)), normal }
  }
}
