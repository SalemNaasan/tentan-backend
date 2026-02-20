import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { Question, PPLCase, SubjectArea } from "@/lib/types"

export const dynamic = "force-dynamic"

// --- KNOWLEDGE ENGINE CONFIG ---

const STOP_WORDS = new Set([
    "och", "att", "är", "en", "ett", "på", "i", "med", "som", "för", "den", "det", "till", "från", "av", "om", "eller", "men", "vad", "vem", "vilka", "har", "hade", "ska", "skulle", "kan", "kunde", "man", "vid", "inte", "under", "över", "efter", "före", "hos", "genom", "mellan", "mot", "the", "and", "is", "a", "an", "to", "in", "it", "of", "with"
])

/**
 * Concept Map: Semantic bridges between medical concepts.
 */
const KNOWLEDGE_BRIDGE: Record<string, string[]> = {
    "andnöd": ["lungor", "andningsvägar", "saturering", "respiration", "lunginflammation", "pneumoni", "astma", "kol", "gasutbyte"],
    "bröstsmärta": ["hjärta", "ekg", "troponin", "ischemi", "infarkt", "st-höjning", "angina", "kardiologi", "kärlkramp"],
    "buksmärta": ["mage", "tarm", "buk", "lever", "gallsten", "pankreatit", "apendicit", "gastro", "matsmältning"],
    "huvudvärk": ["hjärna", "nervsystemet", "migrän", "blödning", "stroke", "neurologi", "meningit"],
    "feber": ["infektion", "inflammation", "crp", "leukocyter", "immunförsvar", "bakterier", "virus"],
    "bensvullnad": ["hjärtsvikt", "ödem", "venös", "trombos", "njurar", "vätskebalans"],
    "yrsel": ["balans", "öron", "neurologi", "blodtryck", "hjärta"],
    "urin": ["njurar", "urologi", "nefrologi", "blåsa", "infektion", "kreatinin", "cystit"],
    "blodtryck": ["hjärta", "kärl", "hypertoni", "cardio", "puls"],
}

/**
 * Normalizes text for better matching.
 */
function normalize(text: string): string {
    return text.toLowerCase()
        .replace(/[^\w\s\u00C0-\u017F]/g, " ") // Keep Swedish characters
        .replace(/\s+/g, " ")
        .trim()
}

/**
 * Calculates a high-precision relevance score.
 */
function calculatePrecisionRelevance(question: Question, pplCase: PPLCase): number {
    const fullCase = normalize(pplCase.title + " " + pplCase.description)
    const qText = normalize(question.questionText || "")
    const qAnswer = normalize(question.answer || "")
    const fullQ = qText + " " + qAnswer

    let score = 0

    // 1. MANUAL KEYWORDS (Highest Weight: 10 per match)
    // These are the "Clinical Concepts" the user explicitly wants to match.
    if (pplCase.keywords) {
        const manualKeywords = pplCase.keywords.split(",")
            .map(k => normalize(k))
            .filter(k => k.length > 0)

        manualKeywords.forEach(kw => {
            if (fullQ.includes(kw)) {
                score += 10 // Huge boost for manual keywords
            }
        })
    }

    // 2. SUBJECT AREA MATCH (Weight: 5)
    if (pplCase.subjectArea && (pplCase.subjectArea === question.subjectArea)) {
        score += 5
    }

    // 3. KNOWLEDGE BRIDGE (Weight: 2 per match)
    Object.entries(KNOWLEDGE_BRIDGE).forEach(([key, related]) => {
        if (fullCase.includes(key)) {
            if (fullQ.includes(key)) score += 2
            related.forEach(word => {
                if (fullQ.includes(word)) score += 1
            })
        }
    })

    // 4. TEXT SIMILARITY (Fuzzy matching - Weight: 0.5 - 2)
    const keywords = fullCase.split(" ")
        .filter(word => word.length > 4 && !STOP_WORDS.has(word))

    let textMatches = 0
    keywords.forEach(word => {
        if (fullQ.includes(word)) {
            textMatches++
            if (word.length > 8) score += 0.5 // Bonus for long technical terms
        }
    })

    if (keywords.length > 0) {
        score += (textMatches / keywords.length) * 2
    }

    return score
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const caseId = searchParams.get("caseId")

        if (!caseId) {
            return NextResponse.json({ error: "Missing caseId" }, { status: 400 })
        }

        // 1. Fetch the case
        const { data: pplCaseData, error: caseError } = await supabase
            .from("ppl_cases")
            .select("*")
            .eq("id", caseId)
            .single()

        if (caseError) throw caseError

        const pplCase: PPLCase = {
            ...pplCaseData,
            subjectArea: pplCaseData.subject_area,
            keywords: pplCaseData.keywords
        }

        // 2. Fetch all questions for that semester
        const { data: questions, error: questionsError } = await supabase
            .from("custom_questions")
            .select("*")
            .eq("semester", pplCase.semester)

        if (questionsError) throw questionsError

        // 3. Rank questions using high-precision logic
        const rankedQuestions = (questions as any[])
            .map((q) => {
                const questionObj: Question = {
                    id: q.id,
                    semester: q.semester,
                    examType: q.exam_type,
                    examDate: q.exam_date,
                    examPeriod: q.exam_period,
                    subjectArea: q.subject_area,
                    questionNumber: q.question_number,
                    questionText: q.question_text || "",
                    interaction: q.interaction,
                    options: q.options,
                    correctAnswer: q.correct_answer,
                    answer: q.answer || q.correct_answer || "",
                    points: q.points,
                    imageUrl: q.image_url,
                    isHidden: q.is_hidden
                }

                return {
                    ...questionObj,
                    relevance: calculatePrecisionRelevance(questionObj, pplCase)
                }
            })
            .filter(q => q.relevance > 0.5) // Filter out noise
            .sort((a, b) => b.relevance - a.relevance)

        // Normalize relevance to 0-1 for the UI if it exceeds 1
        // We'll just divide by a reasonable "max" for the progress bar
        const normalizedResults = rankedQuestions.map(q => ({
            ...q,
            relevance: Math.min(1, q.relevance / 15) // 15 points is a very strong match
        }))

        return NextResponse.json(normalizedResults.slice(0, 50))
    } catch (error: any) {
        console.error("Precision Rank API Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
