import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { Question, PPLCase } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const caseId = searchParams.get("caseId")

        if (!caseId) {
            return NextResponse.json({ error: "Missing caseId" }, { status: 400 })
        }

        // 1. Fetch the case metadata
        const { data: pplCaseData, error: caseError } = await supabase
            .from("ppl_cases")
            .select("*")
            .eq("id", caseId)
            .single()

        if (caseError) throw caseError

        // 2. Fetch all questions for that semester
        const { data: questions, error: questionsError } = await supabase
            .from("custom_questions")
            .select("*")
            .eq("semester", pplCaseData.semester)

        if (questionsError) throw questionsError

        // 3. Fetch PRE-CALCULATED scores for this case
        const { data: storedScores, error: scoresError } = await supabase
            .from("case_question_scores")
            .select("question_id, score")
            .eq("case_id", caseId)

        if (scoresError) throw scoresError

        // Create a lookup map for scores
        const scoreMap = new Map(storedScores.map(s => [s.question_id, s.score]))

        // 4. Map questions and attach scores
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
                    relevance: scoreMap.get(q.id) || 0 // Use stored score or 0
                }
            })
            .filter(q => q.relevance > 0) // Only show questions that have a positive score
            .sort((a, b) => b.relevance - a.relevance) // Highest score first

        return NextResponse.json(rankedQuestions)
    } catch (error: any) {
        console.error("Stored Rank API Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
