"use client"

import { ShowAnswerRenderer } from "./show-answer"
import { CheckAnswersRenderer } from "./check-answers"
import type { Question } from "@/lib/types"

interface QuestionRendererProps {
    question: Question
    userAnswer: any
    onAnswerChange: (answer: any) => void
    disabled?: boolean
}

export function QuestionRenderer({ question, userAnswer, onAnswerChange, disabled }: QuestionRendererProps) {
    if (question.interaction === "check_answers") {
        return (
            <CheckAnswersRenderer
                options={question.options || []}
                value={userAnswer as string[] || []}
                onChange={onAnswerChange}
                disabled={disabled}
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
