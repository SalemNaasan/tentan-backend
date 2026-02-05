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
const examPeriods = ["HT23", "VT24", "HT24", "VT25", "HT25"] as const
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

interface FilterSidebarProps {
  selectedSemesters: Semester[]
  setSelectedSemesters: (semesters: Semester[]) => void
  selectedExamTypes: ExamType[]
  setSelectedExamTypes: (types: ExamType[]) => void
  selectedSubjects: SubjectArea[]
  setSelectedSubjects: (subjects: SubjectArea[]) => void
  selectedPeriods: string[]
  setSelectedPeriods: (periods: string[]) => void
  showOnlyBookmarked: boolean
  onShowOnlyBookmarkedChange: (checked: boolean) => void
  selectedInteractions: InteractionType[]
  setSelectedInteractions: (types: InteractionType[]) => void
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
  showOnlyBookmarked,
  onShowOnlyBookmarkedChange,
  selectedInteractions,
  setSelectedInteractions,
}: FilterSidebarProps) {
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
            checked={showOnlyBookmarked}
            onCheckedChange={onShowOnlyBookmarkedChange}
          />
          <div className="flex items-center gap-1.5 text-sm font-medium transition-colors group-hover:text-primary">
            <Star className={cn("h-4 w-4", showOnlyBookmarked ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground")} />
            Visa endast bokmärkta
          </div>
        </label>
      </div>

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

      <div className="border-t border-border pt-6">
        <h3 className="mb-3 text-sm font-semibold text-foreground uppercase tracking-wide">
          TentaTyp
        </h3>
        <div className="space-y-2">
          {examTypes.map((type) => (
            <div key={type.value} className="flex items-center space-x-2">
              <Checkbox
                id={`type-${type.value}`}
                checked={selectedExamTypes.includes(type.value)}
                onCheckedChange={(checked) =>
                  handleExamTypeChange(type.value, checked as boolean)
                }
              />
              <Label
                htmlFor={`type-${type.value}`}
                className="text-sm font-normal cursor-pointer"
              >
                {type.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <h3 className="mb-3 text-sm font-semibold text-foreground uppercase tracking-wide">
          Tenta-period
        </h3>
        <div className="space-y-2">
          {examPeriods.map((period) => (
            <div key={period} className="flex items-center space-x-2">
              <Checkbox
                id={`period-${period}`}
                checked={selectedPeriods.includes(period)}
                onCheckedChange={(checked) =>
                  handlePeriodChange(period, checked as boolean)
                }
              />
              <Label
                htmlFor={`period-${period}`}
                className="text-sm font-normal cursor-pointer"
              >
                {period}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <h3 className="mb-3 text-sm font-semibold text-foreground uppercase tracking-wide">
          Ämnesområde
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
          {subjects.map((subject) => (
            <div key={subject} className="flex items-center space-x-2">
              <Checkbox
                id={`subject-${subject}`}
                checked={selectedSubjects.includes(subject)}
                onCheckedChange={(checked) =>
                  handleSubjectChange(subject, checked as boolean)
                }
              />
              <Label
                htmlFor={`subject-${subject}`}
                className="text-sm font-normal cursor-pointer"
              >
                {subjectLabels[subject]}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <h3 className="mb-3 text-sm font-semibold text-foreground uppercase tracking-wide">
          Frågetyp
        </h3>
        <div className="space-y-2">
          {interactionTypes.map((type) => (
            <div key={type.value} className="flex items-center space-x-2">
              <Checkbox
                id={`interaction-${type.value}`}
                checked={selectedInteractions.includes(type.value)}
                onCheckedChange={(checked) =>
                  handleInteractionChange(type.value, checked as boolean)
                }
              />
              <Label
                htmlFor={`interaction-${type.value}`}
                className="text-sm font-normal cursor-pointer"
              >
                {type.label}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
