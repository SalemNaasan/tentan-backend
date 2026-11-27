import { supabaseAdmin as supabase } from "../supabase-server"
import type { Semester } from "../types"

// Endast för servern. Terminens material för AI-chatten (föreläsningsutdrag + tentafrågor med facit)
// och en kombinerad sökning: ordsökning (BM25) + betydelsesökning (Gemini-embeddings) när vektorer finns.

export interface MaterialDoc {
  id: string
  /** Källa som chatten hänvisar till, t.ex. "Tenta HT23 omtenta · fråga 29 · Farmakokinetik" */
  label: string
  text: string
  lecture?: string
}

const CACHE_MS = 10 * 60 * 1000
const cache = new Map<string, { at: number; exams: Corpus; lectures: Corpus }>()

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

/** Föreläsningstext från den privata lagringsmappen chat-material ({termin}.json), om den finns */
async function loadLectures(semester: Semester): Promise<MaterialDoc[]> {
  const { data, error } = await supabase.storage.from("chat-material").download(`${semester}.json`)
  if (error || !data) return [] // ingen föreläsningstext för terminen än
  const chunks: { id: string; title: string; lecture?: string | null; where: string; text: string }[] = JSON.parse(await data.text())
  return chunks.map(c => ({ id: c.id, label: `Föreläsning: ${c.title} · ${c.where}`, text: c.text, lecture: c.lecture ?? undefined }))
}

interface Corpus {
  docs: MaterialDoc[]
  index: Index
  /** Betydelsevektor per dokument (int8, normaliserad), eller null om den saknas */
  vecs: (Int8Array | null)[]
}

const EMBED_MODEL = "gemini-embedding-001"
const EMBED_DIM = 768

/** Förberäknade vektorer från chat-material/{termin}.embeddings.json (skapas med ett skript) */
async function loadVectors(semester: Semester): Promise<Map<string, Int8Array>> {
  const map = new Map<string, Int8Array>()
  const { data, error } = await supabase.storage.from("chat-material").download(`${semester}.embeddings.json`)
  if (error || !data) return map
  const file: { dim: number; items: { id: string; v: string }[] } = JSON.parse(await data.text())
  if (file.dim !== EMBED_DIM) return map
  for (const item of file.items) {
    const bytes = Buffer.from(item.v, "base64")
    map.set(item.id, new Int8Array(bytes.buffer, bytes.byteOffset, bytes.length))
  }
  return map
}

/** Frågans betydelsevektor, eller null om det inte går (ingen nyckel, kvot slut, timeout) */
async function embedQuery(text: string): Promise<Float32Array | null> {
  const key = process.env.GEMINI_API_KEY
  if (!key) return null
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ content: { parts: [{ text: text.slice(0, 4000) }] }, taskType: "RETRIEVAL_QUERY", outputDimensionality: EMBED_DIM }),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) {
      console.warn("Embedding misslyckades:", res.status)
      return null
    }
    const values: number[] = (await res.json()).embedding?.values ?? []
    if (values.length !== EMBED_DIM) return null
    const norm = Math.sqrt(values.reduce((a, x) => a + x * x, 0)) || 1
    return Float32Array.from(values, x => x / norm)
  } catch (error) {
    console.warn("Embedding misslyckades:", error)
    return null
  }
}

async function load(semester: Semester): Promise<{ at: number; exams: Corpus; lectures: Corpus }> {
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

  const examDocs: MaterialDoc[] = rows
    .filter(r => !r.is_hidden && r.question_text)
    .map(r => ({ id: r.id, label: examLabel(r), text: questionText(r), lecture: r.lecture ?? undefined }))
  const [lectureDocs, vectors] = await Promise.all([loadLectures(semester), loadVectors(semester)])
  const corpus = (docs: MaterialDoc[]): Corpus => ({ docs, index: buildIndex(docs), vecs: docs.map(d => vectors.get(d.id) ?? null) })
  const entry = { at: Date.now(), exams: corpus(examDocs), lectures: corpus(lectureDocs) }
  cache.set(semester, entry)
  return entry
}

function rank({ docs, index, vecs }: Corpus, q: string[], qvec: Float32Array | null, maxChars: number, maxDocs: number): MaterialDoc[] {
  const N = docs.length
  if (!N) return []
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

  // Svaga ordträffar (under en tredjedel av bästa träffen) tas inte med – det sparar tokens
  // och gör att frågor utanför terminen inte får något låtsasrelevant material
  const floor = (scored[0]?.s ?? 0) * 0.35
  const lexical = scored.filter(x => x.s >= floor).slice(0, 30).map(x => x.i)

  // Betydelsesökning: de mest lika dokumenten (nära den bästa likheten)
  let semantic: number[] = []
  if (qvec) {
    const sims: { i: number; s: number }[] = []
    vecs.forEach((v, i) => {
      if (!v) return
      let dot = 0
      for (let k = 0; k < v.length; k++) dot += v[k] * qvec[k]
      sims.push({ i, s: dot / 127 })
    })
    sims.sort((a, z) => z.s - a.s)
    const top = sims[0]?.s ?? 0
    semantic = sims.filter(x => x.s >= top - 0.08).slice(0, 30).map(x => x.i)
  }

  // Slå ihop listorna (reciprocal rank fusion): dokument som båda sökningarna hittar hamnar först
  const fused = new Map<number, number>()
  lexical.forEach((i, r) => fused.set(i, (fused.get(i) ?? 0) + 1 / (50 + r)))
  semantic.forEach((i, r) => fused.set(i, (fused.get(i) ?? 0) + 1 / (50 + r)))
  const order = [...fused.entries()].sort((a, z) => z[1] - a[1]).map(([i]) => i)

  const picked: MaterialDoc[] = []
  let chars = 0
  for (const i of order) {
    const doc = docs[i]
    if (chars + doc.text.length > maxChars && picked.length > 0) continue
    picked.push(doc)
    chars += doc.text.length
    if (picked.length >= maxDocs) break
  }
  return picked
}

/** De mest relevanta föreläsningsbitarna och tentafrågorna för frågan (båda sorterna söks för sig) */
export async function searchMaterial(semester: Semester, query: string): Promise<MaterialDoc[]> {
  const [{ exams, lectures }, qvec] = await Promise.all([load(semester), embedQuery(query)])
  const q = [...new Set(terms(query))]
  if (!q.length && !qvec) return []
  // Med föreläsningar: ungefär hälften var; utan: bara tentafrågor
  const lectureDocs = rank(lectures, q, qvec, 20_000, 7)
  const examDocs = rank(exams, q, qvec, lectureDocs.length ? 20_000 : 40_000, lectureDocs.length ? 8 : 14)
  return [...lectureDocs, ...examDocs]
}
