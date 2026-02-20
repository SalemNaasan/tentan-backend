"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Briefcase, Sparkles, ChevronRight, BookOpen } from "lucide-react"
import type { Semester, PPLCase, Question } from "@/lib/types"
import { QuestionCard } from "@/components/question-card"

export default function CasesPage() {
    const [selectedSemester, setSelectedSemester] = useState<Semester>("T1")
    const [cases, setCases] = useState<PPLCase[]>([])
    const [selectedCase, setSelectedCase] = useState<PPLCase | null>(null)
    const [rankedQuestions, setRankedQuestions] = useState<(Question & { relevance: number })[]>([])
    const [loadingCases, setLoadingCases] = useState(false)
    const [loadingRank, setLoadingRank] = useState(false)

    const loadCases = useCallback(async (semester: Semester) => {
        setLoadingCases(true)
        try {
            const res = await fetch(`/api/cases?semester=${semester}`)
            if (!res.ok) throw new Error("Failed to load cases")
            const data = await res.json()
            setCases(data)
            if (data.length > 0) {
                // Automatically select the first case if none selected
                // setSelectedCase(data[0])
            } else {
                setSelectedCase(null)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoadingCases(false)
        }
    }, [])

    useEffect(() => {
        loadCases(selectedSemester)
    }, [selectedSemester, loadCases])

    const handleRankQuestions = async (pplCase: PPLCase) => {
        setSelectedCase(pplCase)
        setLoadingRank(true)
        setRankedQuestions([])
        try {
            const res = await fetch(`/api/cases/rank?caseId=${pplCase.id}`)
            if (!res.ok) throw new Error("Failed to rank questions")
            const data = await res.json()
            setRankedQuestions(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoadingRank(false)
        }
    }

    return (
        <div className="flex min-h-screen flex-col">
            <Header />

            <main className="flex-1 bg-muted/30 pb-20">
                <div className="mx-auto max-w-7xl px-4 py-8">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                            <Briefcase className="h-8 w-8 text-primary" />
                            PPL / Basgruppsfall
                        </h1>
                        <p className="mt-2 text-muted-foreground max-w-2xl">
                            Välj en termin och ett basgruppsfall för att se de mest relevanta tentafrågorna rankade med AI-liknande logik.
                        </p>
                    </div>

                    <div className="grid gap-8 lg:grid-cols-[350px_1fr]">
                        {/* Sidebar: Case Selection */}
                        <div className="space-y-6">
                            <Card>
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Välj termin</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Select
                                        value={selectedSemester}
                                        onValueChange={(v) => setSelectedSemester(v as Semester)}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Välj termin" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10"].map(t => (
                                                <SelectItem key={t} value={t}>{t}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </CardContent>
                            </Card>

                            <div className="space-y-3">
                                <h3 className="font-semibold px-1 flex items-center gap-2">
                                    Basgruppsfall
                                    {loadingCases && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                                </h3>
                                {cases.length === 0 && !loadingCases ? (
                                    <p className="text-sm text-muted-foreground px-1 italic">Inga fall inlagda för denna termin än.</p>
                                ) : (
                                    <div className="grid gap-2">
                                        {cases.map((c) => (
                                            <button
                                                key={c.id}
                                                onClick={() => handleRankQuestions(c)}
                                                className={`text-left p-4 rounded-xl border transition-all hover:shadow-md ${selectedCase?.id === c.id
                                                    ? "bg-primary text-primary-foreground border-primary shadow-lg ring-2 ring-primary ring-offset-2"
                                                    : "bg-card text-card-foreground border-border hover:border-primary/50"
                                                    }`}
                                            >
                                                <div className="font-medium text-sm mb-1">{c.title}</div>
                                                <div className={`text-xs line-clamp-2 ${selectedCase?.id === c.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                                                    {c.description}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Main Content: Ranked Questions */}
                        <div className="space-y-6">
                            {!selectedCase ? (
                                <div className="h-[400px] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-border rounded-3xl">
                                    <div className="h-16 w-16 bg-muted flex items-center justify-center rounded-2xl mb-4">
                                        <Sparkles className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">Välj ett fall för att börja</h3>
                                    <p className="text-muted-foreground max-w-sm">
                                        När du väljer ett fall kommer systemet att analysera alla tentafrågor för terminen och rangordna dem efter relevans.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-sm">
                                        <div className="flex flex-wrap items-center gap-2 mb-4">
                                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">{selectedCase.semester}</Badge>
                                            <Badge variant="outline" className="border-primary/20">{selectedCase.subjectArea}</Badge>
                                            <Badge variant="secondary" className="gap-1">
                                                <Sparkles className="h-3 w-3" />
                                                Kunskapsmatchat
                                            </Badge>
                                        </div>
                                        <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap mb-6">
                                            {selectedCase.description}
                                        </div>
                                        {selectedCase.keywords && (
                                            <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
                                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider w-full mb-1">Matchad kunskap:</span>
                                                {selectedCase.keywords.split(",").map((kw, i) => (
                                                    <Badge key={i} variant="secondary" className="bg-primary/5 text-primary border-primary/10 hover:bg-primary/10 transition-colors">
                                                        {kw.trim()}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                                <BookOpen className="h-5 w-5 text-primary" />
                                                Relevanta tentafrågor
                                                <Badge variant="outline" className="ml-2 font-normal text-xs">{rankedQuestions.length} träffar</Badge>
                                            </h3>
                                        </div>

                                        {loadingRank ? (
                                            <div className="py-20 flex flex-col items-center justify-center text-center gap-4">
                                                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                                <div className="animate-pulse flex flex-col items-center gap-2">
                                                    <p className="font-medium">Analyserar kopplingar mellan fall och tentafrågor...</p>
                                                    <p className="text-sm text-muted-foreground">Detta tar bara en sekund.</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                {rankedQuestions.map((q, idx) => (
                                                    <div key={q.id} className="relative group">
                                                        {idx < 3 && (
                                                            <div className="absolute -left-2 -top-2 z-10 bg-gradient-to-br from-yellow-400 to-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                                                                TOPPVAL
                                                            </div>
                                                        )}
                                                        <QuestionCard
                                                            question={{
                                                                ...q,
                                                                semester: q.semester || selectedCase.semester,
                                                            }}
                                                            isSelected={false}
                                                            onSelectChange={() => { }}
                                                        />
                                                        <div className="mt-2 flex items-center gap-2 px-4 py-1.5 bg-primary/5 rounded-full border border-primary/10 w-fit">
                                                            <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-primary"
                                                                    style={{ width: `${Math.min(100, (q.relevance || 0) * 100)}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-[10px] uppercase font-bold text-primary tracking-wider">
                                                                {Math.round((q.relevance || 0) * 100)}% Relevans
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}

                                                {rankedQuestions.length === 0 && !loadingRank && selectedCase && (
                                                    <div className="text-center py-12 text-muted-foreground border border-dashed rounded-3xl">
                                                        Inga relevanta frågor hittades för detta fall.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}
