"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { Microscope as MicroscopeIcon } from "lucide-react"
import type { ToolProps } from "./tool-props"

const LabScene = dynamic(() => import("../three/lab-scene"), {
  ssr: false,
  loading: () => <div className="h-[320px] animate-pulse rounded-xl bg-slate-800 md:h-[380px]" />,
})

// Mikrobiologi: blodagarplattor och biokemiska rör som SVG.

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Tentornas mikroskopibilder finns inte i underlaget, så ingen egen bild ritas */
export function GramStainTool() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center">
      <MicroscopeIcon className="h-8 w-8 text-muted-foreground" />
      <p className="max-w-md text-sm text-muted-foreground">
        På tentan visades en mikroskopibild här. Bilden finns inte i tentaunderlaget, så frågorna besvaras utan bild.
      </p>
    </div>
  )
}

export type Hemolysis = "beta" | "alpha" | "gamma"

function BloodAgarPlate({ type, label, seed }: { type: Hemolysis; label: string; seed: number }) {
  const rand = mulberry32(seed)
  const colonies = Array.from({ length: 42 }, () => {
    const a = rand() * Math.PI * 2
    const r = Math.sqrt(rand()) * 78
    return { x: 100 + Math.cos(a) * r, y: 100 + Math.sin(a) * r, r: 3 + rand() * 3 }
  })
  const halo = type === "beta" ? "rgba(255,226,196,0.85)" : type === "alpha" ? "rgba(96,110,44,0.75)" : "transparent"
  return (
    <figure className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 200 200" className="w-full max-w-[220px]" role="img" aria-label={`Blodagarplatta ${label}`}>
        <defs>
          <radialGradient id={`agar-${seed}`} cx="45%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#a3222c" />
            <stop offset="100%" stopColor="#6b0f17" />
          </radialGradient>
        </defs>
        <circle cx={100} cy={100} r={96} fill="#e5e7eb" stroke="#9ca3af" strokeWidth={2} />
        <circle cx={100} cy={100} r={90} fill={`url(#agar-${seed})`} />
        {colonies.map((c, i) => (
          <circle key={`h${i}`} cx={c.x} cy={c.y} r={c.r * (type === "beta" ? 3.2 : 2.4)} fill={halo} />
        ))}
        {colonies.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={c.r} fill={type === "gamma" ? "#e7e2d4" : "#f1efe8"} stroke="#cfc8b6" strokeWidth={0.6} />
        ))}
        <ellipse cx={70} cy={55} rx={36} ry={12} fill="rgba(255,255,255,0.12)" transform="rotate(-30 70 55)" />
      </svg>
      <figcaption className="text-sm font-semibold">{label}</figcaption>
    </figure>
  )
}

export const TUBE_TESTS = [
  { id: "glukos", name: "Glukos", pos: "#facc15", neg: "#dc2626", legend: "gul = jäsning" },
  { id: "laktos", name: "Laktos", pos: "#facc15", neg: "#dc2626", legend: "gul = jäsning" },
  { id: "indol", name: "Indol", pos: "#e11d48", neg: "#fde68a", legend: "röd ring = positiv" },
  { id: "citrat", name: "Citrat", pos: "#2563eb", neg: "#16a34a", legend: "blå = positiv" },
  { id: "ureas", name: "Ureas", pos: "#ec4899", neg: "#fbbf24", legend: "rosa = positiv" },
  { id: "rorlighet", name: "Rörlighet", pos: "diffuse", neg: "line", legend: "diffus växt = rörlig" },
] as const

export const TUBE_RESULTS: Record<string, Record<string, boolean>> = {
  ecoli: { glukos: true, laktos: true, indol: true, citrat: false, ureas: false, rorlighet: true },
  klebsiella: { glukos: true, laktos: true, indol: false, citrat: true, ureas: true, rorlighet: false },
}

function TubeRack({ organism }: { organism: string }) {
  const results = TUBE_RESULTS[organism] ?? TUBE_RESULTS.ecoli
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
      {TUBE_TESTS.map(t => {
        const positive = results[t.id]
        const isIndol = t.id === "indol"
        const isMotility = t.id === "rorlighet"
        const body = isIndol ? "#fde68a" : isMotility ? "#fef3c7" : positive ? t.pos : t.neg
        return (
          <figure key={t.id} className="flex flex-col items-center gap-1">
            <svg viewBox="0 0 40 120" className="h-32" role="img" aria-label={`${t.name}rör`}>
              <rect x={12} y={2} width={16} height={10} rx={2} fill="#9ca3af" />
              <path d="M10 12 h20 v88 a10 10 0 0 1 -20 0 z" fill="rgba(241,245,249,0.6)" stroke="#94a3b8" />
              <path d="M11 40 h18 v60 a9 9 0 0 1 -18 0 z" fill={body} opacity={0.9} />
              {isIndol && <rect x={11} y={36} width={18} height={6} fill={positive ? "#e11d48" : "#fef9c3"} />}
              {isMotility &&
                (positive ? (
                  <path d="M11 44 h18 v56 a9 9 0 0 1 -18 0 z" fill="rgba(180,140,60,0.45)" />
                ) : (
                  <line x1={20} y1={42} x2={20} y2={102} stroke="rgba(150,110,40,0.8)" strokeWidth={2} />
                ))}
            </svg>
            <figcaption className="text-center text-xs font-medium leading-tight">
              {t.name}
              <span className="block font-normal text-muted-foreground">{t.legend}</span>
            </figcaption>
          </figure>
        )
      })}
    </div>
  )
}

export function AgarTool({ item }: ToolProps) {
  const plates: Hemolysis[] | undefined = item.config?.plates
  const tubes: string | undefined = item.config?.tubes
  const [mode, setMode] = useState<"3d" | "2d">("3d")
  const list = plates ?? ["beta"]

  return (
    <div className="space-y-2">
      {mode === "3d" ? (
        <LabScene plates={tubes ? undefined : list} tubes={tubes} />
      ) : tubes ? (
        <TubeRack organism={tubes} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {list.map((p, i) => (
            <BloodAgarPlate key={i} type={p} label={list.length > 1 ? `Platta ${String.fromCharCode(65 + i)}` : "Platta"} seed={i * 17 + 5} />
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        {tubes ? <span>{TUBE_TESTS.map(t => `${t.name}: ${t.legend}`).join(" · ")}</span> : <span />}
        <button type="button" className="underline-offset-2 hover:underline" onClick={() => setMode(m => (m === "3d" ? "2d" : "3d"))}>
          Visa i {mode === "3d" ? "2D" : "3D"}
        </button>
      </div>
    </div>
  )
}
