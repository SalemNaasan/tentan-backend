import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { Question, PPLCase } from "@/lib/types"

export const dynamic = "force-dynamic"

const STOP_WORDS = new Set([
    "och", "att", "är", "en", "ett", "på", "i", "med", "som", "för", "den", "det", "till", "från", "av", "om", "eller", "men", "vad", "vem", "vilka", "har", "hade", "ska", "skulle", "kan", "kunde", "man", "vid", "inte", "under", "över", "efter", "före", "hos", "genom", "mellan", "mot", "the", "and", "is", "a", "an", "to", "in", "it", "of", "with"
])

/**
 * Dice's Coefficient to measure similarity between two strings.
 * Returns a value between 0 (completely different) and 1 (identical).
 */
function getSimilarity(s1: string, s2: string): number {
    const str1 = s1.toLowerCase().replace(/[^\w\s]/g, "")
    const str2 = s2.toLowerCase().replace(/[^\w\s]/g, "")

    const set1 = new Set()
    for (let i = 0; i < str1.length - 1; i++) {
        const bigram = str1.substring(i, i + 2)
        if (!bigram.includes(" ")) set1.add(bigram)
    }

    const set2 = new Set()
    for (let i = 0; i < str2.length - 1; i++) {
        const bigram = str2.substring(i, i + 2)
        if (!bigram.includes(" ")) set2.add(bigram)
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
    const caseTitle = pplCase.title.toLowerCase()
    const caseDesc = pplCase.description.toLowerCase()
    const qText = question.questionText.toLowerCase()
    const qAnswer = question.answer.toLowerCase()
    const fullQ = (qText + " " + qAnswer).toLowerCase()

    // 1. Title matching (High weight)
    let titleBonus = 0
    const titleKeywords = caseTitle.split(/\s+/).filter(w => w.length > 3 && !STOP_WORDS.has(w))
    titleKeywords.forEach(kw => {
        if (fullQ.includes(kw)) titleBonus += 0.2
    })

    // 2. Keyword matching with weight by length
    const keywords = caseDesc.split(/\s+/).filter(word => word.length > 3 && !STOP_WORDS.has(word))
    let keywordMatches = 0
    let weightedMatches = 0

    keywords.forEach(word => {
        if (fullQ.includes(word)) {
            keywordMatches++
            // Give more importance to specific medical terms (usually longer)
            weightedMatches += word.length > 6 ? 2 : 1
        }
    })

    const keywordScore = keywords.length > 0 ? weightedMatches / keywords.length : 0

    // 3. Overall Text similarity
    const similarityScore = getSimilarity(caseDesc, fullQ)

    // Weighted result
    return (titleBonus * 0.3) + (keywordScore * 0.5) + (similarityScore * 0.2)
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

        // 3. Rank and MAP questions to camelCase
        const rankedQuestions = (questions as any[])
            .map((q) => {
                // IMPORTANT: Map snake_case to camelCase so QuestionCard can display it
                const questionObj: Question = {
                    id: q.id,
                    semester: q.semester,
                    examType: q.exam_type || q.examType,
                    examDate: q.exam_date || q.examDate,
                    examPeriod: q.exam_period || q.examPeriod,
                    subjectArea: q.subject_area || q.subjectArea,
                    questionNumber: q.question_number || q.questionNumber,
                    questionText: q.question_text || q.questionText || "",
                    interaction: q.interaction,
                    options: q.options,
                    correctAnswer: q.correct_answer || q.correctAnswer,
                    answer: q.answer || q.correct_answer || "",
                    points: q.points,
                    imageUrl: q.image_url || q.imageUrl,
                    isHidden: q.is_hidden || q.isHidden
                }

                return {
                    ...questionObj,
                    relevance: calculateRelevance(questionObj, pplCase)
                }
            })
            .filter(q => q.relevance > 0.05) // Filter out clearly unrelated stuff
            .sort((a, b) => b.relevance - a.relevance)

        // Return the top results
        return NextResponse.json(rankedQuestions.slice(0, 50))
    } catch (error: any) {
        console.error("Rank API Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
