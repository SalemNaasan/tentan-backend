import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin as supabase } from "@/lib/supabase-server"
import { requireAdmin } from "@/lib/admin-auth"
import type { QuestionComment } from "@/lib/comments"

export const dynamic = "force-dynamic"

// Kommentarer på övningsfrågorna (tabellen question_comments, se supabase/comments.sql).
// GET ?questionId=… ger trådarna för en fråga, GET ?counts=1 antal per fråga, GET ?recent=1 de senaste (admin).

const map = (row: any): QuestionComment => ({
  id: row.id,
  questionId: row.question_id,
  parentId: row.parent_id,
  authorName: row.author_name,
  body: row.body,
  createdAt: row.created_at,
})

const noStore = { headers: { "Cache-Control": "no-store" } }

export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams

  if (params.get("counts")) {
    const { data, error } = await supabase.from("question_comments").select("question_id").limit(10000)
    if (error) return NextResponse.json({}, noStore)
    const counts: Record<string, number> = {}
    for (const row of data || []) counts[row.question_id] = (counts[row.question_id] ?? 0) + 1
    return NextResponse.json(counts, noStore)
  }

  if (params.get("recent")) {
    const auth = requireAdmin(req, "super")
    if (auth instanceof NextResponse) return auth
    const { data, error } = await supabase.from("question_comments").select("*").order("created_at", { ascending: false }).limit(200)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json((data || []).map(map), noStore)
  }

  const questionId = params.get("questionId")
  if (!questionId) return NextResponse.json({ error: "questionId saknas" }, { status: 400 })
  const { data, error } = await supabase.from("question_comments").select("*").eq("question_id", questionId).order("created_at", { ascending: true })
  if (error) return NextResponse.json([], noStore)
  return NextResponse.json((data || []).map(map), noStore)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const questionId = typeof body?.questionId === "string" ? body.questionId.slice(0, 100) : ""
  const authorName = typeof body?.authorName === "string" ? body.authorName.trim().slice(0, 40) : ""
  const text = typeof body?.body === "string" ? body.body.trim() : ""
  const parentId = typeof body?.parentId === "string" ? body.parentId.slice(0, 100) : null

  // Dolt fält som bara robotar fyller i
  if (body?.website) return NextResponse.json({ success: true })
  if (!questionId || !authorName || !text) return NextResponse.json({ error: "Namn och kommentar krävs" }, { status: 400 })
  if (text.length > 1500) return NextResponse.json({ error: "Kommentaren är för lång (max 1500 tecken)" }, { status: 400 })

  const row = {
    id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    question_id: questionId,
    parent_id: parentId,
    author_name: authorName,
    body: text,
  }
  const { error } = await supabase.from("question_comments").insert(row)
  if (error) {
    console.error("Comments POST Error:", error)
    return NextResponse.json({ error: /question_comments/.test(error.message) ? "Kommentarer är inte aktiverade än" : "Kunde inte spara kommentaren" }, { status: 500 })
  }
  return NextResponse.json(map({ ...row, created_at: new Date().toISOString() }))
}

export async function DELETE(req: NextRequest) {
  const auth = requireAdmin(req, "super")
  if (auth instanceof NextResponse) return auth
  const id = new URL(req.url).searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 })
  const { error } = await supabase.from("question_comments").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
