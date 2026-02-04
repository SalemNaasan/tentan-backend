"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface CheckAnswersRendererProps {
    options: string[]
    value: string[]
    onChange: (value: string[]) => void
    disabled?: boolean
}

export function CheckAnswersRenderer({ options, value, onChange, disabled }: CheckAnswersRendererProps) {
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
                return (
                    <div key={index} className="flex items-center space-x-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent/5">
                        <Checkbox
                            id={`option-${index}`}
                            checked={value.includes(key)}
                            onCheckedChange={() => handleToggle(key)}
                            disabled={disabled}
                        />
                        <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer font-normal leading-relaxed">
                            {option}
                        </Label>
                    </div>
                )
            })}
        </div>
    )
}
