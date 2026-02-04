import type { Question } from "./types"

const CUSTOM_KEY = "customQuestions"
const DELETED_KEY = "deletedQuestionIds"

export function getCustomQuestions(): Question[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(CUSTOM_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function setCustomQuestions(questions: Question[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(questions))
}

export function getDeletedQuestionIds(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(DELETED_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function setDeletedQuestionIds(ids: string[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(DELETED_KEY, JSON.stringify(ids))
}
