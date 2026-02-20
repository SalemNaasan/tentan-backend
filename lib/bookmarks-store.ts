const BOOKMARKS_KEY = "tentan_bookmarks"

export function getBookmarkedIds(): string[] {
    if (typeof window === "undefined") return []
    try {
        const raw = localStorage.getItem(BOOKMARKS_KEY)
        return raw ? JSON.parse(raw) : []
    } catch {
        return []
    }
}

export function toggleBookmark(questionId: string): string[] {
    const current = getBookmarkedIds()
    const exists = current.includes(questionId)
    const next = exists
        ? current.filter(id => id !== questionId)
        : [...current, questionId]

    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next))
    return next
}

export function addBookmarks(questionIds: string[]): string[] {
    const current = getBookmarkedIds()
    const newIds = questionIds.filter(id => !current.includes(id))
    if (newIds.length === 0) return current

    const next = [...current, ...newIds]
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next))
    return next
}

export function removeBookmarks(questionIds: string[]): string[] {
    const current = getBookmarkedIds()
    const next = current.filter(id => !questionIds.includes(id))

    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next))
    return next
}
