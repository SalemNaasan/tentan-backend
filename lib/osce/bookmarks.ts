// Bokmärkta praktiska frågor sparas i den egna webbläsaren, precis som på teoridelen.

const KEY = "tentan_osce_bookmarks"

export function getOsceBookmarks(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]")
  } catch {
    return []
  }
}

export function toggleOsceBookmark(id: string): string[] {
  const current = getOsceBookmarks()
  const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id]
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // privat läge eller full lagring – bokmärket gäller då bara tills sidan laddas om
  }
  return next
}
