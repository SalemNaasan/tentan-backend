"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import type { Semester, ExamType, SubjectArea, InteractionType } from "@/lib/types"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

const semesters: Semester[] = ["T1", "T2", "T3", "T4", "T5"]
const examTypes: { value: ExamType; label: string }[] = [
  { value: "regular", label: "Ordinarie tenta" },
  { value: "re-exam", label: "Omtenta" },
]

// Available tenta-perioder (exam periods) for filtering
const examPeriods = [
  "VT20", "HT20",
  "VT21", "HT21",
  "VT22", "HT22",
  "VT23", "HT23",
  "VT24", "HT24",
  "VT25", "HT25",
  "VT26", "HT26",
  "VT27", "HT27",
  "VT28", "HT28",
  "VT29", "HT29",
] as const
// Only show the tema codes you actually use
const subjects: SubjectArea[] = ["pu", "gen", "gnm", "vf", "erl", "cren", "ibi", "nspr"]

const subjectLabels: Record<SubjectArea, string> = {
  pu: "PU",
  gen: "GEN",
  gnm: "GNM",
  vf: "VF",
  erl: "ERL",
  cren: "CREN",
  ibi: "IBI",
  nspr: "NSPR",
  Other: "Övrigt",
}

const interactionTypes: { value: InteractionType; label: string }[] = [
  { value: "check_answers", label: "Flervalsfrågor" },
  { value: "show_answer", label: "Skrivfrågor" },
]

const defaultCases = ["Fall A", "Fall B", "Fall C", "Fall D", "Fall E", "Fall F"]

interface AvailableOptions {
  examTypes: Set<string>
  periods: Set<string>
  subjects: Set<string>
  interactions: Set<string>
  cases: Set<string>
}

interface FilterSidebarProps {
  selectedSemesters: Semester[]
  setSelectedSemesters: (semesters: Semester[]) => void
  selectedExamTypes: ExamType[]
  setSelectedExamTypes: (types: ExamType[]) => void
  selectedSubjects: SubjectArea[]
  setSelectedSubjects: (subjects: SubjectArea[]) => void
  selectedPeriods: string[]
  setSelectedPeriods: (periods: string[]) => void
  isOnlyBookmarked: boolean
  onShowOnlyBookmarkedChange: (checked: boolean) => void
  selectedInteractions: InteractionType[]
  setSelectedInteractions: (types: InteractionType[]) => void
  selectedCases?: string[]
  setSelectedCases?: (cases: string[]) => void
  availableOptions?: AvailableOptions
}

export function FilterSidebar({
  selectedSemesters,
  setSelectedSemesters,
  selectedExamTypes,
  setSelectedExamTypes,
  selectedSubjects,
  setSelectedSubjects,
  selectedPeriods,
  setSelectedPeriods,
  isOnlyBookmarked,
  onShowOnlyBookmarkedChange,
  selectedInteractions,
  setSelectedInteractions,
  selectedCases = [],
  setSelectedCases,
  availableOptions,
}: FilterSidebarProps) {
  // If no availableOptions provided (e.g. no semester selected), everything is available
  const hasOptions = !!availableOptions

  const isTypeAvailable    = (v: string) => !hasOptions || availableOptions!.examTypes.has(v)
  const isPeriodAvailable  = (v: string) => !hasOptions || availableOptions!.periods.has(v)
  const isSubjectAvailable = (v: string) => !hasOptions || availableOptions!.subjects.has(v)
  const isInteractionAvailable = (v: string) => !hasOptions || availableOptions!.interactions.has(v)
  const isCaseAvailable = (v: string) => !hasOptions || (availableOptions!.cases && availableOptions!.cases.size > 0 ? (availableOptions!.cases.has(v) || availableOptions!.cases.has(v.replace(/^fall\s*/i, '').trim())) : true)

  const handleCaseChange = (caseName: string, checked: boolean) => {
    if (!setSelectedCases) return
    if (checked) {
      setSelectedCases([...selectedCases, caseName])
    } else {
      setSelectedCases(selectedCases.filter((c) => c !== caseName))
    }
  }

  const handleSemesterChange = (semester: Semester, checked: boolean) => {
    if (checked) {
      setSelectedSemesters([...selectedSemesters, semester])
    } else {
      setSelectedSemesters(selectedSemesters.filter((s) => s !== semester))
    }
  }

  const handleExamTypeChange = (type: ExamType, checked: boolean) => {
    if (checked) {
      setSelectedExamTypes([...selectedExamTypes, type])
    } else {
      setSelectedExamTypes(selectedExamTypes.filter((t) => t !== type))
    }
  }

  const handleSubjectChange = (subject: SubjectArea, checked: boolean) => {
    if (checked) {
      setSelectedSubjects([...selectedSubjects, subject])
    } else {
      setSelectedSubjects(selectedSubjects.filter((s) => s !== subject))
    }
  }

  const handlePeriodChange = (period: string, checked: boolean) => {
    if (checked) {
      setSelectedPeriods([...selectedPeriods, period])
    } else {
      setSelectedPeriods(selectedPeriods.filter((p) => p !== period))
    }
  }

  const handleInteractionChange = (type: InteractionType, checked: boolean) => {
    if (checked) {
      setSelectedInteractions([...selectedInteractions, type])
    } else {
      setSelectedInteractions(selectedInteractions.filter((t) => t !== type))
    }
  }

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-border">
        <label className="flex items-center gap-2 cursor-pointer group">
          <Checkbox
            checked={isOnlyBookmarked}
            onCheckedChange={onShowOnlyBookmarkedChange}
          />
          <div className="flex items-center gap-1.5 text-sm font-medium transition-colors group-hover:text-primary">
            <Star className={cn("h-4 w-4", isOnlyBookmarked ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground")} />
            Visa endast bokmärkta
          </div>
        </label>
      </div>

      {/* Termin – always fully active (it's the "controller") */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground uppercase tracking-wide">
          Termin
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {semesters.map((semester) => (
            <div key={semester} className="flex items-center space-x-2">
              <Checkbox
                id={`semester-${semester}`}
                checked={selectedSemesters.includes(semester)}
                onCheckedChange={(checked) =>
                  handleSemesterChange(semester, checked as boolean)
                }
              />
              <Label
                htmlFor={`semester-${semester}`}
                className="text-sm font-normal cursor-pointer"
              >
                {semester}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* TentaTyp */}
      <div className="border-t border-border pt-6">
        <h3 className="mb-3 text-sm font-semibold text-foreground uppercase tracking-wide">
          TentaTyp
        </h3>
        <div className="space-y-2">
          {examTypes.map((type) => {
            const available = isTypeAvailable(type.value)
            return (
              <div
                key={type.value}
                className={cn(
                  "flex items-center space-x-2 transition-opacity",
                  !available && "opacity-35 pointer-events-none"
                )}
              >
                <Checkbox
                  id={`type-${type.value}`}
                  checked={selectedExamTypes.includes(type.value)}
                  onCheckedChange={(checked) =>
                    handleExamTypeChange(type.value, checked as boolean)
                  }
                  disabled={!available}
                />
                <Label
                  htmlFor={`type-${type.value}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {type.label}
                </Label>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tenta-period */}
      <div className="border-t border-border pt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Tenta-period
          </h3>
          {selectedPeriods.length > 0 && (
            <button
              onClick={() => setSelectedPeriods([])}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Rensa
            </button>
          )}
        </div>
        <div className="space-y-2">
          {["20","21","22","23","24","25","26","27","28","29"].map((year) => (
            <div key={year} className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground w-6 shrink-0">{year}</span>
              {(["VT","HT"] as const).map((half) => {
                const period = `${half}${year}`
                const active = selectedPeriods.includes(period)
                const available = isPeriodAvailable(period)
                return (
                  <button
                    key={period}
                    onClick={() => available && handlePeriodChange(period, !active)}
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-xs font-medium transition-all border",
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : available
                          ? "bg-transparent text-muted-foreground border-border hover:border-foreground hover:text-foreground"
                          : "bg-transparent text-muted-foreground/30 border-border/30 cursor-not-allowed"
                    )}
                  >
                    {half}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Ämnesområde */}
      <div className="border-t border-border pt-6">
        <h3 className="mb-3 text-sm font-semibold text-foreground uppercase tracking-wide">
          Ämnesområde
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
          {subjects.map((subject) => {
            const available = isSubjectAvailable(subject)
            return (
              <div
                key={subject}
                className={cn(
                  "flex items-center space-x-2 transition-opacity",
                  !available && "opacity-35 pointer-events-none"
                )}
              >
                <Checkbox
                  id={`subject-${subject}`}
                  checked={selectedSubjects.includes(subject)}
                  onCheckedChange={(checked) =>
                    handleSubjectChange(subject, checked as boolean)
                  }
                  disabled={!available}
                />
                <Label
                  htmlFor={`subject-${subject}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {subjectLabels[subject]}
                </Label>
              </div>
            )
          })}
        </div>
      </div>

      {/* Frågetyp */}
      <div className="border-t border-border pt-6">
        <h3 className="mb-3 text-sm font-semibold text-foreground uppercase tracking-wide">
          Frågetyp
        </h3>
        <div className="space-y-2">
          {interactionTypes.map((type) => {
            const available = isInteractionAvailable(type.value)
            return (
              <div
                key={type.value}
                className={cn(
                  "flex items-center space-x-2 transition-opacity",
                  !available && "opacity-35 pointer-events-none"
                )}
              >
                <Checkbox
                  id={`interaction-${type.value}`}
                  checked={selectedInteractions.includes(type.value)}
                  onCheckedChange={(checked) =>
                    handleInteractionChange(type.value, checked as boolean)
                  }
                  disabled={!available}
                />
                <Label
                  htmlFor={`interaction-${type.value}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {type.label}
                </Label>
              </div>
            )
          })}
        </div>
      </div>

      {/* Fall (Case) - Speciellt relevant för T4 & T5 */}
      {setSelectedCases && (
        <div className="border-t border-border pt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              Fall (T4-T5)
            </h3>
            {selectedCases.length > 0 && (
              <button
                onClick={() => setSelectedCases([])}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Rensa
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {defaultCases.map((cName) => {
              const available = isCaseAvailable(cName)
              return (
                <div
                  key={cName}
                  className={cn(
                    "flex items-center space-x-2 transition-opacity",
                    !available && "opacity-35 pointer-events-none"
                  )}
                >
                  <Checkbox
                    id={`case-${cName}`}
                    checked={selectedCases.includes(cName)}
                    onCheckedChange={(checked) =>
                      handleCaseChange(cName, checked as boolean)
                    }
                    disabled={!available}
                  />
                  <Label
                    htmlFor={`case-${cName}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {cName}
                  </Label>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
