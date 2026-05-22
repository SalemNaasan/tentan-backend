"use client"

import { useState, useMemo, useEffect, ReactNode } from "react"
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
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/lib/utils"
import { GripVertical } from "lucide-react"

interface DragOrderingRendererProps {
    options: string[] // Items to be ordered
    value: string[] // Current order of item IDs
    onChange: (value: string[]) => void
    disabled?: boolean
    showCorrect?: boolean
    revealAnswer?: boolean
    correctAnswer: string[] // Correct order of item IDs
    searchQuery?: string
}

export function DragOrderingRenderer({
    options,
    value,
    onChange,
    disabled,
    showCorrect,
    revealAnswer,
    correctAnswer,
    searchQuery,
}: DragOrderingRendererProps) {
    const [activeId, setActiveId] = useState<string | null>(null)

    // Helper: highlight search query matches in text
    const highlightText = (text: string): ReactNode => {
        if (!searchQuery || !searchQuery.trim()) return text
        const query = searchQuery.trim()
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
        const parts = text.split(regex)
        if (parts.length === 1) return text
        return parts.map((part, i) =>
            regex.test(part) ? (
                <mark key={i} className="bg-yellow-200 dark:bg-yellow-500/40 text-inherit rounded-sm px-0.5 py-0">{part}</mark>
            ) : part
        )
    }

    // Map options to objects with IDs for dnd-kit
    const items = useMemo(() => {
        // If value is empty, use default options order
        const currentOrder = value && value.length > 0 ? value : options
        return currentOrder.map((content) => ({
            id: content,
            content: content,
        }))
    }, [options, value])

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 200,
                tolerance: 5,
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

        if (over && active.id !== over.id) {
            const oldIndex = items.findIndex((i) => i.id === active.id)
            const newIndex = items.findIndex((i) => i.id === over.id)

            const newItems = arrayMove(items, oldIndex, newIndex)
            onChange(newItems.map(i => i.id))
        }
    }

    const activeItem = items.find(i => i.id === activeId)

    return (
        <div className="space-y-4 max-w-md mx-auto">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider text-center">Dra för att ändra ordning</h4>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <SortableContext items={items} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                        {items.map((item, idx) => {
                            const isCorrect = showCorrect && correctAnswer[idx] === item.id

                            return (
                                <SortableItem
                                    key={item.id}
                                    id={item.id}
                                    content={item.content}
                                    disabled={disabled}
                                    isCorrect={isCorrect}
                                    showCorrect={showCorrect || revealAnswer}
                                    highlightText={highlightText}
                                />
                            )
                        })}
                    </div>
                </SortableContext>
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
                        <div className="flex items-center gap-3 p-3 bg-background border-2 border-primary rounded-lg shadow-xl cursor-grabbing scale-[1.02]">
                            <GripVertical className="h-4 w-4 text-primary shrink-0" />
                            <span className="text-sm font-semibold">{activeItem?.content}</span>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {revealAnswer && (
                <div className="mt-6 p-4 bg-secondary/10 border border-border rounded-xl space-y-3">
                    <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-widest text-center">Facit: Rätt ordning</h5>
                    <div className="space-y-1.5 text-sm">
                        {correctAnswer.map((text, i) => (
                            <div key={i} className="flex gap-3 items-center">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                                    {i + 1}
                                </span>
                                <span className="font-medium text-foreground">{highlightText(text)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

function SortableItem({
    id,
    content,
    disabled,
    isCorrect,
    showCorrect,
    highlightText
}: {
    id: string;
    content: string;
    disabled?: boolean;
    isCorrect?: boolean;
    showCorrect?: boolean;
    highlightText?: (text: string) => ReactNode;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id, disabled })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1,
        touchAction: 'none',
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "flex items-center gap-3 p-3 bg-background border rounded-lg shadow-sm transition-all relative overflow-hidden",
                !disabled && "cursor-grab active:cursor-grabbing hover:shadow-md hover:border-primary/50",
                isDragging ? "opacity-0" : "border-border",
                disabled && "cursor-default opacity-80",
                showCorrect && (isCorrect ? "border-green-500 bg-green-50/50" : "border-red-500 bg-red-50/50")
            )}
            {...attributes}
            {...listeners}
        >
            {!disabled && <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />}
            <span className="text-sm font-medium flex-1">{highlightText ? highlightText(content) : content}</span>
            {showCorrect && (
                <div className={cn(
                    "absolute right-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full",
                    isCorrect ? "bg-green-500 text-white" : "bg-red-500 text-white"
                )}>
                    {isCorrect ? (
                        <Check className="h-3 w-3" />
                    ) : (
                        <X className="h-3 w-3" />
                    )}
                </div>
            )}
        </div>
    )
}

import { Check, X } from "lucide-react"
