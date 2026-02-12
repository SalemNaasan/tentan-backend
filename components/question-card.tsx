"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Question } from "@/lib/types"
import { ChevronDown, ChevronUp, Eye, EyeOff, MessageSquare, CheckCircle2, XCircle, RotateCcw, Star } from "lucide-react"
import { QuestionRenderer } from "./question-renderers/question-renderer"
import { cn } from "@/lib/utils"

interface QuestionCardProps {
  question: Question
  isSelected: boolean
  onSelectChange: (selected: boolean) => void
  onFeedbackSubmit?: (questionId: string, questionPreview: string, feedbackText: string) => void
  isBookmarked?: boolean
  onToggleBookmark?: () => void
}

export function QuestionCard({
  question,
  isSelected,
  onSelectChange,
  onFeedbackSubmit,
  isBookmarked,
  onToggleBookmark,
}: QuestionCardProps) {
  const [showAnswer, setShowAnswer] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackText, setFeedbackText] = useState("")

  // New states for interactive system
  const [userAnswer, setUserAnswer] = useState<any>(null)
  const [isChecked, setIsChecked] = useState(false)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false)


  const handleFeedbackSubmit = () => {
    const text = feedbackText.trim()
    if (!text || !onFeedbackSubmit) return
    const preview = question.questionText.slice(0, 80) + (question.questionText.length > 80 ? "…" : "")
    onFeedbackSubmit(question.id, preview, text)
    setFeedbackText("")
    setFeedbackOpen(false)
  }

  const handleCheckAnswer = () => {
    if (question.interaction !== "drag_ordering" && (!userAnswer || (Array.isArray(userAnswer) && userAnswer.length === 0))) return

    if (question.interaction === "check_answers") {
      const selected = (userAnswer as string[]) || []
      const actual = Array.isArray(question.correctAnswer)
        ? question.correctAnswer
        : [question.correctAnswer]

      const correct = selected.length === actual.length &&
        selected.every(v => actual.includes(v.toLowerCase().trim()))

      setIsCorrect(correct)
      setIsChecked(true)
    } else if (question.interaction === "drag_matching") {
      let parsedCorrect: Record<string, string> = {}
      try {
        parsedCorrect = typeof question.correctAnswer === "string"
          ? JSON.parse(question.correctAnswer)
          : question.correctAnswer as any
      } catch (e) { }

      const userRes = userAnswer as Record<string, string>
      const correct = Object.keys(parsedCorrect).length > 0 &&
        Object.keys(parsedCorrect).length === Object.keys(userRes).length &&
        Object.keys(parsedCorrect).every(k => parsedCorrect[k] === userRes[k])

      setIsCorrect(correct)
      setIsChecked(true)
    } else if (question.interaction === "drag_ordering") {
      let parsedCorrect: string[] = []
      try {
        parsedCorrect = typeof question.correctAnswer === "string"
          ? JSON.parse(question.correctAnswer)
          : question.correctAnswer as any
      } catch (e) { }

      const userRes = userAnswer as string[]
      const correct = parsedCorrect.length > 0 &&
        parsedCorrect.length === userRes.length &&
        parsedCorrect.every((v, i) => v === userRes[i])

      setIsCorrect(correct)
      setIsChecked(true)
    }
  }

  const handleReset = () => {
    setUserAnswer(null)
    setIsChecked(false)
    setIsCorrect(null)
    setShowAnswer(false)
    setShowCorrectAnswer(false)
  }


  return (
    <Card className={cn(
      "overflow-hidden transition-all border-l-4",
      isChecked
        ? isCorrect
          ? "border-l-green-500 shadow-green-50/50"
          : "border-l-red-500 shadow-red-50/50"
        : "border-l-transparent"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelectChange}
              className="mt-1"
              aria-label={`Välj fråga ${question.questionNumber} för Anki-export`}
            />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-medium">
                  {question.semester}
                </Badge>
                <Badge
                  variant={question.examType === "regular" ? "default" : "secondary"}
                  className="font-medium"
                >
                  {question.examType === "regular" ? "Ordinarie" : "Omtenta"}
                </Badge>
                <Badge variant="secondary">{question.subjectArea}</Badge>
                <span className="text-xs text-muted-foreground">{question.examPeriod}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Fråga {question.questionNumber}
                {question.points !== undefined && (
                  <span className="ml-2 px-1.5 py-0.5 rounded-md bg-accent/10 text-accent font-semibold text-[10px] uppercase tracking-wider border border-accent/20">
                    {question.points} {question.points === 1 ? 'poäng' : 'poäng'}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 transition-colors",
                isBookmarked ? "text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50" : "text-muted-foreground"
              )}
              onClick={onToggleBookmark}
              aria-label={isBookmarked ? "Ta bort bokmärke" : "Bokmärk fråga"}
            >
              <Star className={cn("h-4 w-4", isBookmarked && "fill-current")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsExpanded(!isExpanded)}
              aria-label={isExpanded ? "Fäll ihop frågan" : "Expandera frågan"}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-6">
            {/* Question Text */}
            <div className="rounded-lg bg-secondary/30 p-4 border border-border/50">
              <p className="text-foreground leading-relaxed font-medium whitespace-pre-wrap">
                {question.questionText}
              </p>
            </div>

            {/* Question Image */}
            {question.imageUrl && (
              <div className="my-4 rounded-xl overflow-hidden border border-border/50 bg-secondary/5 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={question.imageUrl}
                  alt={`Bild för fråga ${question.questionNumber}`}
                  className="w-full h-auto max-h-[400px] object-contain mx-auto"
                  loading="lazy"
                />
              </div>
            )}

            {/* Interactive Renderer */}
            <div className="py-2">
              <QuestionRenderer
                question={question}
                userAnswer={userAnswer}
                onAnswerChange={setUserAnswer}
                disabled={isChecked}
                showCorrect={isChecked}
                revealAnswer={showCorrectAnswer}
              />

            </div>

            {/* Check Result Feedback */}
            {isChecked && (
              <div className={cn(
                "flex items-center gap-3 p-4 rounded-lg animate-in zoom-in-95 duration-200",
                isCorrect ? "bg-green-500/10 text-green-700 border border-green-500/20" : "bg-red-500/10 text-red-700 border border-red-500/20"
              )}>
                {isCorrect ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-semibold">Rätt svar!</p>
                      <p className="text-sm">Bra jobbat, du har förstått konceptet.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-semibold">Inte helt rätt...</p>
                      <p className="text-sm">Kolla igenom alternativen en gång till.</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-2">
                {["check_answers", "drag_matching", "drag_ordering"].includes(question.interaction) ? (
                  !isChecked ? (
                    <Button
                      onClick={handleCheckAnswer}
                      disabled={
                        question.interaction !== "drag_ordering" && (
                          !userAnswer ||
                          (Array.isArray(userAnswer) && userAnswer.length === 0) ||
                          (typeof userAnswer === 'object' && Object.keys(userAnswer).length === 0)
                        )
                      }
                      className="gap-2 bg-accent hover:bg-accent/90"
                    >
                      Rätta svar
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handleReset}
                        className="gap-2"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Gör om
                      </Button>
                      {!isCorrect && !showCorrectAnswer && (
                        <Button
                          variant="outline"
                          onClick={() => setShowCorrectAnswer(true)}
                          className="gap-2 border-green-200 hover:bg-green-50 text-green-700"
                        >
                          <Eye className="h-4 w-4" />
                          Visa svar
                        </Button>
                      )}
                    </div>
                  )
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setShowAnswer(!showAnswer)}
                    className="gap-2"
                  >
                    {showAnswer ? (
                      <><EyeOff className="h-4 w-4" /> Dölj svar</>
                    ) : (
                      <><Eye className="h-4 w-4" /> Visa svar</>
                    )}
                  </Button>
                )}
              </div>

              <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                    <MessageSquare className="h-4 w-4" />
                    Feedback
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Feedback på frågan</DialogTitle>
                    <DialogDescription>
                      Beskriv fel, oklarheter eller förbättringsförslag. Din feedback visas för administratören.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2 py-2">
                    <Label htmlFor="feedback-text">Din feedback</Label>
                    <Textarea
                      id="feedback-text"
                      placeholder="T.ex. stavfel i frågan, fel svar, otydlighet..."
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      rows={4}
                      className="resize-none"
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setFeedbackOpen(false)}>
                      Avbryt
                    </Button>
                    <Button
                      onClick={handleFeedbackSubmit}
                      disabled={!feedbackText.trim() || !onFeedbackSubmit}
                    >
                      Skicka feedback
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Answer Section (only for show_answer mode or when revealed explicitly somehow) */}
            {showAnswer && (
              <div className="space-y-4 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
                  <h4 className="mb-2 text-xs font-bold text-accent uppercase tracking-wider">
                    Korrekt Svar / Förklaring
                  </h4>
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                    {question.answer}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card >
  )
}
