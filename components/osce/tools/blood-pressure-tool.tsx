"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { Hand, Stethoscope, Wind } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import { playKorotkoff, playPumpSqueeze, getAudioContext } from "@/lib/osce/audio"
import type { ToolProps } from "./tool-props"

const ArmScene = dynamic(() => import("../three/arm-scene"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-xl bg-slate-800" />,
})

// Blodtrycksmätning: manschettval, armposition, palpatoriskt tryck, pump/ventil och Korotkoffljud.

type Method = "palpate" | "listen"
const CUFFS = [
  { width: 9, label: "9 cm rak" },
  { width: 12, label: "12 cm rak" },
  { width: 14, label: "14 cm konisk" },
]
const BPM = 72

function Manometer({ pressure }: { pressure: number }) {
  const angle = -225 + (Math.min(300, pressure) / 300) * 270
  const ticks = Array.from({ length: 31 }, (_, i) => i * 10)
  return (
    <svg viewBox="0 0 200 200" className="h-28 w-28 md:h-32 md:w-32" role="img" aria-label={`Manometer ${Math.round(pressure)} mmHg`}>
      <circle cx={100} cy={100} r={94} fill="#f8fafc" stroke="#334155" strokeWidth={4} />
      {ticks.map(t => {
        const a = ((-225 + (t / 300) * 270) * Math.PI) / 180
        const major = t % 20 === 0
        const r1 = major ? 72 : 78
        return (
          <g key={t}>
            <line x1={100 + Math.cos(a) * r1} y1={100 + Math.sin(a) * r1} x2={100 + Math.cos(a) * 86} y2={100 + Math.sin(a) * 86} stroke="#334155" strokeWidth={major ? 2 : 1} />
            {t % 40 === 0 && (
              <text x={100 + Math.cos(a) * 60} y={100 + Math.sin(a) * 60 + 4} fontSize={11} textAnchor="middle" fill="#334155">
                {t}
              </text>
            )}
          </g>
        )
      })}
      <text x={100} y={140} fontSize={10} textAnchor="middle" fill="#64748b">
        mmHg
      </text>
      <line
        x1={100}
        y1={100}
        x2={100 + Math.cos((angle * Math.PI) / 180) * 78}
        y2={100 + Math.sin((angle * Math.PI) / 180) * 78}
        stroke="#dc2626"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <circle cx={100} cy={100} r={6} fill="#334155" />
    </svg>
  )
}

export function BloodPressureTool({ item, onAchieve, exam, locked }: ToolProps) {
  const cfg = item.config ?? {}
  const armCircumference: number = cfg.armCircumference ?? 29
  const trueSys: number = cfg.sys ?? 148
  const trueDia: number = cfg.dia ?? 86
  const gap: [number, number] = cfg.silentGap ?? [136, 122]

  const [cuff, setCuff] = useState<number | null>(null)
  const [armAtHeart, setArmAtHeart] = useState<boolean | null>(null)
  const [method, setMethod] = useState<Method>("palpate")
  const [pressure, setPressure] = useState(0)
  const [rate, setRate] = useState(0)
  const [pulseFelt, setPulseFelt] = useState(true)
  const [beat, setBeat] = useState(0)
  const [palpValue, setPalpValue] = useState<number | null>(null)
  const [sysValue, setSysValue] = useState<number | null>(null)
  const [diaValue, setDiaValue] = useState<number | null>(null)
  const [done, setDone] = useState(false)
  const [log, setLog] = useState<string[]>([])

  const pressureRef = useRef(0)
  const rateRef = useRef(0)
  const track = useRef({
    cuffAtStart: null as number | null,
    armAtStart: null as boolean | null,
    palpBeforeListen: false,
    listenedYet: false,
    maxListenPressure: 0,
    rateSamples: [] as number[],
  })

  const disabled = locked || done

  // Effektivt tryck i artären som manschetten "ser" – påverkas av fel manschett och armposition
  const offset = (cuff === 9 ? 10 : cuff === 14 ? -8 : 0) + (armAtHeart === false ? 8 : 0)
  const effSys = trueSys + offset
  const effDia = trueDia + offset

  // Deflation
  useEffect(() => {
    rateRef.current = rate
  }, [rate])

  useEffect(() => {
    let last = performance.now()
    const id = window.setInterval(() => {
      const now = performance.now()
      const dt = (now - last) / 1000
      last = now
      const p = pressureRef.current
      if (p > 0 && rateRef.current > 0) {
        const next = Math.max(0, p - rateRef.current * dt)
        pressureRef.current = next
        setPressure(next)
        if (next < effSys + 5 && next > effDia - 5 && track.current.listenedYet) track.current.rateSamples.push(rateRef.current)
      }
    }, 50)
    return () => window.clearInterval(id)
  }, [effSys, effDia])

  // Hjärtslag: puls i a. radialis eller Korotkoffljud
  useEffect(() => {
    const id = window.setInterval(() => {
      setBeat(b => b + 1)
      const p = pressureRef.current
      const felt = p < effSys
      setPulseFelt(felt)
      if (method === "listen" && p > 0) {
        const inGap = p < gap[0] + offset && p > gap[1] + offset
        if (p < effSys && p > effDia && !inGap) {
          const phase = p > effSys - 14 ? 1 : p > effSys - 30 ? 2 : p > effDia + 10 ? 3 : 4
          playKorotkoff(phase as 1 | 2 | 3 | 4)
        }
      }
    }, 60000 / BPM)
    return () => window.clearInterval(id)
  }, [method, effSys, effDia, gap, offset])

  const note = (text: string) => setLog(l => [...l.slice(-5), text])

  const pump = () => {
    if (disabled) return
    getAudioContext()
    playPumpSqueeze()
    const t = track.current
    if (t.cuffAtStart === null) {
      t.cuffAtStart = cuff
      t.armAtStart = armAtHeart
    }
    const next = Math.min(300, pressureRef.current + 10)
    pressureRef.current = next
    setPressure(next)
    if (method === "listen") {
      t.listenedYet = true
      t.maxListenPressure = Math.max(t.maxListenPressure, next)
    }
  }

  const releaseAll = () => {
    pressureRef.current = 0
    setPressure(0)
    setRate(0)
  }

  const record = (kind: "palp" | "sys" | "dia") => {
    const v = Math.round(pressureRef.current / 2) * 2
    if (kind === "palp") {
      setPalpValue(v)
      if (!track.current.listenedYet) track.current.palpBeforeListen = true
      note(`Palpatoriskt systoliskt tryck: ${v} mmHg`)
    } else if (kind === "sys") {
      setSysValue(v)
      note(`Korotkoff I: ${v} mmHg`)
    } else {
      setDiaValue(v)
      note(`Korotkoff V: ${v} mmHg`)
    }
  }

  const finish = () => {
    const t = track.current
    const ids: string[] = []
    const correctCuff = Math.abs(armCircumference * 0.4 - 12) < 2.5 ? 12 : armCircumference * 0.4 > 13 ? 14 : 9
    if ((t.cuffAtStart ?? cuff) === correctCuff) ids.push("bp-cuff")
    if ((t.armAtStart ?? armAtHeart) === true) ids.push("bp-heart-level")
    if (t.palpBeforeListen) ids.push("bp-palp-first")
    if (palpValue !== null && Math.abs(palpValue - trueSys) <= 15) ids.push("bp-palp-value")
    const ref = palpValue ?? trueSys
    if (t.maxListenPressure >= ref + 25 && t.maxListenPressure <= ref + 55) ids.push("bp-inflation")
    const avg = t.rateSamples.length ? t.rateSamples.reduce((a, b) => a + b, 0) / t.rateSamples.length : 0
    if (avg >= 1.5 && avg <= 4) ids.push("bp-deflation")
    if (sysValue !== null && Math.abs(sysValue - trueSys) <= 10) ids.push("bp-sys")
    if (diaValue !== null && Math.abs(diaValue - trueDia) <= 10) ids.push("bp-dia")
    setDone(true)
    if (ids.length) onAchieve(ids)
    if (!exam) note(`Tentators värde: ${trueSys}/${trueDia} mmHg. Din deflationshastighet: ${avg.toFixed(1)} mmHg/s.`)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="relative h-[340px] md:h-[420px]">
        <ArmScene cuff={cuff} armAtHeart={armAtHeart} method={method} pressure={pressure} />
        <div className="pointer-events-none absolute bottom-2 right-2 flex flex-col items-center rounded-2xl bg-white/90 p-1.5 shadow-lg">
          <Manometer pressure={pressure} />
          <span className="font-mono text-xs tabular-nums text-slate-600">{Math.round(pressure)} mmHg</span>
        </div>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">1. Manschett <span className="font-normal text-muted-foreground">– armomkrets {armCircumference} cm (uppmätt med måttband)</span></p>
          <div className="flex flex-wrap gap-2">
            {CUFFS.map(c => (
              <Button key={c.width} size="sm" variant={cuff === c.width ? "default" : "outline"} onClick={() => setCuff(c.width)} disabled={disabled || pressure > 0}>
                {c.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">2. Armens position</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={armAtHeart === true ? "default" : "outline"} onClick={() => setArmAtHeart(true)} disabled={disabled}>
              Vilar på bordet i hjärthöjd
            </Button>
            <Button size="sm" variant={armAtHeart === false ? "default" : "outline"} onClick={() => setArmAtHeart(false)} disabled={disabled}>
              Hänger rakt ned
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">3. Mät</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={method === "palpate" ? "secondary" : "ghost"} onClick={() => setMethod("palpate")} disabled={disabled} className="gap-1.5">
              <Hand className="h-4 w-4" /> Palpera a. radialis
            </Button>
            <Button size="sm" variant={method === "listen" ? "secondary" : "ghost"} onClick={() => setMethod("listen")} disabled={disabled} className="gap-1.5">
              <Stethoscope className="h-4 w-4" /> Stetoskop över a. brachialis
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-3 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={pump} disabled={disabled || cuff === null} className="gap-1.5" onPointerDown={e => e.preventDefault()}>
              <Wind className="h-4 w-4" /> Pumpa (+10)
            </Button>
            <Button variant="outline" onClick={releaseAll} disabled={disabled}>
              Släpp ut all luft
            </Button>
            {cuff === null && <span className="text-xs text-muted-foreground">Välj manschett först.</span>}
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>Ventil (deflation)</span>
              <span>{rate === 0 ? "Stängd" : `${rate.toFixed(1)} mmHg/s`}</span>
            </div>
            <Slider value={[rate]} min={0} max={10} step={0.5} onValueChange={([v]) => setRate(v)} disabled={disabled} />
          </div>

          {method === "palpate" ? (
            <div className="flex items-center gap-3 text-sm">
              <span
                key={beat}
                className={cn("h-3 w-3 rounded-full", pulseFelt && pressure < 300 ? "animate-ping bg-rose-500" : "bg-muted-foreground/30")}
              />
              <span>{pulseFelt ? "Radialispulsen känns" : "Radialispulsen känns inte"}</span>
              <Button size="sm" variant="outline" className="ml-auto" onClick={() => record("palp")} disabled={disabled || pressure === 0}>
                Registrera palpatoriskt SBT
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Lyssna efter Korotkoffljud (använd hörlurar).</span>
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="outline" onClick={() => record("sys")} disabled={disabled || pressure === 0}>
                  Första ljudet
                </Button>
                <Button size="sm" variant="outline" onClick={() => record("dia")} disabled={disabled || pressure === 0}>
                  Ljuden försvann
                </Button>
              </div>
            </div>
          )}
        </div>

        {log.length > 0 && (
          <ul className="space-y-1 text-sm">
            {log.map((l, i) => (
              <li key={i} className="text-muted-foreground">• {l}</li>
            ))}
          </ul>
        )}

        <Button onClick={finish} disabled={disabled || sysValue === null || diaValue === null}>
          {done ? "Blodtrycket rapporterat" : `Rapportera blodtryck${sysValue && diaValue ? ` ${sysValue}/${diaValue}` : ""}`}
        </Button>
      </div>

    </div>
  )
}
