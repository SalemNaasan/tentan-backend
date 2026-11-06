"use client"

import { useEffect, useRef } from "react"

// Scrollande "fonokardiogram": visar ljudets amplitud över tid,
// så att S1, S2 (och klyvning/S3) syns samtidigt som de hörs.

export function Waveform({ analyser, active, height = 96 }: { analyser: AnalyserNode | null; active: boolean; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const g = canvas.getContext("2d")
    if (!g) return

    const dpr = window.devicePixelRatio || 1
    const resize = () => {
      canvas.width = canvas.clientWidth * dpr
      canvas.height = height * dpr
    }
    resize()
    window.addEventListener("resize", resize)

    const buf = new Float32Array(analyser?.fftSize ?? 2048)
    const columnsPerFrame = 2 * dpr
    let raf = 0

    const draw = () => {
      const w = canvas.width
      const h = canvas.height
      // Flytta bilden åt vänster och rita en ny kolumn längst till höger
      g.drawImage(canvas, -columnsPerFrame, 0)
      g.fillStyle = "#0e1a17"
      g.fillRect(w - columnsPerFrame, 0, columnsPerFrame, h)

      let peak = 0
      if (analyser && active) {
        analyser.getFloatTimeDomainData(buf)
        for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i]))
      }
      const amp = Math.min(1, peak * 2.2) * (h / 2 - 4)
      g.fillStyle = "#34d399"
      g.fillRect(w - columnsPerFrame, h / 2 - amp, columnsPerFrame, Math.max(1, amp * 2))

      raf = requestAnimationFrame(draw)
    }

    g.fillStyle = "#0e1a17"
    g.fillRect(0, 0, canvas.width, canvas.height)
    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
    }
  }, [analyser, active, height])

  return <canvas ref={canvasRef} className="block w-full rounded-md" style={{ height }} aria-hidden />
}
