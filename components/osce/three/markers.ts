import type { Point } from "@/lib/osce/anatomy"

/** Saker som ritas på patienten – samma beskrivning används i 3D och i 2D-reservläget */
export type PatientMarker =
  | { kind: "stethoscope"; p: Point; piece: "membrane" | "bell" }
  | { kind: "hand"; p: Point }
  | { kind: "electrode"; p: Point; label: string; color: string }
  | { kind: "pad"; p: Point; index: number }
  | { kind: "cpr-hands"; p: Point }
  | { kind: "ring"; p: Point; color: string; label?: string; dashed?: boolean }

export type PointerPhase = "down" | "move" | "up"

export interface PatientViewProps {
  xray?: boolean
  markers?: PatientMarker[]
  /** Klick/drag på patientens hud, i 2D-anatomins koordinater */
  onPoint?: (p: Point, phase: PointerPhase) => void
  /** Visa interkostalrum/MCL som hjälplinjer */
  guides?: boolean
  /** Kamerans startläge */
  focus?: "chest" | "overview"
  ariaLabel?: string
  className?: string
  highlight?: boolean
}
