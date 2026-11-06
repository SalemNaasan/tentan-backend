// Koordinater för den virtuella patienten (SVG viewBox 0 0 400 540).
// Patienten står vänd mot dig: patientens VÄNSTRA sida är på din HÖGRA sida.

export const VIEW = { width: 400, height: 540 }
export const MIDLINE = 200

/** Revben n fäster vid sternalranden på denna höjd */
export const ribY = (n: number) => 105 + 22 * n
/** Interkostalrum n (under revben n) vid sternalranden */
export const icsY = (n: number) => 116 + 22 * n

export const STERNUM = { top: 108, angle: ribY(2), bottom: 292, xiphoid: 312, halfWidth: 16 }

/** Medioklavikularlinjen, främre axillarlinjen och mittaxillarlinjen (patientens vänster = +) */
export const LINES = { mcl: 68, aal: 112, mal: 136 }

export type Point = {
  x: number
  y: number
  /** Exakt läge på 3D-kroppen när punkten kommer från ett klick i 3D-vyn */
  spot?: { pos: number[]; normal: number[] }
}

export const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

export interface Landmark extends Point {
  id: string
  label: string
  short: string
}

/** Hjärtats auskultationspunkter */
export const HEART_POINTS: Landmark[] = [
  { id: "aorta", label: "Aortaområdet – I2 höger parasternalt", short: "I2 dx", x: MIDLINE - 30, y: icsY(2) },
  { id: "pulm", label: "Pulmonalisområdet – I2 vänster parasternalt", short: "I2 sin", x: MIDLINE + 30, y: icsY(2) },
  { id: "erb", label: "Erbs punkt – I3 vänster parasternalt", short: "I3 sin", x: MIDLINE + 30, y: icsY(3) },
  { id: "tric", label: "Trikuspidalisområdet – I4 vänster parasternalt", short: "I4 sin", x: MIDLINE + 28, y: icsY(4) },
  { id: "mitral", label: "Mitralisområdet – apex, I5 medioklavikulärt", short: "Apex", x: MIDLINE + LINES.mcl, y: icsY(5) + 4 },
  { id: "carotid-r", label: "A. carotis höger", short: "Carotis dx", x: MIDLINE - 22, y: 62 },
  { id: "carotid-l", label: "A. carotis vänster", short: "Carotis sin", x: MIDLINE + 22, y: 62 },
]

export const IKTUS: Point = { x: MIDLINE + LINES.mcl, y: icsY(5) + 4 }

/** Relativ styrka på hjärtljuden vid varje punkt (S1, A2, P2, S3) */
export const HEART_PROFILE: Record<string, { s1: number; a2: number; p2: number; s3: number }> = {
  aorta: { s1: 0.45, a2: 1, p2: 0.35, s3: 0.1 },
  pulm: { s1: 0.5, a2: 0.75, p2: 1, s3: 0.15 },
  erb: { s1: 0.7, a2: 0.75, p2: 0.6, s3: 0.3 },
  tric: { s1: 0.95, a2: 0.5, p2: 0.4, s3: 0.5 },
  mitral: { s1: 1, a2: 0.45, p2: 0.2, s3: 1 },
  "carotid-r": { s1: 0.15, a2: 0.45, p2: 0.05, s3: 0 },
  "carotid-l": { s1: 0.15, a2: 0.45, p2: 0.05, s3: 0 },
}

/** Lungornas auskultationspunkter framifrån/lateralt, i par höger–vänster */
export const LUNG_POINTS: (Landmark & { lobe: "upper" | "middle" | "lower"; side: "dx" | "sin"; base?: boolean })[] = [
  { id: "ul-dx", label: "Överlob höger – I2 MCL", short: "ÖL dx", x: MIDLINE - LINES.mcl, y: icsY(2), lobe: "upper", side: "dx" },
  { id: "ul-sin", label: "Överlob vänster – I2 MCL", short: "ÖL sin", x: MIDLINE + LINES.mcl, y: icsY(2), lobe: "upper", side: "sin" },
  { id: "ml-dx", label: "Mellanlob höger – I4 MCL", short: "ML dx", x: MIDLINE - LINES.mcl, y: icsY(4), lobe: "middle", side: "dx" },
  { id: "li-sin", label: "Lingula – I4 vänster främre axillarlinje", short: "Lingula", x: MIDLINE + LINES.aal - 6, y: icsY(4), lobe: "middle", side: "sin" },
  { id: "ll-dx", label: "Underlob höger – I6 främre axillarlinjen", short: "UL dx", x: MIDLINE - LINES.aal, y: icsY(6) + 6, lobe: "lower", side: "dx" },
  { id: "ll-sin", label: "Underlob vänster – I6 främre axillarlinjen", short: "UL sin", x: MIDLINE + LINES.aal, y: icsY(6) + 6, lobe: "lower", side: "sin" },
  { id: "base-dx", label: "Lunggräns höger basalt – mittaxillarlinjen", short: "Bas dx", x: MIDLINE - LINES.mal + 6, y: icsY(8) + 10, lobe: "lower", side: "dx", base: true },
  { id: "base-sin", label: "Lunggräns vänster basalt – mittaxillarlinjen", short: "Bas sin", x: MIDLINE + LINES.mal - 6, y: icsY(8) + 10, lobe: "lower", side: "sin", base: true },
]

export const LUNG_PAIR: Record<string, string> = {
  "ul-dx": "ul-sin", "ul-sin": "ul-dx",
  "ml-dx": "li-sin", "li-sin": "ml-dx",
  "ll-dx": "ll-sin", "ll-sin": "ll-dx",
  "base-dx": "base-sin", "base-sin": "base-dx",
}

/** Bröstelektrodernas korrekta lägen */
export const ELECTRODE_TARGETS: Record<string, Point> = {
  V1: { x: MIDLINE - 24, y: icsY(4) },
  V2: { x: MIDLINE + 24, y: icsY(4) },
  V4: { x: MIDLINE + LINES.mcl, y: icsY(5) + 4 },
  V3: { x: MIDLINE + (24 + LINES.mcl) / 2, y: (icsY(4) + icsY(5) + 4) / 2 },
  V5: { x: MIDLINE + LINES.aal, y: icsY(5) + 4 },
  V6: { x: MIDLINE + LINES.mal, y: icsY(5) + 4 },
}

/** HLR: nedre halvan av sternum */
export const CPR_HAND_ZONE = { x1: MIDLINE - 14, x2: MIDLINE + 14, y1: STERNUM.angle + 60, y2: STERNUM.bottom }

/** Hjärtstartarplattor antero-lateralt */
export const AED_ZONES = {
  right: { x1: MIDLINE - 95, x2: MIDLINE - 18, y1: 112, y2: 175, label: "under höger nyckelben" },
  left: { x1: MIDLINE + 85, x2: MIDLINE + 150, y1: icsY(5) - 10, y2: icsY(7) + 25, label: "vänster sida i höjd med apex" },
}

export function inZone(p: Point, z: { x1: number; x2: number; y1: number; y2: number }) {
  return p.x >= z.x1 && p.x <= z.x2 && p.y >= z.y1 && p.y <= z.y2
}
