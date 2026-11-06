"use client"

import { useEffect, useRef, useState } from "react"
import { STATION_SECONDS, WARNING_SECONDS } from "@/lib/osce/types"

/**
 * Stationsklocka som följer tentans regler: en signal efter 9 minuter och två efter 10.
 * Räknar mot en starttid (inte genom att summera ticks) så att den inte driver.
 */
export function useStationTimer({
  running,
  resetKey,
  onWarning,
  onEnd,
  total = STATION_SECONDS,
  warning = WARNING_SECONDS,
}: {
  running: boolean
  resetKey: unknown
  onWarning: () => void
  onEnd: () => void
  total?: number
  warning?: number
}) {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef<number | null>(null)
  const baseRef = useRef(0)
  const firedRef = useRef({ warning: false, end: false })
  const handlers = useRef({ onWarning, onEnd })
  handlers.current = { onWarning, onEnd }

  useEffect(() => {
    setElapsed(0)
    baseRef.current = 0
    startRef.current = null
    firedRef.current = { warning: false, end: false }
  }, [resetKey])

  useEffect(() => {
    if (!running) {
      if (startRef.current !== null) baseRef.current += (Date.now() - startRef.current) / 1000
      startRef.current = null
      return
    }
    startRef.current = Date.now()
    const id = window.setInterval(() => {
      const e = baseRef.current + (Date.now() - (startRef.current ?? Date.now())) / 1000
      setElapsed(e)
      if (e >= warning && !firedRef.current.warning) {
        firedRef.current.warning = true
        handlers.current.onWarning()
      }
      if (e >= total && !firedRef.current.end) {
        firedRef.current.end = true
        handlers.current.onEnd()
      }
    }, 250)
    return () => window.clearInterval(id)
  }, [running, total, warning])

  return { elapsed, remaining: Math.max(0, total - elapsed) }
}

export function formatClock(seconds: number) {
  const s = Math.ceil(seconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}
