import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { PPLCase } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const semester = searchParams.get("semester")

        let query = supabase.from("ppl_cases").select("*").order("created_at", { ascending: false })

        if (semester) {
            query = query.eq("semester", semester)
        }

        const { data, error } = await query

        if (error) throw error

        // Map snake_case to camelCase
        const mappedData = (data || []).map((c: any) => ({
            ...c,
            subjectArea: c.subject_area,
            keywords: c.keywords
        }))

        return NextResponse.json(mappedData)
    } catch (error: any) {
        console.error("Cases API Error (GET):", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const body: PPLCase = await req.json()

        const { data, error } = await supabase
            .from("ppl_cases")
            .upsert({
                id: body.id || undefined,
                semester: body.semester,
                subject_area: body.subjectArea,
                title: body.title,
                description: body.description,
                keywords: body.keywords,
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error: any) {
        console.error("Cases API Error (POST):", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get("id")

        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 })

        const { error } = await supabase.from("ppl_cases").delete().eq("id", id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("Cases API Error (DELETE):", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
