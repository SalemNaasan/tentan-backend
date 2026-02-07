import { NextRequest, NextResponse } from "next/server"
import { mockQuestions } from "@/lib/mock-data"
import { supabase } from "@/lib/supabase"
import type { Question } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    // 1. Fetch custom questions
    const { data: customQuestions, error: customError } = await supabase
      .from('custom_questions')
      .select('*')

    if (customError) throw customError

    // 2. Fetch deleted question IDs
    const { data: deletedIds, error: deletedError } = await supabase
      .from('deleted_question_ids')
      .select('id')

    if (deletedError) throw deletedError

    // 2b. Fetch hidden question IDs
    const { data: hiddenIds, error: hiddenError } = await supabase
      .from('hidden_question_ids')
      .select('id')

    if (hiddenError) throw hiddenError

    const deletedSet = new Set(deletedIds.map(d => d.id))
    const hiddenSet = new Set(hiddenIds.map(h => h.id))

    // 3. Map custom questions to local type (ensuring camelCase if they were snake_case)
    const customMapped: Question[] = (customQuestions || []).map(q => ({
      id: q.id,
      semester: q.semester,
      examType: q.exam_type,
      examDate: q.exam_date,
      examPeriod: q.exam_period,
      subjectArea: q.subject_area,
      questionNumber: q.question_number,
      questionText: q.question_text,
      interaction: q.interaction,
      options: q.options,
      correctAnswer: q.correct_answer,
      answer: q.answer,
      isHidden: q.is_hidden,
      points: q.points
    }))

    // 4. Combine and filter
    const customIds = new Set(customMapped.map(q => q.id))
    const filteredMock = mockQuestions
      .filter(q => !deletedSet.has(q.id) && !customIds.has(q.id))
      .map(q => ({
        ...q,
        isHidden: hiddenSet.has(q.id)
      }))

    const allQuestions = [
      ...filteredMock,
      ...customMapped
    ]

    return NextResponse.json(allQuestions, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    })
  } catch (error: any) {
    console.error("API Error (GET):", error)
    return NextResponse.json({ error: error.message || "Failed to fetch questions" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const questions: Question[] = await req.json()

    // Convert to snake_case for Supabase
    const toUpsert = questions.map(q => ({
      id: q.id,
      semester: q.semester,
      exam_type: q.examType,
      exam_date: q.examDate,
      exam_period: q.examPeriod,
      subject_area: q.subjectArea,
      question_number: q.questionNumber,
      question_text: q.questionText,
      interaction: q.interaction,
      options: q.options,
      correct_answer: q.correctAnswer,
      answer: q.answer,
      is_hidden: q.isHidden,
      points: q.points
    }))

    const { error } = await supabase
      .from('custom_questions')
      .upsert(toUpsert)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("API Error (POST):", error)
    return NextResponse.json({ error: error.message || "Failed to save questions" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, isHidden } = await req.json()

    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 })
    }

    if (id.startsWith('custom-')) {
      // Update custom question
      const { error } = await supabase
        .from('custom_questions')
        .update({ is_hidden: isHidden })
        .eq('id', id)

      if (error) throw error
    } else {
      // Update mock question visibility
      if (isHidden) {
        const { error } = await supabase
          .from('hidden_question_ids')
          .upsert({ id })
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('hidden_question_ids')
          .delete()
          .eq('id', id)
        if (error) throw error
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("API Error (PATCH):", error)
    return NextResponse.json({ error: error.message || "Failed to update visibility" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 })
    }

    if (id.startsWith('custom-')) {
      // Delete from custom questions
      const { error } = await supabase
        .from('custom_questions')
        .delete()
        .eq('id', id)

      if (error) throw error
    } else {
      // Mark mock question as deleted
      const { error } = await supabase
        .from('deleted_question_ids')
        .insert({ id })

      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("API Error (DELETE):", error)
    return NextResponse.json({ error: "Failed to delete question" }, { status: 500 })
  }
}
