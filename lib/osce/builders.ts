import type { ChoiceItem, Criterion, ExamRef, NumericItem, OscePeriod, OsceStation, SelfItem, ToolId, ToolItem } from "./types"

// Små hjälpare som gör stationsfilerna lätta att läsa och skriva.
// Kriterier skrivs som [text, poäng] och får id:n automatiskt.

type CriterionInput = [text: string, points: number] | [text: string, points: number, id: string]

function toCriteria(itemId: string, list: CriterionInput[]): Criterion[] {
  return list.map(([text, points, id], i) => ({ id: id ?? `${itemId}-${i}`, text, points }))
}

export function self(
  id: string,
  prompt: string,
  criteria: CriterionInput[],
  why: string,
  maxPoints?: number,
): SelfItem {
  return { kind: "self", id, prompt, criteria: toCriteria(id, criteria), why, maxPoints }
}

export function choice(
  id: string,
  prompt: string,
  options: string[],
  correct: number | number[],
  points: number,
  why: string,
): ChoiceItem {
  const correctList = Array.isArray(correct) ? correct : [correct]
  return { kind: "choice", id, prompt, options, correct: correctList, points, why, multi: Array.isArray(correct) }
}

export function numeric(
  id: string,
  prompt: string,
  unit: string,
  [min, max]: [number, number],
  points: number,
  why: string,
): NumericItem {
  return { kind: "numeric", id, prompt, unit, min, max, points, why }
}

/** Kriterier för verktyg har fasta id:n eftersom verktyget rapporterar dem */
export function tool(
  id: string,
  toolId: ToolId,
  prompt: string,
  criteria: [id: string, text: string, points: number][],
  why: string,
  config?: Record<string, any>,
  examQuestions?: string[],
): ToolItem {
  return {
    kind: "tool",
    id,
    tool: toolId,
    prompt,
    criteria: criteria.map(([cid, text, points]) => ({ id: cid, text, points })),
    why,
    config,
    examQuestions,
  }
}

/** Bild ur tentan, visas exakt som den är (filer i /public/osce/exam) */
export function figure(id: string, prompt: string, files: string[]): ToolItem {
  const images = files.map(f => ({ src: `/osce/exam/${f}.jpg`, alt: prompt }))
  return tool(id, "image", prompt, [], "", { images })
}

export function exam(period: OscePeriod, type: ExamRef["type"], session?: ExamRef["session"]): ExamRef {
  return { period, type, session }
}

/** Samma station på en annan tenta */
export function reused(station: OsceStation, id: string, ref: ExamRef, patch: Partial<OsceStation> = {}): OsceStation {
  return { ...station, ...patch, id, exam: ref }
}
