import type { QuestionFeedback } from "./types"

const FEEDBACK_KEY = "questionFeedback"

export function getFeedback(): QuestionFeedback[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(FEEDBACK_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function setFeedback(items: QuestionFeedback[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(FEEDBACK_KEY, JSON.stringify(items))
}

export function addFeedback(feedback: Omit<QuestionFeedback, "id" | "createdAt" | "status">): void {
  const items = getFeedback()
  const newItem: QuestionFeedback = {
    ...feedback,
    id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    status: "new",
    createdAt: new Date().toISOString(),
  }
  setFeedback([newItem, ...items])
}

export function updateFeedbackStatus(id: string, status: QuestionFeedback["status"]): void {
  const items = getFeedback().map((item) =>
    item.id === id ? { ...item, status } : item
  )
  setFeedback(items)
}
