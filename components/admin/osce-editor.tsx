"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowDown, ArrowUp, Copy, ExternalLink, Image as ImageIcon, Loader2, Plus, RotateCcw, Save, Search, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ImageUpload } from "@/components/admin/image-upload"
import { cn } from "@/lib/utils"
import { ALL_STATIONS, type StationOverride } from "@/lib/osce/stations"
import { itemMaxPoints } from "@/lib/osce/scoring"
import { invalidateOsceData } from "@/lib/osce/use-osce-data"
import { OSCE_THEMES, STATION_MAX_POINTS, examLabel, periodRank, type OsceItem, type OsceTheme } from "@/lib/osce/types"

// Redigera OSCE-stationerna. Ändringar sparas som hela stationer i Supabase (tabellen osce_stations)
// och läggs ovanpå stationerna i koden. "Återställ" tar bort ändringen.

type Status = "original" | "ändrad" | "ny"

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 2 })
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
const lines = (text: string) => text.split("\n").map(s => s.trim()).filter(Boolean)

function itemKindLabel(item: OsceItem) {
  if (item.kind === "self") return "Muntlig fråga"
  if (item.kind === "tool") return item.tool === "image" ? "Bild" : item.criteria.length === 0 ? `Visning (${item.tool})` : `Praktiskt moment (${item.tool})`
  return item.kind
}

export function OsceEditor() {
  const [overrides, setOverrides] = useState<StationOverride[]>([])
  const [loading, setLoading] = useState(true)
  const [tableMissing, setTableMissing] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<StationOverride | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/osce", { cache: "no-store" })
      setOverrides(res.ok ? await res.json() : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Alla stationer inklusive dolda, med status
  const stations = useMemo(() => {
    const byId = new Map(overrides.map(o => [o.id, o]))
    const list: { station: StationOverride; status: Status }[] = ALL_STATIONS.map(s => ({
      station: byId.get(s.id) ?? s,
      status: byId.has(s.id) ? "ändrad" : "original",
    }))
    for (const o of overrides) if (!ALL_STATIONS.some(s => s.id === o.id)) list.push({ station: o, status: "ny" })
    return list.sort(
      (a, b) =>
        periodRank(b.station.exam.period) - periodRank(a.station.exam.period) ||
        examLabel(a.station.exam).localeCompare(examLabel(b.station.exam)) ||
        a.station.theme.localeCompare(b.station.theme),
    )
  }, [overrides])

  const visible = stations.filter(({ station }) => {
    const q = search.trim().toLowerCase()
    return !q || `${station.title} ${station.theme} ${examLabel(station.exam)} ${station.id}`.toLowerCase().includes(q)
  })

  const statusOf = (id: string): Status => stations.find(s => s.station.id === id)?.status ?? "ny"

  const select = (station: StationOverride) => {
    if (dirty && !confirm("Du har osparade ändringar. Vill du lämna stationen ändå?")) return
    setSelectedId(station.id)
    setDraft(clone(station))
    setDirty(false)
    setMessage(null)
  }

  const update = (patch: Partial<StationOverride>) => {
    setDraft(d => (d ? { ...d, ...patch } : d))
    setDirty(true)
  }

  const updateItem = (index: number, patch: Partial<OsceItem>) => {
    setDraft(d => (d ? { ...d, items: d.items.map((it, i) => (i === index ? ({ ...it, ...patch } as OsceItem) : it)) } : d))
    setDirty(true)
  }

  const moveItem = (index: number, dir: -1 | 1) => {
    setDraft(d => {
      if (!d) return d
      const items = [...d.items]
      const j = index + dir
      if (j < 0 || j >= items.length) return d
      ;[items[index], items[j]] = [items[j], items[index]]
      return { ...d, items }
    })
    setDirty(true)
  }

  const removeItem = (index: number) => {
    if (!confirm("Ta bort momentet från stationen?")) return
    setDraft(d => (d ? { ...d, items: d.items.filter((_, i) => i !== index) } : d))
    setDirty(true)
  }

  const addItem = (kind: "self" | "image") => {
    const item: OsceItem =
      kind === "self"
        ? { kind: "self", id: uid("fraga"), prompt: "", why: "", criteria: [{ id: uid("k"), text: "", points: 0.5 }] }
        : { kind: "tool", id: uid("bild"), tool: "image", prompt: "Bild", why: "", criteria: [], config: { images: [] } }
    setDraft(d => (d ? { ...d, items: [...d.items, item] } : d))
    setDirty(true)
  }

  const newStation = (from?: StationOverride) => {
    if (dirty && !confirm("Du har osparade ändringar. Vill du lämna stationen ändå?")) return
    const station: StationOverride = from
      ? { ...clone(from), id: uid("egen"), title: `${from.title} (kopia)`, hidden: false }
      : {
          id: uid("egen"),
          theme: "CREN",
          title: "Ny station",
          skills: [],
          scenario: "",
          material: [],
          exam: { period: "VT26", type: "ordinarie", session: "fm" },
          items: [],
        }
    setSelectedId(station.id)
    setDraft(station)
    setDirty(true)
    setMessage(null)
  }

  const save = async () => {
    if (!draft) return
    if (!draft.title.trim()) return setMessage({ ok: false, text: "Stationen måste ha en titel." })
    if (!/^(VT|HT)\d{2}$/.test(draft.exam.period)) return setMessage({ ok: false, text: "Perioden ska skrivas som VT26 eller HT25." })
    setSaving(true)
    setMessage(null)
    try {
      // Rensa tomma rader innan sparning
      const station: StationOverride = {
        ...draft,
        skills: draft.skills.map(s => s.trim()).filter(Boolean),
        material: (draft.material ?? []).map(s => s.trim()).filter(Boolean),
        note: draft.note?.trim() || undefined,
        items: draft.items.map(it =>
          it.kind === "self" ? { ...it, criteria: it.criteria.filter(c => c.text.trim()) } : it,
        ),
      }
      const res = await fetch("/api/osce", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(station) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Kunde inte spara")
      invalidateOsceData()
      await load()
      setDraft(clone(station))
      setDirty(false)
      setMessage({ ok: true, text: "Sparat. Ändringen syns direkt på sajten." })
    } catch (e: any) {
      const missing = /osce_stations/.test(e.message)
      setTableMissing(missing)
      setMessage({ ok: false, text: missing ? "Tabellen osce_stations finns inte i Supabase än – kör supabase/osce.sql först." : e.message })
    } finally {
      setSaving(false)
    }
  }

  const revert = async () => {
    if (!draft) return
    const isNew = statusOf(draft.id) === "ny"
    if (!confirm(isNew ? "Ta bort den här stationen helt?" : "Återställ stationen till originalet från tentan? Dina ändringar försvinner.")) return
    setSaving(true)
    try {
      const res = await fetch(`/api/osce?id=${encodeURIComponent(draft.id)}`, { method: "DELETE" })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Kunde inte återställa")
      invalidateOsceData()
      await load()
      const original = ALL_STATIONS.find(s => s.id === draft.id)
      setDraft(original ? clone(original) : null)
      setSelectedId(original ? original.id : null)
      setDirty(false)
      setMessage({ ok: true, text: isNew ? "Stationen är borttagen." : "Stationen är återställd till originalet." })
    } catch (e: any) {
      setMessage({ ok: false, text: e.message })
    } finally {
      setSaving(false)
    }
  }

  const total = draft ? draft.items.reduce((s, it) => s + itemMaxPoints(it), 0) : 0

  return (
    <div className="space-y-4">
      {tableMissing && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="pt-6 text-sm">
            Tabellen <code>osce_stations</code> saknas i Supabase. Kör innehållet i <code>supabase/osce.sql</code> i Supabase → SQL Editor, och spara sedan igen.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* Stationslista */}
        <Card className="h-fit">
          <CardHeader className="space-y-3 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Stationer ({stations.length})</CardTitle>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => newStation()}>
                <Plus className="h-4 w-4" /> Ny
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Sök station…" className="pl-8" />
            </div>
          </CardHeader>
          <CardContent className="max-h-[70vh] space-y-1 overflow-y-auto pt-0">
            {loading && <Loader2 className="mx-auto my-6 h-5 w-5 animate-spin text-muted-foreground" />}
            {visible.map(({ station, status }) => (
              <button
                key={station.id}
                onClick={() => select(station)}
                className={cn(
                  "w-full rounded-md border px-2.5 py-2 text-left text-sm transition-colors",
                  selectedId === station.id ? "border-primary bg-secondary" : "border-transparent hover:bg-secondary/60",
                )}
              >
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                    {station.theme}
                  </Badge>
                  <span className="truncate font-medium">{station.title}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  {examLabel(station.exam)}
                  {status !== "original" && <Badge className="px-1.5 py-0 text-[10px]">{status}</Badge>}
                  {station.hidden && <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">dold</Badge>}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Redigering */}
        {!draft ? (
          <Card>
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              Välj en station till vänster för att ändra frågor, facit, poäng, förklaringar och bilder – eller skapa en ny.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card className="sticky top-16 z-10">
              <CardContent className="flex flex-wrap items-center gap-2 py-3">
                <Badge variant={statusOf(draft.id) === "original" ? "outline" : "default"}>{statusOf(draft.id)}</Badge>
                <span className={cn("text-sm tabular-nums", Math.abs(total - STATION_MAX_POINTS) > 0.01 ? "text-amber-600" : "text-muted-foreground")}>
                  Totalt {fmt(total)} / {STATION_MAX_POINTS} p
                </span>
                {dirty && <span className="text-xs text-amber-600">Osparade ändringar</span>}
                <div className="ml-auto flex flex-wrap gap-2">
                  {statusOf(draft.id) !== "ny" && (
                    <Button asChild size="sm" variant="ghost" className="gap-1">
                      <a href={`/osce/station/${draft.id}`} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4" /> Visa
                      </a>
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="gap-1" onClick={() => newStation(draft)}>
                    <Copy className="h-4 w-4" /> Duplicera
                  </Button>
                  {statusOf(draft.id) !== "original" && (
                    <Button size="sm" variant="outline" className="gap-1" onClick={revert} disabled={saving}>
                      <RotateCcw className="h-4 w-4" /> {statusOf(draft.id) === "ny" ? "Ta bort" : "Återställ original"}
                    </Button>
                  )}
                  <Button size="sm" className="gap-1" onClick={save} disabled={saving || !dirty}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Spara
                  </Button>
                </div>
                {message && <p className={cn("w-full text-sm", message.ok ? "text-emerald-600" : "text-rose-600")}>{message.text}</p>}
              </CardContent>
            </Card>

            {/* Stationens uppgifter */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Station</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Titel</Label>
                  <Input value={draft.title} onChange={e => update({ title: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Tema</Label>
                  <Select value={draft.theme} onValueChange={v => update({ theme: v as OsceTheme })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OSCE_THEMES.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.id} – {t.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1.5">
                    <Label>Period</Label>
                    <Input value={draft.exam.period} onChange={e => update({ exam: { ...draft.exam, period: e.target.value.toUpperCase() } })} placeholder="VT26" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Typ</Label>
                    <Select value={draft.exam.type} onValueChange={v => update({ exam: { ...draft.exam, type: v as "ordinarie" | "omtenta" } })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ordinarie">Ordinarie</SelectItem>
                        <SelectItem value="omtenta">Omtenta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Pass</Label>
                    <Select
                      value={draft.exam.session ?? "none"}
                      onValueChange={v => update({ exam: { ...draft.exam, session: v === "none" ? undefined : (v as "fm" | "em") } })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">–</SelectItem>
                        <SelectItem value="fm">fm</SelectItem>
                        <SelectItem value="em">em</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Moment (kommaseparerade, används i Fri övning)</Label>
                  <Input value={draft.skills.join(", ")} onChange={e => update({ skills: e.target.value.split(",") })} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Instruktion som läses upp (scenario)</Label>
                  <Textarea rows={3} value={draft.scenario} onChange={e => update({ scenario: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Material (en rad per sak)</Label>
                  <Textarea rows={3} value={(draft.material ?? []).join("\n")} onChange={e => update({ material: e.target.value.split("\n") })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Notis (t.ex. att facit är uppskattat)</Label>
                  <Textarea rows={3} value={draft.note ?? ""} onChange={e => update({ note: e.target.value })} />
                </div>
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <Checkbox checked={!!draft.hidden} onCheckedChange={v => update({ hidden: v === true })} />
                  Dölj stationen på sajten
                </label>
              </CardContent>
            </Card>

            {/* Moment */}
            {draft.items.map((item, index) => (
              <Card key={item.id}>
                <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
                  <Badge variant="secondary">{index + 1}</Badge>
                  <span className="text-sm font-medium">{itemKindLabel(item)}</span>
                  {(item.kind === "self" || item.kind === "tool") && item.criteria.length > 0 && (
                    <span className="text-xs text-muted-foreground">{fmt(itemMaxPoints(item))} p</span>
                  )}
                  <div className="ml-auto flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => moveItem(index, -1)} disabled={index === 0} aria-label="Flytta upp">
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => moveItem(index, 1)} disabled={index === draft.items.length - 1} aria-label="Flytta ner">
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" onClick={() => removeItem(index)} aria-label="Ta bort momentet">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>{item.kind === "tool" && item.criteria.length === 0 ? "Rubrik" : "Fråga (ordagrant från protokollet)"}</Label>
                    <Textarea rows={2} value={item.prompt} onChange={e => updateItem(index, { prompt: e.target.value })} />
                  </div>

                  {item.kind === "tool" && item.examQuestions && (
                    <div className="space-y-1.5">
                      <Label>Protokollets frågor för momentet (en per rad)</Label>
                      <Textarea rows={3} value={item.examQuestions.join("\n")} onChange={e => updateItem(index, { examQuestions: lines(e.target.value) } as Partial<OsceItem>)} />
                    </div>
                  )}

                  {item.kind === "tool" && item.tool === "image" && (
                    <div className="space-y-2">
                      <Label>Bilder</Label>
                      {(item.config?.images ?? []).map((img: { src: string; alt: string }, i: number) => (
                        <div key={i} className="flex items-start gap-3 rounded-md border border-border p-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.src} alt="" className="h-20 w-28 rounded object-contain bg-white" />
                          <div className="flex-1 space-y-2">
                            <ImageUpload
                              value={img.src}
                              onChange={url => {
                                const images = [...item.config!.images]
                                images[i] = { ...img, src: url }
                                updateItem(index, { config: { ...item.config, images } } as Partial<OsceItem>)
                              }}
                            />
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-rose-600"
                            onClick={() => updateItem(index, { config: { ...item.config, images: item.config!.images.filter((_: unknown, k: number) => k !== i) } } as Partial<OsceItem>)}
                            aria-label="Ta bort bilden"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <div className="rounded-md border border-dashed border-border p-2">
                        <p className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <ImageIcon className="h-3.5 w-3.5" /> Lägg till bild
                        </p>
                        <ImageUpload
                          onChange={url =>
                            updateItem(index, { config: { ...item.config, images: [...(item.config?.images ?? []), { src: url, alt: item.prompt }] } } as Partial<OsceItem>)
                          }
                        />
                      </div>
                    </div>
                  )}

                  {(item.kind === "self" || item.kind === "tool") && (item.kind === "self" || item.criteria.length > 0) && (
                    <div className="space-y-2">
                      <Label>Facit / bedömning</Label>
                      {item.criteria.map((c, ci) => (
                        <div key={c.id} className="flex items-start gap-2">
                          <Textarea
                            rows={1}
                            className="min-h-9 flex-1"
                            value={c.text}
                            onChange={e => updateItem(index, { criteria: item.criteria.map((x, k) => (k === ci ? { ...x, text: e.target.value } : x)) })}
                          />
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            className="w-20"
                            value={c.points}
                            onChange={e => updateItem(index, { criteria: item.criteria.map((x, k) => (k === ci ? { ...x, points: Number(e.target.value) || 0 } : x)) })}
                            aria-label="Poäng"
                          />
                          {item.kind === "self" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-9 w-9 text-rose-600"
                              onClick={() => updateItem(index, { criteria: item.criteria.filter((_, k) => k !== ci) })}
                              aria-label="Ta bort raden"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      {item.kind === "self" ? (
                        <div className="flex flex-wrap items-center gap-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => updateItem(index, { criteria: [...item.criteria, { id: uid("k"), text: "", points: 0.5 }] })}
                          >
                            <Plus className="h-4 w-4" /> Lägg till facitrad
                          </Button>
                          <div className="flex items-center gap-2 text-sm">
                            <Label className="font-normal text-muted-foreground">Max poäng (valfritt, t.ex. "2 av 4 räcker")</Label>
                            <Input
                              type="number"
                              step="0.5"
                              min="0"
                              className="w-20"
                              value={item.maxPoints ?? ""}
                              onChange={e => updateItem(index, { maxPoints: e.target.value === "" ? undefined : Number(e.target.value) } as Partial<OsceItem>)}
                            />
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Texten och poängen går att ändra. Raderna bockas av automatiskt av det interaktiva verktyget, så de kan inte läggas till eller tas bort här.
                        </p>
                      )}
                    </div>
                  )}

                  {!(item.kind === "tool" && item.criteria.length === 0) && (
                    <div className="space-y-1.5">
                      <Label>Förklaring (visas efter svaret)</Label>
                      <Textarea rows={2} value={item.why} onChange={e => updateItem(index, { why: e.target.value })} />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="gap-1" onClick={() => addItem("self")}>
                <Plus className="h-4 w-4" /> Lägg till fråga
              </Button>
              <Button variant="outline" className="gap-1" onClick={() => addItem("image")}>
                <ImageIcon className="h-4 w-4" /> Lägg till bild
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
