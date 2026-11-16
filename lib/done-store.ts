// Frågor man har gjort (tittat på svaret eller rättat), sparas i webbläsaren precis som bokmärkena.

import { getUserAnswers } from "./answers-store"

const DONE_KEY = "tentan_done"

export function getDoneIds(): string[] {
    if (typeof window === "undefined") return []
    try {
        const raw = localStorage.getItem(DONE_KEY)
        if (raw) return JSON.parse(raw)
        // Första gången: frågor som redan rättats eller fått svaret visat räknas som gjorda
        const answers = getUserAnswers()
        return save(Object.keys(answers).filter(id => answers[id]?.isChecked || answers[id]?.showAnswer || answers[id]?.showCorrectAnswer))
    } catch {
        return []
    }
}

function save(ids: string[]): string[] {
    try {
        localStorage.setItem(DONE_KEY, JSON.stringify(ids))
    } catch {
        // privat läge eller full lagring – gäller då bara tills sidan laddas om
    }
    return ids
}

export function setDone(questionId: string, done: boolean): string[] {
    const current = getDoneIds()
    if (done === current.includes(questionId)) return current
    return save(done ? [...current, questionId] : current.filter(id => id !== questionId))
}

/** Gör frågorna ogjorda igen */
export function clearDone(questionIds: string[]): string[] {
    const remove = new Set(questionIds)
    return save(getDoneIds().filter(id => !remove.has(id)))
}
