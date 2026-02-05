import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import type { QuestionFeedback } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('question_feedback')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error

        const mapped: QuestionFeedback[] = (data || []).map(f => ({
            id: f.id,
            questionId: f.question_id,
            questionPreview: f.question_preview,
            feedbackText: f.feedback_text,
            status: f.status,
            createdAt: f.created_at
        }))

        return NextResponse.json(mapped, {
            headers: { "Cache-Control": "no-store" }
        })
    } catch (error) {
        console.error("Feedback GET Error:", error)
        return NextResponse.json({ error: "Failed to fetch feedback" }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const feedback: Omit<QuestionFeedback, "id" | "createdAt" | "status"> = await req.json()

        const { error } = await supabase
            .from('question_feedback')
            .insert({
                id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                question_id: feedback.questionId,
                question_preview: feedback.questionPreview,
                feedback_text: feedback.feedbackText,
                status: 'new'
            })

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Feedback POST Error:", error)
        return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 })
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const { id, status } = await req.json()

        if (!id || !status) {
            return NextResponse.json({ error: "Missing ID or status" }, { status: 400 })
        }

        const { error } = await supabase
            .from('question_feedback')
            .update({ status })
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Feedback PATCH Error:", error)
        return NextResponse.json({ error: "Failed to update feedback" }, { status: 500 })
    }
}
