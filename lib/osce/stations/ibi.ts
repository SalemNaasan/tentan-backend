import { exam, self, tool } from "../builders"
import type { ExamRef, OsceItem, OsceStation } from "../types"

// Frågorna är ordagranna från examinatorsprotokollen. Ändra inte ordalydelsen.
// Varje tenta är en egen station: frågorna återkommer men preparat, poäng och svar skiljer sig.

const gramSlide = (gram: "pos" | "neg"): OsceItem[] => [
  tool("gram", "gram", "Detta är en bild på ett gramfärgat preparat", [], "", { organism: gram === "pos" ? "gpos-cocci" : "gneg-rods" }),
  self("gram-reaction", "Vilken gramreaktion ser du?", [[gram === "pos" ? "Grampositiv" : "Gramnegativ", 1]], "Lila/blåvioletta bakterier = grampositiva, rosa/röda = gramnegativa."),
  self(
    "gram-why",
    "Varför färgas bakterier olika vid gramfärgning?",
    [
      ["Skillnad i uppbyggnaden av sina cellväggar. G+ har en tjockare cellvägg bestående av flera skikt av peptidoglykan. G- har ett tunnare lager av peptidoglykan samt LPS.", 0.5],
      ["Då man sköljer bakterierna med alkohol tappar G- den violetta färgen och behöver därför färgas in med en kontrastfärg (ex. safranin). G+ påverkas inte av alkoholen.", 0.5],
    ],
    "Stegen: kristallviolett → jod → alkohol/aceton → safranin.",
  ),
]

const chapman = (points: 1 | 2): OsceItem =>
  self(
    "chapman",
    "Detta är en chapmanplatta. Vilka två funktioner har den?",
    [
      ["Selekterande – hög koncentration av NaCl som hämmar tillväxt av de flesta bakterier, dock ej stafylokocker.", points / 2],
      ["Differentierande – Mannit jäses av bl.a. Staphylococcus aureus, vilket ger sura restprodukter och färgomslag till gult i plattan.", points / 2],
    ],
    "",
  )

const spores: OsceItem[] = [
  tool("spores", "gram", "Detta är ett preparat som är färgat med malakitgrönt.", [], "", { organism: "spores" }),
  self("spores-what", "Vad ser du?", [["Grönfärgade endosporer", 0.5]], "Endosporer bildas av bl.a. Bacillus och Clostridium."),
  self("autoclave", "Vilken steriliseringsteknik används för att avdöda endosporer?", [["Autoklavering, tryck-kokning", 0.5]], ""),
]

const bloodAgar = (plates: ("beta" | "alpha" | "gamma")[], plateQuestion: string): OsceItem[] => [
  tool("agar", "agar", "Visa blodagarplatta.", [], "", { plates }),
  self("plate", plateQuestion, [["Blodagarplatta/Blodplatta", 1]], ""),
  self(
    "plate-why",
    "Varför är blodagar bra att odla bakterier på?",
    [["Näringsrik", 0.5], ["Studera hemolys", 0.5]],
    "",
  ),
]

const betaHemolysis = self("hemolysis", "Ser du någon hemolys? Vilken sorts hemolys?", [["Ja. Beta-hemolys/fullständig hemolys", 1]], "Betahemolys ger en klar genomskinlig zon runt kolonierna.")

const hemolysisABC = self(
  "hemolysis-abc",
  "Vilken sorts hemolys ser du på platta A, B och C?",
  [["A. Ingen hemolys (gamma)", 1], ["B. Alfahemolys (delvis hemolys)", 1], ["C. Betahemolys (fullständig hemolys)", 1]],
  "",
)

const tubes = (organism: "ecoli" | "klebsiella", speciesPoints: 1 | 2, tubeQuestion: string): OsceItem[] => [
  tool("tube-rack", "agar", "Visa rör.", [], "", { tubes: organism }),
  self(
    "tubes",
    tubeQuestion,
    [["Jäsningsrör", 1], ["Biotypning (art- och typbestämning via skillnader i bakteriers metabolism)", 1]],
    "",
  ),
  self(
    "species",
    "Vilken bakterie är det?",
    [[organism === "ecoli" ? "E. coli" : "Klebsiella", speciesPoints]],
    "E. coli: indolpositiv, citratnegativ och rörlig. Klebsiella: indolnegativ, citratpositiv, ureaspositiv och orörlig.",
  ),
]

const TUBE_Q = "Vilken typ av rör? Vad används dom till?"
const PLATE_Q = "Vilken typ av platta?"

function bacteriology(id: string, ref: ExamRef, items: OsceItem[], note?: string): OsceStation {
  return {
    id,
    theme: "IBI",
    title: "Bakteriologi",
    skills: ["Gramfärgning", "Bakteriologi", "Odling"],
    scenario: "",
    exam: ref,
    note,
    items,
  }
}

export const ibiStations: OsceStation[] = [
  bacteriology("ibi-vt26-fm", exam("VT26", "ordinarie", "fm"), [...gramSlide("pos"), chapman(1), ...bloodAgar(["beta"], PLATE_Q), betaHemolysis, ...tubes("ecoli", 2, TUBE_Q)]),
  bacteriology("ibi-vt26-em", exam("VT26", "ordinarie", "em"), [...gramSlide("neg"), ...spores, ...bloodAgar(["beta"], PLATE_Q), betaHemolysis, ...tubes("klebsiella", 2, TUBE_Q)]),
  bacteriology("ibi-vt25-fm", exam("VT25", "ordinarie", "fm"), [...gramSlide("neg"), chapman(2), ...bloodAgar(["beta"], "Vilka typ av platta?"), betaHemolysis, ...tubes("ecoli", 1, TUBE_Q)]),
  bacteriology("ibi-vt25-em", exam("VT25", "ordinarie", "em"), [...gramSlide("pos"), ...bloodAgar(["gamma", "alpha", "beta"], PLATE_Q), hemolysisABC, ...tubes("klebsiella", 1, TUBE_Q)]),
  bacteriology(
    "ibi-ht24-omtenta",
    exam("HT24", "omtenta"),
    [...gramSlide("neg"), ...spores, ...bloodAgar(["beta"], PLATE_Q), betaHemolysis, ...tubes("klebsiella", 2, "Vilken typ av rör? Vad används de till?")],
    "Protokollet saknar facit. Preparat och svar är därför samma som på VT26 em, som har samma frågor.",
  ),
  {
    id: "ibi-anemi",
    theme: "IBI",
    title: "Anemi",
    skills: ["Anemiutredning", "Labbvärden"],
    scenario:
      "Elena 24 år, och Lennart 75 år, söker båda vårdcentralen. Lennart beskriver ökade besvär av kärlkramp den senaste tiden, och Elena har via sin klocka noterat en högre hjärtfrekvens än vanligt de senaste veckorna. Som erfaren läkare väcks din misstanke om att båda kan ha anemi.",
    material: [
      "Provsvar: Hb 73 g/L (117–153), EVF 0,20 (0,3–0,46), erytrocyter 2,8 ×10¹²/L (3,9–5,2), MCV 71 fL (82–98), MCH 26 pg (27–33), LPK 6,5 ×10⁹/L (3,5–8,8), TPK 355 ×10⁹/L (140–390)",
      "Provsvar Lennart: Hb 73 g/L (134–170), LPK 4,1 ×10⁹/L (3,5–8,8), TPK 320 ×10⁹/L (140–350)",
    ],
    exam: exam("HT25", "omtenta"),
    items: [
      self(
        "symptoms",
        "Nämn fyra typiska symtom eller statusfynd vid anemi.",
        [
          ["Andfåddhet", 0.5],
          ["Hjärtklappning", 0.5],
          ["Blekhet", 0.5],
          ["Yrsel", 0.5],
          ["Lågt blodtryck", 0.5],
          ["Munvinkelragader", 0.5],
        ],
        "0,5 p per korrekt svar – kan finnas fler som bedöms korrekta.",
        2,
      ),
      self(
        "history",
        "Ett kapillärt Hb bekräftar misstanken – båda har anemi med Hb 73 g/L. Ange två viktiga anamnestiska frågor till Elena respektive Lennart.",
        [
          ["Stora menses", 0.5],
          ["Vegetarian/vegan", 0.5],
          ["Ändrade avföringsvanor, svart avföring", 0.5],
          ["Står på blodförtunnande", 0.5],
        ],
        "0,5 p per korrekt svar – kan finnas fler som bedöms korrekta.",
      ),
      self(
        "mcv",
        "Elena och Lennart får gå till labb för venös provtagning – du vill veta mer om hur blodstatus ser ur för vidare utredning. Vad förväntar du dig för MCV vid anemi på grund av; njursvikt, alkoholism, B12-brist, järnbrist, thalassemi samt folatbrist?",
        [
          ["Njursvikt (normocytär)", 0.5],
          ["Alkoholism (makrocytär)", 0.5],
          ["B12-brist (makrocytär)", 0.5],
          ["Järnbrist (mikrocytär)", 0.5],
          ["Thalassemi (mikrocytär)", 0.5],
          ["Folatbrist (makrocytär)", 0.5],
        ],
        "",
      ),
      self(
        "define",
        "Ali från labb sticker in huvudet tio minuter senare. DELA UT PROVSVAREN. Utifrån provsvaren – definiera anemin och motivera vad du i första hand vill ta för kompletterande prover för att bekräfta din misstanke?",
        [["Mikrocytär anemi", 0.5], ["Komplettera provtagning med järnstatus (serumjärn, transferrin och transferrinmättnad), transferrinreceptor och ferritin – räcker med ferritin/järnstatus", 0.5]],
        "",
      ),
      self(
        "order",
        "Vid utveckling av järnbristanemi – i vilken ordning påverkas proverna? Rangordna ferritin, MCV, Hb, plasmajärn.",
        [["1 ferritin, 2 plasmajärn, 3 Hb, 4 MCV", 2]],
        "Först töms järndepåerna, sedan sjunker det cirkulerande järnet, därefter blir Hb lågt och sist sjunker MCV.",
      ),
    ],
  },
]
