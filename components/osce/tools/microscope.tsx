"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { Minus, Plus, Microscope as MicroscopeIcon, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ToolProps } from "./tool-props"

// Virtuellt mikroskop: pan (dra) och zoom (hjul/knappar) i ett runt synfält.

export function MicroscopeFrame({ children, label }: { children: ReactNode; label?: string }) {
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setZoom(z => Math.min(6, Math.max(1, z * (e.deltaY < 0 ? 1.15 : 0.87))))
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [])

  const clamp = (v: number) => Math.max(-300 * (zoom - 1), Math.min(300 * (zoom - 1), v))

  return (
    <div className="space-y-2">
      <div
        ref={ref}
        className="relative mx-auto aspect-square w-full max-w-[420px] cursor-grab touch-none overflow-hidden rounded-full border-[10px] border-neutral-800 bg-neutral-900 shadow-inner active:cursor-grabbing"
        onPointerDown={e => {
          e.currentTarget.setPointerCapture(e.pointerId)
          drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
        }}
        onPointerMove={e => {
          if (!drag.current) return
          setOffset({ x: clamp(drag.current.ox + e.clientX - drag.current.x), y: clamp(drag.current.oy + e.clientY - drag.current.y) })
        }}
        onPointerUp={() => (drag.current = null)}
      >
        <div
          className="absolute inset-0 origin-center transition-transform duration-75"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
        >
          {children}
        </div>
        <div className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_60px_25px_rgba(0,0,0,0.55)]" />
      </div>
      <div className="flex items-center justify-center gap-2">
        <Button size="icon" variant="outline" onClick={() => setZoom(z => Math.max(1, z / 1.4))} aria-label="Zooma ut">
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-24 text-center font-mono text-xs text-muted-foreground">{Math.round(zoom * 10)}× objektiv</span>
        <Button size="icon" variant="outline" onClick={() => setZoom(z => Math.min(6, z * 1.4))} aria-label="Zooma in">
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => {
            setZoom(1)
            setOffset({ x: 0, y: 0 })
          }}
          aria-label="Återställ"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
      {label && <p className="text-center text-xs text-muted-foreground">{label}</p>}
    </div>
  )
}

const SPECIMEN_NAMES: Record<string, string> = {
  duodenum: "Preparat från tunntarm",
  ventrikel: "Preparat från mag–tarmkanalen",
  lever: "Preparat från bukorgan",
  "rectum-anus": "Preparat från mag–tarmkanalen",
  pankreas: "Endokrint preparat",
  binjure: "Endokrint preparat",
  thyroidea: "Endokrint preparat",
}

/** Histologiskt preparat. Bilder läggs i /public/osce/histology/<preparat>.jpg */
export function MicroscopeTool({ item, exam }: ToolProps) {
  const specimen: string = item.config?.specimen ?? "okänt"
  const [missing, setMissing] = useState(false)
  const src = item.config?.image ?? `/osce/histology/${specimen}.jpg`

  if (missing) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center">
        <MicroscopeIcon className="h-8 w-8 text-muted-foreground" />
        <div>
          <p className="font-medium">{exam ? SPECIMEN_NAMES[specimen] ?? "Histologiskt preparat" : `Preparat: ${specimen}`}</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Preparatet visades i det digitala mikroskopet på tentan och finns inte i tentaunderlaget. Öppna motsvarande preparat i kursens digitala mikroskop eller histologiatlas och besvara frågorna utifrån det.
          </p>
        </div>
      </div>
    )
  }

  return (
    <MicroscopeFrame label="Dra för att panorera, scrolla eller använd knapparna för att zooma.">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Histologiskt preparat" className="h-full w-full object-cover" draggable={false} onError={() => setMissing(true)} />
    </MicroscopeFrame>
  )
}
