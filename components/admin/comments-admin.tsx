"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, RefreshCw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { timeAgo, type QuestionComment } from "@/lib/comments"

// De senaste kommentarerna från övningsfrågorna, så att olämpliga kan tas bort.

export function CommentsAdmin() {
  const [comments, setComments] = useState<QuestionComment[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    const res = await fetch("/api/comments?recent=1", { cache: "no-store" })
    const data = await res.json().catch(() => [])
    if (!res.ok) {
      setError(/question_comments/.test(data.error ?? "") ? "Tabellen question_comments saknas – kör supabase/comments.sql i Supabase." : data.error || "Kunde inte hämta kommentarer")
      setComments([])
      return
    }
    setComments(data)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const remove = async (c: QuestionComment) => {
    if (!confirm(`Ta bort kommentaren från ${c.authorName}? Svar på den tas också bort.`)) return
    const res = await fetch(`/api/comments?id=${encodeURIComponent(c.id)}`, { method: "DELETE" })
    if (res.ok) load()
    else alert("Kunde inte ta bort kommentaren")
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Senaste kommentarerna</CardTitle>
        <Button size="sm" variant="ghost" className="gap-1.5" onClick={load}>
          <RefreshCw className="h-4 w-4" /> Uppdatera
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {comments === null && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        {error && <p className="text-sm text-rose-600">{error}</p>}
        {comments?.length === 0 && !error && <p className="text-sm text-muted-foreground">Inga kommentarer än.</p>}
        {comments?.map(c => (
          <div key={c.id} className="flex items-start gap-3 rounded-md border border-border p-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-semibold">{c.authorName}</span>{" "}
                <span className="text-xs text-muted-foreground">
                  {timeAgo(c.createdAt)} · fråga {c.questionId}
                  {c.parentId && " · svar"}
                </span>
              </p>
              <p className="mt-0.5 whitespace-pre-wrap text-sm">{c.body}</p>
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" onClick={() => remove(c)} aria-label="Ta bort kommentaren">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
