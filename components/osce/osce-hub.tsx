"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, ListChecks, Stethoscope, Timer, Dumbbell, HeartPulse, Activity, Microscope, Brain, FlaskConical, Pill } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ALL_STATIONS, getSittings } from "@/lib/osce/stations"
import { OSCE_PERIODS, OSCE_THEMES, examLabel, type ExamRef, type OscePeriod, type OsceStation, type OsceTheme } from "@/lib/osce/types"

const THEME_ICON: Record<OsceTheme, typeof Activity> = {
  CREN: Activity,
  NSPR: Brain,
  GEN: HeartPulse,
  GNM: Microscope,
  IBI: FlaskConical,
  ERL: Pill,
}

const INTERACTIVE = new Set(["auscultation", "electrodes", "bloodpressure", "cpr", "choking", "spirometry", "ecg", "gram", "agar"])

const FILTER_KEY = "tentan_osce_filters"

export function OsceHub() {
  const [theme, setTheme] = useState<OsceTheme | "all">("all")
  const [skill, setSkill] = useState<string | null>(null)
  const [period, setPeriod] = useState<OscePeriod | "all">("all")
  const [examType, setExamType] = useState<ExamRef["type"] | "all">("all")
  const [session, setSession] = useState<"fm" | "em" | "all">("all")
  const [restored, setRestored] = useState(false)

  // Filtren ligger kvar när man går in på en station och tillbaka
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(FILTER_KEY) ?? "null")
      if (saved) {
        setTheme(saved.theme ?? "all")
        setSkill(saved.skill ?? null)
        setPeriod(saved.period ?? "all")
        setExamType(saved.examType ?? "all")
        setSession(saved.session ?? "all")
      }
    } catch {
      // privat läge eller blockerad lagring – standardfiltren gäller
    }
    setRestored(true)
  }, [])

  useEffect(() => {
    if (!restored) return
    try {
      sessionStorage.setItem(FILTER_KEY, JSON.stringify({ theme, skill, period, examType, session }))
    } catch {
      // filtren sparas bara om webbläsaren tillåter det
    }
  }, [restored, theme, skill, period, examType, session])

  const skills = useMemo(() => {
    const list = ALL_STATIONS.filter(s => theme === "all" || s.theme === theme).flatMap(s => s.skills)
    return [...new Set(list)].sort((a, b) => a.localeCompare(b, "sv"))
  }, [theme])

  const stations = ALL_STATIONS.filter(
    s => (period === "all" || s.exam.period === period) && (examType === "all" || s.exam.type === examType) && (session === "all" || s.exam.session === session) && (theme === "all" || s.theme === theme) && (!skill || s.skills.includes(skill)),
  )

  const sittings = useMemo(getSittings, [])

  // Stationerna är redan sorterade; här grupperas de per tenta
  const groups = stations.reduce<{ label: string; items: OsceStation[] }[]>((list, s) => {
    const label = `${s.exam.period} ${s.exam.type}`
    const last = list[list.length - 1]
    if (last?.label === label) last.items.push(s)
    else list.push({ label, items: [s] })
    return list
  }, [])

  return (
    <div className="space-y-12">
      <section className="mx-auto max-w-3xl space-y-4 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Praktisk tentamen · Termin 3</p>
        <h1 className="text-balance text-4xl font-bold tracking-tight md:text-5xl">OSCE-simulatorn</h1>
        <p className="mx-auto max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
          Undersök en virtuell patient, lyssna med stetoskopet, koppla EKG och gör HLR – och bli bedömd mot samma protokoll som examinatorerna använder.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Timer className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Full simulering</h2>
            <p className="text-sm text-muted-foreground">4 stationer à 10 minuter med visselsignaler, slumpade eller från en gammal tenta. Betygsrapport och genomgång i slutet. Godkänt vid 30 av 40 p.</p>
          </div>
          <div className="mt-auto flex flex-wrap gap-2">
            <Button asChild className="gap-2">
              <Link href="/osce/simulering">
                Slumpad tenta <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <a href="#tentor">Välj en gammal tenta</a>
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Dumbbell className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Fri övning</h2>
            <p className="text-sm text-muted-foreground">Välj ett moment, till exempel hjärtstatus eller HLR, och träna i egen takt med facit och förklaringar direkt.</p>
          </div>
          <Button asChild variant="outline" className="mt-auto gap-2 self-start">
            <a href="#stationer">
              Välj station <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
            <ListChecks className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Alla frågor</h2>
            <p className="text-sm text-muted-foreground">Bläddra bland alla gamla praktiska frågor som på teoridelen. Sortera, sök och se svaren direkt.</p>
          </div>
          <Button asChild variant="outline" className="mt-auto gap-2 self-start">
            <Link href="/osce/fragor">
              Se alla frågor <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section id="tentor" className="scroll-mt-24 space-y-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Gör en gammal tenta</h2>
          <p className="text-sm text-muted-foreground">Välj en tenta och gör exakt de fyra stationer som kom då, med klocka och resultat.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {OSCE_PERIODS.map(p => (
            <div key={p} className="space-y-2 rounded-xl border border-border bg-card p-3">
              <h3 className="text-lg font-bold">{p}</h3>
              {sittings
                .filter(x => x.stations[0].exam.period === p)
                .map(x => {
                  const { type, session } = x.stations[0].exam
                  return (
                    <Link
                      key={x.key}
                      href={`/osce/simulering?tenta=${x.key}`}
                      className="group flex items-center gap-2 rounded-lg border border-border px-3 py-2 transition-colors hover:border-foreground/30 hover:bg-secondary/60"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{type === "omtenta" ? "Omtenta" : `Ordinarie ${session}`}</span>
                        <span className="block truncate text-xs text-muted-foreground">{x.stations.map(st => st.theme).join(" · ")}</span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  )
                })}
            </div>
          ))}
        </div>
      </section>

      <section id="stationer" className="scroll-mt-24 space-y-5">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Stationer</h2>
          <p className="text-sm text-muted-foreground">{ALL_STATIONS.length} stationer från ordinarie tentor och omtentor HT24–VT26, senaste tentan först.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={period === "all" ? "default" : "outline"} onClick={() => setPeriod("all")}>
            Alla tentor
          </Button>
          {OSCE_PERIODS.map(p => (
            <Button key={p} size="sm" variant={period === p ? "default" : "outline"} onClick={() => setPeriod(p)}>
              {p}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "Alla typer"],
              ["ordinarie", "Ordinarie"],
              ["omtenta", "Omtenta"],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              size="sm"
              variant={examType === id ? "default" : "outline"}
              onClick={() => {
                setExamType(id)
                // Omtentor har inget fm/em
                if (id === "omtenta") setSession("all")
              }}
            >
              {label}
            </Button>
          ))}
          <div className="mx-1 w-px bg-border" />
          {(
            [
              ["all", "Fm och em"],
              ["fm", "Fm"],
              ["em", "Em"],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              size="sm"
              variant={session === id ? "default" : "outline"}
              onClick={() => {
                setSession(id)
                if (id !== "all" && examType === "omtenta") setExamType("all")
              }}
            >
              {label}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={theme === "all" ? "default" : "outline"} onClick={() => { setTheme("all"); setSkill(null) }}>
            Alla teman
          </Button>
          {OSCE_THEMES.map(t => {
            const Icon = THEME_ICON[t.id]
            return (
              <Button key={t.id} size="sm" variant={theme === t.id ? "default" : "outline"} onClick={() => { setTheme(t.id); setSkill(null) }} className="gap-1.5">
                <Icon className="h-4 w-4" /> {t.name}
              </Button>
            )
          })}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {skills.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setSkill(skill === s ? null : s)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                skill === s ? "border-accent bg-accent text-accent-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {s}
            </button>
          ))}
        </div>

        {groups.map(group => (
          <div key={group.label} className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {group.label} · {group.items.length} {group.items.length === 1 ? "station" : "stationer"}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map(s => {
                const Icon = THEME_ICON[s.theme]
                const interactive = s.items.some(i => i.kind === "tool" && INTERACTIVE.has(i.tool))
                return (
                  <Link
                    key={s.id}
                    href={`/osce/station/${s.id}`}
                    className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                        <Icon className="h-4 w-4" /> {s.theme}
                      </span>
                      {interactive && (
                        <Badge variant="secondary" className="gap-1 text-[10px]">
                          <Stethoscope className="h-3 w-3" /> Interaktiv
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold leading-snug">{s.title}</h3>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{s.scenario}</p>
                    <p className="mt-auto text-xs text-muted-foreground">{examLabel(s.exam)}</p>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
        {groups.length === 0 && <p className="text-sm text-muted-foreground">Inga stationer matchar filtret.</p>}
      </section>
    </div>
  )
}
