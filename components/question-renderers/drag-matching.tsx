"use client"

import { useState, useEffect } from "react"
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
} from "@dnd-kit/core"
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/lib/utils"

interface Item {
    id: string
    content: string
}

interface DragMatchingRendererProps {
    options: string[] // Format: "Source|Target"
    value: Record<string, string> // Mapping of sourceId to targetId
    onChange: (value: Record<string, string>) => void
    disabled?: boolean
    showCorrect?: boolean
    correctAnswer: Record<string, string>
}

export function DragMatchingRenderer({
    options,
    value,
    onChange,
    disabled,
    showCorrect,
    correctAnswer,
}: DragMatchingRendererProps) {
    const [sources, setSources] = useState<Item[]>([])
    const [availableTargets, setAvailableTargets] = useState<Item[]>([])

    // Parse options: "Source|Target"
    useEffect(() => {
        const parsedSources: Item[] = []
        const parsedTargets: Item[] = []

        options.forEach((opt, idx) => {
            const [src, target] = opt.split("|").map(s => s.trim())
            if (src && target) {
                parsedSources.push({ id: `src-${idx}`, content: src })
                parsedTargets.push({ id: `target-${idx}`, content: target })
            }
        })

        setSources(parsedSources)
        // Randomize targets for the UI
        setAvailableTargets([...parsedTargets].sort(() => Math.random() - 0.5))
    }, [options])

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleDragEnd = (event: any) => {
        if (disabled) return
        const { active, over } = event

        if (over && over.id.startsWith("droppable-")) {
            const sourceId = active.id
            const targetId = over.id.replace("droppable-", "")

            const newValue = { ...value, [sourceId]: targetId }
            onChange(newValue)
        }
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Sources Column */}
                <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Begrepp</h4>
                    {sources.map((src) => {
                        const currentTargetId = value[src.id]
                        const targetContent = availableTargets.find(t => t.id === currentTargetId)?.content
                        const isCorrect = showCorrect && correctAnswer[src.id] === currentTargetId

                        return (
                            <div key={src.id} className="flex flex-col gap-2">
                                <div className="p-3 bg-secondary/20 rounded-lg border border-border font-medium">
                                    {src.content}
                                </div>
                                {/* Drop Zone */}
                                <DropZone
                                    id={`droppable-${src.id}`}
                                    content={targetContent}
                                    disabled={disabled}
                                    isCorrect={isCorrect}
                                    showCorrect={showCorrect}
                                />
                            </div>
                        )
                    })}
                </div>

                {/* Available Targets Column */}
                <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Förklaringar</h4>
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <div className="flex flex-wrap gap-2">
                            {availableTargets
                                .filter(t => !Object.values(value).includes(t.id))
                                .map((target) => (
                                    <DraggableItem
                                        key={target.id}
                                        id={target.id}
                                        content={target.content}
                                        disabled={disabled}
                                    />
                                ))}
                        </div>
                    </DndContext>
                </div>
            </div>

            {Object.keys(value).length > 0 && !disabled && (
                <button
                    onClick={() => onChange({})}
                    className="text-xs text-accent underline hover:text-accent/80"
                >
                    Rensa alla kopplingar
                </button>
            )}
        </div>
    )
}

function DraggableItem({ id, content, disabled }: { id: string; content: string; disabled?: boolean }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({ id, disabled })

    const style = {
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 10 : 1,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn(
                "p-2 bg-background border border-border rounded-md shadow-sm cursor-grab active:cursor-grabbing text-sm",
                isDragging && "opacity-50",
                disabled && "cursor-default opacity-80"
            )}
        >
            {content}
        </div>
    )
}

import { useDroppable } from "@dnd-kit/core"

function DropZone({ id, content, disabled, isCorrect, showCorrect }: { id: string; content?: string; disabled?: boolean; isCorrect?: boolean; showCorrect?: boolean }) {
    const { isOver, setNodeRef } = useDroppable({ id, disabled })

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "min-h-[40px] p-2 border-2 border-dashed rounded-lg transition-colors flex items-center justify-center text-sm italic text-muted-foreground",
                isOver && "border-primary bg-primary/5",
                !content && "border-border/50",
                content && "border-solid border-border bg-secondary/10 not-italic text-foreground",
                showCorrect && content && (isCorrect ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50")
            )}
        >
            {content || "Släpp förklaring här"}
        </div>
    )
}
