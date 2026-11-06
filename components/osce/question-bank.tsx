"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, Eye, EyeOff, Filter, Search, Star, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { getOsceBookmarks, toggleOsceBookmark } from "@/lib/osce/bookmarks"
import { ALL_QUESTIONS, QUESTION_KINDS, duplicateKey, type OsceQuestion } from "@/lib/osce/questions"
import { OSCE_PERIODS, OSCE_THEMES, examLabel, type OsceItem } from "@/lib/osce/types"
import { Why } from "./item-view"
import { TOOLS } from "./tools"

const PAGE_SIZE = 20
const STAR_COLOR = "#f59e0b"
const FILTER_KEY = "tentan_osce_question_filters"
const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 2 })

type Sort = "newest" | "oldest" | "common" | "points"

interface Filters {
  periods: string[]
  types: string[]
  sessions: string[]
  themes: string[]
  kinds: string[]
  skills: string[]
}

const EMPTY: Filters = { periods: [], types: [], sessions: [], themes: [], kinds: [], skills: [] }

const SKILLS = [...new Set(ALL_QUESTIONS.flatMap(q => q.station.skills))].sort((a, b) => a.localeCompare(b, "sv"))

function Answer({ item }: { item: OsceItem }) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
      {(item.kind === "self" || item.kind === "tool") && (
        <>
          {item.kind === "self" && item.maxPoints !== undefined && (
            <p className="text-xs text-muted-foreground">Max {fmt(item.maxPoints)} p, alla behöver inte vara med.</p>
          )}
          <ul className="space-y-1.5">
            {item.criteria.map(c => (
              <li key={c.id} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span className="flex-1">{c.text}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{fmt(c.points)} p</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {item.kind === "choice" && (
        <ul className="space-y-1.5">
          {item.correct.map(i => (
            <li key={i} className="flex items-start gap-2 text-sm font-medium">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              {item.options[i]}
            </li>
          ))}
        </ul>
      )}
      {item.kind === "numeric" && (
        <p className="flex items-center gap-2 text-sm font-medium">
          <Check className="h-4 w-4 text-emerald-600" />
          {item.min === item.max ? fmt(item.min) : `${fmt(item.min)}–${fmt(item.max)}`} {item.unit}
        </p>
      )}
      <Why text={item.why} />
    </div>
  )
}

function QuestionCard({
  question,
  showAll,
  bookmarked,
  onBookmark,
}: {
  question: OsceQuestion
  showAll: boolean
  bookmarked: boolean
  onBookmark: () => void
}) {
  const [open, setOpen] = useState(false)
  const [figureOpen, setFigureOpen] = useState(false)
  const { station, item, figure } = question
  const visible = open || showAll
  const Figure = figure ? TOOLS[figure.tool] : null

  return (
    <article className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge>{station.theme}</Badge>
        <Badge variant="secondary">{examLabel(station.exam)}</Badge>
        <span className="text-xs text-muted-foreground">
          {station.title} · fråga {question.number} · {fmt(question.points)} p
        </span>
        <button
          type="button"
          onClick={onBookmark}
          aria-pressed={bookmarked}
          aria-label={bookmarked ? "Ta bort bokmärke" : "Bokmärk frågan"}
          className="ml-auto rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Star className="h-5 w-5" style={bookmarked ? { color: STAR_COLOR, fill: STAR_COLOR } : undefined} />
        </button>
      </div>

      {station.scenario && question.number === 1 && <p className="rounded-md bg-muted/40 p-2.5 text-sm leading-relaxed text-muted-foreground">{station.scenario}</p>}

      {item.kind === "tool" && item.examQuestions ? (
        <ol className="list-decimal space-y-1 pl-5 font-medium leading-relaxed text-foreground">
          {item.examQuestions.map((q, i) => (
            <li key={i}>{q}</li>
          ))}
        </ol>
      ) : (
        <p className="font-medium leading-relaxed text-foreground">{item.prompt}</p>
      )}

      {question.exams.length > 1 && (
        <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
          Har kommit på {question.exams.length} tentor: {question.exams.join(", ")}
        </p>
      )}

      {figureOpen && figure && Figure && (
        <div className="rounded-lg border border-border p-3">
          <p className="mb-2 text-sm font-medium">{figure.prompt}</p>
          <Figure item={figure} achieved={[]} onAchieve={() => {}} exam={false} locked={false} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={visible ? "secondary" : "default"} className="gap-1.5" onClick={() => setOpen(o => !o)} disabled={showAll}>
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {visible ? "Dölj svar" : "Visa svar"}
        </Button>
        {figure && Figure && (
          <Button size="sm" variant="outline" onClick={() => setFigureOpen(f => !f)}>
            {figureOpen ? "Dölj bild" : "Visa bild"}
          </Button>
        )}
        <Button asChild size="sm" variant="ghost" className="ml-auto gap-1.5">
          <Link href={`/osce/station/${station.id}`}>
            Öva på stationen <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {visible && <Answer item={item} />}
    </article>
  )
}

function FilterGroup({
  title,
  options,
  selected,
  onChange,
}: {
  title: string
  options: { id: string; label: string }[]
  selected: string[]
  onChange: (next: string[]) => void
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">{title}</h3>
      <div className="space-y-1.5">
        {options.map(o => (
          <Label key={o.id} className="flex cursor-pointer items-center gap-2 text-sm font-normal text-foreground">
            <Checkbox
              checked={selected.includes(o.id)}
              onCheckedChange={v => onChange(v === true ? [...selected, o.id] : selected.filter(x => x !== o.id))}
            />
            {o.label}
          </Label>
        ))}
      </div>
    </div>
  )
}

export function QuestionBank() {
  const [filters, setFilters] = useState<Filters>(EMPTY)
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<Sort>("newest")
  const [unique, setUnique] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [page, setPage] = useState(1)
  const [bookmarks, setBookmarks] = useState<string[]>([])
  const [onlyBookmarked, setOnlyBookmarked] = useState(false)
  const [restored, setRestored] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Filtren ligger kvar när man går in på en station och tillbaka
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(FILTER_KEY) ?? "null")
      if (saved) {
        setFilters({ ...EMPTY, ...saved.filters })
        setSearch(saved.search ?? "")
        setSort(saved.sort ?? "newest")
        setUnique(Boolean(saved.unique))
        setShowAll(Boolean(saved.showAll))
        setPage(saved.page ?? 1)
        setOnlyBookmarked(Boolean(saved.onlyBookmarked))
      }
    } catch {
      // privat läge eller blockerad lagring – standardfiltren gäller
    }
    setBookmarks(getOsceBookmarks())
    setRestored(true)
  }, [])

  useEffect(() => {
    if (!restored) return
    try {
      sessionStorage.setItem(FILTER_KEY, JSON.stringify({ filters, search, sort, unique, showAll, page, onlyBookmarked }))
    } catch {
      // filtren sparas bara om webbläsaren tillåter det
    }
  }, [restored, filters, search, sort, unique, showAll, page, onlyBookmarked])

  const results = useMemo(() => {
    const q = search.trim().toLowerCase()
    const match = (list: string[], value?: string) => list.length === 0 || (value !== undefined && list.includes(value))
    let list = ALL_QUESTIONS.filter(({ id, station, kind, searchText }) => {
      const { period, type, session } = station.exam
      return (
        (!onlyBookmarked || bookmarks.includes(id)) &&
        match(filters.periods, period) &&
        match(filters.types, type) &&
        match(filters.sessions, session) &&
        match(filters.themes, station.theme) &&
        match(filters.kinds, kind) &&
        (filters.skills.length === 0 || filters.skills.some(s => station.skills.includes(s))) &&
        (!q || searchText.includes(q))
      )
    })
    if (unique) {
      const seen = new Set<string>()
      list = list.filter(x => {
        const key = duplicateKey(x)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    }
    // Listan är redan sorterad med senaste tentan först
    if (sort === "oldest") {
      const order = [...new Set(list.map(x => x.station.id))].reverse()
      list = [...list].sort((a, b) => order.indexOf(a.station.id) - order.indexOf(b.station.id) || a.number - b.number)
    } else if (sort === "common") {
      list = [...list].sort((a, b) => b.exams.length - a.exams.length)
    } else if (sort === "points") {
      list = [...list].sort((a, b) => b.points - a.points)
    }
    return list
  }, [filters, search, sort, unique, onlyBookmarked, bookmarks])

  const change = <K extends keyof Filters>(key: K, value: string[]) => {
    setFilters(f => ({ ...f, [key]: value }))
    setPage(1)
  }

  const activeFilters = Object.values(filters).some(v => v.length > 0) || search !== ""
  const clear = () => {
    setFilters(EMPTY)
    setSearch("")
    setPage(1)
  }

  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE))
  const current = Math.min(page, pages)
  const visible = results.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  const sidebar = (
    <div className="space-y-5">
      <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal text-foreground">
        <Checkbox
          checked={onlyBookmarked}
          onCheckedChange={v => {
            setOnlyBookmarked(v === true)
            setPage(1)
          }}
        />
        <Star className="h-4 w-4" style={{ color: STAR_COLOR }} /> Visa endast bokmärkta
      </Label>
      <FilterGroup title="Tenta" options={OSCE_PERIODS.map(p => ({ id: p, label: p }))} selected={filters.periods} onChange={v => change("periods", v)} />
      <FilterGroup
        title="Typ"
        options={[
          { id: "ordinarie", label: "Ordinarie" },
          { id: "omtenta", label: "Omtenta" },
        ]}
        selected={filters.types}
        onChange={v => change("types", v)}
      />
      <FilterGroup
        title="Fm eller em"
        options={[
          { id: "fm", label: "Fm" },
          { id: "em", label: "Em" },
        ]}
        selected={filters.sessions}
        onChange={v => change("sessions", v)}
      />
      <FilterGroup title="Tema" options={OSCE_THEMES.map(t => ({ id: t.id, label: t.id }))} selected={filters.themes} onChange={v => change("themes", v)} />
      <FilterGroup title="Frågetyp" options={QUESTION_KINDS} selected={filters.kinds} onChange={v => change("kinds", v)} />
      <FilterGroup title="Moment" options={SKILLS.map(s => ({ id: s, label: s }))} selected={filters.skills} onChange={v => change("skills", v)} />
    </div>
  )

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-3 gap-1.5">
        <Link href="/osce">
          <ArrowLeft className="h-4 w-4" /> OSCE
        </Link>
      </Button>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Praktiska tentafrågor</h1>
        <p className="mt-2 text-muted-foreground">Alla frågor från de gamla praktiska tentorna. Sortera, sök och se svaren med förklaringar.</p>
      </div>

      <div className="flex gap-8">
        <aside className="hidden w-52 shrink-0 lg:block">{sidebar}</aside>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Antal frågor</h2>
              <span className="text-3xl font-bold text-foreground">{results.length}</span>
            </div>
            <div>
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Bokmärkta</h2>
              <span className="flex items-center gap-1.5 text-3xl font-bold text-foreground">
                {bookmarks.length} <Star className="h-5 w-5" style={{ color: STAR_COLOR, fill: STAR_COLOR }} />
              </span>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="Sök i frågor och svar…"
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 lg:hidden">
                  <Filter className="h-4 w-4" /> Filter
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="overflow-y-auto p-6">
                <SheetTitle className="mb-4">Filter</SheetTitle>
                {sidebar}
              </SheetContent>
            </Sheet>
            <Select value={sort} onValueChange={v => setSort(v as Sort)}>
              <SelectTrigger className="w-48" size="sm" aria-label="Sortering">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Senaste tentan först</SelectItem>
                <SelectItem value="oldest">Äldsta tentan först</SelectItem>
                <SelectItem value="common">Vanligaste frågorna</SelectItem>
                <SelectItem value="points">Mest poäng</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant={showAll ? "default" : "outline"} className="gap-1.5" onClick={() => setShowAll(s => !s)}>
              {showAll ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showAll ? "Dölj alla svar" : "Visa alla svar"}
            </Button>
            <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
              <Checkbox
                checked={unique}
                onCheckedChange={v => {
                  setUnique(v === true)
                  setPage(1)
                }}
              />
              Visa varje fråga en gång
            </Label>
            {activeFilters && (
              <Button size="sm" variant="ghost" className="gap-1" onClick={clear}>
                <X className="h-4 w-4" /> Rensa
              </Button>
            )}
          </div>

          <div className={cn("space-y-3", results.length === 0 && "hidden")}>
            {visible.map(q => (
              <QuestionCard key={q.id} question={q} showAll={showAll} bookmarked={bookmarks.includes(q.id)} onBookmark={() => setBookmarks(toggleOsceBookmark(q.id))} />
            ))}
          </div>
          {results.length === 0 && (
            <p className="py-10 text-center text-muted-foreground">{onlyBookmarked && bookmarks.length === 0 ? "Du har inga bokmärkta frågor än." : "Inga frågor matchar filtren."}</p>
          )}

          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button size="icon" variant="outline" disabled={current === 1} onClick={() => setPage(current - 1)} aria-label="Föregående sida">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm tabular-nums text-muted-foreground">
                Sida {current} av {pages}
              </span>
              <Button size="icon" variant="outline" disabled={current === pages} onClick={() => setPage(current + 1)} aria-label="Nästa sida">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
