import { createHmac, timingSafeEqual } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import type { Semester } from "./types"

// Endast för servern (API-routes). Importera aldrig i klientkomponenter.

export type AdminRole = "super" | "limited"

export const LIMITED_SEMESTERS: Semester[] = ["T4", "T5"]

export const ADMIN_COOKIE = "admin_session"
const SESSION_TTL_SECONDS = 60 * 60 * 12 // 12 timmar

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD
  if (!secret) throw new Error("ADMIN_SESSION_SECRET/ADMIN_PASSWORD saknas i miljövariablerna")
  return secret
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url")
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

// Returnerar rollen för ett lösenord, eller null om det är fel
export function roleForPassword(password: string): AdminRole | null {
  const adminPassword = process.env.ADMIN_PASSWORD
  const guestPassword = process.env.GUEST_PASSWORD
  if (adminPassword && safeEqual(password, adminPassword)) return "super"
  if (guestPassword && safeEqual(password, guestPassword)) return "limited"
  return null
}

export function createSessionToken(role: AdminRole): string {
  const payload = Buffer.from(
    JSON.stringify({ role, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS })
  ).toString("base64url")
  return `${payload}.${sign(payload)}`
}

export function setSessionCookie(res: NextResponse, role: AdminRole) {
  res.cookies.set(ADMIN_COOKIE, createSessionToken(role), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  })
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 })
}

export function getAdminRole(req: NextRequest): AdminRole | null {
  const token = req.cookies.get(ADMIN_COOKIE)?.value
  if (!token) return null

  const [payload, signature] = token.split(".")
  if (!payload || !signature) return null

  try {
    if (!safeEqual(signature, sign(payload))) return null
    const { role, exp } = JSON.parse(Buffer.from(payload, "base64url").toString())
    if (typeof exp !== "number" || exp < Math.floor(Date.now() / 1000)) return null
    return role === "super" || role === "limited" ? role : null
  } catch {
    return null
  }
}

/**
 * Kräver inloggning. Returnerar rollen, eller ett färdigt 401/403-svar.
 * Användning:
 *   const auth = requireAdmin(req, "super")
 *   if (auth instanceof NextResponse) return auth
 */
export function requireAdmin(req: NextRequest, minimum: AdminRole = "limited"): AdminRole | NextResponse {
  const role = getAdminRole(req)
  if (!role) {
    return NextResponse.json({ error: "Inte inloggad" }, { status: 401 })
  }
  if (minimum === "super" && role !== "super") {
    return NextResponse.json({ error: "Behörighet saknas" }, { status: 403 })
  }
  return role
}
