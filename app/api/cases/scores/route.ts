import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"

/**
 * POST /api/cases/scores
 * Batch imports scores for a specific case.
 * Body: { caseId: string, scores: { questionId: string, score: number }[] }
 */
export async function POST(req: NextRequest) {
    try {
        const { caseId, scores } = await req.json()

        if (!caseId || !Array.isArray(scores)) {
            return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
        }

        // Prepare data for upsert
        const upsertData = scores.map(s => ({
            case_id: caseId,
            question_id: s.questionId,
            score: s.score
        }))

        const { error } = await supabase
            .from("case_question_scores")
            .upsert(upsertData, { onConflict: "case_id,question_id" })

        if (error) throw error

        return NextResponse.json({ success: true, count: scores.length })
    } catch (error: any) {
        console.error("Batch Score API Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

/**
 * GET /api/cases/scores?caseId=xxx
 * Fetches all scores for a specific case.
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const caseId = searchParams.get("caseId")

        if (!caseId) {
            return NextResponse.json({ error: "Missing caseId" }, { status: 400 })
        }

        const { data, error } = await supabase
            .from("case_question_scores")
            .select("question_id, score")
            .eq("case_id", caseId)

        if (error) throw error

        return NextResponse.json(data.map(d => ({
            questionId: d.question_id,
            score: d.score
        })))
    } catch (error: any) {
        console.error("Get Scores API Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
