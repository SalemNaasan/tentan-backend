"use client"

import { useCallback, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CompressionPad, useCompressionCounter } from "./compression-pad"
import type { ToolProps } from "./tool-props"

// Luftvägsstopp hos litet barn som övergår i barn-HLR (5 inblåsningar, sedan 15:2).

type Step = "conscious" | "unconscious-breaths" | "compress" | "breaths" | "done"

export function ChokingTool({ onAchieve, exam, locked }: ToolProps) {
  const [step, setStep] = useState<Step>("conscious")
  const [log, setLog] = useState<string[]>(["Barnet hostar svagt och orkar inte få upp föremålet själv."])
  const [series, setSeries] = useState<{ kind: "back" | "chest"; n: number } | null>(null)
  const [done, setDone] = useState<string[]>([])
  const [checks, setChecks] = useState(0)
  const [rescueBreaths, setRescueBreaths] = useState(0)
  const [technique, setTechnique] = useState<"fingers" | "palm" | null>(null)
  const [cycleBreaths, setCycleBreaths] = useState(0)
  const [cycles, setCycles] = useState(0)
  const comp = useCompressionCounter()
  const disabled = locked || step === "done"

  const say = (t: string) => setLog(l => [...l, t])
  const achieve = useCallback((ids: string[]) => !locked && onAchieve(ids), [locked, onAchieve])

  /** Sekvensen som protokollet förväntar sig: rygg, bröst, kontroll, rygg, bröst */
  const conscious = (action: "back" | "chest" | "check" | "abdominal" | "sweep") => {
    if (disabled) return
    if (action === "abdominal") {
      say("→ Ger buktryck.")
      if (!exam) say("Buktryck ges inte till spädbarn och små barn – risk för skador på levern. Använd brösttryck.")
      return
    }
    if (action === "sweep") {
      say("→ Sveper blint med fingret i munnen.")
      if (!exam) say("Blind fingersvepning kan trycka ner föremålet längre. Ta bara bort det du ser.")
      return
    }
    if (action === "check") {
      const next = checks + 1
      setChecks(next)
      say("→ Kontrollerar munnen och om barnet är vid medvetande.")
      if (done.includes("chest1") && !done.includes("check")) {
        setDone(d => [...d, "check"])
        achieve(["ch-check"])
      }
      if (done.includes("chest2")) {
        say("Barnet tappar tonus, reagerar inte när du ruskar och du uppfattar ingen andning.")
        setStep("unconscious-breaths")
      } else {
        say("Föremålet har inte kommit upp. Barnet är fortfarande vaket men orkar knappt hosta.")
      }
      return
    }
    // Serie med 5 slag/tryck – räknas tryck för tryck
    const current = series?.kind === action ? series.n + 1 : 1
    setSeries({ kind: action, n: current })
    if (current === 5) {
      const key = action === "back" ? (done.includes("back1") ? "back2" : "back1") : done.includes("chest1") ? "chest2" : "chest1"
      const order = ["back1", "chest1", "check", "back2", "chest2"]
      const expectedBefore = order.slice(0, order.indexOf(key))
      if (expectedBefore.every(k => done.includes(k) || k === "check")) achieve([`ch-${key}`])
      setDone(d => [...d, key])
      say(action === "back" ? "→ 5 ryggdunk mellan skulderbladen med barnet framåtlutat." : "→ 5 brösttryck på nedre delen av bröstbenet.")
      setSeries(null)
    }
  }

  const rescueBreath = () => {
    const n = rescueBreaths + 1
    setRescueBreaths(n)
    if (n === 5) {
      achieve(["ch-5breaths"])
      say("→ 5 inblåsningar med lätt huvudböjning; du ser att bröstkorgen höjs något.")
      setStep("compress")
    }
  }

  const compress = useCallback(() => {
    if (step !== "compress" || disabled) return
    comp.press()
    if (comp.count + 1 >= 15) {
      window.setTimeout(() => {
        const rate = comp.averageRate() ?? 0
        if (cycles === 0 && technique === "fingers" && rate >= 95 && rate <= 125) achieve(["ch-15comp"])
        setCycleBreaths(0)
        setStep("breaths")
      }, 120)
    }
  }, [step, disabled, comp, cycles, technique, achieve])

  const cycleBreath = () => {
    const n = cycleBreaths + 1
    setCycleBreaths(n)
    if (n === 2) {
      const c = cycles + 1
      setCycles(c)
      comp.reset()
      if (c >= 4) {
        achieve(["ch-cycles"])
        say("→ 4 cykler barn-HLR 15:2 genomförda. Ambulansen anländer.")
        setStep("done")
      } else setStep("compress")
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-lg border border-border bg-card p-3 text-sm" aria-live="polite">
        {log.map((l, i) => (
          <p key={i} className={cn(l.startsWith("→") ? "pl-2" : "font-medium")}>
            {l}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {step === "conscious" && (
          <>
            <p className="text-sm text-muted-foreground">Varje klick är ett slag/tryck. {series ? `${series.kind === "back" ? "Ryggdunk" : "Brösttryck"}: ${series.n}/5` : ""}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => conscious("back")} disabled={disabled}>
                Ryggdunk
              </Button>
              <Button variant="outline" onClick={() => conscious("chest")} disabled={disabled}>
                Brösttryck
              </Button>
              <Button variant="outline" onClick={() => conscious("check")} disabled={disabled}>
                Kontrollera mun och medvetande
              </Button>
              <Button variant="ghost" onClick={() => conscious("abdominal")} disabled={disabled}>
                Buktryck
              </Button>
              <Button variant="ghost" onClick={() => conscious("sweep")} disabled={disabled}>
                Blind fingersvepning
              </Button>
            </div>
          </>
        )}

        {step === "unconscious-breaths" && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Barnet är medvetslöst och andas inte. Starta barn-HLR.</p>
            <Button onClick={rescueBreath} disabled={disabled}>
              Inblåsning ({rescueBreaths}/5)
            </Button>
          </div>
        )}

        {step === "compress" && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex flex-wrap justify-center gap-2 text-sm">
              <span className="self-center text-muted-foreground">Teknik:</span>
              <Button size="sm" variant={technique === "fingers" ? "secondary" : "ghost"} onClick={() => setTechnique("fingers")}>
                Två fingrar / tumgrepp
              </Button>
              <Button size="sm" variant={technique === "palm" ? "secondary" : "ghost"} onClick={() => setTechnique("palm")}>
                Två händer som på vuxen
              </Button>
            </div>
            <CompressionPad count={comp.count} target={15} rate={comp.rate} onPress={compress} disabled={disabled || technique === null} showRate={!exam} />
            <p className="text-xs text-muted-foreground">Cykel {cycles + 1} av 4</p>
          </div>
        )}

        {step === "breaths" && (
          <Button onClick={cycleBreath} disabled={disabled}>
            Inblåsning ({cycleBreaths}/2)
          </Button>
        )}
      </div>
    </div>
  )
}
