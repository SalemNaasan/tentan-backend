import { OSCE_PERIODS, OSCE_THEMES, examLabel, type OsceStation, type OsceTheme } from "../types"
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
    OSCE_PERIODS.indexOf(a.exam.period) - OSCE_PERIODS.indexOf(b.exam.period) ||
    (a.exam.type === b.exam.type ? 0 : a.exam.type === "ordinarie" ? -1 : 1) ||
    (b.exam.session ?? "").localeCompare(a.exam.session ?? "") ||
    THEME_ORDER.indexOf(a.theme) - THEME_ORDER.indexOf(b.theme)
  )
}

export const ALL_STATIONS: OsceStation[] = [
  ...crenStations,
  ...nsprStations,
  ...genStations,
  ...gnmStations,
  ...ibiStations,
  ...erlStations,
].sort(byExam)

export function getStation(id: string): OsceStation | undefined {
  return ALL_STATIONS.find(s => s.id === id)
}

export function stationsForTheme(theme: OsceTheme): OsceStation[] {
  return ALL_STATIONS.filter(s => s.theme === theme)
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
export function drawExam(count = 4): OsceStation[] {
  const themes = shuffle([...new Set(ALL_STATIONS.map(s => s.theme))]).slice(0, count)
  return themes.map(theme => shuffle(stationsForTheme(theme))[0])
}

/** En riktig tentaomgång, t.ex. VT26 ordinarie fm */
export interface ExamSitting {
  key: string
  label: string
  stations: OsceStation[]
}

const sittingKey = (s: OsceStation) => [s.exam.period, s.exam.type, s.exam.session].filter(Boolean).join("-")

export function getSittings(): ExamSitting[] {
  const list: ExamSitting[] = []
  for (const station of ALL_STATIONS) {
    const key = sittingKey(station)
    const found = list.find(x => x.key === key)
    if (found) found.stations.push(station)
    else list.push({ key, label: examLabel(station.exam), stations: [station] })
  }
  return list
}

export function getSitting(key: string): ExamSitting | undefined {
  return getSittings().find(x => x.key === key)
}
