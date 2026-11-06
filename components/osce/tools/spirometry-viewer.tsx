"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import type { ToolProps } from "./tool-props"

// Flöde–volymkurvor från dynamisk spirometri, genererade matematiskt.
// Exspiration ritas uppåt (positivt flöde), inspiration nedåt.

type CurveType = "normal" | "obstructive" | "poor-effort" | "short"

interface Curve {
  points: [number, number][]
  pef: [number, number]
  fvc: number
}

function buildCurve(type: CurveType): Curve {
  const exp: [number, number][] = []
  const N = 120
  let fvc = 4.8
  let pef = 9.6
  let pefAt = 0.5

  const flowAt = (v: number): number => {
    switch (type) {
      case "normal": {
        if (v < pefAt) return pef * Math.sin((Math.PI / 2) * (v / pefAt))
        return pef * (1 - (v - pefAt) / (fvc - pefAt)) ** 1.05
      }
      case "obstructive": {
        if (v < pefAt) return pef * Math.sin((Math.PI / 2) * (v / pefAt))
        const x = (v - pefAt) / (fvc - pefAt)
        return pef * (Math.exp(-3.4 * x) - x * Math.exp(-3.4)) * (1 - 0.05 * x)
      }
      case "poor-effort": {
        // Långsam start och låg, rundad topp långt in i utandningen
        const x = v / fvc
        return pef * Math.sin(Math.PI * Math.min(1, x ** 0.85)) ** 1.4
      }
      case "short": {
        if (v < pefAt) return pef * Math.sin((Math.PI / 2) * (v / pefAt))
        return pef * (1 - (v - pefAt) / (4.8 - pefAt))
      }
    }
  }

  if (type === "obstructive") {
    fvc = 3.7
    pef = 5.6
    pefAt = 0.35
  } else if (type === "poor-effort") {
    fvc = 4.3
    pef = 5.2
  } else if (type === "short") {
    fvc = 2.9
    pef = 9.3
  }

  for (let i = 0; i <= N; i++) {
    const v = (fvc * i) / N
    exp.push([v, Math.max(0, flowAt(v))])
  }
  // Avbruten utandning: tvärt stopp
  if (type === "short") exp.push([fvc, 0])

  const peakIndex = exp.reduce((best, p, i) => (p[1] > exp[best][1] ? i : best), 0)

  // Inspiration: halvcirkelliknande kurva tillbaka från FVC till 0
  const insp: [number, number][] = []
  for (let i = 0; i <= N; i++) {
    const v = fvc * (1 - i / N)
    insp.push([v, -5.2 * Math.sin((Math.PI * i) / N) * (type === "obstructive" ? 0.85 : 1)])
  }

  return { points: [...exp, ...insp], pef: exp[peakIndex], fvc }
}

const W = 260
const H = 220
const X = (v: number) => 34 + (v / 6) * (W - 50)
const Y = (f: number) => 18 + ((12 - f) / 18) * (H - 44)

export function SpirometryViewer({ item, onAchieve, achieved, exam, locked }: ToolProps) {
  const types: CurveType[] = item.config?.curves ?? ["normal"]
  const showLabels: boolean = item.config?.labels ?? true
  const pointOn: number | undefined = item.config?.pointOn
  const curves = useMemo(() => types.map(buildCurve), [types.join(",")])
  const [marks, setMarks] = useState<{ x: number; y: number; hit: string | null }[]>([])

  const handleClick = (e: React.MouseEvent<SVGSVGElement>, index: number) => {
    if (pointOn !== index || locked) return
    const svg = e.currentTarget
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse())
    const c = curves[index]
    let hit: string | null = null
    const near = (vx: number, vy: number, r: number) => Math.hypot(p.x - X(vx), p.y - Y(vy)) < r
    if (near(c.pef[0], c.pef[1], 16)) hit = "sp-pef"
    else if (near(c.fvc, 0, 16)) hit = "sp-fvc"
    else if (p.y > Y(0) + 6 && p.y < Y(-6) && p.x > X(0) && p.x < X(c.fvc)) hit = "sp-insp"
    setMarks(m => [...m.slice(-5), { x: p.x, y: p.y, hit }])
    if (hit && !achieved.includes(hit)) onAchieve([hit])
  }

  const hitLabel: Record<string, string> = { "sp-pef": "PEF", "sp-fvc": "FVC", "sp-insp": "Inspiration" }

  return (
    <div className="space-y-2">
      <div className="grid gap-3 sm:grid-cols-2">
        {curves.map((c, i) => {
          const d = c.points.map(([v, f], j) => `${j ? "L" : "M"}${X(v).toFixed(1)},${Y(f).toFixed(1)}`).join(" ") + " Z"
          const pointing = pointOn === i
          return (
            <div key={i} className={cn("rounded-lg border bg-card p-2", pointing ? "border-accent ring-1 ring-accent/40" : "border-border")}>
              <div className="flex items-center justify-between px-1 text-sm font-semibold">
                <span>Kurva {String.fromCharCode(65 + i)}</span>
                {pointing && <span className="text-xs font-normal text-accent">Klicka för att peka</span>}
              </div>
              <svg
                viewBox={`0 0 ${W} ${H}`}
                className={cn("w-full", pointing && !locked && "cursor-crosshair")}
                onClick={e => handleClick(e, i)}
                role="img"
                aria-label={`Flöde–volymkurva ${String.fromCharCode(65 + i)}`}
              >
                {[-4, 0, 4, 8, 12].map(f => (
                  <g key={f}>
                    <line x1={X(0)} x2={X(6)} y1={Y(f)} y2={Y(f)} stroke="currentColor" className="text-border" strokeWidth={f === 0 ? 1.4 : 0.6} />
                    <text x={X(0) - 5} y={Y(f) + 3} fontSize={9} textAnchor="end" className="fill-muted-foreground">
                      {f}
                    </text>
                  </g>
                ))}
                {[0, 1, 2, 3, 4, 5, 6].map(v => (
                  <text key={v} x={X(v)} y={H - 10} fontSize={9} textAnchor="middle" className="fill-muted-foreground">
                    {v}
                  </text>
                ))}
                <line x1={X(0)} x2={X(0)} y1={Y(12)} y2={Y(-6)} stroke="currentColor" className="text-border" />
                <path d={d} fill="rgba(16,185,129,0.08)" stroke="#0f766e" strokeWidth={2} strokeLinejoin="round" />
                {showLabels && (
                  <>
                    <text x={X(6)} y={Y(0) - 4} fontSize={9} textAnchor="end" className="fill-muted-foreground">
                      Volym (L)
                    </text>
                    <text x={X(0) + 4} y={Y(12) + 2} fontSize={9} className="fill-muted-foreground">
                      Flöde (L/s)
                    </text>
                  </>
                )}
                {pointing &&
                  marks.map((m, j) => (
                    <g key={j}>
                      <circle cx={m.x} cy={m.y} r={5} fill={!exam && m.hit ? "#10b981" : "#2563eb"} opacity={0.8} />
                      {!exam && m.hit && (
                        <text x={m.x + 7} y={m.y - 6} fontSize={10} fontWeight={600} fill="#047857">
                          {hitLabel[m.hit]}
                        </text>
                      )}
                    </g>
                  ))}
              </svg>
            </div>
          )
        })}
      </div>
    </div>
  )
}
