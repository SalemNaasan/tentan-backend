import type { Question, Exam } from "./types"

export const mockQuestions: Question[] = [
  {
    id: "q1",
    semester: "T1",
    examType: "regular",
    examDate: "2024-01-15",
    examPeriod: "VT24",
    subjectArea: "Other",
    questionNumber: 1,
    interaction: "check_answers",
    questionText: "Vilken nerv försörjer de flesta musklerna i kroppens främre lårogel?",
    options: ["Femoralis", "Ischiadicus", "Obturatorius", "Tibialis"],
    correctAnswer: ["a"],
    answer: "Nervus femoralis försörjer quadriceps femoris, sartorius och pectineus.",
  },
  {
    id: "q2",
    semester: "T1",
    examType: "regular",
    examDate: "2024-01-15",
    examPeriod: "VT24",
    subjectArea: "Other",
    questionNumber: 2,
    interaction: "check_answers",
    questionText: "Vilka av följande är grenar från aorta carotis externa? (Välj alla som stämmer)",
    options: ["A. thyroidea superior", "A. lingualis", "A. facialis", "A. ophthalmica"],
    correctAnswer: ["a", "b", "c"],
    answer: "A. ophthalmica är en gren från aorta carotis interna.",
  },
  {
    id: "q3",
    semester: "T1",
    examType: "re-exam",
    examDate: "2024-02-20",
    examPeriod: "VT24",
    subjectArea: "Other",
    questionNumber: 1,
    interaction: "show_answer",
    questionText: "Beskriv hjärtats retledningssystem i korrekt ordning (börja från sinusknutan).",
    correctAnswer: "SA-noden, AV-noden, His bunt, Purkinjefibrer",
    answer: "Impulsen startar i SA-noden och sprids sedan via AV-noden till His bunt och slutligen Purkinjefibrerna.",
  },
  {
    id: "q4",
    semester: "T2",
    examType: "regular",
    examDate: "2024-05-10",
    examPeriod: "VT24",
    subjectArea: "Other",
    questionNumber: 1,
    interaction: "show_answer",
    questionText: "Vilka hormon bildas i Pankreas, Binjurebark respektive Hypofys?",
    correctAnswer: "Insulin (Pankreas), Kortisol (Binjurebark), TSH (Hypofys)",
    answer: "Insulin bildas i pankreas, kortisol i binjurebarken och TSH i hypofysen.",
  },
  {
    id: "q5",
    semester: "T2",
    examType: "regular",
    examDate: "2024-05-10",
    examPeriod: "VT24",
    subjectArea: "Other",
    questionNumber: 2,
    interaction: "show_answer",
    questionText:
      "Compare and contrast the mechanisms of action of ACE inhibitors and ARBs in the treatment of hypertension. Discuss their effects on the renin-angiotensin-aldosterone system.",
    correctAnswer: "ACE block enzyme, ARB block receptor",
    answer:
      "ACE inhibitors block angiotensin-converting enzyme, preventing Ang I to Ang II conversion and bradykinin breakdown. ARBs block AT1 receptors, preventing Ang II effects while allowing Ang II to act on AT2 receptors.",

  },
  {
    id: "q6",
    semester: "T3",
    examType: "regular",
    examDate: "2024-10-05",
    examPeriod: "HT24",
    subjectArea: "Other",
    questionNumber: 1,
    interaction: "show_answer",
    questionText:
      "Describe the pathophysiology of acute myocardial infarction from the initial event to the cellular changes seen at different time points. Include the gross and microscopic findings.",
    correctAnswer: "Ischemia -> Necrosis (Coagulative)",
    answer:
      "AMI begins with coronary artery occlusion, causing ischemia. Within minutes, anaerobic metabolism begins. After 20-30 minutes, irreversible injury occurs. Microscopic changes include wavy fibers (1-3h), coagulative necrosis (4-12h), and neutrophil infiltration (12-24h).",

  },
  {
    id: "q7",
    semester: "T3",
    examType: "re-exam",
    examDate: "2024-11-15",
    examPeriod: "HT24",
    subjectArea: "Other",
    questionNumber: 1,
    interaction: "show_answer",
    questionText:
      "A 25-year-old woman presents with dysuria and frequency. Urine culture shows >100,000 CFU/mL of gram-negative rods. What is the most likely organism, and what virulence factors contribute to its pathogenicity?",
    correctAnswer: "E. coli",
    answer:
      "Escherichia coli (UPEC) is the most likely cause. Virulence factors include type 1 fimbriae (mannose-binding), P fimbriae (Gal-Gal binding), hemolysin, and siderophores for iron acquisition.",

  },
  {
    id: "q8",
    semester: "T4",
    examType: "regular",
    examDate: "2024-12-01",
    examPeriod: "HT24",
    subjectArea: "Other",
    questionNumber: 1,
    interaction: "show_answer",
    questionText:
      "A 65-year-old man with a history of atrial fibrillation presents with sudden onset of severe abdominal pain. Physical examination shows pain out of proportion to findings. What is your differential diagnosis and initial management?",
    correctAnswer: "Acute mesenteric ischemia",
    answer:
      "Acute mesenteric ischemia should be strongly suspected given AF and pain out of proportion to exam. Differential includes mesenteric venous thrombosis, NOMI, and aortic dissection. Initial management: NPO, IV fluids, anticoagulation, CT angiography.",

  },
  {
    id: "q9",
    semester: "T4",
    examType: "regular",
    examDate: "2024-12-01",
    examPeriod: "HT24",
    subjectArea: "Other",
    questionNumber: 2,
    interaction: "show_answer",
    questionText:
      "Explain the difference between Type I and Type IV hypersensitivity reactions. Provide clinical examples of each and describe the immunological mechanisms involved.",
    correctAnswer: "Type I (IgE), Type IV (T-cell)",
    answer:
      "Type I is IgE-mediated, immediate (minutes), involves mast cell degranulation (e.g., anaphylaxis, allergic rhinitis). Type IV is T-cell mediated, delayed (48-72h), involves Th1 cells and macrophages (e.g., contact dermatitis, tuberculin test).",

  },
  {
    id: "q10",
    semester: "T5",
    examType: "regular",
    examDate: "2025-01-10",
    examPeriod: "VT25",
    subjectArea: "Other",
    questionNumber: 1,
    interaction: "show_answer",
    questionText:
      "A 55-year-old woman presents with progressive fatigue, weight gain, and cold intolerance. Her TSH is 15 mU/L (normal 0.4-4.0) and free T4 is low. What is the diagnosis, most common cause, and treatment approach?",
    correctAnswer: "Hypothyroidism, Hashimoto's",
    answer:
      "Primary hypothyroidism, most commonly caused by Hashimoto's thyroiditis (chronic autoimmune thyroiditis). Treatment is levothyroxine replacement, starting at low doses in elderly or cardiac patients, with TSH monitoring every 6-8 weeks until stable.",

  },
  {
    id: "q11",
    semester: "T5",
    examType: "re-exam",
    examDate: "2025-02-15",
    examPeriod: "VT25",
    subjectArea: "Other",
    questionNumber: 1,
    interaction: "show_answer",
    questionText:
      "A 45-year-old man presents to the emergency department with sudden onset of severe epigastric pain radiating to the back, nausea, and vomiting. He has a history of heavy alcohol use. What is the most likely diagnosis and how would you confirm it?",
    correctAnswer: "Acute pancreatitis, Lipase >3x",
    answer:
      "Acute pancreatitis is the most likely diagnosis. Confirm with serum lipase (or amylase) >3x upper limit of normal, along with clinical presentation. CT with contrast can assess severity and complications if needed.",

  },
  {
    id: "q12",
    semester: "T6",
    examType: "regular",
    examDate: "2025-03-20",
    examPeriod: "VT25",
    subjectArea: "Other",
    questionNumber: 1,
    interaction: "show_answer",
    questionText:
      "A 2-year-old child presents with barking cough, inspiratory stridor, and hoarseness that started suddenly at night. What is the most likely diagnosis, and what is the initial management?",
    correctAnswer: "Viral croup, Dexamethasone",
    answer:
      "Viral croup (laryngotracheobronchitis) is the most likely diagnosis. Initial management includes humidified air, a single dose of dexamethasone (0.6 mg/kg), and nebulized epinephrine for moderate-severe cases.",

  },
]

export const mockExams: Exam[] = [
  { id: "e1", semester: "T1", examType: "regular", date: "2024-01-15", year: 2024, questionCount: 25 },
  { id: "e2", semester: "T1", examType: "re-exam", date: "2024-02-20", year: 2024, questionCount: 25 },
  { id: "e3", semester: "T2", examType: "regular", date: "2024-05-10", year: 2024, questionCount: 30 },
  { id: "e4", semester: "T3", examType: "regular", date: "2024-10-05", year: 2024, questionCount: 28 },
  { id: "e5", semester: "T3", examType: "re-exam", date: "2024-11-15", year: 2024, questionCount: 28 },
  { id: "e6", semester: "T4", examType: "regular", date: "2024-12-01", year: 2024, questionCount: 32 },
  { id: "e7", semester: "T5", examType: "regular", date: "2025-01-10", year: 2025, questionCount: 30 },
  { id: "e8", semester: "T5", examType: "re-exam", date: "2025-02-15", year: 2025, questionCount: 30 },
  { id: "e9", semester: "T6", examType: "regular", date: "2025-03-20", year: 2025, questionCount: 35 },
]
