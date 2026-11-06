"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

// Kompressionsplatta: tryck på knappen (eller mellanslag) i takt.
// Mäter frekvensen över de senaste kompressionerna.

export function useCompressionCounter() {
  const times = useRef<number[]>([])
  const [count, setCount] = useState(0)
  const [rate, setRate] = useState<number | null>(null)

  const press = useCallback(() => {
    const now = performance.now()
    times.current.push(now)
    const recent = times.current.slice(-6)
    if (recent.length >= 3) {
      const avg = (recent[recent.length - 1] - recent[0]) / (recent.length - 1)
      setRate(Math.round(60000 / avg))
    }
    setCount(c => c + 1)
    return now
  }, [])

  const reset = useCallback(() => {
    times.current = []
    setCount(0)
    setRate(null)
  }, [])

  /** Medelfrekvens över alla tryck i serien */
  const averageRate = useCallback(() => {
    const t = times.current
    if (t.length < 3) return null
    return 60000 / ((t[t.length - 1] - t[0]) / (t.length - 1))
  }, [])

  return { count, rate, press, reset, averageRate }
}

export function CompressionPad({
  count,
  target,
  rate,
  onPress,
  disabled,
  label = "Tryck",
  showRate = true,
}: {
  count: number
  target: number
  rate: number | null
  onPress: () => void
  disabled?: boolean
  label?: string
  showRate?: boolean
}) {
  const [pressed, setPressed] = useState(false)

  useEffect(() => {
    if (disabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return
      const target = e.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return
      e.preventDefault()
      setPressed(true)
      onPress()
      window.setTimeout(() => setPressed(false), 90)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onPress, disabled])

  const inZone = rate !== null && rate >= 100 && rate <= 120
  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        disabled={disabled}
        onPointerDown={() => {
          setPressed(true)
          onPress()
        }}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        className={cn(
          "flex h-28 w-28 select-none flex-col items-center justify-center rounded-full border-4 border-rose-300 bg-rose-500 text-white shadow-lg transition-transform",
          pressed ? "scale-90 shadow-sm" : "scale-100",
          disabled && "opacity-50",
        )}
      >
        <span className="text-3xl font-bold tabular-nums">{count}</span>
        <span className="text-xs opacity-90">
          {label} / {target}
        </span>
      </button>
      {showRate && (
        <div className="w-56">
          <div className="relative h-2 rounded-full bg-muted">
            <div className="absolute inset-y-0 rounded-full bg-emerald-500/40" style={{ left: `${(100 - 60) / 1.2}%`, width: `${20 / 1.2}%` }} />
            {rate !== null && (
              <div
                className={cn("absolute -top-1 h-4 w-1.5 rounded-full", inZone ? "bg-emerald-600" : "bg-amber-500")}
                style={{ left: `${Math.min(100, Math.max(0, (rate - 60) / 1.2))}%` }}
              />
            )}
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
            <span>60</span>
            <span className={cn("font-medium", inZone ? "text-emerald-600" : "text-foreground")}>{rate ? `${rate}/min` : "frekvens"}</span>
            <span>180</span>
          </div>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Tips: tryck på mellanslag i takt.</p>
    </div>
  )
}
