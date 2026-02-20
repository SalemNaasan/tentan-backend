import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { Question, PPLCase } from "@/lib/types"

export const dynamic = "force-dynamic"

/**
 * Dice's Coefficient to measure similarity between two strings.
 * Returns a value between 0 (completely different) and 1 (identical).
 */
function getSimilarity(s1: string, s2: string): number {
    const str1 = s1.toLowerCase().replace(/[^\w\s]/g, "")
    const str2 = s2.toLowerCase().replace(/[^\w\s]/g, "")

    const set1 = new Set()
    for (let i = 0; i < str1.length - 1; i++) {
        set1.add(str1.substring(i, i + 2))
    }

    const set2 = new Set()
    for (let i = 0; i < str2.length - 1; i++) {
        set2.add(str2.substring(i, i + 2))
    }

    const intersection = new Set([...set1].filter((x) => set2.has(x)))
    const total = set1.size + set2.size

    if (total === 0) return 0
    return (2 * intersection.size) / total
}

/**
 * Calculates a relevance score for a question based on a case.
 */
function calculateRelevance(question: Question, pplCase: PPLCase): number {
    const caseText = (pplCase.title + " " + pplCase.description).toLowerCase()
    const questionText = (question.questionText + " " + question.answer).toLowerCase()

    // 1. Text similarity (Dice's Coefficient)
    const similarity = getSimilarity(caseText, questionText)

    // 2. Keyword matching (weighted)
    const keywords = caseText.split(/\s+/).filter(word => word.length > 3)
    let keywordMatches = 0
    keywords.forEach(word => {
        if (questionText.includes(word)) {
            keywordMatches++
        }
    })

    const keywordScore = keywords.length > 0 ? keywordMatches / keywords.length : 0

    // Combine scores (adjust weights as needed)
    return (similarity * 0.4) + (keywordScore * 0.6)
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const caseId = searchParams.get("caseId")

        if (!caseId) {
            return NextResponse.json({ error: "Missing caseId" }, { status: 400 })
        }

        // 1. Fetch the case
        const { data: pplCase, error: caseError } = await supabase
            .from("ppl_cases")
            .select("*")
            .eq("id", caseId)
            .single()

        if (caseError) throw caseError

        // 2. Fetch all questions for that semester
        const { data: questions, error: questionsError } = await supabase
            .from("custom_questions")
            .select("*")
            .eq("semester", pplCase.semester)

        if (questionsError) throw questionsError

        // 3. Rank questions
        const rankedQuestions = (questions as any[])
            .map((q) => {
                // Convert snake_case from DB to camelCase for the algorithm if needed, 
                // but here we just need text content
                const questionObj: Question = {
                    ...q,
                    questionText: q.question_text,
                    answer: q.answer || q.correct_answer || ""
                }
                return {
                    ...q,
                    relevance: calculateRelevance(questionObj, pplCase)
                }
            })
            .sort((a, b) => b.relevance - a.relevance)

        // Return the top results (e.g., top 50)
        return NextResponse.json(rankedQuestions.slice(0, 50))
    } catch (error: any) {
        console.error("Rank API Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
