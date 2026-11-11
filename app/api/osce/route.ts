import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin as supabase } from "@/lib/supabase-server"
import { requireAdmin } from "@/lib/admin-auth"
import type { StationOverride } from "@/lib/osce/stations"

export const dynamic = "force-dynamic"

// OSCE-stationer som ändrats eller lagts till i admin (tabellen osce_stations, se supabase/osce.sql).

export async function GET() {
  const { data, error } = await supabase.from("osce_stations").select("id, data")
  if (error) {
    // Tabellen finns inte än: sajten visar då originalstationerna
    console.warn("osce_stations kunde inte läsas:", error.message)
    return NextResponse.json([], { headers: { "Cache-Control": "no-store" } })
  }
  const stations = (data || []).map(row => ({ ...row.data, id: row.id })) as StationOverride[]
  return NextResponse.json(stations, { headers: { "Cache-Control": "no-store" } })
}

function isStation(value: any): value is StationOverride {
  return (
    value &&
    typeof value.id === "string" &&
    /^[a-z0-9-]{1,80}$/.test(value.id) &&
    typeof value.title === "string" &&
    typeof value.theme === "string" &&
    value.exam &&
    typeof value.exam.period === "string" &&
    Array.isArray(value.items)
  )
}

export async function PUT(req: NextRequest) {
  const auth = requireAdmin(req, "super")
  if (auth instanceof NextResponse) return auth

  const station = await req.json().catch(() => null)
  if (!isStation(station)) {
    return NextResponse.json({ error: "Ogiltig station" }, { status: 400 })
  }
  if (JSON.stringify(station).length > 200_000) {
    return NextResponse.json({ error: "Stationen är för stor" }, { status: 400 })
  }

  const { error } = await supabase
    .from("osce_stations")
    .upsert({ id: station.id, data: station, updated_at: new Date().toISOString() })
  if (error) {
    console.error("OSCE PUT Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}

/** Tar bort ändringen: en station från koden går tillbaka till originalet, en ny station försvinner */
export async function DELETE(req: NextRequest) {
  const auth = requireAdmin(req, "super")
  if (auth instanceof NextResponse) return auth

  const id = new URL(req.url).searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 })

  const { error } = await supabase.from("osce_stations").delete().eq("id", id)
  if (error) {
    console.error("OSCE DELETE Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
