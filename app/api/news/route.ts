import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('app_news')
            .select('*')
            .order('updated_at', { ascending: false })
            .limit(1)

        if (error) throw error

        return NextResponse.json(data?.[0] || null)
    } catch (error: any) {
        console.error("News API Error (GET):", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const { content } = await req.json()

        if (content === undefined) {
            return NextResponse.json({ error: "Missing content" }, { status: 400 })
        }

        // Get the first record ID if it exists
        const { data: existing, error: fetchError } = await supabase
            .from('app_news')
            .select('id')
            .limit(1)

        if (fetchError) {
            console.error("Fetch existing news error:", fetchError)
            return NextResponse.json({ error: `Kunde inte hämta befintlig data: ${fetchError.message}` }, { status: 500 })
        }

        let result;
        if (existing && existing.length > 0) {
            result = await supabase
                .from('app_news')
                .update({ content, updated_at: new Date().toISOString() })
                .eq('id', existing[0].id)
        } else {
            result = await supabase
                .from('app_news')
                .insert({ content })
        }

        if (result.error) {
            console.error("Supabase news save error:", result.error)
            return NextResponse.json({ error: `Gick inte att spara i databasen: ${result.error.message}. Kontrollera tabellen 'app_news'.` }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("News API Error (POST):", error)
        return NextResponse.json({ error: error.message || "Ett oväntat fel uppstod vid sparning." }, { status: 500 })
    }
}
