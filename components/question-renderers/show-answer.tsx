"use client"

import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface ShowAnswerRendererProps {
    value: string
    onChange: (value: string) => void
    disabled?: boolean
}

export function ShowAnswerRenderer({ value, onChange, disabled }: ShowAnswerRendererProps) {
    return (
        <div className="space-y-2">
            <Label htmlFor="manual-answer" className="text-sm text-muted-foreground italic">
                Skriv ditt svar här för att träna (rättas ej automatiskt)
            </Label>
            <Textarea
                id="manual-answer"
                placeholder="Typa ditt svar..."
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className="min-h-[100px] bg-background/50 focus:bg-background"
            />
        </div>
    )
}
