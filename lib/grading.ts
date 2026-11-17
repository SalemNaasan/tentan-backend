import type { Question } from "./types"

// Poängsättning för tentaläget. Flerval, matchning och ordning rättas automatiskt;
// skrivfrågor (show_answer) bedömer man själv mot facit.

export const PASS_PERCENT = 64.5

export const maxPoints = (q: Question) => (typeof q.points === "number" && q.points > 0 ? q.points : 1)

export const isAutoGraded = (q: Question) => q.interaction !== "show_answer"

function parse<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return (value as T) ?? fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function hasAnswer(q: Question, answer: unknown): boolean {
  if (answer == null) return false
  if (typeof answer === "string") return answer.trim().length > 0
  if (Array.isArray(answer)) return answer.length > 0
  if (typeof answer === "object") return Object.keys(answer as object).length > 0
  return false
}

/** Poäng för en automatiskt rättad fråga, eller null för skrivfrågor */
export function autoScore(q: Question, answer: unknown): number | null {
  const max = maxPoints(q)
  switch (q.interaction) {
    case "check_answers": {
      // Samma regel som på övningssidan: exakt rätt kombination av alternativ ger full poäng
      const selected = ((answer as string[]) ?? []).map(v => v.toLowerCase().trim())
      const correct = (Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer]).map(v => String(v).toLowerCase().trim())
      return selected.length === correct.length && selected.every(v => correct.includes(v)) ? max : 0
    }
    case "drag_matching": {
      // Inget avdrag vid fel svar: poäng i proportion till antal rätta par
      const correct = parse<Record<string, string>>(q.correctAnswer, {})
      const keys = Object.keys(correct)
      if (keys.length === 0) return 0
      const given = (answer as Record<string, string>) ?? {}
      const right = keys.filter(k => given[k] === correct[k]).length
      return Math.round((max * right * 2) / keys.length) / 2
    }
    case "drag_ordering": {
      const correct = parse<string[]>(q.correctAnswer, [])
      const given = (answer as string[]) ?? []
      return correct.length > 0 && correct.length === given.length && correct.every((v, i) => v === given[i]) ? max : 0
    }
    default:
      return null
  }
}

/** "Fråga 12" eller "Fråga A:2" för fallfrågor */
export function questionLabel(q: Question) {
  return q.caseName ? `${q.caseName.replace(/^fall\s*/i, "").trim().toUpperCase()}:${q.questionNumber}` : String(q.questionNumber)
}
