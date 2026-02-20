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
 * This allows matching "knowledge" even if words differ.
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
 * Calculates a knowledge-based relevance score.
 */
function calculateKnowledgeRelevance(question: Question, pplCase: PPLCase): number {
    const caseTitle = pplCase.title.toLowerCase()
    const caseDesc = pplCase.description.toLowerCase()
    const fullCase = (caseTitle + " " + caseDesc).toLowerCase()

    const qText = question.questionText.toLowerCase()
    const qAnswer = question.answer.toLowerCase()
    const fullQ = (qText + " " + qAnswer).toLowerCase()

    let score = 0

    // 1. SUBJECT AREA MATCH (Critical for "Knowledge" matching)
    // If the admin tagged the case with the same tema as the question, it's a huge boost.
    if (pplCase.subjectArea === question.subjectArea) {
        score += 0.5
    }

    // 2. KNOWLEDGE BRIDGE (Semantic Matching)
    // Check if case contains a key concept that should trigger related medical topics.
    Object.entries(KNOWLEDGE_BRIDGE).forEach(([key, related]) => {
        if (fullCase.includes(key)) {
            // Small bonus if the trigger word itself is there
            if (fullQ.includes(key)) score += 0.2

            // Bonus if any related "knowledge" words are in the question
            related.forEach(word => {
                if (fullQ.includes(word)) {
                    score += 0.15
                }
            })
        }
    })

    // 3. KEYWORD MATCHING (weighted long medical terms)
    const keywords = fullCase.split(/\s+/)
        .filter(word => word.length > 4 && !STOP_WORDS.has(word))

    let rawMatches = 0
    keywords.forEach(word => {
        if (fullQ.includes(word)) {
            rawMatches++
            // Specific bonus for long/technical words
            if (word.length > 7) score += 0.05
        }
    })

    if (keywords.length > 0) {
        score += (rawMatches / keywords.length) * 0.3
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
            subjectArea: pplCaseData.subject_area
        }

        // 2. Fetch all questions for that semester (or broader if you want)
        // For now stay within semester for better relevance
        const { data: questions, error: questionsError } = await supabase
            .from("custom_questions")
            .select("*")
            .eq("semester", pplCase.semester)

        if (questionsError) throw questionsError

        // 3. Rank questions using knowledge logic
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
                    relevance: calculateKnowledgeRelevance(questionObj, pplCase)
                }
            })
            .filter(q => q.relevance > 0.1) // Minimum filter to exclude garbage
            .sort((a, b) => b.relevance - a.relevance)

        return NextResponse.json(rankedQuestions.slice(0, 50))
    } catch (error: any) {
        console.error("Knowledge Rank API Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
