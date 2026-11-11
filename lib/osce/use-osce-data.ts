"use client"

import { useEffect, useMemo, useState } from "react"
import { ALL_STATIONS, mergeStations, type StationOverride } from "./stations"
import { buildQuestions } from "./questions"

// Stationerna med adminändringar ovanpå. Hämtas en gång per sidladdning och delas mellan komponenter.

let cache: Promise<StationOverride[]> | null = null

function loadOverrides() {
  cache ??= fetch("/api/osce", { cache: "no-store" })
    .then(res => (res.ok ? res.json() : []))
    .catch(() => [])
  return cache
}

/** Glöm hämtade ändringar (efter att admin sparat) */
export function invalidateOsceData() {
  cache = null
}

export function useOsceStations() {
  const [overrides, setOverrides] = useState<StationOverride[] | null>(null)

  useEffect(() => {
    let alive = true
    loadOverrides().then(list => alive && setOverrides(list))
    return () => {
      alive = false
    }
  }, [])

  const stations = useMemo(() => (overrides ? mergeStations(overrides) : ALL_STATIONS), [overrides])
  return { stations, ready: overrides !== null }
}

export function useOsceQuestions() {
  const { stations, ready } = useOsceStations()
  const questions = useMemo(() => buildQuestions(stations), [stations])
  return { questions, stations, ready }
}
