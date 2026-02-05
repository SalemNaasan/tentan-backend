import type { QuestionFeedback } from "./types"

// This file is now deprecated as we use /api/feedback with Supabase
// Keeping functions as stubs to prevent import errors if missed anywhere

export function getFeedback(): QuestionFeedback[] {
  console.warn("getFeedback is deprecated. Use fetch('/api/feedback') instead.")
  return []
}

export function setFeedback(items: QuestionFeedback[]): void {
  console.warn("setFeedback is deprecated.")
}

export function addFeedback(feedback: Omit<QuestionFeedback, "id" | "createdAt" | "status">): void {
  console.warn("addFeedback is deprecated. Use POST fetch('/api/feedback') instead.")
}

export function updateFeedbackStatus(id: string, status: QuestionFeedback["status"]): void {
  console.warn("updateFeedbackStatus is deprecated. Use PATCH fetch('/api/feedback') instead.")
}
