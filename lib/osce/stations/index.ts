import { OSCE_THEMES, examLabel, periodRank, type OsceStation, type OsceTheme } from "../types"
import { crenStations } from "./cren"
import { erlStations } from "./erl"
import { genStations } from "./gen"
import { gnmStations } from "./gnm"
import { ibiStations } from "./ibi"
import { nsprStations } from "./nspr"

const THEME_ORDER = OSCE_THEMES.map(t => t.id)

/** Senaste tentan först, sedan ordinarie före omtenta, fm före em och tema */
function byExam(a: OsceStation, b: OsceStation) {
  return (
    periodRank(b.exam.period) - periodRank(a.exam.period) ||
    (a.exam.type === b.exam.type ? 0 : a.exam.type === "ordinarie" ? -1 : 1) ||
    (b.exam.session ?? "").localeCompare(a.exam.session ?? "") ||
    THEME_ORDER.indexOf(a.theme) - THEME_ORDER.indexOf(b.theme)
  )
}

/** Stationerna som de står i koden. Ändringar från admin läggs ovanpå med mergeStations. */
export const ALL_STATIONS: OsceStation[] = [
  ...crenStations,
  ...nsprStations,
  ...genStations,
  ...gnmStations,
  ...ibiStations,
  ...erlStations,
].sort(byExam)

/** En station som ändrats eller lagts till i admin (sparas i Supabase-tabellen osce_stations) */
export type StationOverride = OsceStation & { hidden?: boolean }

/** Originalstationerna med adminändringar ovanpå: ändrade ersätts, nya läggs till, dolda tas bort */
export function mergeStations(overrides: StationOverride[], base: OsceStation[] = ALL_STATIONS): OsceStation[] {
  const byId = new Map(overrides.map(o => [o.id, o]))
  const merged = base.map(s => byId.get(s.id) ?? s)
  const added = overrides.filter(o => !base.some(s => s.id === o.id))
  return [...merged, ...added].filter(s => !(s as StationOverride).hidden).sort(byExam)
}

export function getStation(id: string, list: OsceStation[] = ALL_STATIONS): OsceStation | undefined {
  return list.find(s => s.id === id)
}

export function stationsForTheme(theme: OsceTheme, list: OsceStation[] = ALL_STATIONS): OsceStation[] {
  return list.filter(s => s.theme === theme)
}

function shuffle<T>(list: T[]): T[] {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** Full simulering: 4 stationer från 4 olika teman, i slumpad ordning */
export function drawExam(count = 4, list: OsceStation[] = ALL_STATIONS): OsceStation[] {
  const themes = shuffle([...new Set(list.map(s => s.theme))]).slice(0, count)
  return themes.map(theme => shuffle(stationsForTheme(theme, list))[0])
}

/** En riktig tentaomgång, t.ex. VT26 ordinarie fm */
export interface ExamSitting {
  key: string
  label: string
  stations: OsceStation[]
}

const sittingKey = (s: OsceStation) => [s.exam.period, s.exam.type, s.exam.session].filter(Boolean).join("-")

export function getSittings(stations: OsceStation[] = ALL_STATIONS): ExamSitting[] {
  const list: ExamSitting[] = []
  for (const station of stations) {
    const key = sittingKey(station)
    const found = list.find(x => x.key === key)
    if (found) found.stations.push(station)
    else list.push({ key, label: examLabel(station.exam), stations: [station] })
  }
  return list
}

export function getSitting(key: string, stations: OsceStation[] = ALL_STATIONS): ExamSitting | undefined {
  return getSittings(stations).find(x => x.key === key)
}
