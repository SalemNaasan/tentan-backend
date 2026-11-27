"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Eye, Flag, Loader2, RotateCcw, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { QuestionRenderer } from "@/components/question-renderers/question-renderer"
import { cn } from "@/lib/utils"
import { PASS_PERCENT, autoScore, hasAnswer, isAutoGraded, maxPoints, questionLabel } from "@/lib/grading"
import { setDone } from "@/lib/done-store"
import type { Question, Semester } from "@/lib/types"

// Tentaläge: en hel gammal tenta på 5 timmar. Flerval rättas automatiskt, skrivfrågor
// bedömer man själv. Pågående tenta sparas i webbläsaren så att den överlever en omladdning.

const DURATION_MS = 5 * 60 * 60 * 1000
const SESSION_KEY = "tentan_exam_session"
const SEMESTERS: Semester[] = ["T1", "T2", "T3", "T4", "T5"]

type Mode = "direct" | "end"

interface Session {
  examKey: string
  mode: Mode
  startedAt: number
  finishedAt?: number
  current: number
  answers: Record<string, any>
  revealed: Record<string, boolean>
  selfScores: Record<string, number>
}

interface ExamInfo {
  key: string
  semester: Semester
  period: string
  type: string
  questions: Question[]
  total: number
}

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 1 })
const examKeyOf = (q: Question) => `${q.semester}|${q.examPeriod}|${q.examType}`
const typeLabel = (t: string) => (t === "regular" ? "Ordinarie" : "Omtenta")

function periodRank(p: string) {
  const m = /^(VT|HT)(\d{2})$/.exec(p)
  return m ? Number(m[2]) * 2 + (m[1] === "HT" ? 1 : 0) : -1
}

function sortQuestions(list: Question[]) {
  return [...list].sort(
    (a, b) => (a.caseName ?? "").localeCompare(b.caseName ?? "", "sv") || a.questionNumber - b.questionNumber,
  )
}

function formatClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${h}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`
}

function loadSession(): Session | null {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null")
  } catch {
    return null
  }
}

function saveSession(s: Session | null) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s))
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    // privat läge – tentan sparas då bara tills sidan laddas om
  }
}

/** Poäng för en fråga: automatiskt, självbedömt eller null om skrivfrågan inte är bedömd än */
function scoreOf(q: Question, s: Session): number | null {
  if (isAutoGraded(q)) return autoScore(q, s.answers[q.id]) ?? 0
  return typeof s.selfScores[q.id] === "number" ? s.selfScores[q.id] : null
}

export function ExamMode() {
  const [questions, setQuestions] = useState<Question[] | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [semester, setSemester] = useState<Semester>("T1")
  const [mode, setMode] = useState<Mode>("end")
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    fetch("/api/questions", { cache: "no-store" })
      .then(res => (res.ok ? res.json() : []))
      .then((list: Question[]) => setQuestions(list.filter(q => !q.isHidden)))
      .catch(() => setQuestions([]))
    const saved = loadSession()
    if (saved) setSession(saved)
  }, [])

  const update = useCallback((patch: Partial<Session> | ((s: Session) => Partial<Session>)) => {
    setSession(prev => {
      if (!prev) return prev
      const next = { ...prev, ...(typeof patch === "function" ? patch(prev) : patch) }
      saveSession(next)
      return next
    })
  }, [])

  const exams = useMemo(() => {
    const map = new Map<string, ExamInfo>()
    // Frågor utan känd tenta kan inte bilda en hel tenta, och betafrågor (OneNote) är bara delar av tentor
    for (const q of (questions ?? []).filter(x => x.examPeriod !== "Okänd" && !x.isBeta)) {
      const key = examKeyOf(q)
      const exam = map.get(key) ?? { key, semester: q.semester, period: q.examPeriod, type: q.examType, questions: [], total: 0 }
      exam.questions.push(q)
      exam.total += maxPoints(q)
      map.set(key, exam)
    }
    for (const e of map.values()) e.questions = sortQuestions(e.questions)
    return [...map.values()].sort((a, b) => periodRank(b.period) - periodRank(a.period) || (a.type === b.type ? 0 : a.type === "regular" ? -1 : 1))
  }, [questions])

  const exam = session ? exams.find(e => e.key === session.examKey) : undefined
  const remaining = session ? session.startedAt + DURATION_MS - now : DURATION_MS
  const running = !!session && !session.finishedAt

  // Klockan tickar bara under en pågående tenta; när tiden är slut lämnas tentan in automatiskt
  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [running])

  useEffect(() => {
    if (questions && session && !exam) {
      saveSession(null)
      setSession(null)
    }
  }, [questions, session, exam])

  // Frågor man besvarat på tentan räknas som gjorda på övningssidan när tentan är inlämnad
  useEffect(() => {
    if (!session?.finishedAt || !exam) return
    for (const q of exam.questions) if (hasAnswer(q, session.answers[q.id])) setDone(q.id, true)
  }, [session?.finishedAt, exam, session?.answers])

  useEffect(() => {
    if (running && remaining <= 0) update({ finishedAt: session!.startedAt + DURATION_MS })
  }, [running, remaining, session, update])

  const start = (e: ExamInfo, m: Mode = mode) => {
    const s: Session = { examKey: e.key, mode: m, startedAt: Date.now(), current: 0, answers: {}, revealed: {}, selfScores: {} }
    saveSession(s)
    setNow(Date.now())
    setSession(s)
    window.scrollTo({ top: 0 })
  }

  const quit = () => {
    if (running && !confirm("Avbryta tentan? Dina svar försvinner.")) return
    saveSession(null)
    setSession(null)
  }

  if (!questions) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Sparad tenta som inte längre finns (t.ex. borttagna frågor)
  if (session && !exam) return null

  if (!session || !exam) {
    const list = exams.filter(e => e.semester === semester)
    return (
      <div className="space-y-8">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-3 mb-2 gap-1.5">
            <Link href="/study">
              <ArrowLeft className="h-4 w-4" /> Övningsfrågor
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Tenta på tid</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Gör en hel gammal tenta på 5 timmar. Flervalsfrågor rättas automatiskt, skrivfrågor bedömer du själv mot facit. Godkänt från {fmt(PASS_PERCENT)} %.
          </p>
        </div>

        <Card>
          <CardContent className="space-y-3 pt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">När vill du se svaren?</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["end", "När hela tentan är klar", "Som på riktigt: du ser facit och resultat först när du lämnat in."],
                  ["direct", "Direkt efter varje fråga", "Rätta varje fråga när du svarat och se facit på en gång."],
                ] as const
              ).map(([value, title, text]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-colors",
                    mode === value ? "border-primary bg-secondary" : "border-border hover:bg-secondary/50",
                  )}
                >
                  <p className="font-medium">{title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{text}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="mr-2 text-sm font-semibold uppercase tracking-wide text-foreground">Välj tenta</h2>
            {SEMESTERS.map(s => (
              <Button key={s} size="sm" variant={semester === s ? "default" : "outline"} onClick={() => setSemester(s)} disabled={!exams.some(e => e.semester === s)}>
                {s}
              </Button>
            ))}
          </div>
          {list.length === 0 && <p className="py-8 text-center text-muted-foreground">Inga tentor för {semester} än.</p>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map(e => (
              <button
                key={e.key}
                type="button"
                onClick={() => start(e)}
                className="group rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{e.semester}</Badge>
                  <Badge variant={e.type === "regular" ? "default" : "secondary"}>{typeLabel(e.type)}</Badge>
                </div>
                <p className="mt-2 text-xl font-bold">{e.period}</p>
                <p className="text-sm text-muted-foreground">
                  {e.questions.length} frågor · {fmt(e.total)} poäng
                </p>
                <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-primary">
                  <Clock className="h-4 w-4" /> Starta (5 h)
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (session.finishedAt) return <Results exam={exam} session={session} update={update} onQuit={quit} onRetry={() => start(exam, session.mode)} />

  return <ExamRunner exam={exam} session={session} remaining={remaining} update={update} onQuit={quit} />
}

/* ------------------------------------------------------------------ */
/* Pågående tenta                                                      */
/* ------------------------------------------------------------------ */

function ExamRunner({
  exam,
  session,
  remaining,
  update,
  onQuit,
}: {
  exam: ExamInfo
  session: Session
  remaining: number
  update: (patch: Partial<Session> | ((s: Session) => Partial<Session>)) => void
  onQuit: () => void
}) {
  const index = Math.min(session.current, exam.questions.length - 1)
  const q = exam.questions[index]
  const answered = exam.questions.filter(x => hasAnswer(x, session.answers[x.id])).length
  const revealed = session.mode === "direct" && !!session.revealed[q.id]
  const go = (i: number) => {
    update({ current: Math.max(0, Math.min(exam.questions.length - 1, i)) })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }
  const submit = () => {
    const left = exam.questions.length - answered
    if (!confirm(left > 0 ? `Lämna in? ${left} frågor är obesvarade.` : "Lämna in tentan?")) return
    update({ finishedAt: Date.now() })
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="space-y-5">
      <div className="sticky top-16 z-30 -mx-4 flex flex-wrap items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {exam.semester} {exam.period} · {typeLabel(exam.type)}
          </p>
          <p className="text-xs text-muted-foreground">
            {answered}/{exam.questions.length} besvarade
          </p>
        </div>
        <span className={cn("ml-auto flex items-center gap-1.5 font-mono text-lg font-semibold tabular-nums", remaining < 15 * 60 * 1000 && "text-rose-600")}>
          <Clock className="h-4 w-4" /> {formatClock(remaining)}
        </span>
        <Button size="sm" variant="ghost" onClick={onQuit}>
          Avbryt
        </Button>
        <Button size="sm" className="gap-1.5" onClick={submit}>
          <Flag className="h-4 w-4" /> Lämna in
        </Button>
      </div>

      {/* Frågenavigering */}
      <div className="flex flex-wrap gap-1.5">
        {exam.questions.map((x, i) => {
          const done = hasAnswer(x, session.answers[x.id])
          const shown = session.mode === "direct" && session.revealed[x.id]
          const score = shown ? scoreOf(x, session) : null
          return (
            <button
              key={x.id}
              type="button"
              onClick={() => go(i)}
              className={cn(
                "h-8 min-w-8 rounded-md border px-1.5 text-xs font-medium tabular-nums transition-colors",
                i === index && "ring-2 ring-primary ring-offset-1",
                shown && score !== null
                  ? score >= maxPoints(x)
                    ? "border-green-500 bg-green-500/15 text-green-800"
                    : score > 0
                      ? "border-amber-500 bg-amber-500/15 text-amber-800"
                      : "border-rose-500 bg-rose-500/15 text-rose-800"
                  : done
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-foreground",
              )}
              title={`Fråga ${questionLabel(x)}`}
            >
              {questionLabel(x)}
            </button>
          )
        })}
      </div>

      <QuestionPanel
        key={q.id}
        q={q}
        session={session}
        revealed={revealed}
        locked={revealed}
        onAnswer={answer => update(s => ({ answers: { ...s.answers, [q.id]: answer } }))}
        onSelfScore={score => update(s => ({ selfScores: { ...s.selfScores, [q.id]: score } }))}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" className="gap-1.5" onClick={() => go(index - 1)} disabled={index === 0}>
          <ArrowLeft className="h-4 w-4" /> Föregående
        </Button>
        {session.mode === "direct" && !revealed && (
          <Button
            variant="secondary"
            className="gap-1.5"
            onClick={() => {
              setDone(q.id, true)
              update(s => ({ revealed: { ...s.revealed, [q.id]: true } }))
            }}
          >
            <Eye className="h-4 w-4" /> {isAutoGraded(q) ? "Rätta" : "Visa facit"}
          </Button>
        )}
        {index < exam.questions.length - 1 ? (
          <Button className="ml-auto gap-1.5" onClick={() => go(index + 1)}>
            Nästa <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button className="ml-auto gap-1.5" onClick={submit}>
            <Flag className="h-4 w-4" /> Lämna in
          </Button>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* En fråga                                                            */
/* ------------------------------------------------------------------ */

function QuestionPanel({
  q,
  session,
  revealed,
  locked,
  onAnswer,
  onSelfScore,
}: {
  q: Question
  session: Session
  revealed: boolean
  locked: boolean
  onAnswer: (answer: any) => void
  onSelfScore: (score: number) => void
}) {
  const answer = session.answers[q.id]
  const max = maxPoints(q)
  const score = revealed ? scoreOf(q, session) : null

  return (
    <Card>
      <CardContent className="space-y-5 pt-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{q.subjectArea}</Badge>
          {q.caseName && <Badge variant="outline">{q.caseName.toLowerCase().startsWith("fall") ? q.caseName : `Fall ${q.caseName.toUpperCase()}`}</Badge>}
          <span className="text-sm text-muted-foreground">
            Fråga <span className="font-semibold text-foreground">{questionLabel(q)}</span> · {fmt(max)} p
          </span>
          {revealed && score !== null && (
            <Badge className={cn("ml-auto", score >= max ? "bg-green-600" : score > 0 ? "bg-amber-500" : "bg-rose-600")}>
              {fmt(score)} / {fmt(max)} p
            </Badge>
          )}
        </div>

        <div className="rounded-lg border border-border/50 bg-secondary/30 p-4">
          <p className="whitespace-pre-wrap font-medium leading-relaxed text-foreground">{q.questionText}</p>
        </div>

        {q.imageUrl && (
          <div className="overflow-hidden rounded-xl border border-border/50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={q.imageUrl} alt={`Bild för fråga ${questionLabel(q)}`} className="mx-auto h-auto max-h-[420px] w-full object-contain" />
          </div>
        )}

        {isAutoGraded(q) ? (
          <QuestionRenderer question={q} userAnswer={answer} onAnswerChange={onAnswer} disabled={locked} showCorrect={revealed} revealAnswer={revealed} />
        ) : (
          <Textarea
            value={answer ?? ""}
            onChange={e => onAnswer(e.target.value)}
            disabled={locked}
            rows={6}
            placeholder="Skriv ditt svar…"
          />
        )}

        {revealed && <Facit q={q} session={session} onSelfScore={onSelfScore} />}
      </CardContent>
    </Card>
  )
}

/** Facit och, för skrivfrågor, självbedömning */
function Facit({ q, session, onSelfScore }: { q: Question; session: Session; onSelfScore: (score: number) => void }) {
  const max = maxPoints(q)
  const auto = isAutoGraded(q)
  const self = session.selfScores[q.id]
  // Facittexten för flerval är bara bokstäver; de rätta alternativen markeras redan i grönt
  const showText = q.answer && (!auto || q.answer.trim().length > 4)

  return (
    <div className="space-y-3">
      {auto && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg border p-3 text-sm font-medium",
            (autoScore(q, session.answers[q.id]) ?? 0) >= max ? "border-green-500/30 bg-green-500/10 text-green-700" : "border-rose-500/30 bg-rose-500/10 text-rose-700",
          )}
        >
          {(autoScore(q, session.answers[q.id]) ?? 0) >= max ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {fmt(autoScore(q, session.answers[q.id]) ?? 0)} av {fmt(max)} poäng
        </div>
      )}
      {showText && (
        <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-accent">Facit</h4>
          <p className="whitespace-pre-wrap leading-relaxed text-foreground">{q.answer}</p>
        </div>
      )}
      {!auto && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3">
          <span className="text-sm font-medium">Din poäng:</span>
          {[0, max / 2, max].map(v => (
            <Button key={v} size="sm" variant={self === v ? "default" : "outline"} onClick={() => onSelfScore(v)}>
              {fmt(v)}
            </Button>
          ))}
          <Input
            type="number"
            min={0}
            max={max}
            step={0.5}
            value={self ?? ""}
            onChange={e => {
              const v = Number(e.target.value)
              if (e.target.value !== "" && !Number.isNaN(v)) onSelfScore(Math.max(0, Math.min(max, v)))
            }}
            className="h-9 w-20"
            aria-label="Egen poäng"
          />
          <span className="text-sm text-muted-foreground">av {fmt(max)}</span>
          {self === undefined && <span className="text-xs text-amber-600">Bedöm dig själv mot facit</span>}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Resultat                                                            */
/* ------------------------------------------------------------------ */

function Results({
  exam,
  session,
  update,
  onQuit,
  onRetry,
}: {
  exam: ExamInfo
  session: Session
  update: (patch: Partial<Session> | ((s: Session) => Partial<Session>)) => void
  onQuit: () => void
  onRetry: () => void
}) {
  const [open, setOpen] = useState<string | null>(null)
  const scores = exam.questions.map(q => scoreOf(q, session))
  const points = scores.reduce<number>((s, v) => s + (v ?? 0), 0)
  const ungraded = exam.questions.filter((q, i) => !isAutoGraded(q) && scores[i] === null)
  const percent = exam.total ? (points / exam.total) * 100 : 0
  const passed = percent >= PASS_PERCENT
  const used = Math.min(DURATION_MS, (session.finishedAt ?? Date.now()) - session.startedAt)
  // I slutläget har man inte sett facit än: allt visas nu
  const reviewSession: Session = { ...session, revealed: Object.fromEntries(exam.questions.map(q => [q.id, true])) }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          {exam.semester} {exam.period} · {typeLabel(exam.type)} · tid {formatClock(used)}
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Resultat</h1>
      </div>

      <Card className={cn("border-2", ungraded.length ? "border-amber-400" : passed ? "border-green-500" : "border-rose-500")}>
        <CardContent className="flex flex-wrap items-center gap-6 pt-6">
          <div>
            <p className="text-sm text-muted-foreground">Poäng</p>
            <p className="text-3xl font-bold tabular-nums">
              {fmt(points)} / {fmt(exam.total)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Procent</p>
            <p className="text-3xl font-bold tabular-nums">{fmt(percent)} %</p>
          </div>
          <div className="ml-auto text-right">
            {ungraded.length > 0 ? (
              <p className="font-semibold text-amber-600">{ungraded.length} skrivfrågor att bedöma</p>
            ) : (
              <p className={cn("text-2xl font-bold", passed ? "text-green-600" : "text-rose-600")}>{passed ? "Godkänt" : "Underkänt"}</p>
            )}
            <p className="text-xs text-muted-foreground">Gräns {fmt(PASS_PERCENT)} %</p>
          </div>
        </CardContent>
      </Card>

      {ungraded.length > 0 && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Skrivfrågorna räknas som 0 poäng tills du bedömt dem. Öppna dem nedan, jämför ditt svar med facit och sätt poäng.
        </p>
      )}

      <div className="space-y-2">
        {exam.questions.map((q, i) => {
          const score = scores[i]
          const max = maxPoints(q)
          const isOpen = open === q.id
          return (
            <div key={q.id} className="rounded-xl border border-border bg-card">
              <button type="button" onClick={() => setOpen(isOpen ? null : q.id)} className="flex w-full items-center gap-3 p-3 text-left">
                <span className="w-12 shrink-0 text-sm font-semibold tabular-nums">{questionLabel(q)}</span>
                <span className="line-clamp-1 flex-1 text-sm text-muted-foreground">{q.questionText}</span>
                {!isAutoGraded(q) && <Badge variant="outline">Skrivfråga</Badge>}
                <Badge className={cn(score === null ? "bg-amber-500" : score >= max ? "bg-green-600" : score > 0 ? "bg-amber-500" : "bg-rose-600")}>
                  {score === null ? "Ej bedömd" : `${fmt(score)} / ${fmt(max)}`}
                </Badge>
              </button>
              {isOpen && (
                <div className="border-t border-border p-3">
                  <QuestionPanel
                    q={q}
                    session={reviewSession}
                    revealed
                    locked
                    onAnswer={() => {}}
                    onSelfScore={v => update(s => ({ selfScores: { ...s.selfScores, [q.id]: v } }))}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="gap-1.5" onClick={onRetry}>
          <RotateCcw className="h-4 w-4" /> Gör om samma tenta
        </Button>
        <Button onClick={onQuit}>Välj en annan tenta</Button>
      </div>
    </div>
  )
}
