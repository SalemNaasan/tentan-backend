const ANSWERS_KEY = "tentan_user_answers"

export function getUserAnswers(): Record<string, any> {
    if (typeof window === "undefined") return {}
    try {
        const raw = localStorage.getItem(ANSWERS_KEY)
        return raw ? JSON.parse(raw) : {}
    } catch {
        return {}
    }
}

export function getUserAnswer(questionId: string): any {
    const answers = getUserAnswers()
    return answers[questionId] || null
}

export function saveUserAnswer(questionId: string, answer: any): void {
    const answers = getUserAnswers()
    answers[questionId] = answer
    localStorage.setItem(ANSWERS_KEY, JSON.stringify(answers))
}

export function clearAnswer(questionId: string): void {
    const answers = getUserAnswers()
    delete answers[questionId]
    localStorage.setItem(ANSWERS_KEY, JSON.stringify(answers))
}
