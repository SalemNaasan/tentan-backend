import { createHash, createHmac, timingSafeEqual } from "crypto"
import { NextRequest, NextResponse } from "next/server"

// Endast för servern (API-routes). Importera aldrig i klientkomponenter.
//
// Betaåtkomst: den som anger en giltig kod på /beta får en signerad cookie som låser upp
// betainnehåll (frågor med is_beta och föreläsningsfunktionen).
// Koderna ligger i miljövariabeln BETA_CODES, kommaseparerade. Tar man bort en kod
// slutar alla cookies som skapats med den att gälla.

export const BETA_COOKIE = "tentan_beta"
const BETA_TTL_SECONDS = 60 * 60 * 24 * 180 // 180 dagar

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error("ADMIN_SESSION_SECRET saknas i miljövariablerna")
  return secret
}

function codes(): string[] {
  return (process.env.BETA_CODES || "")
    .split(",")
    .map(c => c.trim())
    .filter(Boolean)
}

const fingerprint = (code: string) => createHash("sha256").update(code.toLowerCase()).digest("base64url").slice(0, 12)

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(`beta.${payload}`).digest("base64url")
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}

/** Den giltiga kod som matchar (skiftlägesokänsligt), eller null */
export function matchBetaCode(input: string): string | null {
  const wanted = input.trim().toLowerCase()
  if (!wanted) return null
  return codes().find(c => safeEqual(c.toLowerCase(), wanted)) ?? null
}

export function setBetaCookie(res: NextResponse, code: string) {
  const payload = Buffer.from(
    JSON.stringify({ c: fingerprint(code), exp: Math.floor(Date.now() / 1000) + BETA_TTL_SECONDS })
  ).toString("base64url")
  res.cookies.set(BETA_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: BETA_TTL_SECONDS,
  })
}

export function clearBetaCookie(res: NextResponse) {
  res.cookies.set(BETA_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 })
}

export function hasBetaAccess(req: NextRequest): boolean {
  const token = req.cookies.get(BETA_COOKIE)?.value
  if (!token) return false
  const [payload, signature] = token.split(".")
  if (!payload || !signature) return false
  try {
    if (!safeEqual(signature, sign(payload))) return false
    const { c, exp } = JSON.parse(Buffer.from(payload, "base64url").toString())
    if (typeof exp !== "number" || exp < Math.floor(Date.now() / 1000)) return false
    // Koden måste fortfarande finnas i BETA_CODES
    return codes().some(code => fingerprint(code) === c)
  } catch {
    return false
  }
}
