"use client"

import { useState } from "react"
import { Check, Loader2, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { examLabel, type OsceItem, type OsceStation } from "@/lib/osce/types"

/** Id som feedbacken sparas med, så att admin ser vilken station och fråga den gäller */
export const osceFeedbackId = (station: OsceStation, item: OsceItem) => `osce:${station.id}:${item.id}`

// Feedback på en OSCE-fråga hamnar i samma feedbacklista i admin som teorifrågorna.
export function OsceFeedbackButton({ station, item, className }: { station: OsceStation; item: OsceItem; className?: string }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle")

  const send = async () => {
    if (!text.trim()) return
    setState("sending")
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: osceFeedbackId(station, item),
          questionPreview: `OSCE ${station.theme} ${examLabel(station.exam)} – ${station.title}: ${item.prompt}`.slice(0, 500),
          feedbackText: text.trim(),
        }),
      })
      if (!res.ok) throw new Error()
      setState("sent")
      setText("")
      setTimeout(() => {
        setOpen(false)
        setState("idle")
      }, 1200)
    } catch {
      setState("error")
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={v => {
        setOpen(v)
        if (!v) setState("idle")
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className={className ?? "gap-1.5 text-muted-foreground hover:text-foreground"}>
          <MessageSquare className="h-4 w-4" /> Feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Feedback på frågan</DialogTitle>
          <DialogDescription>Beskriv fel, oklarheter eller förbättringsförslag. Din feedback visas för administratören.</DialogDescription>
        </DialogHeader>
        <p className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
          {station.title} · {examLabel(station.exam)} · {item.prompt}
        </p>
        <div className="space-y-2">
          <Label htmlFor={`osce-feedback-${item.id}`}>Din feedback</Label>
          <Textarea
            id={`osce-feedback-${item.id}`}
            placeholder="T.ex. fel i facit, stavfel, otydlig fråga…"
            value={text}
            onChange={e => setText(e.target.value)}
            rows={4}
            maxLength={2000}
            className="resize-none"
          />
          {state === "error" && <p className="text-sm text-rose-600">Det gick inte att skicka. Försök igen.</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Avbryt
          </Button>
          <Button onClick={send} disabled={!text.trim() || state === "sending" || state === "sent"} className="gap-1.5">
            {state === "sending" && <Loader2 className="h-4 w-4 animate-spin" />}
            {state === "sent" && <Check className="h-4 w-4" />}
            {state === "sent" ? "Tack!" : "Skicka feedback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
