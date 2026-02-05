"use client"

import { ShowAnswerRenderer } from "./show-answer"
import { CheckAnswersRenderer } from "./check-answers"
import type { Question } from "@/lib/types"

interface QuestionRendererProps {
    question: Question
    userAnswer: any
    onAnswerChange: (answer: any) => void
    disabled?: boolean
    showCorrect?: boolean
}

export function QuestionRenderer({
    question,
    userAnswer,
    onAnswerChange,
    disabled,
    showCorrect
}: QuestionRendererProps) {
    if (question.interaction === "check_answers") {
        const correctAnswers = Array.isArray(question.correctAnswer)
            ? question.correctAnswer
            : [question.correctAnswer as string]

        return (
            <CheckAnswersRenderer
                options={question.options || []}
                value={userAnswer as string[] || []}
                onChange={onAnswerChange}
                disabled={disabled}
                showCorrect={showCorrect}
                correctAnswers={correctAnswers}
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
