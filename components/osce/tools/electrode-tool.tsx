"use client"

import { useRef, useState } from "react"
import { Check, ScanLine, Grid3x3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ELECTRODE_TARGETS, dist, type Point } from "@/lib/osce/anatomy"
import { PatientView, type PatientMarker } from "../patient-view"
import type { ToolProps } from "./tool-props"

const COLORS: Record<string, string> = {
  V1: "#ef4444",
  V2: "#eab308",
  V3: "#22c55e",
  V4: "#a16207",
  V5: "#111827",
  V6: "#a855f7",
}

const TOLERANCE = 13

export function ElectrodeTool({ item, onAchieve, exam, locked }: ToolProps) {
  const leads: string[] = item.config?.leads ?? ["V1", "V2", "V3", "V4", "V5", "V6"]
  const [placed, setPlaced] = useState<Record<string, Point>>({})
  const [selected, setSelected] = useState<string>(leads[0])
  const [submitted, setSubmitted] = useState(false)
  const [xray, setXray] = useState(false)
  const [guides, setGuides] = useState(false)
  const dragging = useRef<string | null>(null)

  const disabled = locked || submitted

  const placeLead = (lead: string, p: Point) => {
    setPlaced(prev => ({ ...prev, [lead]: p }))
  }

  const onDown = (p: Point) => {
    if (disabled) return
    // Tog man tag i en redan placerad elektrod?
    const hit = Object.entries(placed).find(([, q]) => dist(p, q) < 12)
    if (hit) {
      dragging.current = hit[0]
      setSelected(hit[0])
      return
    }
    placeLead(selected, p)
    dragging.current = selected
    // Gå vidare till nästa oplacerade elektrod
    const next = leads.find(l => l !== selected && !placed[l])
    if (next) window.setTimeout(() => setSelected(next), 0)
  }

  const evaluate = () => {
    const ok = (lead: string, tol = TOLERANCE) => placed[lead] && dist(placed[lead], ELECTRODE_TARGETS[lead]) < tol
    const ids: string[] = []
    if (leads.length === 4) {
      if (ok("V1")) ids.push("el-v1")
      if (ok("V2")) ids.push("el-v2")
      if (ok("V4")) ids.push("el-v4")
      if (placed.V3 && placed.V2 && placed.V4) {
        const mid = { x: (placed.V2.x + placed.V4.x) / 2, y: (placed.V2.y + placed.V4.y) / 2 }
        if (dist(placed.V3, mid) < TOLERANCE && ok("V2", 20) && ok("V4", 20)) ids.push("el-v3")
      }
    } else {
      if (ok("V1") && ok("V2")) ids.push("el-v1v2")
      if (ok("V4")) ids.push("el-v4")
      if (placed.V3 && placed.V2 && placed.V4) {
        const mid = { x: (placed.V2.x + placed.V4.x) / 2, y: (placed.V2.y + placed.V4.y) / 2 }
        if (dist(placed.V3, mid) < TOLERANCE && ok("V2", 20) && ok("V4", 20)) ids.push("el-v3-line")
      }
      if (ok("V5", 16) && ok("V6", 16)) ids.push("el-v5v6")
      if (placed.V4 && placed.V5 && placed.V6 && Math.abs(placed.V5.y - placed.V4.y) < 9 && Math.abs(placed.V6.y - placed.V4.y) < 9 && ok("V4", 20)) {
        ids.push("el-v4v6-line")
      }
    }
    setSubmitted(true)
    if (ids.length) onAchieve(ids)
  }

  const allPlaced = leads.every(l => placed[l])
  const showTargets = submitted && !exam
  const markers: PatientMarker[] = [
    ...(showTargets ? leads.map(l => ({ kind: "ring" as const, p: ELECTRODE_TARGETS[l], color: "#10b981", label: l, dashed: true })) : []),
    ...Object.entries(placed).map(([l, p]) => ({ kind: "electrode" as const, p, label: l, color: COLORS[l] })),
  ]

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <PatientView
        xray={xray}
        guides={guides && !exam}
        markers={markers}
        onPoint={(p, phase) => {
          if (phase === "down") onDown(p)
          else if (phase === "move" && dragging.current && !disabled) placeLead(dragging.current, p)
          else if (phase === "up") dragging.current = null
        }}
        ariaLabel="Patient för placering av EKG-elektroder"
      />

      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">Välj en elektrod och tryck där den ska sitta. Dra en placerad elektrod för att flytta den.</p>
        <div className="flex flex-wrap gap-2">
          {leads.map(l => (
            <button
              key={l}
              type="button"
              disabled={disabled}
              onClick={() => setSelected(l)}
              className={cn(
                "flex h-10 min-w-12 items-center justify-center gap-1.5 rounded-full border-2 px-3 text-sm font-semibold transition-all",
                selected === l ? "border-foreground bg-foreground text-background" : "border-border bg-card",
                disabled && "opacity-60",
              )}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[l] }} />
              {l}
              {placed[l] && <Check className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={xray ? "secondary" : "ghost"} onClick={() => setXray(x => !x)} className="gap-1.5">
            <ScanLine className="h-4 w-4" /> Röntgenvy
          </Button>
          {!exam && (
            <Button size="sm" variant={guides ? "secondary" : "ghost"} onClick={() => setGuides(g => !g)} className="gap-1.5">
              <Grid3x3 className="h-4 w-4" /> Hjälplinjer
            </Button>
          )}
        </div>
        <Button onClick={evaluate} disabled={!allPlaced || disabled} className="self-start">
          {submitted ? "Placering registrerad" : "Jag är klar med placeringen"}
        </Button>
        {showTargets && <p className="text-xs text-muted-foreground">Gröna ringar visar korrekta lägen.</p>}
      </div>
    </div>
  )
}
