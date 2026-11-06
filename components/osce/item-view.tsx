"use client"

import { useRef, useState } from "react"
import { Check, X, Lightbulb, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import type { ItemResponse, OsceItem } from "@/lib/osce/types"
import { itemMaxPoints, itemScore } from "@/lib/osce/scoring"
import { TOOLS } from "./tools"

export type ItemMode = "exam" | "practice" | "review"

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 1 })

function PointsBadge({ score, max }: { score: number; max: number }) {
  const full = score >= max
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
        full ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" : score > 0 ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
      )}
    >
      {fmt(score)} / {fmt(max)} p
    </span>
  )
}

export function Why({ text }: { text: string }) {
  if (!text) return null
  return (
    <div className="flex gap-2 rounded-lg bg-sky-50 p-3 text-sm leading-relaxed text-sky-950 dark:bg-sky-950/40 dark:text-sky-100">
      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
      <p>{text}</p>
    </div>
  )
}

/** Kriterielista – självbedömning (kryssrutor) eller verktygets resultat (bockar) */
function CriteriaList({
  item,
  response,
  editable,
  onToggle,
}: {
  item: Extract<OsceItem, { kind: "self" | "tool" }>
  response: ItemResponse | undefined
  editable: boolean
  onToggle?: (id: string, on: boolean) => void
}) {
  const achieved = new Set(response?.achieved ?? [])
  return (
    <ul className="space-y-1.5">
      {item.criteria.map(c => {
        const on = achieved.has(c.id)
        return (
          <li key={c.id} className="flex items-start gap-2.5 text-sm">
            {editable ? (
              <Checkbox id={`${item.id}-${c.id}`} checked={on} onCheckedChange={v => onToggle?.(c.id, v === true)} className="mt-0.5" />
            ) : on ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
            )}
            <label htmlFor={`${item.id}-${c.id}`} className={cn("flex-1", !editable && !on && "text-muted-foreground")}>
              {c.text}
            </label>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{fmt(c.points)} p</span>
          </li>
        )
      })}
    </ul>
  )
}

export function ItemView({
  item,
  index,
  response,
  onChange,
  mode,
  locked = false,
}: {
  item: OsceItem
  index: number | null
  response: ItemResponse | undefined
  onChange: (res: ItemResponse) => void
  mode: ItemMode
  locked?: boolean
}) {
  const [revealed, setRevealed] = useState(false)
  const res = response ?? {}
  const max = itemMaxPoints(item)
  const score = itemScore(item, response)
  const isDisplay = item.kind === "tool" && item.criteria.length === 0
  const showFeedback = mode === "review" || (mode === "practice" && revealed)
  const inputLocked = locked || mode === "review" || (mode === "practice" && revealed && item.kind !== "self" && item.kind !== "tool")

  // Senaste svaret i en ref, så att flera uppdateringar i samma ögonblick
  // (t.ex. två kriterier som uppnås samtidigt) inte skriver över varandra
  const latest = useRef<ItemResponse>(res)
  latest.current = response ?? latest.current
  const update = (patch: Partial<ItemResponse>) => {
    const next = { ...latest.current, ...patch }
    latest.current = next
    onChange(next)
  }

  const header = (
    <div className="flex items-start gap-3">
      {index !== null && (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{index}</span>
      )}
      <p className="flex-1 font-medium leading-relaxed text-foreground">{item.prompt}</p>
      {showFeedback && !isDisplay && <PointsBadge score={score} max={max} />}
    </div>
  )

  if (item.kind === "tool") {
    const Tool = TOOLS[item.tool]
    return (
      <section className="space-y-3">
        {header}
        {item.examQuestions && item.examQuestions.length > 1 && (
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            {item.examQuestions.slice(1).map((q, i) => (
              <li key={i} value={i + 2}>
                {q}
              </li>
            ))}
          </ol>
        )}
        <Tool
          item={item}
          achieved={res.achieved ?? []}
          onAchieve={ids => update({ achieved: [...new Set([...(latest.current.achieved ?? []), ...ids])] })}
          exam={mode === "exam"}
          locked={locked || mode === "review"}
        />
        {!isDisplay && mode === "practice" && !revealed && (
          <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => setRevealed(true)}>
            <Eye className="h-4 w-4" /> Visa bedömningsmallen
          </Button>
        )}
        {!isDisplay && showFeedback && (
          <div className="space-y-3 rounded-lg border border-border p-3">
            <CriteriaList item={item} response={response} editable={false} />
            <Why text={item.why} />
          </div>
        )}
      </section>
    )
  }

  return (
    <section className="space-y-3">
      {header}

      {item.kind === "self" && (
        <>
          {mode !== "review" && (
            <Textarea
              value={res.notes ?? ""}
              onChange={e => update({ notes: e.target.value })}
              placeholder={mode === "exam" ? "Svara som du skulle svara examinatorn (stödord räcker)…" : "Skriv ditt svar innan du tittar på facit…"}
              rows={2}
              disabled={locked}
            />
          )}
          {mode === "review" && res.notes && <p className="rounded-md bg-muted/50 p-2 text-sm italic text-muted-foreground">Ditt svar: {res.notes}</p>}
          {mode === "practice" && !revealed && (
            <Button size="sm" variant="outline" onClick={() => setRevealed(true)} className="gap-1.5">
              <Eye className="h-4 w-4" /> Visa facit och bedöm dig själv
            </Button>
          )}
          {showFeedback && (
            <div className="space-y-3 rounded-lg border border-border p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Bocka i det du fick med{item.maxPoints !== undefined ? ` · max ${fmt(item.maxPoints)} p` : ""}
              </p>
              <CriteriaList
                item={item}
                response={response}
                editable
                onToggle={(id, on) => {
                  const set = new Set(latest.current.achieved ?? [])
                  if (on) set.add(id)
                  else set.delete(id)
                  update({ achieved: [...set], assessed: true })
                }}
              />
              {!res.assessed && (
                <Button size="sm" variant="ghost" onClick={() => update({ assessed: true })}>
                  Jag fick inget av detta
                </Button>
              )}
              <Why text={item.why} />
            </div>
          )}
        </>
      )}

      {item.kind === "choice" && (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            {item.options.map((opt, i) => {
              const selected = (res.selected ?? []).includes(i)
              const correct = item.correct.includes(i)
              return (
                <button
                  key={i}
                  type="button"
                  disabled={inputLocked}
                  onClick={() => {
                    if (item.multi) {
                      const set = new Set(res.selected ?? [])
                      if (set.has(i)) set.delete(i)
                      else set.add(i)
                      update({ selected: [...set] })
                    } else update({ selected: [i] })
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    selected ? "border-primary bg-secondary" : "border-border bg-card hover:bg-secondary/50",
                    showFeedback && correct && "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40",
                    showFeedback && selected && !correct && "border-rose-400 bg-rose-50 dark:bg-rose-950/40",
                  )}
                >
                  <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center border", item.multi ? "rounded-sm" : "rounded-full", selected && "border-primary bg-primary")}>
                    {selected && <Check className="h-3 w-3 text-primary-foreground" />}
                  </span>
                  <span className="flex-1">{opt}</span>
                  {showFeedback && correct && <Check className="h-4 w-4 text-emerald-600" />}
                </button>
              )
            })}
          </div>
          {item.multi && !showFeedback && <p className="text-xs text-muted-foreground">Flera svar kan vara rätt.</p>}
        </>
      )}

      {item.kind === "numeric" && (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="decimal"
            step="any"
            value={res.value ?? ""}
            onChange={e => update({ value: e.target.value === "" ? null : Number(e.target.value.replace(",", ".")) })}
            disabled={inputLocked}
            className="w-32"
          />
          <span className="text-sm text-muted-foreground">{item.unit}</span>
          {showFeedback && (
            <span className="text-sm text-muted-foreground">
              Godkänt intervall: {item.min === item.max ? fmt(item.min) : `${fmt(item.min)}–${fmt(item.max)}`} {item.unit}
            </span>
          )}
        </div>
      )}

      {(item.kind === "choice" || item.kind === "numeric") && (
        <>
          {mode === "practice" && !revealed && (
            <Button size="sm" variant="outline" onClick={() => setRevealed(true)} disabled={item.kind === "choice" ? !(res.selected ?? []).length : res.value == null}>
              Kontrollera svar
            </Button>
          )}
          {showFeedback && <Why text={item.why} />}
        </>
      )}
    </section>
  )
}
