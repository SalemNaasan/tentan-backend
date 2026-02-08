export type Semester = "T1" | "T2" | "T3" | "T4" | "T5" | "T6" | "T7" | "T8" | "T9" | "T10"

export type ExamPeriod = "HT23" | "VT24" | "HT24" | "VT25" | "HT25"

export const EXAM_PERIODS: ExamPeriod[] = ["HT23", "VT24", "HT24", "VT25", "HT25"]

export type ExamType = "regular" | "re-exam"

// Subject / tema codes used in filters and imported Excel files
// pu, gen, gnm, vf, erl, cren, ibi, nspr + a fallback "Other"
export type SubjectArea =
  | "pu"
  | "gen"
  | "gnm"
  | "vf"
  | "erl"
  | "cren"
  | "ibi"
  | "nspr"
  | "Other"

export type InteractionType = "show_answer" | "check_answers" | "drag_matching" | "drag_ordering"

export interface DragPair {
  source: string
  target: string
}

export interface Question {
  id: string
  semester: Semester
  examType: ExamType
  examDate: string
  examPeriod: ExamPeriod
  subjectArea: SubjectArea
  questionNumber: number
  questionText: string
  interaction: InteractionType
  options?: string[]
  correctAnswer: string | string[]
  answer: string // Keep as the displayable correct answer/explanation
  isHidden?: boolean
  points?: number
  imageUrl?: string
}

export interface Exam {
  id: string
  semester: Semester
  examType: ExamType
  date: string
  year: number
  questionCount: number
}

export type FeedbackStatus = "new" | "read" | "resolved"

export interface QuestionFeedback {
  id: string
  questionId: string
  questionPreview: string
  feedbackText: string
  status: FeedbackStatus
  createdAt: string // ISO
}
