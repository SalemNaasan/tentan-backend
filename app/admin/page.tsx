"use client"

export const dynamic = "force-dynamic"


import React from "react"
import { useState, useCallback, useEffect } from "react"
import * as XLSX from "xlsx"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Upload, FileText, Check, X, Edit2, Loader2, AlertCircle, Lock, Trash2, List, MessageSquare, Eye, EyeOff, Search, ArrowUpDown, Plus, PlusCircle, Image as ImageIcon, BookOpen, Bell, Briefcase } from "lucide-react"
import type { Semester, ExamType, SubjectArea, ExamPeriod, InteractionType, Question, QuestionFeedback, FeedbackStatus, PPLCase } from "@/lib/types"
import { EXAM_PERIODS } from "@/lib/types"
import { ImageUpload } from "@/components/admin/image-upload"
// import { mockQuestions } from "@/lib/mock-data"
// import {
//   getCustomQuestions,
//   setCustomQuestions,
//   getDeletedQuestionIds,
//   setDeletedQuestionIds,
// } from "@/lib/questions-store"

// import { getFeedback, updateFeedbackStatus } from "@/lib/feedback-store"


const ADMIN_PASSWORD = "salem"

interface ExtractedQuestion {
  id: string
  questionNumber: string
  theme: string
  interaction: InteractionType
  questionText: string
  options?: string[]
  correctAnswer: string | string[]
  points?: number
  status: "pending" | "approved" | "rejected" | "editing"
}

interface UploadState {
  status: "idle" | "uploading" | "processing" | "complete" | "error"
  progress: number
  fileName?: string
  error?: string
}

// Only show the tema codes you actually use
const subjects: SubjectArea[] = ["pu", "gen", "gnm", "vf", "erl", "cren", "ibi", "nspr"]

const subjectLabels: Record<SubjectArea, string> = {
  pu: "PU",
  gen: "GEN",
  gnm: "GNM",
  vf: "VF",
  erl: "ERL",
  cren: "CREN",
  ibi: "IBI",
  nspr: "NSPR",
  Other: "Övrigt",
}

// Helper function to map Excel \"tema\" to SubjectArea codes
function mapSubjectToArea(tema: string): SubjectArea {
  if (!tema) return "Other"
  const lowerTema = tema.toLowerCase().trim()
  if (lowerTema.startsWith("pu")) return "pu"
  if (lowerTema.startsWith("gen")) return "gen"
  if (lowerTema.startsWith("gnm")) return "gnm"
  if (lowerTema.startsWith("vf")) return "vf"
  if (lowerTema.startsWith("erl")) return "erl"
  if (lowerTema.startsWith("cren")) return "cren"
  if (lowerTema.startsWith("ibi")) return "ibi"
  if (lowerTema.startsWith("nspr")) return "nspr"
  return "Other"
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [passwordInput, setPasswordInput] = useState("")
  const [passwordError, setPasswordError] = useState(false)

  const [uploadState, setUploadState] = useState<UploadState>({
    status: "idle",
    progress: 0,
  })
  const [selectedSemester, setSelectedSemester] = useState<Semester>("T1")
  const [selectedExamType, setSelectedExamType] = useState<ExamType>("regular")
  const [selectedPeriod, setSelectedPeriod] = useState<ExamPeriod>("VT24")
  const [extractedQuestions, setExtractedQuestions] = useState<ExtractedQuestion[]>([])
  const [editingQuestion, setEditingQuestion] = useState<ExtractedQuestion | null>(null)
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([])
  const [editingAvailableQuestion, setEditingAvailableQuestion] = useState<Question | null>(null)
  const [feedbackList, setFeedbackList] = useState<QuestionFeedback[]>([])
  const [newsContent, setNewsContent] = useState("")
  const [newsLoading, setNewsLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [pplCases, setPplCases] = useState<PPLCase[]>([])
  const [pplCasesLoading, setPplCasesLoading] = useState(false)
  const [pplCaseSaveLoading, setPplCaseSaveLoading] = useState(false)
  const [editingPplCase, setEditingPplCase] = useState<Partial<PPLCase> | null>(null)

  // Manage tab filters
  const [manageSearchQuery, setManageSearchQuery] = useState("")
  const [manageSemester, setManageSemester] = useState<Semester | "all">("all")
  const [manageSubject, setManageSubject] = useState<SubjectArea | "all">("all")
  const [manageVisibility, setManageVisibility] = useState<"all" | "visible" | "hidden">("all")
  const [manageSortOrder, setManageSortOrder] = useState<"asc" | "desc">("desc")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newQuestion, setNewQuestion] = useState<Partial<Question>>({
    semester: "T1",
    examType: "regular",
    examPeriod: "VT24",
    subjectArea: "pu",
    questionNumber: 1,
    interaction: "show_answer",
    questionText: "",
    answer: "",
    correctAnswer: "",
    options: [],
    points: 1,
  })

  const loadAvailableQuestions = useCallback(async () => {
    try {
      const res = await fetch("/api/questions", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setAvailableQuestions(data)
    } catch (error) {
      console.error("Failed to load questions", error)
    }
  }, [])

  const loadFeedback = useCallback(async () => {
    try {
      const res = await fetch("/api/feedback", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setFeedbackList(data)
    } catch (error) {
      console.error("Failed to load feedback", error)
    }
  }, [])

  const loadNews = useCallback(async () => {
    setNewsLoading(true)
    try {
      const res = await fetch("/api/news", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to fetch news")
      const data = await res.json()
      if (data && data.content) {
        setNewsContent(data.content)
      }
    } catch (error) {
      console.error("Failed to load news", error)
    } finally {
      setNewsLoading(false)
    }
  }, [])

  const loadPPLCases = useCallback(async () => {
    setPplCasesLoading(true)
    try {
      const res = await fetch("/api/cases", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to fetch cases")
      const data = await res.json()
      setPplCases(data)
    } catch (error) {
      console.error("Failed to load cases", error)
    } finally {
      setPplCasesLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAvailableQuestions()
  }, [loadAvailableQuestions])

  useEffect(() => {
    loadFeedback()
  }, [loadFeedback])

  useEffect(() => {
    loadNews()
  }, [loadNews])

  useEffect(() => {
    loadPPLCases()
  }, [loadPPLCases])

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file type
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ]
    const isExcel = validTypes.includes(file.type) || file.name.endsWith(".xlsx") || file.name.endsWith(".xls")

    if (!isExcel) {
      setUploadState({
        status: "error",
        progress: 0,
        error: "Vänligen ladda upp en Excel-fil (.xlsx eller .xls)",
      })
      return
    }

    setUploadState({
      status: "uploading",
      progress: 0,
      fileName: file.name,
    })

    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()
      setUploadState((prev) => ({ ...prev, progress: 30 }))

      // Parse Excel file
      const workbook = XLSX.read(arrayBuffer, { type: "array" })
      setUploadState((prev) => ({ ...prev, progress: 50, status: "processing" }))

      // Get the first sheet
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]

      // Convert to JSON - expecting columns: frågnummer, tema, fråga, svarförslag
      const data = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 })

      setUploadState((prev) => ({ ...prev, progress: 70 }))

      // Skip header row (first row contains column names)
      const rows = data.slice(1)

      // Parse questions from rows
      const extractedQs: ExtractedQuestion[] = []

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i] as any[]
        if (!row) continue

        // Manually map row array to a string-based object as requested
        // columns: question_id, theme, interaction, question_text, options, correct_answer
        const excelRow = {
          qId: row[0] != null ? String(row[0]) : "",
          theme: row[1] != null ? String(row[1]) : "",
          interaction: row[2] != null ? String(row[2]) : "show_answer",
          qText: row[3] != null ? String(row[3]) : "",
          optionsStr: row[4] != null ? String(row[4]) : "",
          correctAnsStr: row[5] != null ? String(row[5]) : "",
          points: row[6] != null ? Number(row[6]) : undefined,
        }

        if (excelRow.qText.trim() === "") continue

        const interaction = (excelRow.interaction.trim().toLowerCase() === "check_answers" || excelRow.interaction.trim().toLowerCase().includes("sant eller falskt"))
          ? "check_answers" as const
          : "show_answer" as const

        // Parse options (pipe separated)
        let options: string[] | undefined
        if (excelRow.optionsStr) {
          options = excelRow.optionsStr.split("|").map((s: string) => s.trim()).filter(Boolean)
        }

        // Parse correct answer as keys (a, b, c...)
        let correctAnswer: string | string[]
        if (interaction === "check_answers") {
          // Split by either pipe or comma, then lowercase to handle 'A', 'a', etc.
          correctAnswer = excelRow.correctAnsStr.split(/[|,]/).map((s: string) => s.trim().toLowerCase()).filter(Boolean)
        } else {
          correctAnswer = excelRow.correctAnsStr.trim()
        }

        extractedQs.push({
          id: `eq${i + 1}`,
          questionNumber: excelRow.qId || `${i + 1}`,
          theme: excelRow.theme,
          interaction,
          questionText: excelRow.qText.trim(),
          options,
          correctAnswer,
          points: excelRow.points,
          status: "pending" as const,
        })

        // Update progress
        const progress = 70 + Math.floor((i / rows.length) * 25)
        setUploadState((prev) => ({ ...prev, progress }))
      }

      if (extractedQs.length === 0) {
        setUploadState({
          status: "error",
          progress: 0,
          error: "Inga frågor hittades i Excel-filen. Kontrollera att filen har kolumner: question_id, theme, interaction, question_text, options, correct_answer",
        })
        return
      }

      setExtractedQuestions(extractedQs)
      setUploadState((prev) => ({ ...prev, status: "complete", progress: 100 }))
    } catch (error) {
      console.error("Excel processing error:", error)
      setUploadState({
        status: "error",
        progress: 0,
        error: "Kunde inte läsa Excel-filen. Kontrollera att filen inte är skadad.",
      })
    }
  }, [])

  const handleApprove = (questionId: string) => {
    setExtractedQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, status: "approved" as const } : q))
    )
  }

  const handleReject = (questionId: string) => {
    setExtractedQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, status: "rejected" as const } : q))
    )
  }

  const handleEdit = (question: ExtractedQuestion) => {
    setEditingQuestion({ ...question })
  }

  const handleSaveEdit = () => {
    if (!editingQuestion) return

    let finalAnswer = editingQuestion.correctAnswer
    if (typeof finalAnswer === "string" && finalAnswer.trim().startsWith("[")) {
      try {
        finalAnswer = JSON.parse(finalAnswer)
      } catch (e) {
        console.warn("Could not parse correctAnswer as JSON, keeping as string")
      }
    }

    setExtractedQuestions((prev) =>
      prev.map((q) =>
        q.id === editingQuestion.id
          ? { ...editingQuestion, correctAnswer: finalAnswer, status: "approved" as const }
          : q
      )
    )
    setEditingQuestion(null)
  }

  const handleSaveAll = async () => {
    const approved = extractedQuestions.filter((q) => q.status === "approved")

    if (approved.length === 0) {
      return
    }

    // Map approved extracted questions to the shared Question type
    const newQuestions: Question[] = approved.map((q, index) => ({
      id: `custom-${Date.now()}-${index}`,
      semester: selectedSemester,
      examType: selectedExamType,
      examDate: "",
      examPeriod: selectedPeriod,
      subjectArea: mapSubjectToArea(q.theme),
      questionNumber: Number(q.questionNumber) || index + 1,
      questionText: q.questionText,
      interaction: q.interaction,
      options: q.options,
      correctAnswer: q.correctAnswer,
      answer: Array.isArray(q.correctAnswer) ? q.correctAnswer.join(", ") : (q.correctAnswer as string),
      points: q.points,
    }))

    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newQuestions)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save")

      await loadAvailableQuestions()
      alert(`${newQuestions.length} frågor sparades och kommer visas för alla användare.`)
      setExtractedQuestions([])
    } catch (error: any) {
      console.error("Failed to save questions", error)
      alert(`Kunde inte spara frågorna till databasen: ${error.message}`)
    }
  }

  const handleSaveNews = async () => {
    // ... same
  }

  const handleSavePplCase = async () => {
    if (!editingPplCase?.title || !editingPplCase?.description) {
      alert("Fyll i både titel och beskrivning.")
      return
    }
    setPplCaseSaveLoading(true)
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingPplCase)
      })
      if (!res.ok) throw new Error("Failed to save case")
      await loadPPLCases()
      setEditingPplCase(null)
      alert("PPL-fall sparat!")
    } catch (error: any) {
      console.error("Failed to save PPL case", error)
      alert(`Kunde inte spara PPL-fall: ${error.message}`)
    } finally {
      setPplCaseSaveLoading(false)
    }
  }

  const handleDeletePplCase = async (id: string) => {
    if (!confirm("Är du säker på att du vill ta bort detta PPL-fall?")) return
    try {
      const res = await fetch(`/api/cases?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete case")
      await loadPPLCases()
    } catch (error) {
      console.error("Failed to delete PPL case", error)
      alert("Kunde inte ta bort PPL-fallet.")
    }
  }

  const handleDeleteAvailable = async (questionId: string) => {
    if (!confirm("Är du säker på att du vill ta bort denna fråga? Den tas bort för alla användare.")) return

    try {
      const res = await fetch(`/api/questions?id=${questionId}`, {
        method: "DELETE"
      })
      if (!res.ok) throw new Error("Failed to delete")
      await loadAvailableQuestions()
    } catch (error) {
      console.error("Failed to delete question", error)
      alert("Kunde inte ta bort frågan.")
    }
  }


  const handleEditAvailable = (question: Question) => {
    setEditingAvailableQuestion({ ...question })
  }

  const handleSaveEditAvailable = async () => {
    if (!editingAvailableQuestion) return

    let finalCorrectAnswer = editingAvailableQuestion.correctAnswer
    let finalAnswer = editingAvailableQuestion.answer

    // Robust parsing for multiple choice
    if (editingAvailableQuestion.interaction === "check_answers") {
      if (typeof finalCorrectAnswer === "string") {
        const trimmed = finalCorrectAnswer.trim()
        if (trimmed.startsWith("[")) {
          try {
            finalCorrectAnswer = JSON.parse(trimmed)
          } catch {
            // Fallback for malformed JSON
            finalCorrectAnswer = trimmed.split(/[|,]/).map(s => s.trim().toLowerCase()).filter(Boolean)
          }
        } else {
          // Comma or pipe separated fallback
          finalCorrectAnswer = trimmed.split(/[|,]/).map(s => s.trim().toLowerCase()).filter(Boolean)
        }
      }
      // Ensure it's an array for display field too if it's check_answers
      if (Array.isArray(finalCorrectAnswer)) {
        finalAnswer = finalCorrectAnswer.join(", ")
      } else {
        finalCorrectAnswer = [String(finalCorrectAnswer).toLowerCase().trim()]
        finalAnswer = String(finalCorrectAnswer[0])
      }
    } else {
      // For show_answer, just ensure it's a string
      finalCorrectAnswer = Array.isArray(finalCorrectAnswer) ? finalCorrectAnswer.join(", ") : String(finalCorrectAnswer)
      finalAnswer = finalCorrectAnswer
    }

    const questionToSave = {
      ...editingAvailableQuestion,
      correctAnswer: finalCorrectAnswer,
      answer: finalAnswer
    }

    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([questionToSave])
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save")

      await loadAvailableQuestions()
      setEditingAvailableQuestion(null)
    } catch (error: any) {
      console.error("Failed to save edit", error)
      alert(`Kunde inte spara ändringarna: ${error.message}`)
    }
  }

  const handleCreateQuestion = async () => {
    if (!newQuestion.questionText) {
      alert("Vänligen fyll i frågetexten.")
      return
    }

    let finalCorrectAnswer = newQuestion.correctAnswer || ""
    let finalAnswer = newQuestion.answer || ""
    let finalOptions = newQuestion.options || []

    // Interaction specific logic
    if (newQuestion.interaction === "check_answers") {
      if (typeof finalCorrectAnswer === "string") {
        const trimmed = finalCorrectAnswer.trim()
        if (trimmed.startsWith("[")) {
          try {
            const parsed = JSON.parse(trimmed)
            finalCorrectAnswer = Array.isArray(parsed) ? parsed : [parsed]
          } catch {
            finalCorrectAnswer = trimmed.split(/[|,]/).map(s => s.trim().toLowerCase()).filter(Boolean)
          }
        } else {
          finalCorrectAnswer = trimmed.split(/[|,]/).map(s => s.trim().toLowerCase()).filter(Boolean)
        }
      }
      finalAnswer = Array.isArray(finalCorrectAnswer) ? finalCorrectAnswer.join(", ") : String(finalCorrectAnswer)
    } else if (newQuestion.interaction === "drag_matching" || newQuestion.interaction === "drag_ordering") {
      // Ensure correctAnswer and options are handled correctly as JSON strings for Supabase if needed
      // Actually the API handles them as they are. If it's matching/ordering, the correctAnswer is usually a JSON string.
      if (typeof finalCorrectAnswer === "string" && !finalCorrectAnswer.trim().startsWith("{") && !finalCorrectAnswer.trim().startsWith("[")) {
        // Simple validation or formatting could go here
      }
      if (!finalAnswer) finalAnswer = "Dra och släpp för att svara."
    } else {
      // show_answer
      finalCorrectAnswer = Array.isArray(finalCorrectAnswer) ? finalCorrectAnswer.join(", ") : String(finalCorrectAnswer)
      finalAnswer = finalCorrectAnswer
    }

    const questionToSave = {
      ...newQuestion,
      correctAnswer: finalCorrectAnswer,
      answer: finalAnswer,
      options: finalOptions
    } as Question

    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([questionToSave])
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save")

      await loadAvailableQuestions()
      setIsCreateDialogOpen(false)
    } catch (error: any) {
      console.error("Failed to create question", error)
      alert(`Kunde inte skapa frågan: ${error.message}`)
    }
  }

  const handleToggleVisibility = async (question: Question) => {
    try {
      const res = await fetch("/api/questions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: question.id, isHidden: !question.isHidden })
      })
      if (!res.ok) throw new Error("Failed to update visibility")
      await loadAvailableQuestions()
    } catch (error) {
      console.error("Failed to toggle visibility", error)
      alert("Kunde inte ändra synlighet.")
    }
  }

  const filteredManageQuestions = availableQuestions.filter(q => {
    if (manageSemester !== "all" && q.semester !== manageSemester) return false
    if (manageSubject !== "all" && q.subjectArea !== manageSubject) return false
    if (manageVisibility === "visible" && q.isHidden) return false
    if (manageVisibility === "hidden" && !q.isHidden) return false

    if (manageSearchQuery.trim() !== "") {
      const query = manageSearchQuery.toLowerCase().trim()
      const matchesText = q.questionText.toLowerCase().includes(query)
      const matchesId = q.id.toLowerCase().includes(query)
      const matchesNumber = q.questionNumber.toString().includes(query)
      if (!matchesText && !matchesId && !matchesNumber) return false
    }
    return true
  }).sort((a, b) => {
    const timeA = a.id.startsWith("custom-") ? parseInt(a.id.split("-")[1]) : 0
    const timeB = b.id.startsWith("custom-") ? parseInt(b.id.split("-")[1]) : 0

    if (manageSortOrder === "desc") {
      return timeB - timeA || b.questionNumber - a.questionNumber
    } else {
      return timeA - timeB || a.questionNumber - b.questionNumber
    }
  })


  const resetUpload = () => {
    setUploadState({ status: "idle", progress: 0 })
    setExtractedQuestions([])
  }

  const approvedCount = extractedQuestions.filter((q) => q.status === "approved").length
  const pendingCount = extractedQuestions.filter((q) => q.status === "pending").length

  const handleFeedbackStatusChange = async (feedbackId: string, status: FeedbackStatus) => {
    try {
      const res = await fetch("/api/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: feedbackId, status })
      })
      if (!res.ok) throw new Error("Failed to update status")
      await loadFeedback()
    } catch (error) {
      console.error("Failed to update feedback status", error)
    }
  }


  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAuthenticated(true)
      setPasswordError(false)
    } else {
      setPasswordError(true)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                  <BookOpen className="h-6 w-6 text-primary-foreground" />
                </div>
              </div>
              <CardTitle className="text-2xl">tentan.nu</CardTitle>
              <CardDescription>
                Ange adminlösenordet för att fortsätta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Lösenord</Label>
                  <Input
                    id="password"
                    type="password"
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value)
                      setPasswordError(false)
                    }}
                    placeholder="Ange adminlösenord"
                    className={passwordError ? "border-destructive" : ""}
                  />
                  {passwordError && (
                    <p className="text-sm text-destructive">Felaktigt lösenord</p>
                  )}
                </div>
                <Button type="submit" className="w-full">
                  Öppna adminpanelen
                </Button>
              </form>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs">Admin</Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Tentahantering
            </h1>
            <p className="mt-2 text-muted-foreground">
              Ladda upp Excel-filer med tentafrågor och granska innan publicering.
            </p>
          </div>

          <Tabs defaultValue="upload" className="space-y-6">
            <TabsList>
              <TabsTrigger value="upload">Ladda upp frågor</TabsTrigger>
              <TabsTrigger value="review" disabled={extractedQuestions.length === 0}>
                Granska frågor
                {extractedQuestions.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {extractedQuestions.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="manage" className="gap-2">
                <List className="h-4 w-4" />
                Befintliga frågor
                <Badge variant="secondary" className="ml-1">
                  {availableQuestions.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="feedback" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Feedback
                {feedbackList.filter((f) => f.status === "new").length > 0 && (
                  <Badge variant="destructive" className="ml-1">
                    {feedbackList.filter((f) => f.status === "new").length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="news" className="gap-2">
                <Bell className="h-4 w-4" />
                Nyheter
              </TabsTrigger>
              <TabsTrigger value="cases" className="gap-2">
                <Briefcase className="h-4 w-4" />
                PPL-fall
              </TabsTrigger>
            </TabsList>

            {/* Upload Tab */}
            <TabsContent value="upload" className="space-y-6">
              {/* Exam Metadata */}
              <Card>
                <CardHeader>
                  <CardTitle>Tentadetaljer</CardTitle>
                  <CardDescription>
                    Ange termin, tentaTyp och datum innan uppladdning.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="semester">Termin</Label>
                      <Select
                        value={selectedSemester}
                        onValueChange={(v) => setSelectedSemester(v as Semester)}
                      >
                        <SelectTrigger id="semester">
                          <SelectValue placeholder="Välj termin" />
                        </SelectTrigger>
                        <SelectContent>
                          {["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10"].map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="examType">TentaTyp</Label>
                      <Select
                        value={selectedExamType}
                        onValueChange={(v) => setSelectedExamType(v as ExamType)}
                      >
                        <SelectTrigger id="examType">
                          <SelectValue placeholder="Välj typ" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="regular">Ordinarie tenta</SelectItem>
                          <SelectItem value="re-exam">Omtenta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="examPeriod">Tentaperiod</Label>
                      <Select
                        value={selectedPeriod}
                        onValueChange={(v) => setSelectedPeriod(v as ExamPeriod)}
                      >
                        <SelectTrigger id="examPeriod">
                          <SelectValue placeholder="Välj period" />
                        </SelectTrigger>
                        <SelectContent>
                          {EXAM_PERIODS.map((p) => (
                            <SelectItem key={p} value={p}>
                              {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Upload Area */}
              <Card>
                <CardHeader>
                  <CardTitle>Ladda upp Excel-fil</CardTitle>
                  <CardDescription>
                    Excel-filen ska ha 4 kolumner: frågnummer, tema, fråga, svarförslag
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {uploadState.status === "idle" && (
                    <label
                      htmlFor="excel-upload"
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-secondary/30 p-12 cursor-pointer hover:bg-secondary/50 transition-colors"
                    >
                      <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                      <p className="text-sm font-medium text-foreground">
                        Klicka för att ladda upp eller dra och släpp
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Excel-filer (.xlsx, .xls)</p>
                      <input
                        id="excel-upload"
                        type="file"
                        accept=".xlsx,.xls"
                        className="sr-only"
                        onChange={handleFileUpload}
                      />
                    </label>
                  )}

                  {(uploadState.status === "uploading" || uploadState.status === "processing") && (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-12">
                      <Loader2 className="h-10 w-10 text-accent animate-spin mb-4" />
                      <p className="text-sm font-medium text-foreground">
                        {uploadState.status === "uploading"
                          ? "Laddar upp..."
                          : "Bearbetar Excel-filen..."}
                      </p>
                      <div className="w-full max-w-xs mt-4">
                        <div className="h-2 rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full bg-accent transition-all duration-300"
                            style={{ width: `${uploadState.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                          {uploadState.progress}%
                        </p>
                      </div>
                    </div>
                  )}

                  {uploadState.status === "complete" && (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-accent/30 bg-accent/5 p-12">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20 mb-4">
                        <Check className="h-6 w-6 text-accent" />
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        Inläsning klar!
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {extractedQuestions.length} frågor lästes in från{" "}
                        {uploadState.fileName}
                      </p>
                      <div className="flex gap-2 mt-4">
                        <Button variant="outline" size="sm" onClick={resetUpload}>
                          Ladda upp en till
                        </Button>
                      </div>
                    </div>
                  )}

                  {uploadState.status === "error" && (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 p-12">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/20 mb-4">
                        <AlertCircle className="h-6 w-6 text-destructive" />
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        Uppladdningen misslyckades
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 text-center max-w-md">
                        {uploadState.error}
                      </p>
                      <Button variant="outline" size="sm" className="mt-4 bg-transparent" onClick={resetUpload}>
                        Försök igen
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Format Help */}
              <Card>
                <CardHeader>
                  <CardTitle>Filformat</CardTitle>
                  <CardDescription>
                    Så här ska din Excel-fil se ut
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border border-border rounded-lg">
                      <thead>
                        <tr className="bg-secondary/50">
                          <th className="px-3 py-2 text-left font-medium border-b border-r border-border">question_id</th>
                          <th className="px-3 py-2 text-left font-medium border-b border-r border-border">theme</th>
                          <th className="px-3 py-2 text-left font-medium border-b border-r border-border">interaction</th>
                          <th className="px-3 py-2 text-left font-medium border-b border-r border-border">question_text</th>
                          <th className="px-3 py-2 text-left font-medium border-b border-r border-border">options</th>
                          <th className="px-3 py-2 text-left font-medium border-b border-r border-border">correct_answer</th>
                          <th className="px-3 py-2 text-left font-medium border-b border-border">points</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-3 py-2 border-b border-r border-border font-mono text-xs">1</td>
                          <td className="px-3 py-2 border-b border-r border-border italic text-xs">Anatomi</td>
                          <td className="px-3 py-2 border-b border-r border-border text-xs">check_answers</td>
                          <td className="px-3 py-2 border-b border-r border-border text-xs italic">Vilken nerv...</td>
                          <td className="px-3 py-2 border-b border-r border-border text-xs">Val A | Val B | Val C</td>
                          <td className="px-3 py-2 border-b border-r border-border text-xs">a</td>
                          <td className="px-3 py-2 border-b border-border text-xs">1</td>
                        </tr>
                        <tr className="bg-secondary/20">
                          <td className="px-3 py-2 border-b border-r border-border text-muted-foreground font-mono text-xs">2</td>
                          <td className="px-3 py-2 border-b border-r border-border text-muted-foreground text-xs italic">Fysiologi</td>
                          <td className="px-3 py-2 border-b border-r border-border text-muted-foreground text-xs">show_answer</td>
                          <td className="px-3 py-2 border-b border-r border-border text-muted-foreground text-xs italic">Para ihop...</td>
                          <td className="px-3 py-2 border-b border-r border-border text-muted-foreground text-xs">-</td>
                          <td className="px-3 py-2 border-b border-r border-border text-muted-foreground text-xs">Svar här</td>
                          <td className="px-3 py-2 border-b border-border text-muted-foreground text-xs">2</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 border-b border-r border-border font-mono text-xs">3</td>
                          <td className="px-3 py-2 border-b border-r border-border italic text-xs">Anatomi</td>
                          <td className="px-3 py-2 border-b border-r border-border text-xs">drag_matching</td>
                          <td className="px-3 py-2 border-b border-r border-border text-xs italic">Matcha...</td>
                          <td className="px-3 py-2 border-b border-r border-border text-xs">A|1 | B|2</td>
                          <td className="px-3 py-2 border-b border-r border-border text-xs italic">Se guide</td>
                          <td className="px-3 py-2 border-b border-border text-xs">2</td>
                        </tr>
                        <tr className="bg-secondary/20">
                          <td className="px-3 py-2 border-r border-border text-muted-foreground font-mono text-xs">4</td>
                          <td className="px-3 py-2 border-r border-border text-muted-foreground text-xs italic">Biokemi</td>
                          <td className="px-3 py-2 border-r border-border text-muted-foreground text-xs">drag_ordering</td>
                          <td className="px-3 py-2 border-r border-border text-muted-foreground text-xs italic">Sortera...</td>
                          <td className="px-3 py-2 border-r border-border text-muted-foreground text-xs">Steg A | Steg B</td>
                          <td className="px-3 py-2 border-r border-border text-muted-foreground text-xs italic">Se guide</td>
                          <td className="px-3 py-2 text-muted-foreground text-xs">3</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Review Tab */}
            <TabsContent value="review" className="space-y-6">
              {/* Summary */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div>
                        <p className="text-2xl font-bold text-foreground">{extractedQuestions.length}</p>
                        <p className="text-xs text-muted-foreground">Totalt antal frågor</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-accent">{approvedCount}</p>
                        <p className="text-xs text-muted-foreground">Godkända</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-muted-foreground">{pendingCount}</p>
                        <p className="text-xs text-muted-foreground">Väntande</p>
                      </div>
                    </div>
                    <Button
                      onClick={handleSaveAll}
                      disabled={approvedCount === 0}
                    >
                      Spara {approvedCount} frågor
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Question List */}
              <div className="space-y-4">
                {extractedQuestions.map((question) => (
                  <Card key={question.id} className={
                    question.status === "approved"
                      ? "border-accent/50"
                      : question.status === "rejected"
                        ? "border-destructive/50 opacity-60"
                        : ""
                  }>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              Fråga {question.questionNumber}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {question.theme}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {question.interaction}
                            </Badge>
                            {question.status === "approved" && (
                              <Badge className="bg-accent text-accent-foreground text-xs">Godkänd</Badge>
                            )}
                            {question.status === "rejected" && (
                              <Badge variant="destructive" className="text-xs">Avvisad</Badge>
                            )}
                            {question.points !== undefined && (
                              <Badge variant="outline" className="text-xs bg-accent/5 border-accent/20">
                                {question.points} p
                              </Badge>
                            )}
                          </div>

                          <div>
                            <p className="font-medium text-foreground whitespace-pre-wrap">{question.questionText}</p>
                          </div>

                          <div className="rounded-lg bg-secondary/50 p-3">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Korrekt svar / Alternativ:</p>
                              <p className="text-sm text-foreground">
                                {Array.isArray(question.correctAnswer)
                                  ? question.correctAnswer.join(", ")
                                  : question.correctAnswer?.toString()}
                                {question.options && ` (Alternativ: ${question.options.join(", ")})`}
                              </p>
                            </div>
                          </div>
                        </div>

                        {question.status === "pending" && (
                          <div className="flex flex-col gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-transparent"
                              onClick={() => handleApprove(question.id)}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Godkänn
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-transparent"
                              onClick={() => handleEdit(question)}
                            >
                              <Edit2 className="h-4 w-4 mr-1" />
                              Redigera
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:text-destructive bg-transparent"
                              onClick={() => handleReject(question.id)}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Avvisa
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Manage Tab - Edit/Delete available questions */}
            <TabsContent value="manage" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Hantera befintliga frågor</CardTitle>
                  <CardDescription>
                    Redigera eller ta bort frågor som visas på Övningsfrågor-sidan.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Filters Bar */}
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                    <div className="lg:col-span-2 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Sök på text, nummer eller ID..."
                        value={manageSearchQuery}
                        onChange={(e) => setManageSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Select value={manageSemester} onValueChange={(v) => setManageSemester(v as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Alla terminer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alla terminer</SelectItem>
                        {["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10"].map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={manageSubject} onValueChange={(v) => setManageSubject(v as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Alla ämnen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alla ämnen</SelectItem>
                        {subjects.map(s => (
                          <SelectItem key={s} value={s}>{subjectLabels[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={manageVisibility} onValueChange={(v) => setManageVisibility(v as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Synlighet" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alla (Synliga/Dolda)</SelectItem>
                        <SelectItem value="visible">Endast synliga</SelectItem>
                        <SelectItem value="hidden">Endast dolda</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center gap-4">
                      <p className="text-sm text-muted-foreground">
                        Visar <span className="font-medium text-foreground">{filteredManageQuestions.length}</span> av {availableQuestions.length} frågor
                      </p>
                      <Button
                        size="sm"
                        onClick={() => {
                          setNewQuestion({
                            id: `custom-${Date.now()}`,
                            semester: "T1",
                            examType: "regular",
                            examDate: new Date().toISOString().split('T')[0],
                            examPeriod: "VT24",
                            subjectArea: "pu",
                            questionNumber: availableQuestions.length + 1,
                            interaction: "show_answer",
                            questionText: "",
                            answer: "",
                            correctAnswer: "",
                            options: [],
                            points: 1,
                          })
                          setIsCreateDialogOpen(true)
                        }}
                        className="gap-2 h-8"
                      >
                        <Plus className="h-4 w-4" />
                        Skapa ny fråga
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setManageSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                      className="gap-2"
                    >
                      <ArrowUpDown className="h-4 w-4" />
                      Sortera: {manageSortOrder === "desc" ? "Nyaste först" : "Äldsta först"}
                    </Button>
                  </div>

                  {filteredManageQuestions.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      Inga frågor matchar dina filter.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {filteredManageQuestions.map((question) => (
                        <Card key={question.id} className="border-border">
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline" className="text-xs">
                                    {question.semester} · {question.examType === "regular" ? "Ordinarie" : "Omtenta"}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {subjectLabels[question.subjectArea]}
                                  </Badge>
                                  {question.points !== undefined && (
                                    <Badge variant="outline" className="text-xs bg-accent/5 border-accent/20">
                                      {question.points} p
                                    </Badge>
                                  )}
                                  {question.id.startsWith("custom-") && (
                                    <Badge variant="outline" className="text-xs text-muted-foreground">
                                      Egna
                                    </Badge>
                                  )}
                                  {question.isHidden && (
                                    <Badge variant="destructive" className="text-xs">
                                      Dold
                                    </Badge>
                                  )}
                                </div>
                                <p className={`font-medium text-foreground line-clamp-2 whitespace-pre-wrap ${question.isHidden ? "opacity-50" : ""}`}>{question.questionText}</p>
                                <p className="text-sm text-muted-foreground line-clamp-1 whitespace-pre-wrap">{question.answer}</p>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-transparent"
                                  title={question.isHidden ? "Visa fråga" : "Dölj fråga"}
                                  onClick={() => handleToggleVisibility(question)}
                                >
                                  {question.isHidden ? (
                                    <Eye className="h-4 w-4" />
                                  ) : (
                                    <EyeOff className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-transparent"
                                  onClick={() => handleEditAvailable(question)}
                                >
                                  <Edit2 className="h-4 w-4 mr-1" />
                                  Redigera
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10 bg-transparent"
                                  onClick={() => handleDeleteAvailable(question.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Ta bort
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Feedback Tab */}
            <TabsContent value="feedback" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Feedback från studenter</CardTitle>
                  <CardDescription>
                    Studentfeedback kopplad till frågor. Markera som läst eller löst när du gjort ändringar.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {feedbackList.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      Ingen feedback ännu. Studenter kan skicka feedback via knappen &quot;Skriv feedback&quot; på varje fråga.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {feedbackList.map((fb) => (
                        <Card
                          key={fb.id}
                          className={
                            fb.status === "new"
                              ? "border-accent/50 bg-accent/5"
                              : fb.status === "resolved"
                                ? "opacity-75 border-muted"
                                : "border-border"
                          }
                        >
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-2 min-w-0">
                                <p className="text-xs text-muted-foreground">
                                  Fråga: {fb.questionPreview}
                                </p>
                                <p className="text-sm font-medium text-foreground">
                                  {fb.feedbackText}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(fb.createdAt).toLocaleString("sv-SE")}
                                  {fb.questionId && (
                                    <span className="ml-2">· Fråga-ID: {fb.questionId}</span>
                                  )}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2 shrink-0">
                                {fb.status === "new" && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleFeedbackStatusChange(fb.id, "read")}
                                    >
                                      Markera som läst
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => handleFeedbackStatusChange(fb.id, "resolved")}
                                    >
                                      Markera som löst
                                    </Button>
                                  </>
                                )}
                                {fb.status === "read" && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleFeedbackStatusChange(fb.id, "new")}
                                    >
                                      Tillbaka till ny
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => handleFeedbackStatusChange(fb.id, "resolved")}
                                    >
                                      Markera som löst
                                    </Button>
                                  </>
                                )}
                                {fb.status === "resolved" && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleFeedbackStatusChange(fb.id, "read")}
                                  >
                                    Öppna igen
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div className="mt-2">
                              <Badge
                                variant={
                                  fb.status === "new"
                                    ? "default"
                                    : fb.status === "resolved"
                                      ? "secondary"
                                      : "outline"
                                }
                                className="text-xs"
                              >
                                {fb.status === "new"
                                  ? "Ny"
                                  : fb.status === "read"
                                    ? "Läst"
                                    : "Löst"}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="news" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Hantera nyheter</CardTitle>
                  <CardDescription>
                    Texten du skriver här kommer att visas i nyhetsrutan på startsidan.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {newsLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="news-content">Nyhetsinnehåll</Label>
                        <Textarea
                          id="news-content"
                          placeholder="Skriv vad som händer här..."
                          value={newsContent}
                          onChange={(e) => setNewsContent(e.target.value)}
                          rows={25}
                          className="font-sans text-base leading-relaxed min-h-[400px]"
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button
                          onClick={handleSaveNews}
                          disabled={saveLoading}
                          className="gap-2"
                        >
                          {saveLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          Spara ändringar
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* PPL Cases Tab */}
            <TabsContent value="cases" className="space-y-6">
              <div className="flex justify-between items-center bg-card p-4 rounded-lg border border-border">
                <div>
                  <h3 className="font-semibold text-lg">Hantering av PPL-fall</h3>
                  <p className="text-sm text-muted-foreground">Lägg till eller redigera basgruppsfall för olika terminer.</p>
                </div>
                <Button onClick={() => setEditingPplCase({ semester: "T1", subjectArea: "pu", title: "", description: "" })} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nytt fall
                </Button>
              </div>

              {editingPplCase && (
                <Card>
                  <CardHeader>
                    <CardTitle>{editingPplCase.id ? "Redigera fall" : "Skapa nytt PPL-fall"}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Termin</Label>
                        <Select
                          value={editingPplCase.semester}
                          onValueChange={(v) => setEditingPplCase(prev => ({ ...prev, semester: v as Semester }))}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10"].map(t => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Huvudämne (Tema)</Label>
                        <Select
                          value={editingPplCase.subjectArea}
                          onValueChange={(v) => setEditingPplCase(prev => ({ ...prev, subjectArea: v as SubjectArea }))}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {subjects.map(s => (
                              <SelectItem key={s} value={s}>{subjectLabels[s]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Titel</Label>
                        <Input
                          value={editingPplCase.title}
                          onChange={(e) => setEditingPplCase(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="T.ex. Fall 1: Bröstsmärta"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Beskrivning / Medicinska nyckelord</Label>
                      <Textarea
                        value={editingPplCase.description}
                        onChange={(e) => setEditingPplCase(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Skriv en kort sammanfattning av fallet eller lista de viktigaste medicinska begreppen för AI-rankning..."
                        rows={6}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setEditingPplCase(null)}>Avbryt</Button>
                      <Button onClick={handleSavePplCase} disabled={pplCaseSaveLoading} className="gap-2">
                        {pplCaseSaveLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                        Spara
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                {pplCases.map(c => (
                  <Card key={c.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-2">
                          <Badge variant="outline">{c.semester}</Badge>
                          <Badge variant="secondary">{subjectLabels[c.subjectArea as SubjectArea] || c.subjectArea}</Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => setEditingPplCase(c)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDeletePplCase(c.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <CardTitle className="text-lg">{c.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-3">{c.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Edit Modal for available questions */}
      {editingAvailableQuestion && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Redigera fråga</CardTitle>
              <CardDescription>
                Ändringar sparas och visas direkt på Övningsfrågor-sidan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="avail-edit-question">Fråga</Label>
                <Textarea
                  id="avail-edit-question"
                  value={editingAvailableQuestion.questionText}
                  onChange={(e) =>
                    setEditingAvailableQuestion((prev) =>
                      prev ? { ...prev, questionText: e.target.value } : null
                    )
                  }
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="avail-edit-answer">Korrekt svar (text eller JSON)</Label>
                <Textarea
                  id="avail-edit-answer"
                  value={Array.isArray(editingAvailableQuestion.correctAnswer) ? JSON.stringify(editingAvailableQuestion.correctAnswer) : editingAvailableQuestion.correctAnswer?.toString()}
                  onChange={(e) =>
                    setEditingAvailableQuestion((prev) =>
                      prev ? { ...prev, correctAnswer: e.target.value, answer: e.target.value } : null
                    )
                  }
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="avail-edit-interaction">Interaktion</Label>
                <Select
                  value={editingAvailableQuestion.interaction}
                  onValueChange={(v) =>
                    setEditingAvailableQuestion((prev) =>
                      prev ? { ...prev, interaction: v as InteractionType } : null
                    )
                  }
                >
                  <SelectTrigger id="avail-edit-interaction">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="show_answer">Visa svar</SelectItem>
                    <SelectItem value="check_answers">Rätta svar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="avail-edit-options">Alternativ (separerade med |)</Label>
                <Input
                  id="avail-edit-options"
                  value={editingAvailableQuestion.options?.join(" | ") || ""}
                  onChange={(e) =>
                    setEditingAvailableQuestion((prev) =>
                      prev ? { ...prev, options: e.target.value.split("|").map(s => s.trim()).filter(Boolean) } : null
                    )
                  }
                />
              </div>
              <ImageUpload
                value={editingAvailableQuestion.imageUrl}
                onChange={(url: string) => setEditingAvailableQuestion(prev => prev ? { ...prev, imageUrl: url } : null)}
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="avail-edit-subject">Ämnesområde</Label>
                  <Select
                    value={editingAvailableQuestion.subjectArea}
                    onValueChange={(v) =>
                      setEditingAvailableQuestion((prev) =>
                        prev ? { ...prev, subjectArea: v as SubjectArea } : null
                      )
                    }
                  >
                    <SelectTrigger id="avail-edit-subject">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject} value={subject}>
                          {subjectLabels[subject]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avail-edit-number">Frågnummer</Label>
                  <Input
                    id="avail-edit-number"
                    type="number"
                    min={1}
                    value={editingAvailableQuestion.questionNumber}
                    onChange={(e) =>
                      setEditingAvailableQuestion((prev) =>
                        prev ? { ...prev, questionNumber: parseInt(e.target.value, 10) || 1 } : null
                      )
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="avail-edit-semester">Termin</Label>
                  <Select
                    value={editingAvailableQuestion.semester}
                    onValueChange={(v) =>
                      setEditingAvailableQuestion((prev) =>
                        prev ? { ...prev, semester: v as Semester } : null
                      )
                    }
                  >
                    <SelectTrigger id="avail-edit-semester">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10"].map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avail-edit-examType">TentaTyp</Label>
                  <Select
                    value={editingAvailableQuestion.examType}
                    onValueChange={(v) =>
                      setEditingAvailableQuestion((prev) =>
                        prev ? { ...prev, examType: v as ExamType } : null
                      )
                    }
                  >
                    <SelectTrigger id="avail-edit-examType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">Ordinarie</SelectItem>
                      <SelectItem value="re-exam">Omtenta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avail-edit-period">Tentaperiod</Label>
                  <Select
                    value={editingAvailableQuestion.examPeriod}
                    onValueChange={(v) =>
                      setEditingAvailableQuestion((prev) =>
                        prev ? { ...prev, examPeriod: v as ExamPeriod } : null
                      )
                    }
                  >
                    <SelectTrigger id="avail-edit-period">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXAM_PERIODS.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avail-edit-points">Poäng</Label>
                  <Input
                    id="avail-edit-points"
                    type="number"
                    value={editingAvailableQuestion.points || ""}
                    onChange={(e) =>
                      setEditingAvailableQuestion((prev) =>
                        prev ? { ...prev, points: Number(e.target.value) || 0 } : null
                      )
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditingAvailableQuestion(null)}>
                  Avbryt
                </Button>
                <Button onClick={handleSaveEditAvailable}>
                  Spara ändringar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Modal for upload flow */}
      {editingQuestion && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Redigera fråga {editingQuestion.questionNumber}</CardTitle>
              <CardDescription>
                Gör ändringar i frågan innan godkännande.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-question">Fråga</Label>
                <Textarea
                  id="edit-question"
                  value={editingQuestion.questionText}
                  onChange={(e) =>
                    setEditingQuestion((prev) =>
                      prev ? { ...prev, questionText: e.target.value } : null
                    )
                  }
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-answer">Korrekt svar (text eller JSON)</Label>
                <Textarea
                  id="edit-answer"
                  value={Array.isArray(editingQuestion.correctAnswer) ? JSON.stringify(editingQuestion.correctAnswer) : editingQuestion.correctAnswer?.toString()}
                  onChange={(e) =>
                    setEditingQuestion((prev) =>
                      prev ? { ...prev, correctAnswer: e.target.value } : null
                    )
                  }
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-subject">Tema</Label>
                  <Input
                    id="edit-subject"
                    value={editingQuestion.theme}
                    onChange={(e) =>
                      setEditingQuestion((prev) =>
                        prev ? { ...prev, theme: e.target.value } : null
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-interaction">Interaktion</Label>
                  <Select
                    value={editingQuestion.interaction}
                    onValueChange={(v) =>
                      setEditingQuestion((prev) =>
                        prev ? { ...prev, interaction: v as InteractionType } : null
                      )
                    }
                  >
                    <SelectTrigger id="edit-interaction">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="show_answer">Visa svar</SelectItem>
                      <SelectItem value="check_answers">Rätta svar</SelectItem>
                      <SelectItem value="drag_matching">Matcha (Dra & släpp)</SelectItem>
                      <SelectItem value="drag_ordering">Ordning (Dra & släpp)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-options">Alternativ (separerade med |)</Label>
                  <Input
                    id="edit-options"
                    value={editingQuestion.options?.join(" | ") || ""}
                    onChange={(e) =>
                      setEditingQuestion((prev) =>
                        prev ? { ...prev, options: e.target.value.split("|").map(s => s.trim()).filter(Boolean) } : null
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-points">Poäng</Label>
                  <Input
                    id="edit-points"
                    type="number"
                    value={editingQuestion.points || ""}
                    onChange={(e) =>
                      setEditingQuestion((prev) =>
                        prev ? { ...prev, points: Number(e.target.value) || 0 } : null
                      )
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setEditingQuestion(null)}
                >
                  Avbryt
                </Button>
                <Button onClick={handleSaveEdit}>
                  Spara och godkänn
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Modal */}
      {isCreateDialogOpen && newQuestion && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-primary" />
                Skapa ny fråga
              </CardTitle>
              <CardDescription>
                Fyll i detaljerna för den nya frågan. Den sparas direkt i databasen.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Termin</Label>
                  <Select
                    value={newQuestion.semester}
                    onValueChange={(v) => setNewQuestion(prev => ({ ...prev, semester: v as Semester }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10"].map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ämne/Tema</Label>
                  <Select
                    value={newQuestion.subjectArea}
                    onValueChange={(v) => setNewQuestion(prev => ({ ...prev, subjectArea: v as SubjectArea }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(s => (
                        <SelectItem key={s} value={s}>{subjectLabels[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Period</Label>
                  <Select
                    value={newQuestion.examPeriod}
                    onValueChange={(v) => setNewQuestion(prev => ({ ...prev, examPeriod: v as ExamPeriod }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXAM_PERIODS.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Frågenummer</Label>
                  <Input
                    type="number"
                    value={newQuestion.questionNumber}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, questionNumber: Number(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Interaktion</Label>
                <Select
                  value={newQuestion.interaction}
                  onValueChange={(v) => setNewQuestion(prev => ({ ...prev, interaction: v as InteractionType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="show_answer">Visa svar (textfråga)</SelectItem>
                    <SelectItem value="check_answers">Rätta svar (flerval)</SelectItem>
                    <SelectItem value="drag_matching">Dra och släpp: Matcha</SelectItem>
                    <SelectItem value="drag_ordering">Dra och släpp: Ordning</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Frågetext</Label>
                <Textarea
                  value={newQuestion.questionText}
                  onChange={(e) => setNewQuestion(prev => ({ ...prev, questionText: e.target.value }))}
                  rows={3}
                />
              </div>

              {newQuestion.interaction === "check_answers" && (
                <div className="space-y-2">
                  <Label>Alternativ (skilj med | eller ny rad)</Label>
                  <Textarea
                    placeholder="Alternativ A | Alternativ B | Alternativ C"
                    value={newQuestion.options?.join(" | ")}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, options: e.target.value.split(/[|\n]/).map(s => s.trim()).filter(Boolean) }))}
                    rows={2}
                  />
                </div>
              )}

              {newQuestion.interaction === "drag_matching" && (
                <div className="space-y-2">
                  <Label>Matchningspar (Format: Vänster|Höger, ett per rad)</Label>
                  <Textarea
                    placeholder="Begrepp 1 | Förklaring 1&#10;Begrepp 2 | Förklaring 2"
                    value={newQuestion.options?.join("\n")}
                    onChange={(e) => {
                      const opts = e.target.value.split("\n").map(s => s.trim()).filter(Boolean)
                      setNewQuestion(prev => ({ ...prev, options: opts }))
                    }}
                    rows={4}
                  />
                </div>
              )}

              {newQuestion.interaction === "drag_ordering" && (
                <div className="space-y-2">
                  <Label>Element i ordning (ett per rad)</Label>
                  <Textarea
                    placeholder="Första steget&#10;Andra steget&#10;Tredje steget"
                    value={newQuestion.options?.join("\n")}
                    onChange={(e) => {
                      const opts = e.target.value.split("\n").map(s => s.trim()).filter(Boolean)
                      setNewQuestion(prev => ({ ...prev, options: opts }))
                    }}
                    rows={4}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Korrekt svar</Label>
                <Input
                  placeholder={
                    newQuestion.interaction === "check_answers" ? "a, c (kolumnbokstäver)" :
                      newQuestion.interaction === "drag_matching" ? '{"src-0":"target-0", "src-1":"target-1"}' :
                        newQuestion.interaction === "drag_ordering" ? '["Steg 1", "Steg 2", "Steg 3"]' :
                          "Svaret som visas"
                  }
                  value={Array.isArray(newQuestion.correctAnswer) ? JSON.stringify(newQuestion.correctAnswer) : newQuestion.correctAnswer}
                  onChange={(e) => setNewQuestion(prev => ({ ...prev, correctAnswer: e.target.value }))}
                />
                {(newQuestion.interaction === "drag_matching" || newQuestion.interaction === "drag_ordering") && (
                  <p className="text-[10px] text-muted-foreground italic">
                    Tips: För matching använd formatet: Begrepp 1 | Förklaring 1 osv. Jag skapar JSON åt dig om du lämnar Svar tomt och trycker spara (kommer snart).
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Poäng</Label>
                  <Input
                    type="number"
                    value={newQuestion.points}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, points: Number(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tentadatum</Label>
                  <Input
                    type="date"
                    value={newQuestion.examDate}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, examDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Förklaring / Utförligt svar</Label>
                <Textarea
                  value={newQuestion.answer}
                  onChange={(e) => setNewQuestion(prev => ({ ...prev, answer: e.target.value }))}
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Avbryt
                </Button>
                <Button onClick={handleCreateQuestion}>
                  Skapa fråga
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Footer />
    </div>
  )
}
