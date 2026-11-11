"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, RotateCcw, Timer, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { getStation } from "@/lib/osce/stations"
import { useOsceStations } from "@/lib/osce/use-osce-data"
import { stationScore } from "@/lib/osce/scoring"
import { playWhistle, getAudioContext } from "@/lib/osce/audio"
import { examLabel, type ItemResponse, type StationResponses } from "@/lib/osce/types"
import { StationHeader, StationItems } from "./station-view"
import { formatClock, useStationTimer } from "./use-station-timer"

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 1 })

export function PracticeStation({ id }: { id: string }) {
  const { stations, ready } = useOsceStations()
  const station = getStation(id, stations)
  const [responses, setResponses] = useState<StationResponses>({})
  const [attempt, setAttempt] = useState(0)
  const [timerOn, setTimerOn] = useState(false)
  const [warned, setWarned] = useState(false)
  const [timeUp, setTimeUp] = useState(false)

  const { remaining } = useStationTimer({
    running: timerOn && !timeUp,
    resetKey: attempt,
    onWarning: () => {
      playWhistle(1)
      setWarned(true)
    },
    onEnd: () => {
      playWhistle(2)
      setTimeUp(true)
    },
  })

  if (!station) {
    // En station som lagts till i admin finns först när ändringarna hämtats
    if (!ready) return <div className="h-64 animate-pulse rounded-xl bg-muted" />
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">Stationen finns inte.</p>
        <Button asChild variant="link">
          <Link href="/osce">Tillbaka till OSCE</Link>
        </Button>
      </div>
    )
  }

  const score = stationScore(station, responses)
  const reset = () => {
    setResponses({})
    setAttempt(a => a + 1)
    setWarned(false)
    setTimeUp(false)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="sticky top-16 z-40 -mx-4 flex flex-wrap items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link href="/osce#stationer">
            <ArrowLeft className="h-4 w-4" /> Alla stationer
          </Link>
        </Button>
        <div className="ml-auto flex items-center gap-3">
          {timerOn ? (
            <span className={cn("flex items-center gap-1.5 font-mono text-lg font-semibold tabular-nums", (warned || timeUp) && "text-amber-600")}>
              {warned && <Bell className="h-4 w-4" />}
              {timeUp ? "Tiden är ute" : formatClock(remaining)}
            </span>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                getAudioContext()
                setTimerOn(true)
              }}
            >
              <Timer className="h-4 w-4" /> Starta 10-minutersklocka
            </Button>
          )}
          <div className="hidden items-center gap-2 sm:flex">
            <Progress value={score * 10} className="h-2 w-24" />
            <span className="font-mono text-sm tabular-nums">{fmt(score)} / 10 p</span>
          </div>
          <Button size="sm" variant="ghost" onClick={reset} className="gap-1.5" aria-label="Börja om">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <StationHeader station={station} />
      <p className="text-sm text-muted-foreground">Fri övning: svara i egen takt och kontrollera varje moment direkt. Tenta: {examLabel(station.exam)}.{station.note ? ` ${station.note}` : ""}</p>
      <StationItems
        key={attempt}
        station={station}
        responses={responses}
        onChange={(itemId: string, res: ItemResponse) => setResponses(r => ({ ...r, [itemId]: res }))}
        mode="practice"
      />
      <div className="rounded-xl border border-border bg-card p-4 text-center">
        <p className="text-sm text-muted-foreground">Poäng hittills</p>
        <p className="text-3xl font-bold tabular-nums">{fmt(score)} / 10</p>
        <p className="text-xs text-muted-foreground">Poängen räknas löpande utifrån dina svar och självbedömningar.</p>
      </div>
    </div>
  )
}
