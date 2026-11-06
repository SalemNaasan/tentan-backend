import { exam, self, tool } from "../builders"
import type { ExamRef, OsceItem, OsceStation } from "../types"

// Frågorna är ordagranna från examinatorsprotokollen. Ändra inte ordalydelsen.
// Protokollets frågor ligger i examQuestions; verktyget låter studenten utföra dem.

const CHILD_VS_ADULT = self(
  "child-vs-adult",
  "Hur skiljer sig HLR-algoritm mellan barn och vuxna och varför?",
  [
    ["15 vs 30 kompression och initial inblåsningarna", 0.5],
    ["Det är mest sannolikt med respiratorisk orsak hos barn", 0.5],
  ],
  "Poäng enbart om man kan beskriva båda delarna. Barns hjärtstopp är nästan alltid sekundärt till syrebrist, inte till en primär arytmi.",
)

const WHY_BREATHS = self(
  "why-breaths",
  "Varför är det relevant med inblåsningar även på ett barn som får hjärtstopp p.g.a främmande kropp i luftstrupen?",
  [["Barnet behöver syre, och luft kan passera förbi eller föremålet kan förskjutas", 1]],
  "Protokollet anger inget facit för frågan. Ett medvetslöst barn har slapp muskulatur, så föremålet sitter ofta inte lika hårt.",
)

const adultChoking = (prompt: string) =>
  self(
    "adult-choking",
    prompt,
    [["5 ryggdunk med korrekt placering", 1], ["5 buktryck med korrekt placering", 1]],
    "Buktryck görs inte på spädbarn – där används brösttryck i stället.",
  )

const CPR_WHY =
  "Konstatera hjärtstopp snabbt (ingen kontakt + ingen normal andning), larma tidigt och starta kompressioner direkt. Hjärtstartarens plattor placeras antero-lateralt eller antero-posteriort, så att strömmen går genom hjärtat."

function adultCpr(
  id: string,
  ref: ExamRef,
  scenario: string,
  firstQuestion: string,
  examQuestions: string[],
  criteria: [string, string, number][],
  extra: OsceItem[],
  skills: string[] = [],
): OsceStation {
  return {
    id,
    theme: "GEN",
    title: "HLR",
    skills: ["HLR", "Hjärtstartare", "Stabilt sidoläge", ...skills],
    scenario,
    material: ["Docka"],
    exam: ref,
    items: [tool("cpr", "cpr", firstQuestion, criteria, CPR_WHY, undefined, examQuestions), ...extra],
  }
}

const ALONE =
  "Du springer snabbt fram till personen som ligger på marken (representeras av en docka), till synes livlös. Du är själv på platsen."

const AED_STEPS = (prompt: string) =>
  self("aed-steps", prompt, [["Analysera, ladda, defibrillera/defibrillering, återstarta komp.", 0.5]], "")

const STANDARD_QUESTIONS = [
  "Visa vilka åtgärder du vidtar",
  "Du får ingen kontakt med mannen och uppfattar ingen andning, vad gör du nu?",
  "Vad gör du nu?",
  "Vad gör du nu?",
  "Visa hur du gör 4 cykler med HLR",
  "En person kommer förbi och frågar om denne kan hjälpa till med något. Vad ber du personen göra?",
  "Visa var du skulle placera plattorna för hjärtstartare",
  "Personen återfår andning, vad gör du nu",
]

const STANDARD_CRITERIA: [string, string, number][] = [
  ["cpr-consc", "Kontrollerar medvetandegrad (ropar/ruskar)", 0.5],
  ["cpr-airway", "Säkerställer fri luftväg", 0.5],
  ["cpr-breathing", "Kontrollerar andning (lyssnar/känner/tittar)", 0.5],
  ["cpr-112", "Larmar 112", 1],
  ["cpr-30", "30 bröstkompressioner", 0.5],
  ["cpr-hands", "Korrekt placering av händer", 0.5],
  ["cpr-rate", "Korrekt djup och frekvens", 0.5],
  ["cpr-2breaths", "2 inblåsningar", 0.5],
  ["cpr-mask", "Korrekt placering av mun/pocketmask", 0.5],
  ["cpr-eval", "Värderar effekt av inblåsningar", 0.5],
  ["cpr-cycles", "Gör korrekt 30:2 med snabba byten", 1],
  ["cpr-aed-fetch", "Hämta hjärtstartare/defibrillator", 1],
  ["cpr-pads", "Visa var du skulle placera plattorna för hjärtstartare", 1],
  ["cpr-recovery", "Visa stabilt sidoläge", 1],
]

const CHOKE_QUESTIONS = [
  "Visa hur du agerar för att försöka hjälpa barnet (dockan framför dig) som har satt i halsen och som nu inte orkar hosta så bra själv längre.",
  "När du kontrollerar vid nästa tillfälle har barnet tappat tonus och reagerar inte när du ruskar eller försöker få kontakt. Du uppfattar inte heller att den andas. Vad gör du nu?",
]

function chokingTool(checkText: string) {
  return tool(
    "choking",
    "choking",
    CHOKE_QUESTIONS[0],
    [
      ["ch-back1", "5 ryggdunk", 0.5],
      ["ch-chest1", "5 brösttryck", 0.5],
      ["ch-check", checkText, 1],
      ["ch-back2", "5 ryggdunk", 0.5],
      ["ch-chest2", "5 brösttryck", 0.5],
      ["ch-5breaths", "5 inblåsningar (position, värderar att lagom med luft kommer in)", 1],
      ["ch-15comp", "15 kompressioner (position, teknik: tummar/fingrar/knogar/hand, djup, frekvens)", 1],
      ["ch-cycles", "4 cykler korrekt barn-HLR 15:2", 1],
    ],
    "Håll barnet framåtlutat med huvudet lägre än bröstkorgen och ge 5 ryggdunk mellan skulderbladen. Vänd och ge 5 brösttryck. Kontrollera mellan varje serie.",
    undefined,
    CHOKE_QUESTIONS,
  )
}

function childChoking(id: string, ref: ExamRef, scenario: string, checkText: string, extra: OsceItem[]): OsceStation {
  return {
    id,
    theme: "GEN",
    title: "Luftvägsstopp och barn-HLR",
    skills: ["Luftvägsstopp", "Barn-HLR", "HLR"],
    scenario,
    material: ["Docka"],
    exam: ref,
    items: [chokingTool(checkText), ...extra],
  }
}

export const genStations: OsceStation[] = [
  adultCpr(
    "gen-hlr-vt26",
    exam("VT26", "ordinarie", "em"),
    `Du är ute och går i trädgårdsföreningen när du ser hur en person framför dig, först vingla till och sedan falla ihop några meter framför dig. ${ALONE}`,
    STANDARD_QUESTIONS[0],
    STANDARD_QUESTIONS,
    STANDARD_CRITERIA,
    [AED_STEPS("Beskriv kortfattat stegen som den halvautomatiska hjärtstarten kommer kommunicera?")],
  ),
  childChoking(
    "gen-barn-vt26",
    exam("VT26", "ordinarie", "fm"),
    "Du är ute och går i trädgårdsföreningen när du plötsligt hör kraftiga hostningar och harklingar från lekplatsen. Du går dit och finner en pappa med sin dotter på en parkbänk. Pappan är uppjagad och uppger att han tror att dottern satt en vindruva i halsen.",
    "Kontrollerar medvetande",
    [CHILD_VS_ADULT, WHY_BREATHS, adultChoking("Beskriv hur du gör om det var en vuxen som skulle sätta i halsen:")],
  ),
  adultCpr(
    "gen-hlr-ht25",
    exam("HT25", "ordinarie", "fm"),
    `Du är ute och går i trädgårdsföreningen när du ser hur en person framför dig, först vingla till och sedan faller ihop några meter framför dig. ${ALONE}`,
    STANDARD_QUESTIONS[0],
    STANDARD_QUESTIONS,
    STANDARD_CRITERIA,
    [AED_STEPS("Beskriv kortfattat stegen som den halvautomatiska hjärtstarten kommer kommunicera?")],
  ),
  childChoking(
    "gen-barn-ht25",
    exam("HT25", "ordinarie", "em"),
    "Du är och handlar på IKEA och har precis satt dig på restaurangen när du plötsligt hör ett högfrekvent hostande bakom dig. Du vänder dig om och får se en förälder med ett litet barn som hostar frenetiskt. Föräldern har tagit upp barnet (symboliserat att dockan framför dig) och ropar att barnet satt i halsen.",
    "Kontrollerar om föremålet kommer upp/barnet är vid medvetande",
    [
      self("small-airway", "Vad kan du behöv göra hos små barn för att förbättra luftvägen?", [["Lätt huvudböjning och haklyft (neutralläge)", 1]], "Protokollet anger inget facit för frågan."),
      self("air-amount", "Hur vet du hur mycket luft du skall blåsa in", [["Blåser tills bröstkorgen precis höjs", 1]], "Protokollet anger inget facit för frågan."),
      CHILD_VS_ADULT,
      WHY_BREATHS,
    ],
  ),
  adultCpr(
    "gen-hlr-ht25-omtenta",
    exam("HT25", "omtenta"),
    "Du är ute och går på stan när du ser hur en man först vinglar till och sedan faller ihop några meter framför dig. Du springer snabbt fram till mannen som ligger på marken (representeras av en docka), till synes livlös. Du är själv på platsen.",
    "Visa vilka åtgärder du vidta för att konstatera hjärtstopp.",
    [
      "Visa vilka åtgärder du vidta för att konstatera hjärtstopp.",
      "Du får ingen kontakt med mannen och uppfattar ingen andning, vad gör du nu?",
      "Vad gör du nu?",
      "Vad gör du nu?",
      "Visar hur du gör 4 cykler med HLR",
      "En person kommer förbi och frågar om denne kan hjälpa till med något. Vad ber du personen göra?",
      "Mannen hostar till och du uppfattar att han andas. Larmoperatören på 112 säger att en ambulans är på plats om några minuter. Vad gör du nu?",
    ],
    [
      ["cpr-consc", "Kontrollerar medvetandegrad (ropar/ruskar)", 0.5],
      ["cpr-airway", "Säkerställer fri luftväg", 0.5],
      ["cpr-breathing", "Kontrollerar andning (lyssnar/känner/tittar)", 1],
      ["cpr-112", "Larmar 112", 1],
      ["cpr-30", "Hjärtkompressioner (antal – 30)", 0.5],
      ["cpr-hands", "Teknik (placering)", 0.25],
      ["cpr-rate", "Teknik (djup och frekvens)", 0.25],
      ["cpr-2breaths", "Inblåsningar (antal – 2)", 0.5],
      ["cpr-mask", "Korrekt teknik (placering över mun)", 0.25],
      ["cpr-eval", "Korrekt teknik (värderar effekt)", 0.25],
      ["cpr-cycles", "Gör korrekt 30:2 med snabba byten", 1],
      ["cpr-aed-fetch", "Hämta hjärtstartare/defibrillator", 1],
      ["cpr-recovery", "Beskriver/visar hur han lägger patienten i stabilt sidoläge", 1],
    ],
    [CHILD_VS_ADULT, WHY_BREATHS],
    ["Barn-HLR"],
  ),
  adultCpr(
    "gen-hlr-vt25-omtenta",
    exam("VT25", "omtenta"),
    "Du är ute och går på stan när du ser hur en man först vinglar till och sedan faller ihop några meter framför dig. Du springer snabbt fram till mannen som ligger på marken (representeras av en docka), till synes livlös. Du är själv på platsen.",
    "Vilka åtgärder vidtar du?",
    [
      "Vilka åtgärder vidtar du?",
      "Du får ingen kontakt med mannen och uppfattar ingen andning, vad gör du nu?",
      "Vad gör du nu?",
      "Viss hur du gör 4 cykler med HLR",
      "En person kommer förbi och frågar om denne kan hjälpa till med något. Vad ber du personen göra?",
      "Visa var du skulle placera plattorna för hjärtstartare",
      "Mannen hostar till och du uppfattar att han andas. Larmoperatören på 112 säger att en ambulans är på plats om några minuter. Vad gör du nu?",
    ],
    [
      ["cpr-consc", "Kontrollerar medvetandegrad", 0.5],
      ["cpr-airway", "Säkerställer fri luftväg", 0.5],
      ["cpr-breathing", "Kontrollerar andning", 0.5],
      ["cpr-112", "Larmar 112", 0.5],
      ["cpr-30", "30 Bröstkompressioner", 0.5],
      ["cpr-hands", "Korrekt placering", 0.5],
      ["cpr-rate", "5-6 cm djup/ 1/3 av bröstkorg, 100-120/min", 0.5],
      ["cpr-2breaths", "2 inblåsningar", 0.5],
      ["cpr-eval", "Värderar effekt av inblåsningar", 0.5],
      ["cpr-cycles", "Korrekt 30:2, snabba byten", 1],
      ["cpr-aed-fetch", "Hämta hjärtstartare/defibrillator", 0.5],
      ["cpr-pads", "Korrekt placering, antero-posteriort eller antero-lateralt", 1],
      ["cpr-recovery", "Beskriver/visar hur han lägger patienten i stabilt sidoläge", 1],
    ],
    [adultChoking("Beskriv hur du gör om du har en vuxen som har satt i halsen:")],
    ["Luftvägsstopp"],
  ),
  adultCpr(
    "gen-hlr-ht24",
    exam("HT24", "ordinarie", "em"),
    "Du är ute och går på stan när du ser hur en man först vinglar till och sedan faller ihop några meter framför dig. Du springer snabbt fram till mannen som ligger på marken (representeras av en docka), till synes livlös. Du är ensam på platsen.",
    "Visa vilka åtgärder du vidtar för att konstatera hjärtstopp.",
    [
      "Visa vilka åtgärder du vidtar för att konstatera hjärtstopp.",
      "Du får ingen kontakt med mannen och uppfattar ingen andning, vad gör du nu?",
      "Vad gör du nu?",
      "Gör två cykler korrekt HLR",
      "En person kommer förbi och frågar om vederbörande kan hjälpa till med något. Vad ber du personen göra?",
      "Visa med händerna på dockan var du sätter plattorna för defibrillatorn",
      "Mannen hostar till och du uppfattar att han andas. Larmoperatören på 112 säger att en ambulans är på plats om några minuter. Vad gör du nu?",
    ],
    [
      ["cpr-consc", "Kontrollerar medvetandegrad (ropar/ruskar)", 1],
      ["cpr-breathing", "Kontrollerar andning (lyssnar/känner/tittar)", 1],
      ["cpr-112", "Larmar 112", 1],
      ["cpr-30", "Hjärtkompressioner (antal – 30)", 0.5],
      ["cpr-rate", "Hjärtkompressioner (frekvens)", 0.5],
      ["cpr-hands", "Teknik (placering, djup)", 1],
      ["cpr-2breaths", "Inblåsningar (antal – 2)", 0.5],
      ["cpr-mask", "Korrekt teknik (placering över mun)", 0.25],
      ["cpr-eval", "Korrekt teknik (värderar effekt)", 0.25],
      ["cpr-cycles", "Gör korrekt 30:2 med snabba byten", 1],
      ["cpr-aed-fetch", "Hämta hjärtstartare/defibrillator", 1],
      ["cpr-pads", "Korrekt placering, antero-posteriort eller antero-lateralt", 0.5],
      ["cpr-recovery", "Beskriver/visar hur han lägger patienten i stabilt sidoläge", 1],
    ],
    [AED_STEPS("Beskriv hur en halvautomatisk hjärtstare fungerar")],
  ),
  childChoking(
    "gen-barn-ht24",
    exam("HT24", "ordinarie", "fm"),
    "Du pulsar i nysnön genom trädgårdsföreningen när du plötsligt hör kraftiga hostningar och harklingar från lekplatsen. Du går in och finner en pappa med sin dotter på en parkbänk. Pappan är uppjagade och uppger att han tror att dottern satt en vindruva i halsen.",
    "Kontrollerar medvetande",
    [CHILD_VS_ADULT, WHY_BREATHS, adultChoking("Beskriv hur du gör om det var en vuxen som skulle sätta i halsen:")],
  ),
]
