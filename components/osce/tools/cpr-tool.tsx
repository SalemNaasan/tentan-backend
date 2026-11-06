"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Phone, Zap, Wind, HeartPulse, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AED_ZONES, CPR_HAND_ZONE, inZone, type Point } from "@/lib/osce/anatomy"
import { PatientView } from "../patient-view"
import { CompressionPad, useCompressionCounter } from "./compression-pad"
import type { ToolProps } from "./tool-props"

// Vuxen-HLR som ett förlopp: konstatera hjärtstopp → larma → 30:2 → hjärtstartare → stabilt sidoläge.

type Phase = "scene" | "hands" | "compress" | "breaths" | "pads" | "aed" | "rosc" | "done"
type LogEntry = { who: "scene" | "you" | "aed"; text: string }

const DEPTHS = ["2–3 cm", "5–6 cm", "8–10 cm"]

export function CprTool({ onAchieve, exam, locked }: ToolProps) {
  const [phase, setPhase] = useState<Phase>("scene")
  const [log, setLog] = useState<LogEntry[]>([
    { who: "scene", text: "Personen ligger på rygg på marken och rör sig inte." },
  ])
  const [flags, setFlags] = useState({ consc: false, airway: false, breathing: false, called: false, bystander: false, fetched: false, aedHere: false })
  const [depth, setDepth] = useState<string | null>(null)
  const [hands, setHands] = useState<Point | null>(null)
  const [cycles, setCycles] = useState(0)
  const [breathCount, setBreathCount] = useState(0)
  const [maskOk, setMaskOk] = useState<boolean | null>(null)
  const [askEval, setAskEval] = useState(false)
  const [pads, setPads] = useState<Point[]>([])
  const [aedState, setAedState] = useState<"analyse" | "charge" | "shock" | "resume">("analyse")
  const comp = useCompressionCounter()

  const track = useRef({ rates: [] as number[], firstCycleCount: 0, goodCycles: 0, lastCompression: 0, slowSwitch: false })
  const disabled = locked || phase === "done"

  const say = useCallback((entry: LogEntry) => setLog(l => [...l, entry]), [])
  const achieve = useCallback((ids: string[]) => !locked && onAchieve(ids), [locked, onAchieve])

  // Händelser som styrs av antal cykler
  useEffect(() => {
    if (cycles === 1 && !flags.bystander) {
      setFlags(f => ({ ...f, bystander: true }))
      say({ who: "scene", text: "En person kommer förbi och frågar om hen kan hjälpa till med något." })
    }
    if (cycles >= 4 && phase === "compress" && comp.count === 0) {
      if (track.current.goodCycles >= 4 && !track.current.slowSwitch) achieve(["cpr-cycles"])
      if (flags.fetched) {
        setFlags(f => ({ ...f, aedHere: true }))
        say({ who: "scene", text: "Personen kommer tillbaka med en hjärtstartare och slår på den." })
        setPhase("pads")
      } else {
        say({ who: "scene", text: "Personen hostar till och du uppfattar att hen andas. Larmoperatören säger att ambulansen är på plats om några minuter." })
        setPhase("rosc")
      }
    }
  }, [cycles, phase, comp.count, flags.bystander, flags.fetched, say, achieve])

  const sceneAction = (id: string) => {
    if (disabled) return
    switch (id) {
      case "consc":
        setFlags(f => ({ ...f, consc: true }))
        say({ who: "you", text: "Ropar och ruskar personen i axlarna." })
        say({ who: "scene", text: "Ingen reaktion." })
        if (phase === "scene") achieve(["cpr-consc"])
        break
      case "airway":
        setFlags(f => ({ ...f, airway: true }))
        say({ who: "you", text: "Gör huvudböjning–haklyft för att skapa fri luftväg." })
        if (phase === "scene") achieve(["cpr-airway"])
        break
      case "breathing":
        setFlags(f => ({ ...f, breathing: true }))
        say({ who: "you", text: "Tittar, lyssnar och känner efter andning i högst 10 sekunder." })
        say({ who: "scene", text: "Ingen normal andning – bara enstaka snappande andetag." })
        if (phase === "scene") achieve(["cpr-breathing"])
        break
      case "112":
        setFlags(f => ({ ...f, called: true }))
        say({ who: "you", text: "Ringer 112 och sätter telefonen på högtalare." })
        say({ who: "scene", text: "SOS Alarm: 'Ambulans är på väg. Starta hjärt-lungräddning.'" })
        achieve(["cpr-112"])
        break
      case "fetch":
        if (flags.bystander) {
          setFlags(f => ({ ...f, fetched: true }))
          say({ who: "you", text: "Ber personen hämta närmaste hjärtstartare och komma tillbaka." })
          achieve(["cpr-aed-fetch"])
        } else {
          say({ who: "scene", text: "Det finns ingen här att fråga ännu." })
        }
        break
      case "pulse":
        say({ who: "you", text: "Känner efter puls på halsen i 30 sekunder." })
        say({ who: "scene", text: exam ? "Du känner ingen säker puls." : "Pulskontroll är osäker även för vana och fördröjer HLR – lekmän ska inte leta puls." })
        break
      case "legs":
        say({ who: "you", text: "Lyfter upp benen." })
        say({ who: "scene", text: exam ? "Ingen förändring." : "Det hjälper inte vid hjärtstopp – tiden behövs för kompressioner." })
        break
      case "start":
        say({ who: "you", text: "Påbörjar hjärt-lungräddning." })
        setPhase("hands")
        break
    }
  }

  const onTorso = (p: Point) => {
    if (disabled) return
    if (phase === "hands") {
      setHands(p)
      const ok = inZone(p, CPR_HAND_ZONE)
      if (ok) achieve(["cpr-hands"])
      say({ who: "you", text: "Placerar händerna på bröstkorgen." })
      if (!exam && !ok) say({ who: "scene", text: "Händerna ska ligga mitt på bröstet – på nedre halvan av bröstbenet." })
      setPhase("compress")
    } else if (phase === "pads") {
      const next = [...pads, p]
      setPads(next)
      if (next.length === 2) {
        const okA = next.some(q => inZone(q, AED_ZONES.right))
        const okB = next.some(q => inZone(q, AED_ZONES.left))
        if (okA && okB) achieve(["cpr-pads"])
        say({ who: "you", text: "Fäster hjärtstartarens plattor på bar hud." })
        setPhase("aed")
        setAedState("analyse")
        say({ who: "aed", text: "Analyserar hjärtrytmen. Rör inte patienten." })
        window.setTimeout(() => {
          setAedState("charge")
          say({ who: "aed", text: "Stöt rekommenderas. Laddar. Håll undan från patienten." })
          window.setTimeout(() => {
            setAedState("shock")
            say({ who: "aed", text: "Tryck på den blinkande knappen nu." })
          }, 1600)
        }, 2200)
      }
    }
  }

  const compress = useCallback(() => {
    if (phase !== "compress" || disabled) return
    const t = track.current
    if (comp.count === 0 && t.lastCompression && performance.now() - t.lastCompression > 12000) t.slowSwitch = true
    t.lastCompression = comp.press()
    if (comp.count + 1 >= 30) {
      // Kort fördröjning så att 30:e trycket hinner registreras
      window.setTimeout(() => {
        const avg = comp.averageRate()
        if (avg) t.rates.push(avg)
        if (cycles === 0) t.firstCycleCount = 30
        setPhase("breaths")
        setBreathCount(0)
      }, 150)
    }
  }, [phase, disabled, comp, cycles])

  const giveBreath = (technique: "mask" | "none") => {
    if (disabled) return
    if (breathCount === 0 && maskOk === null) {
      setMaskOk(technique === "mask")
      if (technique === "mask") achieve(["cpr-mask"])
    }
    const n = breathCount + 1
    setBreathCount(n)
    say({ who: "you", text: technique === "mask" ? `Inblåsning ${n} med pocketmask och fri luftväg.` : `Inblåsning ${n} utan att öppna luftvägen.` })
    if (technique === "none" && !exam) say({ who: "scene", text: "Luften går ner i magen – bröstkorgen höjs inte." })
    if (n === 2) {
      if (cycles === 0) {
        achieve(["cpr-2breaths"])
        setAskEval(true)
      } else finishCycle()
    }
  }

  const finishCycle = () => {
    const t = track.current
    const lastRate = t.rates[t.rates.length - 1] ?? 0
    if (lastRate >= 95 && lastRate <= 125) t.goodCycles += 1
    if (cycles === 0) {
      const avgRate = t.rates.reduce((a, b) => a + b, 0) / t.rates.length
      if (t.firstCycleCount === 30) achieve(["cpr-30"])
      if (depth === "5–6 cm" && avgRate >= 95 && avgRate <= 125) achieve(["cpr-rate"])
    }
    comp.reset()
    setCycles(c => c + 1)
    setPhase("compress")
  }

  const answerEval = (ok: boolean) => {
    setAskEval(false)
    if (ok) achieve(["cpr-eval"])
    say({ who: "you", text: ok ? "Ser att bröstkorgen höjs vid varje inblåsning." : "Fortsätter utan att bedöma effekten." })
    finishCycle()
  }

  const shock = () => {
    setAedState("resume")
    say({ who: "aed", text: "Stöt given. Påbörja hjärt-lungräddning." })
    window.setTimeout(() => {
      say({ who: "scene", text: "Efter en stund hostar personen till och börjar andas normalt. Ambulansen är på plats om några minuter." })
      setPhase("rosc")
    }, 1800)
  }

  const recovery = (choice: "side" | "continue" | "sit") => {
    if (choice === "side") {
      achieve(["cpr-recovery"])
      say({ who: "you", text: "Lägger personen i stabilt sidoläge och övervakar andningen tills ambulansen kommer." })
    } else {
      say({ who: "you", text: choice === "continue" ? "Fortsätter kompressionerna." : "Hjälper personen att sätta sig upp." })
    }
    setPhase("done")
  }

  const sceneButtons = [
    { id: "consc", label: "Ropa och ruska", icon: UserRound },
    { id: "airway", label: "Huvudböjning–haklyft", icon: Wind },
    { id: "breathing", label: "Kontrollera andning", icon: Wind },
    { id: "112", label: "Larma 112", icon: Phone },
    { id: "pulse", label: "Känn efter puls i 30 s", icon: HeartPulse },
    { id: "legs", label: "Lyft upp benen", icon: UserRound },
  ]

  const torsoActive = phase === "hands" || phase === "pads"

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <div className="space-y-2">
        <PatientView
          highlight={torsoActive}
          markers={[
            ...(hands ? [{ kind: "cpr-hands" as const, p: hands }] : []),
            ...pads.map((p, i) => ({ kind: "pad" as const, p, index: i })),
          ]}
          onPoint={(p, phase) => phase === "down" && onTorso(p)}
          ariaLabel="HLR-docka"
        />
        {phase === "hands" && <p className="text-center text-sm font-medium text-accent">Tryck där du placerar händerna.</p>}
        {phase === "pads" && <p className="text-center text-sm font-medium text-accent">Placera hjärtstartarens två plattor ({pads.length}/2).</p>}
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-lg border border-border bg-card p-3 text-sm" aria-live="polite">
          {log.map((e, i) => (
            <p
              key={i}
              className={cn(
                e.who === "you" && "pl-4 text-foreground",
                e.who === "scene" && "font-medium text-foreground",
                e.who === "aed" && "font-mono text-amber-700 dark:text-amber-400",
              )}
            >
              {e.who === "you" ? "→ " : e.who === "aed" ? "🔊 " : ""}
              {e.text}
            </p>
          ))}
        </div>

        {(phase === "scene" || phase === "compress" || phase === "breaths") && (
          <div className="flex flex-wrap gap-2">
            {phase === "scene" &&
              sceneButtons.map(b => (
                <Button key={b.id} size="sm" variant="outline" onClick={() => sceneAction(b.id)} disabled={disabled} className="gap-1.5">
                  <b.icon className="h-4 w-4" /> {b.label}
                </Button>
              ))}
            {phase !== "scene" && !flags.called && (
              <Button size="sm" variant="outline" onClick={() => sceneAction("112")} className="gap-1.5">
                <Phone className="h-4 w-4" /> Larma 112
              </Button>
            )}
            {flags.bystander && !flags.fetched && (
              <Button size="sm" variant="outline" onClick={() => sceneAction("fetch")} className="gap-1.5">
                <Zap className="h-4 w-4" /> Be personen hämta hjärtstartare
              </Button>
            )}
            {phase === "scene" && (
              <Button size="sm" onClick={() => sceneAction("start")} className="gap-1.5">
                <HeartPulse className="h-4 w-4" /> Starta HLR
              </Button>
            )}
          </div>
        )}

        {phase === "compress" && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="text-muted-foreground">Kompressionsdjup:</span>
              {DEPTHS.map(d => (
                <Button key={d} size="sm" variant={depth === d ? "secondary" : "ghost"} onClick={() => setDepth(d)} disabled={disabled}>
                  {d}
                </Button>
              ))}
            </div>
            <CompressionPad count={comp.count} target={30} rate={comp.rate} onPress={compress} disabled={disabled || depth === null} showRate={!exam} />
            <p className="text-xs text-muted-foreground">Cykel {cycles + 1}{depth === null ? " · välj djup först" : ""}</p>
          </div>
        )}

        {phase === "breaths" && !askEval && (
          <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
            <p className="text-sm font-medium">Inblåsningar ({breathCount}/2)</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => giveBreath("mask")} disabled={disabled}>
                Huvudböjning–haklyft + pocketmask över mun och näsa
              </Button>
              <Button size="sm" variant="outline" onClick={() => giveBreath("none")} disabled={disabled}>
                Blås direkt utan att böja huvudet
              </Button>
            </div>
          </div>
        )}

        {askEval && (
          <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
            <p className="text-sm font-medium">Hur värderar du effekten av inblåsningarna?</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => answerEval(true)}>
                Tittar på att bröstkorgen höjs
              </Button>
              <Button size="sm" variant="outline" onClick={() => answerEval(false)}>
                Lyssnar efter ljud från magen
              </Button>
              <Button size="sm" variant="outline" onClick={() => answerEval(false)}>
                Ingen bedömning – fortsätter direkt
              </Button>
            </div>
          </div>
        )}

        {phase === "aed" && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:bg-amber-950/30">
            <Zap className="h-6 w-6 text-amber-600" />
            <span className="text-sm font-medium">
              {aedState === "analyse" ? "Analyserar…" : aedState === "charge" ? "Laddar…" : aedState === "shock" ? "Klar för stöt" : "Stöt given"}
            </span>
            <Button size="sm" className="ml-auto bg-amber-500 text-white hover:bg-amber-600" disabled={aedState !== "shock"} onClick={shock}>
              Ge stöt
            </Button>
          </div>
        )}

        {phase === "rosc" && (
          <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
            <p className="text-sm font-medium">Personen andas normalt. Vad gör du nu?</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => recovery("side")}>
                Stabilt sidoläge och övervakar andningen
              </Button>
              <Button size="sm" variant="outline" onClick={() => recovery("continue")}>
                Fortsätter bröstkompressionerna
              </Button>
              <Button size="sm" variant="outline" onClick={() => recovery("sit")}>
                Hjälper personen att sitta upp
              </Button>
            </div>
          </div>
        )}

        {phase === "done" && <p className="text-sm font-medium text-muted-foreground">Ambulansen anländer och tar över.</p>}
      </div>
    </div>
  )
}
