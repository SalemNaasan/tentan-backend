"use client"

export const dynamic = "force-dynamic"


import { useState, useMemo, useEffect } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { QuestionCard } from "@/components/question-card"
import { FilterSidebar } from "@/components/filter-sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
// import { mockQuestions } from "@/lib/mock-data"
import type { Semester, ExamType, ExamPeriod, SubjectArea, Question, InteractionType } from "@/lib/types"
// import { getCustomQuestions, getDeletedQuestionIds } from "@/lib/questions-store"

// import { addFeedback } from "@/lib/feedback-store"

import { Download, X, Filter, ChevronLeft, ChevronRight, CheckSquare, Square, Star, ArrowUpDown, ArrowUp, ArrowDown, Search } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { getBookmarkedIds, toggleBookmark as toggleBookmarkInStore } from "@/lib/bookmarks-store"

const PAGE_SIZE = 10




export default function StudyPage() {
  const [selectedSemesters, setSelectedSemesters] = useState<Semester[]>([])
  const [selectedExamTypes, setSelectedExamTypes] = useState<ExamType[]>([])
  const [selectedSubjects, setSelectedSubjects] = useState<SubjectArea[]>([])
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([])
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([])
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([])
  const [isOnlyBookmarked, setIsOnlyBookmarked] = useState(false)
  const [selectedInteractions, setSelectedInteractions] = useState<InteractionType[]>([])
  const [sortBy, setSortBy] = useState<"number-asc" | "number-desc" | "points-asc" | "points-desc">("number-asc")
  const [searchQuery, setSearchQuery] = useState("")


  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)


  // Load questions: mock + custom - deleted from global DB
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/questions", { cache: "no-store" })
        if (!res.ok) throw new Error("Failed to fetch")
        const allQuestions = await res.json()
        setQuestions(allQuestions)
        setBookmarkedIds(getBookmarkedIds())
      } catch (error) {
        console.error("Failed to load questions", error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedSemesters, selectedExamTypes, selectedSubjects, selectedPeriods, isOnlyBookmarked, selectedInteractions, searchQuery])

  const filteredQuestions = useMemo(() => {

    return questions.filter((q) => {
      if (q.isHidden) {
        return false
      }
      if (isOnlyBookmarked && !bookmarkedIds.includes(q.id)) {
        return false
      }
      if (selectedSemesters.length > 0 && !selectedSemesters.includes(q.semester)) {
        return false
      }
      if (selectedExamTypes.length > 0 && !selectedExamTypes.includes(q.examType)) {
        return false
      }
      if (selectedSubjects.length > 0 && !selectedSubjects.includes(q.subjectArea)) {
        return false
      }
      if (selectedPeriods.length > 0 && !selectedPeriods.includes(q.examPeriod)) {
        return false
      }
      if (selectedInteractions.length > 0 && !selectedInteractions.includes(q.interaction)) {
        return false
      }
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase().trim()
        const matchesText = q.questionText.toLowerCase().includes(query)
        const matchesNumber = q.questionNumber.toString().includes(query)
        const matchesSubject = q.subjectArea.toLowerCase().includes(query)
        if (!matchesText && !matchesNumber && !matchesSubject) {
          return false
        }
      }
      return true
    }).sort((a, b) => {
      if (sortBy === "number-asc" || sortBy === "number-desc") {
        const numA = Number(a.questionNumber) || 0
        const numB = Number(b.questionNumber) || 0
        return sortBy === "number-asc" ? numA - numB : numB - numA
      } else {
        const pA = a.points || 0
        const pB = b.points || 0
        return sortBy === "points-asc" ? pA - pB : pB - pA
      }
    })
  }, [questions, selectedSemesters, selectedExamTypes, selectedSubjects, selectedPeriods, isOnlyBookmarked, bookmarkedIds, selectedInteractions, sortBy, searchQuery])

  const totalPages = Math.ceil(filteredQuestions.length / PAGE_SIZE)

  const paginatedQuestions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredQuestions.slice(start, start + PAGE_SIZE)
  }, [filteredQuestions, currentPage])

  const handleToggleBookmark = (id: string) => {
    const next = toggleBookmarkInStore(id)
    setBookmarkedIds(next)
  }

  const handleQuestionSelect = (questionId: string, selected: boolean) => {
    if (selected) {
      setSelectedQuestions((prev) => [...prev, questionId])
    } else {
      setSelectedQuestions((prev) => prev.filter((id) => id !== questionId))
    }
  }

  const handleSelectAll = () => {
    const allFilteredIds = filteredQuestions.map(q => q.id)
    const allSelected = allFilteredIds.every(id => selectedQuestions.includes(id))

    if (allSelected) {
      // Remove all filtered from selection
      setSelectedQuestions(prev => prev.filter(id => !allFilteredIds.includes(id)))
    } else {
      // Add all filtered to selection (avoiding duplicates)
      setSelectedQuestions(prev => {
        const newSet = new Set([...prev, ...allFilteredIds])
        return Array.from(newSet)
      })
    }
  }

  const handleFeedbackSubmit = async (questionId: string, questionPreview: string, feedbackText: string) => {
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, questionPreview, feedbackText })
      })
      if (!res.ok) throw new Error("Failed to submit feedback")
    } catch (error) {
      console.error("Error submitting feedback", error)
    }
  }

  const handleExportAnki = async () => {
    const questionsToExport = questions.filter((q) =>
      selectedQuestions.includes(q.id)
    )

    if (questionsToExport.length === 0) {
      return
    }

    const payload = {
      deckName: "tentan.nu - Övningsfrågor",
      cards: questionsToExport.map((q) => ({
        front: q.questionText,
        back: q.answer,
        imageUrl: q.imageUrl,
      })),
    }

    try {
      const res = await fetch("/api/anki-export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        console.error("Failed to export Anki deck", await res.text())
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "tentan-nu-anki-export.apkg"
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error exporting Anki deck", error)
    }
  }

  const clearAllFilters = () => {
    setSelectedSemesters([])
    setSelectedExamTypes([])
    setSelectedSubjects([])
    setSelectedPeriods([])
    setSelectedInteractions([])
    setIsOnlyBookmarked(false)
  }

  const hasActiveFilters =
    selectedSemesters.length > 0 ||
    selectedExamTypes.length > 0 ||
    selectedSubjects.length > 0 ||
    selectedPeriods.length > 0 ||
    selectedInteractions.length > 0 ||
    isOnlyBookmarked

  const filterSidebarContent = (
    <FilterSidebar
      selectedSemesters={selectedSemesters}
      setSelectedSemesters={setSelectedSemesters}
      selectedExamTypes={selectedExamTypes}
      setSelectedExamTypes={setSelectedExamTypes}
      selectedSubjects={selectedSubjects}
      setSelectedSubjects={setSelectedSubjects}
      selectedPeriods={selectedPeriods}
      setSelectedPeriods={setSelectedPeriods}
      isOnlyBookmarked={isOnlyBookmarked}
      onShowOnlyBookmarkedChange={setIsOnlyBookmarked}
      selectedInteractions={selectedInteractions}
      setSelectedInteractions={setSelectedInteractions}
    />
  )

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Övningsfrågor
            </h1>
            <p className="mt-2 text-muted-foreground">
              Bläddra och öva på gamla tentafrågor. Välj frågor för att exportera till Anki.
            </p>
          </div>

          <div className="flex gap-8">
            {/* Desktop Sidebar */}
            <aside className="hidden w-64 shrink-0 lg:block">
              {filterSidebarContent}
            </aside>

            {/* Main Content */}
            <div className="flex-1">
              {/* Header / Stats */}
              <div className="mb-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Antal frågor</h2>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-foreground">
                          {filteredQuestions.length}
                        </span>
                      </div>
                    </div>
                    <div className="h-10 w-px bg-border hidden sm:block" />
                    <div>
                      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Bokmärkta</h2>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xl font-bold text-foreground">{bookmarkedIds.length}</span>
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      </div>
                    </div>
                  </div>

                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Sök i frågor (text, nummer, ämne)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-11 bg-secondary/30 border-border/50 focus:bg-background transition-all"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  {selectedQuestions.length > 0 && (
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="gap-1.5 py-1 px-3 bg-primary/5 text-primary border-primary/10">
                        <Download className="h-3 w-3" />
                        {selectedQuestions.length} markerade
                      </Badge>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleExportAnki}
                        className="h-9 px-4 text-sm gap-2 bg-[#0066FF] hover:bg-[#0052CC] text-white border-none shadow-sm transition-all"
                      >
                        Exportera till Anki
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile Filter Button & Active Filters */}
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="lg:hidden gap-2 bg-transparent">
                      <Filter className="h-4 w-4" />
                      Filter
                      {hasActiveFilters && (
                        <Badge variant="secondary" className="ml-1">
                          {selectedSemesters.length + selectedExamTypes.length + selectedSubjects.length}
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 p-6">
                    <SheetTitle className="sr-only">Filtrera frågor</SheetTitle>
                    {filterSidebarContent}
                  </SheetContent>
                </Sheet>

                {hasActiveFilters && (
                  <>
                    <div className="hidden items-center gap-2 lg:flex">
                      {selectedSemesters.map((s) => (
                        <Badge key={s} variant="secondary" className="gap-1">
                          {s}
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedSemesters((prev) =>
                                prev.filter((x) => x !== s)
                              )
                            }
                            className="ml-1 hover:text-foreground"
                          >
                            <X className="h-3 w-3" />
                            <span className="sr-only">Ta bort {s} filter</span>
                          </button>
                        </Badge>
                      ))}
                      {selectedExamTypes.map((t) => (
                        <Badge key={t} variant="secondary" className="gap-1">
                          {t === "regular" ? "Ordinarie" : "Omtenta"}
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedExamTypes((prev) =>
                                prev.filter((x) => x !== t)
                              )
                            }
                            className="ml-1 hover:text-foreground"
                          >
                            <X className="h-3 w-3" />
                            <span className="sr-only">Ta bort {t} filter</span>
                          </button>
                        </Badge>
                      ))}
                      {selectedSubjects.map((s) => (
                        <Badge key={s} variant="secondary" className="gap-1">
                          {s}
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedSubjects((prev) =>
                                prev.filter((x) => x !== s)
                              )
                            }
                            className="ml-1 hover:text-foreground"
                          >
                            <X className="h-3 w-3" />
                            <span className="sr-only">Ta bort {s} filter</span>
                          </button>
                        </Badge>
                      ))}
                      {selectedPeriods.map((p) => (
                        <Badge key={p} variant="secondary" className="gap-1">
                          Period {p}
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedPeriods((prev) =>
                                prev.filter((x) => x !== p)
                              )
                            }
                            className="ml-1 hover:text-foreground"
                          >
                            <X className="h-3 w-3" />
                            <span className="sr-only">Ta bort Period {p} filter</span>
                          </button>
                        </Badge>
                      ))}
                      {selectedInteractions.map((i) => (
                        <Badge key={i} variant="secondary" className="gap-1">
                          {i === "check_answers" ? "Flerval" : "Skrivfrågor"}
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedInteractions((prev) =>
                                prev.filter((x) => x !== i)
                              )
                            }
                            className="ml-1 hover:text-foreground"
                          >
                            <X className="h-3 w-3" />
                            <span className="sr-only">Ta bort {i} filter</span>
                          </button>
                        </Badge>
                      ))}
                      {isOnlyBookmarked && (
                        <Badge variant="secondary" className="gap-1">
                          Bokmärkta
                          <button
                            type="button"
                            onClick={() => setIsOnlyBookmarked(false)}
                            className="ml-1 hover:text-foreground"
                          >
                            <X className="h-3 w-3" />
                            <span className="sr-only">Ta bort bokmärkta filter</span>
                          </button>
                        </Badge>
                      )}
                      {searchQuery && (
                        <Badge variant="secondary" className="gap-1">
                          Sök: "{searchQuery}"
                          <button
                            type="button"
                            onClick={() => setSearchQuery("")}
                            className="ml-1 hover:text-foreground"
                          >
                            <X className="h-3 w-3" />
                            <span className="sr-only">Ta bort sökfilter</span>
                          </button>
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFilters}
                      className="text-muted-foreground"
                    >
                      Rensa alla
                    </Button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 mb-6">
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                  <SelectTrigger className="w-[180px] h-9 text-xs bg-transparent">
                    <SelectValue placeholder="Sortera" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="number-asc">Nummer (Stigande)</SelectItem>
                    <SelectItem value="number-desc">Nummer (Fallande)</SelectItem>
                    <SelectItem value="points-asc">Poäng (Stigande)</SelectItem>
                    <SelectItem value="points-desc">Poäng (Fallande)</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="gap-2 text-xs h-9 bg-transparent"
                >
                  {filteredQuestions.length > 0 &&
                    filteredQuestions.every(q => selectedQuestions.includes(q.id)) ? (
                    <><CheckSquare className="h-4 w-4" /> Avmarkera alla</>
                  ) : (
                    <><Square className="h-4 w-4" /> Markera alla</>
                  )}
                </Button>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                  </div>
                ) : filteredQuestions.length > 0 ? (
                  paginatedQuestions.map((question) => (
                    <QuestionCard
                      key={question.id}
                      question={question}
                      isSelected={selectedQuestions.includes(question.id)}
                      onSelectChange={(selected) =>
                        handleQuestionSelect(question.id, selected)
                      }
                      onFeedbackSubmit={handleFeedbackSubmit}
                      isBookmarked={bookmarkedIds.includes(question.id)}
                      onToggleBookmark={() => handleToggleBookmark(question.id)}
                    />
                  ))
                ) : (
                  <div className="rounded-lg border border-border bg-card p-12 text-center">
                    <p className="text-muted-foreground">
                      Inga frågor matchar dina filter. Prova att justera ditt urval.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4 bg-transparent"
                      onClick={clearAllFilters}
                    >
                      Rensa filter
                    </Button>
                  </div>
                )}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <div className="flex flex-wrap items-center justify-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        className="w-9 h-9"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
