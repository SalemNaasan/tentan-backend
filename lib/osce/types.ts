// Datamodell för OSCE-simulatorn (praktisk tentamen T3).
// En station består av ett antal moment ("items") som tillsammans ger max 10 poäng,
// precis som examinatorsprotokollen.

export type OsceTheme = "CREN" | "NSPR" | "GEN" | "GNM" | "IBI" | "ERL"

export const OSCE_THEMES: { id: OsceTheme; name: string; description: string }[] = [
  { id: "CREN", name: "CREN", description: "Cirkulation, respiration & njurar" },
  { id: "NSPR", name: "NSPR", description: "Nervsystemet & rörelseapparaten" },
  { id: "GEN", name: "GEN", description: "Akut omhändertagande & HLR" },
  { id: "GNM", name: "GNM", description: "Gastroenterologi & histologi" },
  { id: "IBI", name: "IBI", description: "Immunologi, bakteriologi & infektion" },
  { id: "ERL", name: "ERL", description: "Endokrinologi" },
]

export const STATION_SECONDS = 10 * 60
export const WARNING_SECONDS = 9 * 60
export const STATION_MAX_POINTS = 10
export const PASS_FRACTION = 0.75

/** En bedömningspunkt i protokollet, t.ex. "Lyssnar över I2 dx (0,5 p)" */
export interface Criterion {
  id: string
  text: string
  points: number
}

interface BaseItem {
  id: string
  /** Vad examinatorn säger/frågar */
  prompt: string
  /** Pedagogisk motivering som visas i genomgången */
  why: string
}

/** Fritt svar som studenten själv bedömer mot facit (som en muntlig fråga på OSCE) */
export interface SelfItem extends BaseItem {
  kind: "self"
  criteria: Criterion[]
  /** Valfri tröskel: t.ex. "minst 2 av 4 ger full poäng" */
  maxPoints?: number
}

export interface ChoiceItem extends BaseItem {
  kind: "choice"
  options: string[]
  /** Index för rätta alternativ */
  correct: number[]
  points: number
  multi?: boolean
}

export interface NumericItem extends BaseItem {
  kind: "numeric"
  unit: string
  min: number
  max: number
  points: number
}

export type ToolId =
  | "auscultation"
  | "electrodes"
  | "ecg"
  | "spirometry"
  | "cpr"
  | "choking"
  | "gram"
  | "agar"
  | "microscope"
  | "bloodpressure"
  | "image"

/** Ett praktiskt moment där ett interaktivt verktyg bockar av kriterierna automatiskt */
export interface ToolItem extends BaseItem {
  kind: "tool"
  tool: ToolId
  /** Verktygsspecifik konfiguration (t.ex. vilket EKG eller vilka kurvor) */
  config?: Record<string, any>
  /** Protokollets ordagranna frågor när verktyget täcker flera av dem */
  examQuestions?: string[]
  criteria: Criterion[]
}

export type OsceItem = SelfItem | ChoiceItem | NumericItem | ToolItem

export interface OsceStation {
  id: string
  theme: OsceTheme
  title: string
  /** Moment som stationen tränar, används för "Fri övning" */
  skills: string[]
  /** Fallbeskrivning/instruktion som läses upp när man kommer in */
  scenario: string
  /** Material på stationen (som i protokollen) */
  material?: string[]
  /** Vilken tenta stationen kommer från */
  exam: ExamRef
  /** Avvikelse från protokollet, t.ex. uppskattad poängfördelning */
  note?: string
  items: OsceItem[]
}

/** Tentaperiod, t.ex. "VT26" eller "HT25" (nya perioder kan läggas till i admin) */
export type OscePeriod = string

/** Tentaperioderna i originalstationerna, senaste först */
export const OSCE_PERIODS: OscePeriod[] = ["VT26", "HT25", "VT25", "HT24"]

/** Sorteringsvärde: högre = senare (VT26 > HT25 > VT25) */
export function periodRank(p: string) {
  const m = /^(VT|HT)(\d{2})$/.exec(p)
  return m ? Number(m[2]) * 2 + (m[1] === "HT" ? 1 : 0) : -1
}

/** Perioderna som förekommer bland stationerna, senaste först */
export function periodsOf(stations: { exam: { period: string } }[]): OscePeriod[] {
  return [...new Set(stations.map(s => s.exam.period))].sort((a, b) => periodRank(b) - periodRank(a))
}

export interface ExamRef {
  period: OscePeriod
  type: "ordinarie" | "omtenta"
  session?: "fm" | "em"
}

export function examLabel(e: ExamRef) {
  return [e.period, e.type, e.session].filter(Boolean).join(" ")
}

/** Studentens svar per moment */
export interface ItemResponse {
  /** Kriterier som uppnåtts (verktyg eller självbedömning) */
  achieved?: string[]
  /** Valda alternativ */
  selected?: number[]
  /** Numeriskt svar */
  value?: number | null
  /** Fritext/anteckningar */
  notes?: string
  /** Har studenten bedömt sig själv mot facit? */
  assessed?: boolean
}

export type StationResponses = Record<string, ItemResponse>
