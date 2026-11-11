"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlarmClock, ArrowRight, Bell, CheckCircle2, ChevronDown, Headphones, RotateCcw, Timer, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { drawExam, getSitting, type ExamSitting } from "@/lib/osce/stations"
import { useOsceStations } from "@/lib/osce/use-osce-data"
import { passLimit, stationScore } from "@/lib/osce/scoring"
import { playWhistle, getAudioContext } from "@/lib/osce/audio"
import { STATION_MAX_POINTS, STATION_SECONDS, WARNING_SECONDS, type ItemResponse, type OsceStation, type StationResponses } from "@/lib/osce/types"
import { StationHeader, StationItems } from "./station-view"
import { formatClock, useStationTimer } from "./use-station-timer"

type Phase = "intro" | "station" | "switch" | "report"

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 1 })

export function ExamSession() {
  const [phase, setPhase] = useState<Phase>("intro")
  const [stations, setStations] = useState<OsceStation[]>([])
  const [index, setIndex] = useState(0)
  const [responses, setResponses] = useState<Record<string, StationResponses>>({})
  const [banner, setBanner] = useState<"warning" | null>(null)
  const [timing, setTiming] = useState({ total: STATION_SECONDS, warning: WARNING_SECONDS })
  const [attemptId, setAttemptId] = useState("")
  const [sitting, setSitting] = useState<ExamSitting | null>(null)
  const { stations: allStations } = useOsceStations()

  // ?tenta=VT26-ordinarie-fm kör en hel riktig tenta i stället för slumpade stationer
  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get("tenta")
    if (key) setSitting(getSitting(key, allStations) ?? null)
  }, [allStations])

  const station = stations[index]

  const endStation = useCallback(() => {
    playWhistle(2)
    setBanner(null)
    setPhase(index + 1 < stations.length ? "switch" : "report")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [index, stations.length])

  const { remaining, elapsed } = useStationTimer({
    running: phase === "station",
    resetKey: `${attemptId}-${index}`,
    total: timing.total,
    warning: timing.warning,
    onWarning: () => {
      playWhistle(1)
      setBanner("warning")
    },
    onEnd: endStation,
  })

  const start = () => {
    getAudioContext()
    // ?snabb=1 i adressen ger korta stationer för att testa flödet
    const fast = new URLSearchParams(window.location.search).get("snabb") === "1"
    setTiming(fast ? { total: 40, warning: 30 } : { total: STATION_SECONDS, warning: WARNING_SECONDS })
    setStations(sitting?.stations ?? drawExam(4, allStations))
    setResponses({})
    setIndex(0)
    setAttemptId(String(Date.now()))
    setPhase("station")
  }

  const nextStation = () => {
    setIndex(i => i + 1)
    setPhase("station")
  }

  const setItem = (stationId: string, itemId: string, res: ItemResponse) =>
    setResponses(r => ({ ...r, [stationId]: { ...(r[stationId] ?? {}), [itemId]: res } }))

  const scores = useMemo(() => stations.map(s => stationScore(s, responses[s.id] ?? {})), [stations, responses])
  const total = scores.reduce((a, b) => a + b, 0)
  const max = stations.length * STATION_MAX_POINTS
  const limit = passLimit(stations.length)
  const pendingSelf = stations.reduce(
    (n, s) => n + s.items.filter(i => i.kind === "self" && !(responses[s.id]?.[i.id]?.assessed)).length,
    0,
  )

  if (phase === "intro") {
    return (
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="space-y-3 text-center">
          <Badge variant="outline">{sitting ? "Hel tenta" : "Full simulering"}</Badge>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{sitting ? `Praktisk tentamen ${sitting.label}` : "Praktisk tentamen – T3"}</h1>
          <p className="text-muted-foreground">
            {sitting
              ? `Samma stationer som på tentan: ${sitting.stations.map(s => s.theme).join(", ")}.`
              : "Fyra stationer från fyra olika teman, slumpade ur tidigare tentor. Precis som på riktigt."}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { icon: Timer, title: "4 × 10 minuter", text: "Klockan går direkt när du kommer in på stationen." },
            { icon: Bell, title: "Visselsignaler", text: "En signal efter 9 min (1 minut kvar), två signaler vid stationsbyte." },
            { icon: CheckCircle2, title: "Godkänt: 30 av 40 p", text: "Max 10 p per station. Gränsen är 75 %." },
            { icon: Headphones, title: "Ljud på", text: "Använd hörlurar – stetoskop och Korotkoffljud spelas upp i realtid." },
          ].map(r => (
            <div key={r.title} className="flex gap-3 rounded-xl border border-border bg-card p-4">
              <r.icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <div>
                <p className="font-semibold">{r.title}</p>
                <p className="text-sm text-muted-foreground">{r.text}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Muntliga frågor besvarar du med stödord. Efter sista stationen får du facit och bedömer dina fria svar mot examinatorns protokoll.
        </p>
        <div className="flex justify-center">
          <Button size="lg" className="gap-2" onClick={start}>
            Starta tentan <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  if (phase === "switch") {
    const next = stations[index + 1]
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-5 py-16 text-center">
        <AlarmClock className="h-12 w-12 text-accent" />
        <h2 className="text-2xl font-bold">Stationsbyte</h2>
        <p className="text-muted-foreground">
          Station {index + 1} är avslutad. Gå till station {index + 2} av {stations.length}: <span className="font-medium text-foreground">{next.theme}</span>.
        </p>
        <Button size="lg" className="gap-2" onClick={nextStation}>
          Gå in på station {index + 2} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  if (phase === "report") {
    const passed = total >= limit
    return (
      <div className="mx-auto max-w-3xl space-y-8">
        <div className={cn("rounded-2xl border p-6 text-center", passed ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30" : "border-rose-300 bg-rose-50 dark:bg-rose-950/30")}>
          {passed ? <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" /> : <XCircle className="mx-auto h-10 w-10 text-rose-600" />}
          <p className="mt-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">Resultat</p>
          <p className="text-5xl font-bold tabular-nums">
            {fmt(total)} <span className="text-2xl text-muted-foreground">/ {max} p</span>
          </p>
          <p className="mt-2 font-medium">{passed ? "Godkänd" : "Ej godkänd"} · gräns {limit} p (75 %)</p>
          {pendingSelf > 0 && (
            <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">
              Du har {pendingSelf} muntliga svar kvar att bedöma nedan – resultatet uppdateras när du bockar av.
            </p>
          )}
        </div>

        <div className="space-y-3">
          {stations.map((s, i) => (
            <Collapsible key={s.id} className="rounded-xl border border-border bg-card">
              <CollapsibleTrigger className="group flex w-full items-center gap-3 p-4 text-left">
                <Badge variant="secondary">{s.theme}</Badge>
                <span className="flex-1 font-semibold">{s.title}</span>
                <span className="font-mono text-sm tabular-nums">{fmt(scores[i])} / 10</span>
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <div className="px-4 pb-1">
                <Progress value={scores[i] * 10} className="h-1.5" />
              </div>
              <CollapsibleContent className="space-y-6 p-4 pt-4">
                <StationHeader station={s} />
                <StationItems station={s} responses={responses[s.id] ?? {}} onChange={(itemId, res) => setItem(s.id, itemId, res)} mode="review" />
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={start} className="gap-2">
            <RotateCcw className="h-4 w-4" /> {sitting ? "Gör om tentan" : "Ny simulering"}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/osce#stationer">Till alla stationer</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Pågående station
  const urgent = remaining <= timing.total - timing.warning
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="sticky top-16 z-40 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-muted-foreground">
            Station {index + 1} / {stations.length}
          </span>
          <Progress value={(elapsed / timing.total) * 100} className={cn("h-2 flex-1", urgent && "[&>div]:bg-amber-500")} />
          <span className={cn("font-mono text-2xl font-semibold tabular-nums", urgent && "text-amber-600")}>{formatClock(remaining)}</span>
          <Button size="sm" variant="outline" onClick={endStation}>
            Klar
          </Button>
        </div>
        {banner === "warning" && (
          <div className="mt-2 flex items-center gap-2 rounded-md bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
            <Bell className="h-4 w-4" /> 1 minut kvar – avsluta uppgiften.
          </div>
        )}
      </div>

      <StationHeader station={station} />
      <StationItems key={`${attemptId}-${station.id}`} station={station} responses={responses[station.id] ?? {}} onChange={(itemId, res) => setItem(station.id, itemId, res)} mode="exam" />
    </div>
  )
}
