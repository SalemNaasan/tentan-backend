import type { ItemResponse, OsceItem, OsceStation, StationResponses } from "./types"
import { PASS_FRACTION, STATION_MAX_POINTS } from "./types"

const round = (n: number) => Math.round(n * 10) / 10

export function itemMaxPoints(item: OsceItem): number {
  switch (item.kind) {
    case "self":
      return item.maxPoints ?? item.criteria.reduce((s, c) => s + c.points, 0)
    case "tool":
      return item.criteria.reduce((s, c) => s + c.points, 0)
    default:
      return item.points
  }
}

export function itemScore(item: OsceItem, res: ItemResponse | undefined): number {
  if (!res) return 0
  switch (item.kind) {
    case "self":
    case "tool": {
      const achieved = new Set(res.achieved ?? [])
      const sum = item.criteria.filter(c => achieved.has(c.id)).reduce((s, c) => s + c.points, 0)
      return round(Math.min(sum, itemMaxPoints(item)))
    }
    case "choice": {
      const selected = res.selected ?? []
      if (selected.length === 0) return 0
      if (!item.multi) return item.correct.includes(selected[0]) ? item.points : 0
      // Flerval: poäng per rätt markerat, avdrag per fel, aldrig under 0
      const per = item.points / item.correct.length
      const right = selected.filter(s => item.correct.includes(s)).length
      const wrong = selected.length - right
      return round(Math.max(0, (right - wrong) * per))
    }
    case "numeric": {
      if (res.value === null || res.value === undefined || Number.isNaN(res.value)) return 0
      return res.value >= item.min && res.value <= item.max ? item.points : 0
    }
  }
}

/** Ett moment är "klart att bedöma" när svaret kan rättas */
export function itemNeedsSelfAssessment(item: OsceItem, res: ItemResponse | undefined): boolean {
  return item.kind === "self" && !res?.assessed
}

export function stationMaxPoints(station: OsceStation): number {
  return round(station.items.reduce((s, i) => s + itemMaxPoints(i), 0))
}

export function stationScore(station: OsceStation, responses: StationResponses): number {
  const sum = station.items.reduce((s, i) => s + itemScore(i, responses[i.id]), 0)
  return round(Math.min(sum, STATION_MAX_POINTS))
}

export function passLimit(stationCount: number): number {
  return stationCount * STATION_MAX_POINTS * PASS_FRACTION
}
