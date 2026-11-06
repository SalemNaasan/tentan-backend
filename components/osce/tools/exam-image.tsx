"use client"

import { Maximize2 } from "lucide-react"
import type { ToolProps } from "./tool-props"

export interface ExamImage {
  src: string
  alt: string
}

/** Bilden exakt som den finns i tentan – klicka för full storlek */
export function ExamImageTool({ item }: ToolProps) {
  const images: ExamImage[] = item.config?.images ?? []
  return (
    <div className="space-y-3">
      {images.map(img => (
        <figure key={img.src} className="overflow-hidden rounded-xl border border-border bg-white">
          <a href={img.src} target="_blank" rel="noreferrer" className="group relative block" title="Öppna i full storlek">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.src} alt={img.alt} className="mx-auto max-h-[70vh] w-auto max-w-full" />
            <span className="absolute right-2 top-2 rounded-md bg-black/60 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100">
              <Maximize2 className="h-4 w-4" />
            </span>
          </a>
        </figure>
      ))}
      <p className="text-xs text-muted-foreground">Bild från tentan. Klicka för full storlek.</p>
    </div>
  )
}
