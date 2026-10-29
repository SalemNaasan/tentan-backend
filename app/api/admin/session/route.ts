import { NextRequest, NextResponse } from "next/server"
import { clearSessionCookie, getAdminRole, roleForPassword, setSessionCookie } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

// GET: vilken roll har den inloggade (eller null)
export async function GET(req: NextRequest) {
  return NextResponse.json({ role: getAdminRole(req) }, {
    headers: { "Cache-Control": "no-store" },
  })
}

// POST: logga in med lösenord
export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json()
    const role = typeof password === "string" ? roleForPassword(password) : null

    if (!role) {
      // Liten fördröjning för att göra gissning av lösenord långsammare
      await new Promise(resolve => setTimeout(resolve, 800))
      return NextResponse.json({ error: "Felaktigt lösenord" }, { status: 401 })
    }

    const res = NextResponse.json({ role })
    setSessionCookie(res, role)
    return res
  } catch (error: any) {
    console.error("Admin login error:", error)
    return NextResponse.json({ error: error.message || "Inloggningen misslyckades" }, { status: 500 })
  }
}

// DELETE: logga ut
export async function DELETE() {
  const res = NextResponse.json({ success: true })
  clearSessionCookie(res)
  return res
}
