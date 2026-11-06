"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { Box, Square } from "lucide-react"
import { cn } from "@/lib/utils"
import { Torso } from "./tools/torso"
import type { PatientMarker, PatientViewProps } from "./three/markers"

export type { PatientMarker }

// Patienten visas i 3D när webbläsaren klarar WebGL, annars som 2D-docka.
// Båda vyerna använder samma koordinater, markörer och klickhantering.

const PatientScene = dynamic(() => import("./three/patient-scene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center rounded-xl bg-[radial-gradient(ellipse_at_top,#2a3b52_0%,#121b28_70%)] text-sm text-white/60">
      Laddar 3D-patient…
    </div>
  ),
})

function supportsWebGL() {
  try {
    const c = document.createElement("canvas")
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"))
  } catch {
    return false
  }
}

const PREF_KEY = "tentan_osce_view"

function Markers2D({ markers }: { markers: PatientMarker[] }) {
  return (
    <>
      {markers.map((m, i) => {
        const { x, y } = m.p
        switch (m.kind) {
          case "stethoscope":
            return (
              <g key={i} pointerEvents="none">
                <path d={`M ${x} ${y - 12} C ${x} ${y - 80}, ${x - 60} ${y - 120}, 190 0`} stroke="#1f2937" strokeWidth={4} fill="none" opacity={0.75} />
                <circle cx={x} cy={y} r={m.piece === "bell" ? 10 : 14} fill="#cbd5e1" stroke="#334155" strokeWidth={3} />
              </g>
            )
          case "hand":
            return (
              <circle key={i} cx={x} cy={y} r={16} fill="rgba(16,185,129,0.15)" stroke="#10b981" strokeWidth={2} pointerEvents="none">
                <animate attributeName="r" values="12;18;12" dur="0.88s" repeatCount="indefinite" />
              </circle>
            )
          case "electrode":
            return (
              <g key={i} pointerEvents="none">
                <circle cx={x} cy={y} r={8} fill="white" stroke={m.color} strokeWidth={3} />
                <text x={x} y={y - 12} fontSize={9} textAnchor="middle" fontWeight={700} fill="#1f2937">
                  {m.label}
                </text>
              </g>
            )
          case "pad":
            return <rect key={i} x={x - 20} y={y - 28} width={40} height={56} rx={6} fill="#f8fafc" stroke="#0f172a" strokeWidth={2} pointerEvents="none" />
          case "cpr-hands":
            return <ellipse key={i} cx={x} cy={y} rx={20} ry={14} fill="rgba(244,63,94,0.25)" stroke="#e11d48" strokeWidth={2} pointerEvents="none" />
          case "ring":
            return (
              <g key={i} pointerEvents="none">
                <circle cx={x} cy={y} r={9} fill="none" stroke={m.color} strokeWidth={2} strokeDasharray={m.dashed ? "3 2" : undefined} />
                {m.label && (
                  <text x={x} y={y - 13} fontSize={8} textAnchor="middle" fill="#475569">
                    {m.label}
                  </text>
                )}
              </g>
            )
        }
      })}
    </>
  )
}

export function PatientView(props: PatientViewProps & { heightClass?: string }) {
  const [mode, setMode] = useState<"3d" | "2d" | null>(null)
  const dragging = useRef(false)

  useEffect(() => {
    let pref: string | null = null
    try {
      pref = localStorage.getItem(PREF_KEY)
    } catch {
      // ignoreras
    }
    setMode(!supportsWebGL() ? "2d" : pref === "2d" ? "2d" : "3d")
  }, [])

  const choose = (m: "3d" | "2d") => {
    setMode(m)
    try {
      localStorage.setItem(PREF_KEY, m)
    } catch {
      // ignoreras
    }
  }

  const height = props.heightClass ?? "h-[420px] md:h-[480px]"

  return (
    <div className="relative">
      {mode === "3d" && (
        <div className={height}>
          <PatientScene {...props} />
        </div>
      )}
      {mode === "2d" && (
        <div className={cn("mx-auto aspect-[400/540] w-full max-w-[340px] overflow-hidden rounded-xl border bg-gradient-to-b from-secondary/60 to-background", props.highlight ? "border-accent ring-2 ring-accent/30" : "border-border")}>
          <Torso
            xray={props.xray}
            guides={props.guides}
            ariaLabel={props.ariaLabel}
            onPointerDown={(p, e) => {
              dragging.current = true
              e.currentTarget.setPointerCapture(e.pointerId)
              props.onPoint?.(p, "down")
            }}
            onPointerMove={p => dragging.current && props.onPoint?.(p, "move")}
            onPointerUp={p => {
              dragging.current = false
              props.onPoint?.(p, "up")
            }}
          >
            <Markers2D markers={props.markers ?? []} />
          </Torso>
        </div>
      )}
      {mode === null && <div className={cn(height, "animate-pulse rounded-xl bg-muted")} />}
      {mode !== null && (
        <div className="absolute right-2 top-2 flex overflow-hidden rounded-md border border-white/10 bg-black/40 text-[11px] backdrop-blur">
          {(["3d", "2d"] as const).map(m => (
            <button
              key={m}
              type="button"
              onPointerDownCapture={e => e.stopPropagation()}
              onClick={() => choose(m)}
              className={cn("flex items-center gap-1 px-2 py-1 font-medium", mode === m ? "bg-white text-slate-900" : "text-white/85 hover:bg-white/10", mode === "2d" && mode !== m && "text-slate-700")}
            >
              {m === "3d" ? <Box className="h-3 w-3" /> : <Square className="h-3 w-3" />}
              {m.toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
