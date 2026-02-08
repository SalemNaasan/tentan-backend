"use client"

import { useState, useEffect } from "react"
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
} from "@dnd-kit/core"
import {
    sortableKeyboardCoordinates,
    useSortable,
} from "@dnd-kit/sortable"
import { useDraggable } from "@dnd-kit/core"
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
    const [activeId, setActiveId] = useState<string | null>(null)

    // Parse options: "Source|Target"
    useEffect(() => {
        const parsedSources: Item[] = []
        const parsedTargets: Item[] = []

        options.forEach((opt, idx) => {
            const parts = opt.split("|").map(s => s.trim())
            if (parts.length >= 2) {
                const src = parts[0]
                const target = parts[1]
                parsedSources.push({ id: `src-${idx}`, content: src })
                parsedTargets.push({ id: `target-${idx}`, content: target })
            }
        })

        setSources(parsedSources)
        // Deterministic sort based on content to avoid hydration mismatch if possible, 
        // or just keep it simple.
        setAvailableTargets(parsedTargets)
    }, [options])

    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        }),
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleDragStart = (event: any) => {
        setActiveId(event.active.id)
    }

    const handleDragEnd = (event: any) => {
        setActiveId(null)
        if (disabled) return
        const { active, over } = event

        if (over && over.id.startsWith("droppable-")) {
            const targetId = active.id
            const sourceId = over.id.replace("droppable-", "")

            const newValue = { ...value, [sourceId]: targetId }
            onChange(newValue)
        }
    }

    const activeItem = availableTargets.find(t => t.id === activeId)

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
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
                        <div className="flex flex-wrap gap-2 min-h-[100px] p-4 border rounded-lg bg-secondary/5">
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
                            {availableTargets.filter(t => !Object.values(value).includes(t.id)).length === 0 && (
                                <p className="text-xs text-muted-foreground italic">Alla förklaringar är placerade.</p>
                            )}
                        </div>
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

            <DragOverlay dropAnimation={{
                sideEffects: defaultDropAnimationSideEffects({
                    styles: {
                        active: {
                            opacity: '0.5',
                        },
                    },
                }),
            }}>
                {activeId ? (
                    <div className="p-2 bg-background border-2 border-primary rounded-md shadow-xl text-sm cursor-grabbing">
                        {activeItem?.content}
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    )
}

function DraggableItem({ id, content, disabled }: { id: string; content: string; disabled?: boolean }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id, disabled })

    const style = transform ? {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0 : 1,
    } : undefined

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn(
                "p-2 bg-background border border-border rounded-md shadow-sm text-sm transition-shadow",
                !disabled && "cursor-grab active:cursor-grabbing hover:shadow-md hover:border-primary/50",
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
                "min-h-[44px] p-2 border-2 border-dashed rounded-lg transition-all flex items-center justify-center text-sm italic text-muted-foreground",
                isOver && !disabled && "border-primary bg-primary/10 scale-[1.02]",
                !content && "border-border/50",
                content && "border-solid border-border bg-secondary/10 not-italic text-foreground",
                showCorrect && content && (isCorrect ? "border-green-500 bg-green-100 text-green-900" : "border-red-500 bg-red-100 text-red-900")
            )}
        >
            {content || "Släpp förklaring här"}
        </div>
    )
}
