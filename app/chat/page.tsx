"use client"

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { ArrowUp, Bot, Loader2, RotateCcw, Sparkles } from "lucide-react"
import { useBetaState } from "@/lib/use-beta"
import { CHAT_MAX_QUESTION_CHARS, CHAT_SEMESTERS } from "@/lib/chat/config"
import type { Semester } from "@/lib/types"

type Msg = { role: "user" | "assistant"; content: string; error?: boolean }

const STARTERS: Partial<Record<Semester, string[]>> = {
  T2: ["Förklara Bohr-effekten", "Hur regleras GFR i njuren?", "Vad skiljer medfött och adaptivt immunförsvar?"],
  T3: ["Vad är skillnaden mellan kompetitiv och icke-kompetitiv antagonism?", "Hur känner man igen AV-block III på EKG?", "Vad innebär proportionell universalism?"],
}

const STORE_KEY = "tentan_chat_semester"

// Enkel och säker formatering av svaren: stycken, punktlistor, **fetstil** och [källor]
function inline(text: string, key: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\[[^\]\n]{3,160}\])/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={`${key}-${i}`}>{part.slice(2, -2)}</strong>
    if (part.startsWith("[") && part.endsWith("]"))
      return (
        <span key={`${key}-${i}`} className="mx-0.5 rounded bg-secondary px-1.5 py-0.5 align-baseline text-[11px] font-medium text-muted-foreground [box-decoration-break:clone] [overflow-wrap:anywhere]">
          {part.slice(1, -1)}
        </span>
      )
    return <Fragment key={`${key}-${i}`}>{part}</Fragment>
  })
}

// Radvis: rubriker (#), punkt- och nummerlistor med indrag, avdelare (---) och stycken
function Formatted({ text }: { text: string }) {
  // Ta bort eventuell formelkod ($…$) så att den inte syns som tecken
  const clean = text.replace(/\r/g, "").replace(/\$([^$\n]{1,80})\$/g, (_, f) => f.replace(/[{}\\]/g, "").replace(/_/g, ""))
  const nodes: ReactNode[] = []
  let paragraph: string[] = []
  const flush = () => {
    if (paragraph.length) nodes.push(<p key={nodes.length} className="whitespace-pre-wrap">{inline(paragraph.join("\n"), `p${nodes.length}`)}</p>)
    paragraph = []
  }
  clean.split("\n").forEach((raw, i) => {
    const line = raw.replace(/\s+$/, "")
    const bullet = /^(\s*)([-*•]|\d+[.)])\s+(.*)$/.exec(line)
    if (!line.trim()) return flush()
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      flush()
      nodes.push(<hr key={`hr${i}`} className="border-border" />)
    } else if (/^\s*#{1,4}\s+/.test(line)) {
      flush()
      nodes.push(<h3 key={`h${i}`} className="pt-1 font-semibold">{inline(line.replace(/^\s*#{1,4}\s+/, "").replace(/\*\*/g, ""), `h${i}`)}</h3>)
    } else if (bullet) {
      flush()
      const depth = Math.min(3, Math.floor(bullet[1].replace(/\t/g, "  ").length / 2))
      const marker = /\d/.test(bullet[2]) ? bullet[2] : "•"
      nodes.push(
        <div key={`li${i}`} className="flex gap-2" style={{ paddingLeft: `${depth * 1.1}rem` }}>
          <span className="shrink-0 text-muted-foreground">{marker}</span>
          <span className="min-w-0">{inline(bullet[3], `li${i}`)}</span>
        </div>
      )
    } else {
      paragraph.push(line)
    }
  })
  flush()
  return <div className="space-y-2 leading-relaxed">{nodes}</div>
}

export default function ChatPage() {
  const beta = useBetaState()
  const [semester, setSemester] = useState<Semester>(CHAT_SEMESTERS[0])
  const [threads, setThreads] = useState<Partial<Record<Semester, Msg[]>>>({})
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [remaining, setRemaining] = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const messages = threads[semester] ?? []

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("termin")?.toUpperCase()
    let saved: string | null = null
    try {
      saved = localStorage.getItem(STORE_KEY)
    } catch {}
    const pick = [fromUrl, saved].find(s => s && CHAT_SEMESTERS.includes(s as Semester))
    if (pick) setSemester(pick as Semester)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, semester)
    } catch {}
  }, [semester])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages])

  const setMessages = (s: Semester, update: (prev: Msg[]) => Msg[]) =>
    setThreads(prev => ({ ...prev, [s]: update(prev[s] ?? []) }))

  const send = async (text: string) => {
    const question = text.trim().slice(0, CHAT_MAX_QUESTION_CHARS)
    if (!question || busy) return
    const s = semester
    const history = [...messages.filter(m => !m.error), { role: "user" as const, content: question }]
    setMessages(s, () => [...history, { role: "assistant", content: "" }])
    setInput("")
    setBusy(true)
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ semester: s, messages: history.map(({ role, content }) => ({ role, content })) }),
      })
      const left = res.headers.get("X-Chat-Remaining")
      if (left !== null) setRemaining(Number(left))
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Något gick fel. Försök igen.")
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let answer = ""
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        answer += decoder.decode(value, { stream: true })
        const current = answer
        setMessages(s, prev => [...prev.slice(0, -1), { role: "assistant", content: current }])
      }
      if (!answer.trim()) throw new Error("Inget svar kom. Försök igen.")
    } catch (e: any) {
      setMessages(s, prev => [...prev.slice(0, -1), { role: "assistant", content: e.message, error: true }])
    } finally {
      setBusy(false)
    }
  }

  if (beta === null) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!beta) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-semibold">AI-chatten är i beta</h1>
          <p className="text-muted-foreground">Har du fått en betakod kan du aktivera den och prova chatten.</p>
          <Button asChild>
            <Link href="/beta">Ange betakod</Link>
          </Button>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-[100dvh] flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden px-4">
        {/* Termin */}
        <div className="flex items-center justify-between gap-3 border-b border-border py-3">
          <div className="flex gap-1">
            {CHAT_SEMESTERS.map(s => (
              <button
                key={s}
                onClick={() => !busy && setSemester(s)}
                className={cn(
                  "rounded-full px-3 py-1 text-sm font-medium transition-colors",
                  s === semester ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                {s}
              </button>
            ))}
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => !busy && setMessages(semester, () => [])}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Ny chatt
            </Button>
          )}
        </div>

        {/* Meddelanden */}
        <div className="flex-1 overflow-y-auto py-6">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Fråga om {semester}</h1>
                <p className="mt-1 text-sm text-muted-foreground">Svaren bygger på terminens tentafrågor och hänvisar till källan.</p>
              </div>
              <div className="flex max-w-xl flex-wrap justify-center gap-2">
                {(STARTERS[semester] ?? []).map(q => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {messages.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground">{m.content}</div>
                  </div>
                ) : (
                  <div key={i} className="flex gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className={cn("min-w-0 flex-1 text-[15px]", m.error && "text-destructive")}>
                      {m.content ? <Formatted text={m.content} /> : <Loader2 className="mt-1 h-4 w-4 animate-spin text-muted-foreground" />}
                    </div>
                  </div>
                )
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Inmatning */}
        <form
          className="border-t border-border py-3"
          onSubmit={e => {
            e.preventDefault()
            send(input)
          }}
        >
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  send(input)
                }
              }}
              placeholder={`Ställ en fråga om ${semester}…`}
              maxLength={CHAT_MAX_QUESTION_CHARS}
              rows={1}
              className="max-h-40 min-h-[44px] resize-none"
            />
            <Button type="submit" size="icon" className="h-11 w-11 shrink-0" disabled={busy || !input.trim()} aria-label="Skicka">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
            </Button>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            AI kan ha fel – kontrollera mot källan.{remaining !== null && ` ${remaining} frågor kvar i dag.`}
          </p>
        </form>
      </main>
    </div>
  )
}
