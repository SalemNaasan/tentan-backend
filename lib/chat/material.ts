import { supabaseAdmin as supabase } from "../supabase-server"
import type { Semester } from "../types"

// Endast för servern. Terminens material för AI-chatten och en enkel sökning (BM25) i det.
// Materialet är tentafrågorna med facit; föreläsningar läggs till som egna dokument senare.

export interface MaterialDoc {
  id: string
  /** Källa som chatten hänvisar till, t.ex. "Tenta HT23 omtenta · fråga 29 · Farmakokinetik" */
  label: string
  text: string
  lecture?: string
}

const CACHE_MS = 10 * 60 * 1000
const cache = new Map<string, { at: number; docs: MaterialDoc[]; index: Index }>()

const STOP = new Set(
  ("och att det som för med till från den har kan inte eller vilka vilken vilket beskriv ange förklara nämn varför samt " +
    "på av är ett en de vad hur var när ska skulle kommer finns sig dessa detta dess deras nedan ovan bilden fråga svar " +
    "svarsförslag poäng respektive olika två tre fyra också även mer mycket man vid kan där eller om under efter mellan " +
    "the and of to in").split(" ")
)

/** Ord → söktermer. Grov stamning: ordet och dess första 6 tecken, så att "hemoglobinets" hittar "hemoglobin". */
export function terms(text: string): string[] {
  const out: string[] = []
  for (const word of text.normalize("NFC").toLowerCase().match(/[a-zåäöéü0-9]{3,}/g) ?? []) {
    if (STOP.has(word)) continue
    out.push(word)
    if (word.length > 6) out.push(word.slice(0, 6) + "*")
  }
  return out
}

interface Index {
  df: Map<string, number>
  tf: Map<string, number>[]
  len: number[]
  avgLen: number
}

function buildIndex(docs: MaterialDoc[]): Index {
  const df = new Map<string, number>()
  const tf: Map<string, number>[] = []
  const len: number[] = []
  for (const doc of docs) {
    const counts = new Map<string, number>()
    const words = terms(doc.label + " " + doc.text)
    for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1)
    for (const w of counts.keys()) df.set(w, (df.get(w) ?? 0) + 1)
    tf.push(counts)
    len.push(words.length)
  }
  return { df, tf, len, avgLen: len.reduce((a, b) => a + b, 0) / Math.max(1, len.length) }
}

function examLabel(row: any): string {
  const typ = row.exam_type === "re-exam" ? "omtenta" : "ordinarie"
  const period = row.exam_period === "Okänd" ? "okänd tenta" : `${row.exam_period} ${typ}`
  const num = row.question_number ? ` · fråga ${row.question_number}` : ""
  return `Tenta ${period}${num}${row.lecture ? ` · ${row.lecture}` : ""}`
}

function questionText(row: any): string {
  const parts = [`Fråga: ${row.question_text}`]
  if (Array.isArray(row.options) && row.options.length) parts.push(`Alternativ:\n${row.options.join("\n")}`)
  const correct = Array.isArray(row.correct_answer) ? row.correct_answer.join(", ") : row.correct_answer
  const answer = typeof row.answer === "string" && row.answer.trim() ? row.answer : correct
  if (answer && typeof answer === "string") parts.push(`Facit: ${answer}`)
  return parts.join("\n")
}

async function load(semester: Semester) {
  const hit = cache.get(semester)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit

  const rows: any[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("custom_questions")
      .select("id, exam_type, exam_period, question_number, question_text, options, correct_answer, answer, lecture, is_hidden")
      .eq("semester", semester)
      .range(from, from + 999)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }

  const docs: MaterialDoc[] = rows
    .filter(r => !r.is_hidden && r.question_text)
    .map(r => ({ id: r.id, label: examLabel(r), text: questionText(r), lecture: r.lecture ?? undefined }))
  const entry = { at: Date.now(), docs, index: buildIndex(docs) }
  cache.set(semester, entry)
  return entry
}

/** De mest relevanta dokumenten för frågan, inom en ungefärlig teckengräns */
export async function searchMaterial(semester: Semester, query: string, maxChars = 40_000, maxDocs = 14): Promise<MaterialDoc[]> {
  const { docs, index } = await load(semester)
  const q = [...new Set(terms(query))]
  if (!q.length || !docs.length) return []

  const N = docs.length
  const k1 = 1.4
  const b = 0.75
  const scored: { i: number; s: number }[] = []
  for (let i = 0; i < N; i++) {
    let s = 0
    for (const t of q) {
      const f = index.tf[i].get(t)
      if (!f) continue
      const n = index.df.get(t) ?? 0
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5))
      // Stamträffar (ord*) väger lite mindre än exakta ord
      const weight = t.endsWith("*") ? 0.6 : 1
      s += weight * idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * index.len[i]) / index.avgLen)))
    }
    if (s > 0) scored.push({ i, s })
  }
  scored.sort((a, z) => z.s - a.s)

  // Svaga träffar (under en tredjedel av bästa träffen) tas inte med – det sparar tokens
  // och gör att frågor utanför terminen inte får något låtsasrelevant material
  const floor = (scored[0]?.s ?? 0) * 0.35
  const picked: MaterialDoc[] = []
  let chars = 0
  for (const { i, s } of scored) {
    if (s < floor) break
    const doc = docs[i]
    if (chars + doc.text.length > maxChars && picked.length > 0) continue
    picked.push(doc)
    chars += doc.text.length
    if (picked.length >= maxDocs) break
  }
  return picked
}
