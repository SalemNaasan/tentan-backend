// Syntetiskt 12-avlednings-EKG.
// Varje avledning räknas fram ur en hjärtvektor (el-axel) projicerad på avledningens vinkel,
// så att el-axel, R-vågsprogression, ST-höjningar och tremor blir fysiologiskt konsekventa.

export const LEADS = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"] as const
export type Lead = (typeof LEADS)[number]

export interface EcgCase {
  id: string
  rhythm: "sinus" | "af"
  bpm: number
  /** PQ-tid i sekunder */
  pq: number
  /** QRS-axel i grader */
  axis: number
  st?: Partial<Record<Lead, number>>
  tremor?: "RA" | "LA" | "LL"
  seed: number
}

export const ECG_CASES: Record<string, EcgCase> = {
  sinus75: { id: "sinus75", rhythm: "sinus", bpm: 75, pq: 0.16, axis: 20, seed: 11 },
  "af-stemi": {
    id: "af-stemi",
    rhythm: "af",
    bpm: 75,
    pq: 0,
    axis: 40,
    st: { V1: 0.12, V2: 0.32, V3: 0.38, V4: 0.28, III: -0.1, aVF: -0.08 },
    seed: 7,
  },
  brady45: { id: "brady45", rhythm: "sinus", bpm: 45, pq: 0.18, axis: 50, seed: 3 },
  avblock: { id: "avblock", rhythm: "sinus", bpm: 54, pq: 0.24, axis: 45, seed: 5 },
  "tremor-la": { id: "tremor-la", rhythm: "sinus", bpm: 72, pq: 0.16, axis: 35, tremor: "LA", seed: 9 },
  "tremor-ra": { id: "tremor-ra", rhythm: "sinus", bpm: 72, pq: 0.16, axis: 35, tremor: "RA", seed: 13 },
}

/** Avledningarnas vinkel i det hexaxiala systemet */
const LIMB_ANGLE: Partial<Record<Lead, number>> = { I: 0, II: 60, III: 120, aVR: -150, aVL: -30, aVF: 90 }

/** Bröstavledningar: R-, S-, P- och T-amplitud (mV) med normal R-vågsprogression */
const CHEST: Partial<Record<Lead, { r: number; s: number; p: number; t: number }>> = {
  V1: { r: 0.25, s: 1.0, p: 0.07, t: 0.08 },
  V2: { r: 0.45, s: 1.45, p: 0.1, t: 0.45 },
  V3: { r: 0.85, s: 0.85, p: 0.1, t: 0.5 },
  V4: { r: 1.5, s: 0.4, p: 0.1, t: 0.45 },
  V5: { r: 1.4, s: 0.2, p: 0.1, t: 0.35 },
  V6: { r: 1.1, s: 0.1, p: 0.1, t: 0.25 },
}

const rad = (d: number) => (d * Math.PI) / 180
const gauss = (t: number, mu: number, sigma: number) => Math.exp(-((t - mu) ** 2) / (2 * sigma * sigma))

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function leadMorphology(lead: Lead, c: EcgCase) {
  const angle = LIMB_ANGLE[lead]
  if (angle !== undefined) {
    const aug = lead.startsWith("a") ? 0.87 : 1
    const proj = 1.5 * Math.cos(rad(c.axis - angle)) * aug
    return {
      r: Math.max(0.08, proj + 0.12),
      s: Math.max(0.06, -proj + 0.1),
      p: 0.15 * Math.cos(rad(55 - angle)) * aug,
      t: 0.32 * Math.cos(rad(40 - angle)) * aug,
    }
  }
  return CHEST[lead]!
}

/** Slagtider (R-takter) i sekunder för hela registreringen */
export function beatTimes(c: EcgCase, duration = 10): number[] {
  const rand = mulberry32(c.seed)
  const mean = 60 / c.bpm
  const beats: number[] = []
  let t = 0.35 + rand() * 0.3
  while (t < duration + 1) {
    beats.push(t)
    t += c.rhythm === "af" ? mean * (0.6 + rand() * 0.8) : mean * (0.99 + rand() * 0.02)
  }
  return beats
}

/** Tremorbrus per elektrod (RA, LA, LL) */
function electrodeNoise(c: EcgCase, rand: () => number) {
  const phases = Array.from({ length: 6 }, () => rand() * Math.PI * 2)
  return (t: number) => {
    // Parkinson-/muskeltremor: oregelbunden 5–12 Hz aktivitet med högfrekvent EMG ovanpå
    return (
      0.07 * Math.sin(2 * Math.PI * 5.2 * t + phases[0]) +
      0.05 * Math.sin(2 * Math.PI * 9.1 * t + phases[1]) +
      0.04 * Math.sin(2 * Math.PI * 23 * t + phases[2]) +
      0.035 * Math.sin(2 * Math.PI * 41 * t + phases[3]) +
      0.03 * Math.sin(2 * Math.PI * 67 * t + phases[4])
    )
  }
}

/** Hur mycket brus från respektive elektrod som syns i en avledning (Einthoven/Goldberger/Wilson) */
const ELECTRODE_WEIGHTS: Record<Lead, { RA: number; LA: number; LL: number }> = {
  I: { RA: -1, LA: 1, LL: 0 },
  II: { RA: -1, LA: 0, LL: 1 },
  III: { RA: 0, LA: -1, LL: 1 },
  aVR: { RA: 1, LA: -0.5, LL: -0.5 },
  aVL: { RA: -0.5, LA: 1, LL: -0.5 },
  aVF: { RA: -0.5, LA: -0.5, LL: 1 },
  V1: { RA: -1 / 3, LA: -1 / 3, LL: -1 / 3 },
  V2: { RA: -1 / 3, LA: -1 / 3, LL: -1 / 3 },
  V3: { RA: -1 / 3, LA: -1 / 3, LL: -1 / 3 },
  V4: { RA: -1 / 3, LA: -1 / 3, LL: -1 / 3 },
  V5: { RA: -1 / 3, LA: -1 / 3, LL: -1 / 3 },
  V6: { RA: -1 / 3, LA: -1 / 3, LL: -1 / 3 },
}

export function createEcg(c: EcgCase) {
  const beats = beatTimes(c)
  const rand = mulberry32(c.seed * 31 + 1)
  const tremor = c.tremor ? electrodeNoise(c, rand) : null
  const afPhases = Array.from({ length: 4 }, () => rand() * Math.PI * 2)
  const morph = Object.fromEntries(LEADS.map(l => [l, leadMorphology(l, c)])) as Record<Lead, ReturnType<typeof leadMorphology>>

  /** Spänning (mV) i en avledning vid tiden t */
  return function voltage(lead: Lead, t: number): number {
    const m = morph[lead]
    const st = c.st?.[lead] ?? 0
    let v = 0

    // Närmaste slag räcker – vågorna är korta jämfört med RR
    for (const tb of beats) {
      const dt = t - tb
      if (dt < -0.45 || dt > 0.6) continue
      const rr = 60 / c.bpm
      const tPos = 0.18 + 0.12 * Math.sqrt(rr)
      if (c.rhythm === "sinus") v += m.p * gauss(dt, -c.pq + 0.05, 0.024)
      v += -0.06 * Math.abs(m.r) * gauss(dt, -0.022, 0.007)
      v += m.r * gauss(dt, 0, 0.011)
      v += -m.s * gauss(dt, 0.028, 0.01)
      if (st !== 0) {
        // ST-höjning från J-punkten som smälter ihop med T-vågen
        const rise = 1 / (1 + Math.exp(-(dt - 0.045) / 0.006))
        const fall = 1 / (1 + Math.exp((dt - (tPos + 0.06)) / 0.03))
        v += st * rise * fall
      }
      v += (m.t + Math.max(0, st) * 0.6) * gauss(dt, tPos, 0.048)
    }

    if (c.rhythm === "af") {
      const k = lead === "V1" || lead === "II" || lead === "III" || lead === "aVF" ? 1 : 0.55
      v +=
        k *
        (0.045 * Math.sin(2 * Math.PI * 6.1 * t + afPhases[0]) +
          0.03 * Math.sin(2 * Math.PI * 7.7 * t + afPhases[1]) +
          0.02 * Math.sin(2 * Math.PI * 4.3 * t + afPhases[2]))
    }

    if (tremor && c.tremor) {
      v += ELECTRODE_WEIGHTS[lead][c.tremor] * tremor(t)
    }

    // Lätt baslinjevandring
    v += 0.02 * Math.sin(2 * Math.PI * 0.18 * t + afPhases[3])
    return v
  }
}
