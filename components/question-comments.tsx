"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, MessageCircle, Reply, Send, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { getSavedName, saveName, timeAgo, type QuestionComment } from "@/lib/comments"

// Kommentarer på en fråga: alla kan skriva med sitt namn och svara på varandra.

export function QuestionComments({ questionId, onCountChange }: { questionId: string; onCountChange?: (count: number) => void }) {
  const [comments, setComments] = useState<QuestionComment[] | null>(null)
  const [name, setName] = useState("")
  const [text, setText] = useState("")
  const [website, setWebsite] = useState("")
  const [replyTo, setReplyTo] = useState<QuestionComment | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(getSavedName())
    fetch(`/api/comments?questionId=${encodeURIComponent(questionId)}`, { cache: "no-store" })
      .then(res => (res.ok ? res.json() : []))
      .then(setComments)
      .catch(() => setComments([]))
  }, [questionId])

  // Svaren grupperas under kommentaren de svarar på
  const children = useMemo(() => {
    const map = new Map<string | null, QuestionComment[]>()
    for (const c of comments ?? []) {
      const key = c.parentId && comments!.some(x => x.id === c.parentId) ? c.parentId : null
      map.set(key, [...(map.get(key) ?? []), c])
    }
    return map
  }, [comments])

  const send = async () => {
    if (!name.trim() || !text.trim()) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, authorName: name.trim(), body: text.trim(), parentId: replyTo?.id ?? null, website }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Kunde inte skicka")
      saveName(name.trim())
      const next = [...(comments ?? []), data as QuestionComment]
      setComments(next)
      onCountChange?.(next.length)
      setText("")
      setReplyTo(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSending(false)
    }
  }

  const renderThread = (parent: string | null, depth: number) =>
    (children.get(parent) ?? []).map(c => (
      <div key={c.id} className={cn(depth > 0 && "ml-4 border-l-2 border-border pl-3 sm:ml-6")}>
        <div className="py-2">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-sm font-semibold text-foreground">{c.authorName}</span>
            <span className="text-xs text-muted-foreground">{timeAgo(c.createdAt)}</span>
          </div>
          <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{c.body}</p>
          <button
            type="button"
            onClick={() => setReplyTo(c)}
            className="mt-1 flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Reply className="h-3 w-3" /> Svara
          </button>
        </div>
        {renderThread(c.id, Math.min(depth + 1, 3))}
      </div>
    ))

  return (
    <div className="space-y-3 rounded-lg border border-border bg-secondary/10 p-4">
      <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <MessageCircle className="h-3.5 w-3.5" /> Kommentarer
      </h4>

      {comments === null ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Inga kommentarer än. Skriv den första!</p>
      ) : (
        <div className="divide-y divide-border/60">{renderThread(null, 0)}</div>
      )}

      <div className="space-y-2 border-t border-border pt-3">
        {replyTo && (
          <div className="flex items-center gap-2 rounded-md bg-secondary/60 px-2 py-1 text-xs text-muted-foreground">
            <Reply className="h-3 w-3" /> Svarar {replyTo.authorName}
            <button type="button" onClick={() => setReplyTo(null)} className="ml-auto hover:text-foreground" aria-label="Avbryt svar">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ditt namn" maxLength={40} className="h-9 sm:max-w-xs" />
        {/* Dolt fält mot spam-robotar */}
        <input value={website} onChange={e => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
        <Textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={replyTo ? `Svara ${replyTo.authorName}…` : "Skriv en kommentar om frågan…"}
          rows={3}
          maxLength={1500}
          className="resize-none"
        />
        <div className="flex items-center gap-2">
          <Button size="sm" className="gap-1.5" onClick={send} disabled={sending || !name.trim() || !text.trim()}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Skicka
          </Button>
          <span className="text-xs text-muted-foreground">Kommentaren syns för alla med ditt namn.</span>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
    </div>
  )
}
