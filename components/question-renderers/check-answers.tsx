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
    correctAnswers?: string[]
}

export function CheckAnswersRenderer({
    options,
    value,
    onChange,
    disabled,
    showCorrect,
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

                return (
                    <div
                        key={index}
                        className={cn(
                            "flex items-center space-x-3 rounded-lg border p-3 transition-colors",
                            showCorrect && isCorrect
                                ? "border-green-500 bg-green-500/10"
                                : "border-border hover:bg-accent/5"
                        )}
                    >
                        <Checkbox
                            id={`option-${index}`}
                            checked={value.includes(key)}
                            onCheckedChange={() => handleToggle(key)}
                            disabled={disabled}
                        />
                        <Label
                            htmlFor={`option-${index}`}
                            className={cn(
                                "flex-1 cursor-pointer font-normal leading-relaxed",
                                showCorrect && isCorrect && "font-medium text-green-700"
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
