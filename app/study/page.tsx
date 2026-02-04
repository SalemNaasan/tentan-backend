"use client"

import { useState, useMemo, useEffect } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { QuestionCard } from "@/components/question-card"
import { FilterSidebar } from "@/components/filter-sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { mockQuestions } from "@/lib/mock-data"
import type { Semester, ExamType, ExamPeriod, SubjectArea, Question } from "@/lib/types"
import { getCustomQuestions, getDeletedQuestionIds } from "@/lib/questions-store"
import { addFeedback } from "@/lib/feedback-store"
import { Download, X, Filter } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"



export default function StudyPage() {
  const [selectedSemesters, setSelectedSemesters] = useState<Semester[]>([])
  const [selectedExamTypes, setSelectedExamTypes] = useState<ExamType[]>([])
  const [selectedSubjects, setSelectedSubjects] = useState<SubjectArea[]>([])
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([])
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([])
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const [questions, setQuestions] = useState<Question[]>(mockQuestions)

  // Load questions: mock (minus deleted) + custom from admin
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const deleted = getDeletedQuestionIds()
      const mockFiltered = mockQuestions.filter((q) => !deleted.includes(q.id))
      const custom = getCustomQuestions()
      setQuestions([...mockFiltered, ...custom])
    } catch (error) {
      console.error("Failed to load questions from localStorage", error)
    }
  }, [])

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
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
      return true
    })
  }, [questions, selectedSemesters, selectedExamTypes, selectedSubjects, selectedPeriods])

  const handleQuestionSelect = (questionId: string, selected: boolean) => {
    if (selected) {
      setSelectedQuestions((prev) => [...prev, questionId])
    } else {
      setSelectedQuestions((prev) => prev.filter((id) => id !== questionId))
    }
  }

  const handleFeedbackSubmit = (questionId: string, questionPreview: string, feedbackText: string) => {
    if (typeof window === "undefined") return
    addFeedback({ questionId, questionPreview, feedbackText })
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
  }

  const hasActiveFilters =
    selectedSemesters.length > 0 ||
    selectedExamTypes.length > 0 ||
    selectedSubjects.length > 0 ||
    selectedPeriods.length > 0

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

                {/* Anki Export Button */}
                {selectedQuestions.length > 0 && (
                  <Button
                    onClick={handleExportAnki}
                    className="ml-auto gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Exportera till Anki ({selectedQuestions.length})
                  </Button>
                )}
              </div>

              {/* Results Count */}
              <div className="mb-4">
                <p className="text-sm text-muted-foreground">
                  {filteredQuestions.length} fråg{filteredQuestions.length !== 1 ? "or" : "a"} hittades
                </p>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                {filteredQuestions.length > 0 ? (
                  filteredQuestions.map((question) => (
                    <QuestionCard
                      key={question.id}
                      question={question}
                      isSelected={selectedQuestions.includes(question.id)}
                      onSelectChange={(selected) =>
                        handleQuestionSelect(question.id, selected)
                      }
                      onFeedbackSubmit={handleFeedbackSubmit}
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
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
