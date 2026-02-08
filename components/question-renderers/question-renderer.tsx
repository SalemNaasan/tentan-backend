"use client"

import { ShowAnswerRenderer } from "./show-answer"
import { CheckAnswersRenderer } from "./check-answers"
import { DragMatchingRenderer } from "./drag-matching"
import { DragOrderingRenderer } from "./drag-ordering"
import type { Question } from "@/lib/types"

interface QuestionRendererProps {
    question: Question
    userAnswer: any
    onAnswerChange: (answer: any) => void
    disabled?: boolean
    showCorrect?: boolean
    revealAnswer?: boolean
}

export function QuestionRenderer({
    question,
    userAnswer,
    onAnswerChange,
    disabled,
    showCorrect,
    revealAnswer
}: QuestionRendererProps) {
    if (question.interaction === "check_answers") {
        const correctAnswers = Array.isArray(question.correctAnswer)
            ? question.correctAnswer
            : [question.correctAnswer as string]

        // Distinguish between feedback (showCorrect) and solution (revealAnswer)
        return (
            <CheckAnswersRenderer
                options={question.options || []}
                value={userAnswer as string[] || []}
                onChange={onAnswerChange}
                disabled={disabled}
                showCorrect={showCorrect}
                revealAnswer={revealAnswer}
                correctAnswers={correctAnswers}
            />
        )
    }

    if (question.interaction === "drag_matching") {
        let parsedCorrect: Record<string, string> = {}
        try {
            parsedCorrect = typeof question.correctAnswer === "string"
                ? JSON.parse(question.correctAnswer)
                : question.correctAnswer as any
        } catch (e) { }

        return (
            <DragMatchingRenderer
                options={question.options || []}
                value={userAnswer as Record<string, string> || {}}
                onChange={onAnswerChange}
                disabled={disabled}
                showCorrect={showCorrect}
                revealAnswer={revealAnswer}
                correctAnswer={parsedCorrect}
            />
        )
    }

    if (question.interaction === "drag_ordering") {
        let parsedCorrect: string[] = []
        try {
            parsedCorrect = typeof question.correctAnswer === "string"
                ? JSON.parse(question.correctAnswer)
                : question.correctAnswer as any
        } catch (e) { }

        return (
            <DragOrderingRenderer
                options={question.options || []}
                value={userAnswer as string[] || []}
                onChange={onAnswerChange}
                disabled={disabled}
                showCorrect={showCorrect}
                revealAnswer={revealAnswer}
                correctAnswer={parsedCorrect}
            />
        )
    }

    return (
        <ShowAnswerRenderer
            value={userAnswer as string || ""}
            onChange={onAnswerChange}
            disabled={disabled}
        />
    )
}
