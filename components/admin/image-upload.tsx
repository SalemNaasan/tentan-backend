"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { Loader2, X, Upload, Image as ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface ImageUploadProps {
    value?: string
    onChange: (url: string) => void
    disabled?: boolean
}

export function ImageUpload({ value, onChange, disabled }: ImageUploadProps) {
    const [uploading, setUploading] = useState(false)

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true)
            const file = e.target.files?.[0]
            if (!file) return

            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
            const filePath = `${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('question-images')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('question-images')
                .getPublicUrl(filePath)

            onChange(publicUrl)
        } catch (error) {
            console.error('Error uploading image:', error)
            alert('Misslyckades att ladda upp bild. Kontrollera att din Supabase bucket "question-images" är publik.')
        } finally {
            setUploading(false)
        }
    }

    const removeImage = () => {
        onChange("")
    }

    return (
        <div className="space-y-4">
            <Label>Bild (valfritt)</Label>

            {value ? (
                <div className="relative aspect-video w-full max-w-sm rounded-lg overflow-hidden border border-border group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={value}
                        alt="Frågebild"
                        className="w-full h-full object-contain bg-secondary/20"
                    />
                    {!disabled && (
                        <button
                            onClick={removeImage}
                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            ) : (
                <div className={cn(
                    "flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 transition-colors",
                    uploading ? "bg-accent/5 border-accent" : "bg-secondary/5 border-border hover:border-accent/50"
                )}>
                    {uploading ? (
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-accent" />
                            <p className="text-sm text-muted-foreground">Laddar upp...</p>
                        </div>
                    ) : (
                        <label className="flex flex-col items-center gap-2 cursor-pointer w-full h-full py-4">
                            <div className="p-3 bg-accent/10 rounded-full">
                                <Upload className="h-6 w-6 text-accent" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium">Klicka för att ladda upp</p>
                                <p className="text-xs text-muted-foreground">PNG, JPG eller GIF (max 5MB)</p>
                            </div>
                            <Input
                                type="file"
                                accept="image/*"
                                onChange={handleUpload}
                                disabled={disabled}
                                className="hidden"
                            />
                        </label>
                    )}
                </div>
            )}
        </div>
    )
}
