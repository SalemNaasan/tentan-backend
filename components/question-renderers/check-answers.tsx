"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface CheckAnswersRendererProps {
    options: string[]
    value: string[]
    onChange: (value: string[]) => void
    disabled?: boolean
    showCorrect?: boolean
    revealAnswer?: boolean
    correctAnswers?: string[]
}

export function CheckAnswersRenderer({
    options,
    value,
    onChange,
    disabled,
    showCorrect,
    revealAnswer,
    correctAnswers
}: CheckAnswersRendererProps) {
    const handleToggle = (key: string) => {
        if (value.includes(key)) {
            onChange(value.filter((val) => val !== key))
        } else {
            onChange([...value, key])
        }
    }

    return (
        <div className="grid gap-3">
            {options.map((option, index) => {
                const key = String.fromCharCode(97 + index) // 0 -> 'a', 1 -> 'b', etc.
                const isCorrect = correctAnswers?.includes(key.toLowerCase().trim())
                const isSelected = value.includes(key)

                const showSuccess = (revealAnswer && isCorrect) || (showCorrect && isSelected && isCorrect)
                const showError = showCorrect && isSelected && !isCorrect

                return (
                    <div
                        key={index}
                        className={cn(
                            "flex items-center space-x-3 rounded-lg border p-3 transition-colors",
                            showSuccess && "border-green-500 bg-green-500/10",
                            showError && "border-red-500 bg-red-500/10",
                            !showSuccess && !showError && "border-border hover:bg-accent/5"
                        )}
                    >
                        <Checkbox
                            id={`option-${index}`}
                            checked={isSelected}
                            onCheckedChange={() => handleToggle(key)}
                            disabled={disabled}
                        />
                        <Label
                            htmlFor={`option-${index}`}
                            className={cn(
                                "flex-1 cursor-pointer font-normal leading-relaxed",
                                showSuccess && "font-medium text-green-700",
                                showError && "font-medium text-red-700"
                            )}
                        >
                            {option}
                        </Label>
                    </div>
                )
            })}
        </div>
    )
}
