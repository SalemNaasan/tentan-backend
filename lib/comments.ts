// Kommentarer på övningsfrågorna: typer och klienthjälpare för /api/comments.

export interface QuestionComment {
  id: string
  questionId: string
  parentId: string | null
  authorName: string
  body: string
  createdAt: string
}

const NAME_KEY = "tentan_comment_name"

export function getSavedName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? ""
  } catch {
    return ""
  }
}

export function saveName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name)
  } catch {
    // namnet behöver då skrivas igen nästa gång
  }
}

/** "nyss", "5 min sedan", "igår", "3 nov" */
export function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return "nyss"
  if (diff < 3600) return `${Math.floor(diff / 60)} min sedan`
  if (diff < 86400) return `${Math.floor(diff / 3600)} h sedan`
  if (diff < 172800) return "igår"
  return new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: diff > 300 * 86400 ? "numeric" : undefined })
}
