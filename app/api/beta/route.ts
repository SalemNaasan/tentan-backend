import { NextRequest, NextResponse } from "next/server"
import { clearBetaCookie, hasBetaAccess, matchBetaCode, setBetaCookie } from "@/lib/beta-auth"

export const dynamic = "force-dynamic"

// GET: har besökaren betaåtkomst?
export async function GET(req: NextRequest) {
  return NextResponse.json({ beta: hasBetaAccess(req) }, { headers: { "Cache-Control": "no-store" } })
}

// POST: aktivera beta med en kod
export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json()
    const match = typeof code === "string" ? matchBetaCode(code) : null
    if (!match) {
      // Liten fördröjning för att göra gissning av koder långsammare
      await new Promise(resolve => setTimeout(resolve, 800))
      return NextResponse.json({ error: "Koden stämmer inte" }, { status: 401 })
    }
    const res = NextResponse.json({ beta: true })
    setBetaCookie(res, match)
    return res
  } catch (error: any) {
    console.error("Beta activation error:", error)
    return NextResponse.json({ error: "Kunde inte aktivera beta" }, { status: 500 })
  }
}

// DELETE: stäng av beta på den här enheten
export async function DELETE() {
  const res = NextResponse.json({ beta: false })
  clearBetaCookie(res)
  return res
}
