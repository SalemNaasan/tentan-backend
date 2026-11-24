import type { Semester } from "./types"

// Föreläsningarna per termin och tema, i kursens ordning (som i anteckningsboken "Tentafrågor Preklin").
// Frågorna kopplas till en föreläsning via fältet lecture.

export interface LectureGroup {
  theme: string
  lectures: string[]
}

export const LECTURES: Partial<Record<Semester, LectureGroup[]>> = {
  T2: [
    {
      theme: "CREN",
      lectures: [
        "Erytropoes",
        "Hematopoes",
        "Lungmekanik",
        "Gastransport",
        "Hjärta",
        "Aktionspotentialer & EKG",
        "Cirkulationsfysiologi",
        "Syra-bas",
        "Blodtrycksreglering",
        "Autonoma Nervsystemet",
        "Njuren",
        "Urinvägarna",
        "Normal Hemostas",
        "Arbetsfysiologi",
      ],
    },
    {
      theme: "IBI",
      lectures: [
        "Bakterier",
        "Medfödda Immunförsvaret",
        "Huden",
        "Slemhinnans försvar",
        "Adaptiva Immunförsvaret",
        "Virus & Vaccin",
        "T-celler",
        "B-celler",
      ],
    },
    {
      theme: "NSPR",
      lectures: [
        "Neuroanatomi",
        "Nervsystemets celler",
        "Synaptisk Transmission & Integrering",
        "Homeostas",
        "Motorik I",
        "Motorik II",
        "Somatosensorik",
        "CNS-Embryologi",
        "Rörelseapparatens - Embryologi",
        "Ryggmärgen & Nervrötters Makroanatomi",
        "Benbildning & Frakturläkning",
        "Skalle",
        "Halsen",
        "Rygg & Bål",
        "Axel/Skapula",
        "Arm",
        "Hand",
        "Höft",
        "Ben/Knä",
        "Foten",
        "Smak",
        "Lukt",
        "Ögat & Synsystemet",
        "Örat",
      ],
    },
    { theme: "Histologi", lectures: ["Histologi"] },
  ],
}

/** Föreläsningsgrupperna för de valda terminerna (tom lista om inga föreläsningar finns) */
export function lectureGroupsFor(semesters: Semester[]): (LectureGroup & { semester: Semester })[] {
  return semesters.flatMap(s => (LECTURES[s] ?? []).map(g => ({ ...g, semester: s })))
}

/** Plats i kursordningen, för sortering efter föreläsning (okända sist) */
export function lectureRank(semester: Semester, lecture?: string | null): number {
  if (!lecture) return 9999
  let i = 0
  for (const group of LECTURES[semester] ?? []) {
    for (const l of group.lectures) {
      if (l === lecture) return i
      i++
    }
  }
  return 9998
}
