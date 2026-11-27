import type { Semester } from "./types"

// Föreläsningarna per termin och tema, i kursens ordning (som i anteckningsboken "Tentafrågor Preklin").
// Frågorna kopplas till en föreläsning via fältet lecture.

/**
 * Visar föreläsningsfilter, sortering och etikett på övningssidan för alla.
 * Avstängt tills vidare: då syns funktionen bara för den som aktiverat en betakod på /beta.
 * Sätt till true för att visa den för alla. (Föreläsningarna finns kvar på frågorna och kan redigeras i admin.)
 */
export const LECTURES_ENABLED = false

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
  T3: [
    {
      theme: "GEN",
      lectures: [
        "Receptorfarmakologi",
        "Farmakodynamik",
        "Farmakokinetik",
        "Läkemedelsmetabolism & Farmakogenetik (CYP450)",
        "Läkemedel i kliniken",
        "Cellens Stressrespons",
        "Diagnostiska Metoder & Begrepp",
        "Adaption, Cellskada & Reparation",
        "Akut och Kronisk Inflammation",
        "Upplagringssjukdomar & Amyloidos",
        "Hallmarks of Cancer",
        "Allmän Patologi",
        "Tumörpatologi",
        "Ärftlig Cancer",
        "Molekylär patologi",
        "Åldrandemekanismer",
        "Systemiska effekter av Cancer (Kakexi/Anorexi)",
        "Cancerläkemedel",
        "Toxikologi",
        "Arbets- och Inomhusmiljö",
      ],
    },
    {
      theme: "PU",
      lectures: [
        "Global Hälsa",
        "Jämlik Hälsa",
        "Samhällsinterventioner",
        "Miljömedicin",
        "Stresshantering",
        "Fysiologiska Mekanismer vid Fysisk Aktivitet",
      ],
    },
    {
      theme: "CREN",
      lectures: [
        "EKG",
        "Arbetsprov",
        "Ateroskleros",
        "Lipider",
        "Akuta Koronara Syndrom",
        "Kroniska Koronara Syndrom",
        "Hjärtsvikt",
        "Hemostas",
        "Aneurysm",
        "Klaffel",
        "Arytmi",
        "Perimyokardit",
        "Duplex Doppler",
        "Hypertoni",
        "Kronisk Njursvikt",
        "Glomerulonefrit",
        "Proteiner i Plasma",
        "Akut Njurskada",
        "Anemi",
        "(Blodgrupper) Transfusionsmedicin & Immunhematologi",
        "Astma",
        "Lungsjukdom",
        "Lungcancer",
        "Bronkobstruktiv Farmakodynamik",
        "Röntgen och DT",
        "MEQ-fall",
      ],
    },
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
