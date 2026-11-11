"use client"

import { Package } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { OsceStation, StationResponses, ItemResponse } from "@/lib/osce/types"
import { OSCE_THEMES } from "@/lib/osce/types"
import { ItemView, type ItemMode } from "./item-view"
import { OsceFeedbackButton } from "./feedback-button"

export function themeName(id: string) {
  return OSCE_THEMES.find(t => t.id === id)?.description ?? id
}

export function StationHeader({ station }: { station: OsceStation }) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{station.theme}</Badge>
          <span className="text-xs text-muted-foreground">{themeName(station.theme)}</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{station.title}</h2>
      </div>
      {station.scenario && (
        <blockquote className="rounded-xl border-l-4 border-accent bg-card p-4 text-[15px] leading-relaxed text-foreground shadow-sm">
          {station.scenario}
        </blockquote>
      )}
      {station.material && (
        <div className="flex flex-wrap items-start gap-2 text-sm text-muted-foreground">
          <Package className="mt-0.5 h-4 w-4 shrink-0" />
          <ul className="space-y-0.5">
            {station.material.map(m => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function StationItems({
  station,
  responses,
  onChange,
  mode,
  locked,
}: {
  station: OsceStation
  responses: StationResponses
  onChange: (itemId: string, res: ItemResponse) => void
  mode: ItemMode
  locked?: boolean
}) {
  let n = 0
  return (
    <div className="space-y-6">
      {station.items.map((item, i) => {
        const display = item.kind === "tool" && item.criteria.length === 0
        if (!display) n += 1
        return (
          <div key={item.id} className="space-y-6">
            {i > 0 && <Separator />}
            <ItemView
              item={item}
              index={display ? null : n}
              response={responses[item.id]}
              onChange={res => onChange(item.id, res)}
              mode={mode}
              locked={locked}
            />
            {/* Feedback döljs under full simulering för att inte störa */}
            {mode !== "exam" && (
              <div className="-mt-3 flex justify-end">
                <OsceFeedbackButton station={station} item={item} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
