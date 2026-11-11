import { ALL_STATIONS } from "./stations"
import { itemMaxPoints } from "./scoring"
import { examLabel, type OsceItem, type OsceStation, type ToolItem } from "./types"

// Alla frågor ur OSCE-stationerna som en bläddringsbar lista, likt de teoretiska övningsfrågorna.

export type QuestionKind = "muntlig" | "praktisk"

export const QUESTION_KINDS: { id: QuestionKind; label: string }[] = [
  { id: "muntlig", label: "Muntlig fråga" },
  { id: "praktisk", label: "Praktiskt moment" },
]

export interface OsceQuestion {
  id: string
  station: OsceStation
  item: OsceItem
  /** Frågans nummer inom stationen */
  number: number
  points: number
  kind: QuestionKind
  /** EKG, kurva eller preparat som frågan bygger på */
  figure?: ToolItem
  /** Samma fråga med samma svar, inklusive denna: tentorna den kommit på */
  exams: string[]
  /** Fritext för sökning (fråga och svar) */
  searchText: string
}

function answerText(item: OsceItem) {
  switch (item.kind) {
    case "self":
    case "tool":
      return item.criteria.map(c => c.text).join(" ")
    case "choice":
      return item.correct.map(i => item.options[i]).join(" ")
    case "numeric":
      return `${item.min} ${item.max} ${item.unit}`
  }
}

const kindOf = (item: OsceItem): QuestionKind => (item.kind === "tool" ? "praktisk" : "muntlig")

/** Bygger frågelistan från stationerna (originalen eller med adminändringar) */
export function buildQuestions(stations: OsceStation[] = ALL_STATIONS): OsceQuestion[] {
  const list: OsceQuestion[] = []
  for (const station of stations) {
    let number = 0
    let figure: ToolItem | undefined
    for (const item of station.items) {
      if (item.kind === "tool" && item.criteria.length === 0) {
        // Histologipreparaten saknar ännu bilder, så det finns inget att visa
        if (item.tool !== "microscope") figure = item
        continue
      }
      number += 1
      list.push({
        id: `${station.id}:${item.id}`,
        station,
        item,
        number,
        points: itemMaxPoints(item),
        kind: kindOf(item),
        figure,
        exams: [],
        searchText: `${item.prompt} ${item.kind === "tool" ? (item.examQuestions ?? []).join(" ") : ""} ${answerText(item)} ${station.title}`.toLowerCase(),
      })
    }
  }

  // Samma fråga med samma svar räknas ihop, så att man ser vad som brukar återkomma
  const groups = new Map<string, string[]>()
  const keyOf = (q: OsceQuestion) => `${q.item.prompt}|${answerText(q.item)}`.toLowerCase()
  for (const q of list) {
    const key = keyOf(q)
    const exams = groups.get(key) ?? []
    const label = examLabel(q.station.exam)
    if (!exams.includes(label)) exams.push(label)
    groups.set(key, exams)
  }
  for (const q of list) q.exams = groups.get(keyOf(q)) ?? []
  return list
}

export const ALL_QUESTIONS = buildQuestions()

/** Gör om till en nyckel så att bara första förekomsten visas när dubletter döljs */
export function duplicateKey(q: OsceQuestion) {
  return `${q.item.prompt}|${answerText(q.item)}`.toLowerCase()
}
