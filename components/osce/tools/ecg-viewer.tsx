"use client"

import { useMemo, useState } from "react"
import { Ruler, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ECG_CASES, LEADS, createEcg, type Lead } from "@/lib/osce/ecg"
import type { ToolProps } from "./tool-props"

// Kalibrerad EKG-visare: 25 mm/s, 10 mm/mV, millimeterrutnät och mätsticka.
const PX_PER_MM = 4
const SPEED = 25 // mm/s
const GAIN = 10 // mm/mV
const ROW_MM = 32
const LEFT_MM = 10
const WIDTH_MM = LEFT_MM + 250 + 4
const LAYOUT: Lead[][] = [
  ["I", "aVR", "V1", "V4"],
  ["II", "aVL", "V2", "V5"],
  ["III", "aVF", "V3", "V6"],
]

const mm = (v: number) => v * PX_PER_MM

function tracePath(fn: (t: number) => number, t0: number, t1: number, x0mm: number, baselineMm: number) {
  const step = 0.004
  let d = ""
  for (let t = t0; t <= t1 + 1e-9; t += step) {
    const x = mm(x0mm + (t - t0) * SPEED)
    const y = mm(baselineMm - fn(t) * GAIN)
    d += `${d ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`
  }
  return d
}

function calibration(xMm: number, baselineMm: number) {
  const x = mm(xMm)
  const b = mm(baselineMm)
  return `M${x},${b} L${x + mm(1)},${b} L${x + mm(1)},${b - mm(10)} L${x + mm(6)},${b - mm(10)} L${x + mm(6)},${b} L${x + mm(7)},${b}`
}

export function EcgViewer({ item }: ToolProps) {
  const ecgCase = ECG_CASES[item.config?.case ?? "sinus75"] ?? ECG_CASES.sinus75
  const voltage = useMemo(() => createEcg(ecgCase), [ecgCase])
  const [caliper, setCaliper] = useState<number[]>([])
  const [measuring, setMeasuring] = useState(false)

  const rows = LAYOUT.length + 1
  const heightMm = rows * ROW_MM + 6

  const paths = useMemo(() => {
    const out: { d: string; label: string; x: number; y: number }[] = []
    LAYOUT.forEach((row, r) => {
      const base = (r + 0.6) * ROW_MM
      row.forEach((lead, c) => {
        const t0 = c * 2.5
        out.push({
          d: tracePath(t => voltage(lead, t), t0, t0 + 2.5, LEFT_MM + t0 * SPEED, base),
          label: lead,
          x: mm(LEFT_MM + t0 * SPEED + 1.5),
          y: mm(base - 11),
        })
      })
    })
    const base = (LAYOUT.length + 0.6) * ROW_MM
    out.push({ d: tracePath(t => voltage("II", t), 0, 10, LEFT_MM, base), label: "II", x: mm(LEFT_MM + 1.5), y: mm(base - 11) })
    return out
  }, [voltage])

  const calibrations = Array.from({ length: rows }, (_, r) => calibration(1.5, (r + 0.6) * ROW_MM))

  const onClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!measuring) return
    const svg = e.currentTarget
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse())
    setCaliper(c => (c.length >= 2 ? [p.x] : [...c, p.x]))
  }

  const deltaMs = caliper.length === 2 ? (Math.abs(caliper[1] - caliper[0]) / PX_PER_MM / SPEED) * 1000 : null

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={measuring ? "default" : "outline"} className="gap-1.5" onClick={() => setMeasuring(m => !m)}>
          <Ruler className="h-4 w-4" /> Mätsticka
        </Button>
        {caliper.length > 0 && (
          <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => setCaliper([])}>
            <RotateCcw className="h-4 w-4" /> Nollställ
          </Button>
        )}
        <span className="text-xs text-muted-foreground">
          {measuring
            ? deltaMs !== null
              ? `Avstånd: ${Math.round(deltaMs)} ms${deltaMs > 250 ? ` · motsvarar ${Math.round(60000 / deltaMs)} slag/min` : ""}`
              : "Klicka på två punkter i EKG:t för att mäta tid."
            : "25 mm/s · 10 mm/mV · en liten ruta = 40 ms, en stor ruta = 200 ms"}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-rose-200 bg-[#fff8f6]">
        <svg
          width={mm(WIDTH_MM)}
          height={mm(heightMm)}
          viewBox={`0 0 ${mm(WIDTH_MM)} ${mm(heightMm)}`}
          className={measuring ? "cursor-crosshair" : undefined}
          onClick={onClick}
          role="img"
          aria-label="12-avlednings-EKG"
        >
          <defs>
            <pattern id="ecg-small" width={mm(1)} height={mm(1)} patternUnits="userSpaceOnUse">
              <path d={`M ${mm(1)} 0 L 0 0 0 ${mm(1)}`} fill="none" stroke="#f6c9c4" strokeWidth={0.6} />
            </pattern>
            <pattern id="ecg-large" width={mm(5)} height={mm(5)} patternUnits="userSpaceOnUse">
              <rect width={mm(5)} height={mm(5)} fill="url(#ecg-small)" />
              <path d={`M ${mm(5)} 0 L 0 0 0 ${mm(5)}`} fill="none" stroke="#e99a92" strokeWidth={1.1} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#ecg-large)" />
          <g fill="none" stroke="#111827" strokeWidth={1.3} strokeLinejoin="round">
            {calibrations.map((d, i) => (
              <path key={i} d={d} />
            ))}
            {paths.map((p, i) => (
              <path key={i} d={p.d} />
            ))}
          </g>
          <g fontSize={12} fontWeight={600} fill="#111827">
            {paths.map((p, i) => (
              <text key={i} x={p.x} y={p.y}>
                {p.label}
              </text>
            ))}
          </g>
          {caliper.map((x, i) => (
            <line key={i} x1={x} x2={x} y1={0} y2={mm(heightMm)} stroke="#2563eb" strokeWidth={1.5} strokeDasharray="6 4" />
          ))}
          {caliper.length === 2 && (
            <rect
              x={Math.min(...caliper)}
              width={Math.abs(caliper[1] - caliper[0])}
              y={0}
              height={mm(heightMm)}
              fill="rgba(37,99,235,0.08)"
            />
          )}
        </svg>
      </div>
      <p className="text-xs text-muted-foreground">Rytmremsan längst ned visar avledning II under hela registreringen (10 s). Scrolla i sidled på mobil.</p>
    </div>
  )
}

export { LEADS }
