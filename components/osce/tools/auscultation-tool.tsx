"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Hand, Stethoscope, ScanLine, Volume2, Wind, Grid3x3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { HEART_POINTS, HEART_PROFILE, IKTUS, LUNG_PAIR, LUNG_POINTS, LUNG_POINTS_BACK, LUNG_POINT_ALIAS, MIDLINE, breathSoundAt, dist, icsY, type Point } from "@/lib/osce/anatomy"
import { HeartSoundEngine, LungSoundEngine, breathPhase, type ChestPiece } from "@/lib/osce/audio"
import { PatientView, type PatientMarker } from "../patient-view"
import { Waveform } from "./waveform"
import type { ToolProps } from "./tool-props"

type Instrument = "hand" | "stethoscope"

const HEART_CENTER: Point = { x: MIDLINE + 20, y: icsY(4) }

const SOUND_LABEL = {
  tracheal: "trakealt andningsljud",
  bronchial: "bronkiellt andningsljud",
  bronchovesicular: "bronkovesikulärt andningsljud",
  vesicular: "vesikulärt andningsljud",
  none: "inget andningsljud – ingen lunga under",
} as const
const CORE_HEART_POINTS = ["aorta", "pulm", "tric", "mitral"]

export function AuscultationTool({ item, achieved, onAchieve, exam, locked }: ToolProps) {
  const mode: "heart" | "lung" = item.config?.mode === "lung" ? "lung" : "heart"
  const [instrument, setInstrument] = useState<Instrument>(mode === "heart" ? "hand" : "stethoscope")
  const [piece, setPiece] = useState<ChestPiece>("membrane")
  const [xray, setXray] = useState(false)
  const [guides, setGuides] = useState(false)
  const [pos, setPos] = useState<Point | null>(null)
  const [message, setMessage] = useState<string>(mode === "heart" ? "Börja med att palpera: välj handen och tryck på patienten." : "Placera stetoskopet på bröstkorgen.")
  const [inhaling, setInhaling] = useState(false)
  const [visited, setVisited] = useState<string[]>([])
  const [prone, setProne] = useState(false)

  const heartRef = useRef<HeartSoundEngine | null>(null)
  const lungRef = useRef<LungSoundEngine | null>(null)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)

  // Spårning för bedömningen
  const track = useRef({
    currentPoint: null as string | null,
    beatsAtPoint: 0,
    pointSince: 0,
    beatsPerPoint: {} as Record<string, number>,
    palpated: false,
    auscultated: false,
    palpBeforeAusk: false,
    usedPieces: new Set<ChestPiece>(),
    lungOrder: [] as string[],
    compared: 0,
  })

  const report = useCallback(
    (ids: string[]) => {
      const fresh = ids.filter(id => !achieved.includes(id))
      if (fresh.length && !locked) onAchieve(fresh)
    },
    [achieved, locked, onAchieve],
  )

  const markVisited = useCallback((id: string) => {
    setVisited(v => (v.includes(id) ? v : [...v, id]))
  }, [])

  // Utvärdera hjärtkriterierna när besökta punkter ändras
  useEffect(() => {
    if (mode !== "heart") return
    const t = track.current
    const ids: string[] = []
    if (CORE_HEART_POINTS.every(p => visited.includes(p))) ids.push("ausk-4")
    if (["erb", "carotid-r", "carotid-l"].some(p => visited.includes(p))) ids.push("ausk-extra")
    if (t.usedPieces.size === 2) ids.push("bell-and-membrane")
    if (ids.length) report(ids)
  }, [visited, mode, report])

  useEffect(() => {
    if (mode !== "lung") return
    const t = track.current
    const ids: string[] = []
    // Över- och underlober och lunggränser räknas både framifrån och bakifrån
    const heard = new Set(visited.map(id => LUNG_POINT_ALIAS[id] ?? id))
    if (["ul-dx", "ul-sin", "ml-dx", "li-sin", "ll-dx", "ll-sin"].every(p => heard.has(p))) ids.push("lung-all-lobes")
    if (t.compared >= 2) ids.push("lung-compare")
    if (heard.has("base-dx") && heard.has("base-sin")) ids.push("lung-bases")
    if (ids.length) report(ids)
  }, [visited, mode, report])

  const ensureEngine = useCallback(() => {
    if (mode === "heart" && !heartRef.current) {
      const engine = new HeartSoundEngine()
      engine.hasS3 = Boolean(item.config?.s3)
      engine.onBeat = () => {
        setInhaling(breathPhase(engine.elapsed(), engine.breath).inhaling)
        const t = track.current
        if (!t.currentPoint) return
        t.beatsAtPoint += 1
        t.beatsPerPoint[t.currentPoint] = Math.max(t.beatsPerPoint[t.currentPoint] ?? 0, t.beatsAtPoint)
        markVisited(t.currentPoint)
        // En hel hjärtcykel (S1–S2–S1) har hörts: utvärdera kriterierna igen
        if (t.beatsAtPoint === 2) setVisited(v => [...v])
      }
      engine.setChestPiece(piece)
      engine.start()
      heartRef.current = engine
      setAnalyser(engine.analyser)
    }
    if (mode === "lung" && !lungRef.current) {
      const engine = new LungSoundEngine(item.config?.finding === "obstructive" ? "obstructive" : "normal")
      engine.setChestPiece(piece)
      engine.start()
      lungRef.current = engine
      setAnalyser(engine.analyser)
    }
  }, [mode, item.config, piece, markVisited])

  useEffect(() => {
    return () => {
      heartRef.current?.dispose()
      lungRef.current?.dispose()
    }
  }, [])

  // Andningsindikator och dwell-tid för lungpunkter
  useEffect(() => {
    if (mode !== "lung") return
    const id = window.setInterval(() => {
      const engine = lungRef.current
      if (!engine) return
      const phase = breathPhase(engine.elapsed(), engine.breath)
      setInhaling(phase.inhaling)
      const t = track.current
      if (t.currentPoint && engine.elapsed() - t.pointSince >= phase.cycle * 0.95) {
        const p = t.currentPoint
        setVisited(v => {
          if (v.includes(p) && t.lungOrder[t.lungOrder.length - 1] === p) return v
          const last = t.lungOrder[t.lungOrder.length - 1]
          if (last !== p) {
            if (last && LUNG_PAIR[last] === p) t.compared += 1
            t.lungOrder.push(p)
          }
          return v.includes(p) ? [...v] : [...v, p]
        })
      }
    }, 150)
    return () => window.clearInterval(id)
  }, [mode])

  useEffect(() => {
    heartRef.current?.setChestPiece(piece)
    lungRef.current?.setChestPiece(piece)
  }, [piece])

  const placeAt = useCallback(
    (p: Point) => {
      if (locked) return
      setPos(p)
      const t = track.current

      if (instrument === "hand") {
        heartRef.current?.setPoint({ s1: 0, a2: 0, p2: 0, s3: 0, contact: 0 })
        lungRef.current?.setContact(0)
        const carotid = HEART_POINTS.filter(h => h.id.startsWith("carotid")).find(h => dist(h, p) < 20)
        if (carotid) {
          t.palpated = true
          if (!t.auscultated) t.palpBeforeAusk = true
          setMessage("Du känner en regelbunden, kraftig carotispuls – ca 68/min.")
          report(t.palpBeforeAusk ? ["palp-carotis", "palp-before-ausk"] : ["palp-carotis"])
        } else if (dist(IKTUS, p) < 18) {
          t.palpated = true
          if (!t.auscultated) t.palpBeforeAusk = true
          setMessage("Iktus palperas – en avgränsad stöt, ca 2 cm stor, i I5 medioklavikulärt.")
          report(t.palpBeforeAusk ? ["palp-iktus", "palp-before-ausk"] : ["palp-iktus"])
        } else if (dist(HEART_CENTER, p) < 70) {
          setMessage("Du känner ingen tydlig pulsation här.")
        } else {
          setMessage("Inga palpationsfynd.")
        }
        return
      }

      // Stetoskop
      ensureEngine()
      t.usedPieces.add(piece)
      if (mode === "heart") {
        t.auscultated = true
        const nearest = HEART_POINTS.map(h => ({ h, d: dist(h, p) })).sort((a, b) => a.d - b.d)[0]
        const engine = heartRef.current
        if (nearest.d < 22) {
          const prof = HEART_PROFILE[nearest.h.id]
          engine?.setPoint({ ...prof, contact: 1 })
          if (t.currentPoint !== nearest.h.id) {
            t.currentPoint = nearest.h.id
            t.beatsAtPoint = 0
          }
          setMessage(exam ? "Stetoskopet ligger an. Lyssna en hel hjärtcykel." : `Du lyssnar över: ${nearest.h.label}`)
          // Protokollet: palpation först, sedan avslutar man med auskultation
          if (t.palpated) report(["ausk-cycle"])
        } else {
          t.currentPoint = null
          const d = dist(HEART_CENTER, p)
          const contact = Math.max(0, 0.7 - d / 220)
          engine?.setPoint({ s1: 0.6, a2: 0.6, p2: 0.4, s3: 0.3, contact })
          setMessage(contact > 0.2 ? "Hjärtljuden hörs men inte över någon klaffpunkt." : "Hjärtljuden hörs knappt här.")
        }
        // Utvärdera hörlurar/klocka direkt
        if (t.usedPieces.size === 2) report(["bell-and-membrane"])
      } else {
        // Ljudet bestäms av vad som ligger under stetoskopet (trakea, bronker, lunga, lever …)
        const sound = breathSoundAt(p)
        const engine = lungRef.current
        engine?.setPoint(sound)
        engine?.setContact(1)
        const points = p.back ? LUNG_POINTS_BACK : LUNG_POINTS
        const nearest = points.map(l => ({ l, d: dist(l, p) })).sort((a, b) => a.d - b.d)[0]
        const description = `${sound.area}: ${SOUND_LABEL[sound.type]}`
        if (nearest && nearest.d < 24) {
          if (t.currentPoint !== nearest.l.id) {
            t.currentPoint = nearest.l.id
            t.pointSince = engine?.elapsed() ?? 0
          }
          setMessage(exam ? "Stetoskopet ligger an. Lyssna en hel andningscykel." : `${nearest.l.label}. ${description}.`)
        } else {
          t.currentPoint = null
          setMessage(exam ? "Stetoskopet ligger an." : `${description}. (Ingen av standardpunkterna.)`)
        }
      }
    },
    [locked, instrument, ensureEngine, piece, mode, exam, report],
  )

  const instruments = useMemo(
    () =>
      mode === "heart"
        ? [
            { id: "hand" as const, label: "Palpera", icon: Hand },
            { id: "stethoscope" as const, label: "Stetoskop", icon: Stethoscope },
          ]
        : [{ id: "stethoscope" as const, label: "Stetoskop", icon: Stethoscope }],
    [mode],
  )

  const landmarks = mode === "heart" ? HEART_POINTS : prone ? LUNG_POINTS_BACK : LUNG_POINTS
  const showMarkers = !exam && guides
  const viewMarkers: PatientMarker[] = [
    ...(showMarkers
      ? landmarks.map(m => ({ kind: "ring" as const, p: m, color: visited.includes(m.id) ? "#10b981" : "#94a3b8", label: m.short, dashed: true }))
      : []),
    ...(pos ? [instrument === "stethoscope" ? { kind: "stethoscope" as const, p: pos, piece } : { kind: "hand" as const, p: pos }] : []),
  ]

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <PatientView
        xray={xray}
        guides={showMarkers}
        markers={viewMarkers}
        onPoint={(p, phase) => phase !== "up" && placeAt(p)}
        ariaLabel="Patient för palpation och auskultation"
        prone={mode === "lung" && prone}
        onTurn={
          mode === "lung"
            ? next => {
                setProne(next)
                setPos(null)
                lungRef.current?.setContact(0)
                track.current.currentPoint = null
                setMessage(next ? "Patienten ligger nu på mage. Lyssna bakifrån: paravertebralt, mellan skulderbladen och basalt." : "Patienten ligger på rygg igen.")
              }
            : undefined
        }
      />

      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {instruments.map(({ id, label, icon: Icon }) => (
            <Button key={id} size="sm" variant={instrument === id ? "default" : "outline"} onClick={() => setInstrument(id)} disabled={locked} className="gap-1.5">
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
          <div className="mx-1 w-px bg-border" />
          <Button size="sm" variant={piece === "membrane" ? "secondary" : "ghost"} onClick={() => setPiece("membrane")} disabled={locked || instrument !== "stethoscope"}>
            Membran
          </Button>
          <Button size="sm" variant={piece === "bell" ? "secondary" : "ghost"} onClick={() => setPiece("bell")} disabled={locked || instrument !== "stethoscope"}>
            Klocka
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={xray ? "secondary" : "ghost"} onClick={() => setXray(x => !x)} className="gap-1.5">
            <ScanLine className="h-4 w-4" /> Röntgenvy
          </Button>
          {!exam && (
            <Button size="sm" variant={guides ? "secondary" : "ghost"} onClick={() => setGuides(g => !g)} className="gap-1.5">
              <Grid3x3 className="h-4 w-4" /> Hjälplinjer
            </Button>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Volume2 className="h-3.5 w-3.5" />
              {mode === "heart" ? "Fonokardiogram" : "Andningsljud"} · {piece === "bell" ? "klocka" : "membran"}
            </span>
            <span className={cn("flex items-center gap-1.5 font-medium transition-colors", inhaling ? "text-sky-600" : "text-muted-foreground")}>
              <Wind className="h-3.5 w-3.5" />
              {inhaling ? "Inandning" : "Utandning"}
            </span>
          </div>
          <Waveform analyser={analyser} active={instrument === "stethoscope"} />
          <p className="mt-2 min-h-10 text-sm text-foreground" aria-live="polite">
            {message}
          </p>
        </div>

        {!exam && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {mode === "heart"
              ? "Tips: använd hörlurar. Stetoskopet ljuder så länge det ligger an – dra det mellan punkterna. Lyssna efter hur S2 klyvs vid inandning över I2 sin, och prova klockan över apex."
              : "Tips: använd hörlurar och lyssna en hel andningscykel per punkt. Jämför höger och vänster sida på samma nivå. Lyssna på halsen (trakealt), över sternum (bronkiellt), mellan skulderbladen (bronkovesikulärt) och ute över lungfälten (vesikulärt) – och vänd patienten för att lyssna bakifrån."}
          </p>
        )}
      </div>
    </div>
  )
}
