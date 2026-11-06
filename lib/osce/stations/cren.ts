import { exam, figure, self, tool } from "../builders"
import type { ExamRef, OsceStation } from "../types"

// Frågorna är ordagranna från examinatorsprotokollen. Ändra inte ordalydelsen.

const WALLS_WHY =
  "Varje avledning 'tittar' på hjärtat från ett eget håll. V1–V2 ligger närmast septum, V3–V4 över framväggen, V5–V6 samt I och aVL ser lateralväggen och II, III och aVF ser diafragmaväggen (inferiort). ST-höjningar i en grupp avledningar lokaliserar därför infarkten och talar om vilket kranskärl som sannolikt är ockluderat (anteriort/septalt ≈ LAD, inferiort ≈ RCA, lateralt ≈ LCx)."

const walls = (prompt: string) =>
  self(
    "walls",
    prompt,
    [
      ["Septala = (V1), V2 (räcker med V2)", 0.5],
      ["Anteriora = V3-V4", 0.5],
      ["Laterala = V5-V6 + AVL, I", 0.5],
      ["Inferiora = II, AVF, III", 0.5],
    ],
    WALLS_WHY,
  )

const WALLS_TEXT =
  "Efter en hjärtinfarkt kan man på EKG se vilken/vilka kammarväggar som är skadade. Vilka avledningar avspeglar septum, anteriora, laterala och inferiora kammarväggar bäst?"

const TREMOR_WHY =
  "Bipolära extremitetsavledningar mäter skillnaden mellan två elektroder: I = vänster arm – höger arm, II = vänster ben – höger arm, III = vänster ben – vänster arm. Muskelaktivitet från en extremitet syns därför i de två avledningar där just den elektroden ingår, men inte i den tredje. Högerarm → I och II, vänsterarm → I och III, vänsterben → II och III."

const REGISTRATION = self(
  "duration",
  "Du registrerar vilo-EKG och skriver ut en standard EKG rapport. Hur lång EKG-registrering sparas?",
  [["EKG-apparater samlar alltid in 10 sekunder", 0.5]],
  "EKG-apparaten samlar alltid in 10 sekunder. Därför kan du räkna antal QRS-komplex på rytmremsan × 6 för att få frekvensen per minut.",
)

const WRONG_CABLE = self(
  "wrong-cable",
  "När du plockar bort sladdarna från elektroderna blir du osäker på om du har kopplat rätt sladd på rätt plats – vad gör du då? Ge 2 exempel.",
  [["Tar ett nytt EKG", 0.5], ["Jämför med ett tidigare taget EKG, ex. i MUSE", 0.5]],
  "Felkopplingar (t.ex. omkastade armelektroder) kan efterlikna patologi som negativ P-våg i I och högerställd axel – jämför alltid med tidigare EKG.",
)

const TREMOR_LEFT_ARM = self(
  "tremor-leads",
  "Du ska ta ett EKG på en patient som har Parkinsons sjukdom med lätta skakningar i vänster arm. Beskriv i vilka bipolära extremitetsavledningar du ser avvikelser i EKG bilden och vad är det du ser som är avvikande?",
  [["Störningar i avl I", 0.5], ["Störningar i avl III", 0.5], ["Muskelstörningar från vänster arm", 0.5]],
  TREMOR_WHY,
)

const TREMOR_FIX = self(
  "tremor-fix",
  "Hur gör du för att minimera muskelstörningarna på det aktuella EKG;t? (elektroderna sitter på handlederna)",
  [["Flytta upp elektroden från vänster handled till högre upp på överarmen", 1]],
  "Ju närmare bålen elektroden sitter, desto mindre tremor från handen och underarmen registreras – och EKG:t påverkas inte nämnvärt eftersom armen fungerar som en ledare.",
)

type CurveType = "normal" | "obstructive" | "short" | "poor-effort"

const CURVE_FACIT: Record<CurveType, [string, number][]> = {
  normal: [["Normalt utseende på flöde/volym loopen", 0.5]],
  obstructive: [["Förlängd exspiration alt lågt slutexpiratoriskt flöde", 0.5], ["Ses vid: obstruktivitet", 0.5]],
  short: [["Förkortad exspiration", 0.5], ["Resulterar i: falsk hög FEV/FVC kvot", 0.5]],
  "poor-effort": [["Tveksam medverkan vid forcerad exspiration", 0.5], ["Resulterar i: MEF ej bedömbar alt Falsk låg FEV1 alt FEV1/FVC kvot", 0.5]],
}

function spirometryStation(id: string, ref: ExamRef, curves: CurveType[], btps: string, image: string): OsceStation {
  return {
    id,
    theme: "CREN",
    title: "Spirometri",
    skills: ["Spirometri", "PEF"],
    scenario: "",
    material: ["PEF-mätare", "Flöde/volym kurvor A-D"],
    exam: ref,
    items: [
      self(
        "pef",
        "Din första uppgift är att instruera försökspersonen att genomföra peak flow (PEF)- mätning enligt skolboken. Vilka instruktioner ger du? Beskriv vad du gör och hur du tänker.",
        [
          ["Instruerar försökspersonen inför testet", 0.5],
          ["Rak kroppshållning, greppar PEF mätaren korrekt", 0.5],
          ["Andas in maximalt, sätt läppar tätt runt munstycket, explosiv utblåsning", 0.5],
          ["Genomförande: Engagerad us. ledare, verbal support, korrigerar fel och ger kloka råd", 0.5],
          ["Ser till att mätmarkören är nollställd inför varje nytt försök. Genomför 3 st. PEF mätningar + Ange resultat! Rapporterar högsta PEF värdet.", 0.5],
        ],
        "PEF är helt ansträngningsberoende – en halvhjärtad utblåsning ger ett falskt lågt värde. Därför görs tre försök och det högsta värdet rapporteras.",
      ),
      figure("curves", "Flöde/volym kurvor A-D", [image]),
      self(
        "curves-judge",
        "Granska och värdera fyra flöde/volym kurvor (A-D).",
        curves.flatMap((type, i) => CURVE_FACIT[type].map(([text, p]): [string, number] => [`Figur ${String.fromCharCode(65 + i)}: ${text}`, p])),
        "En normal kurva stiger brant till PEF och sjunker sedan i en nästan rak linje mot FVC. Vid obstruktivitet är exspirationsdelen konkav. Avbruten utandning ger för liten FVC och därmed falskt hög kvot, och tveksam start ger för lite luft under första sekunden.",
      ),
      self(
        "btps",
        btps,
        [["Luftvolym i kroppen (B)", 0.5], ["Vid T: normal kroppstemp, P: lufttryck 760 mmHg, S: RH 100 %", 0.5]],
        "Luften som mäts i spirometern har rumstemperatur (ATPS) och tar därför mindre plats än i lungorna. Omräkning till BTPS gör att värden blir jämförbara med referensvärden.",
      ),
      self(
        "atps",
        "Hur säkerställer undersökningsledaren att korrekt konvertering från ATPS till BTPS sker?",
        [["Verifierar att spirometern avläser rumsklimatet korrekt så korrekt omräkning från ATPS volym till BTPS volym sker", 1]],
        "Om spirometern läser fel rumstemperatur blir omräkningsfaktorn fel och alla volymer systematiskt felaktiga.",
      ),
      self(
        "static",
        "Vid dynamisk spirometri registreras sänkt VC. Föreslå lämplig undersökningsmetod som bättre kan diagnostisera formen av lungfunktionsnedsättning. Ange också TVÅ viktiga lungfunktionsmått som undersökningsmetoden ger Dig.",
        [
          ["Statisk spirometri – föreslår Kroppspletysmografi alt. gasspädningsmetod som Heliumspädning alt N2 utsköljning", 1],
          ["Beräknad total lungkapacitet (TLC)", 0.5],
          ["Beräknad residualvolym (RV)", 0.5],
        ],
        "Sänkt VC kan bero på restriktivitet (små lungor, lågt TLC) eller på obstruktivitet med 'air trapping' (högt RV). Bara statisk spirometri som mäter TLC och RV kan skilja dem åt.",
      ),
    ],
  }
}

export const crenStations: OsceStation[] = [
  {
    id: "cren-hjartstatus",
    theme: "CREN",
    title: "Hjärtstatus",
    skills: ["Hjärtstatus", "Auskultation", "Hjärttoner"],
    scenario:
      "Din uppgift är att utföra ett fullständigt hjärtstatus på min kollega. Det är fokus på hur statustagningen går till och inte att du ska hitta några fel hos personen. När det är dags för lyssning så kommer vi att använda oss av ett dubbelstetoskop så jag hör vad du hör. Berätta hur du tänker och vad du gör, så tittar jag och ställer några frågor under tiden.",
    material: ["Försöksperson", "Dubbelstetoskop"],
    exam: exam("VT25", "omtenta"),
    items: [
      self(
        "inspection",
        "Börjar med att inspektera patienten Vad tittar du efter hos patienten?",
        [["Dyspné", 0.5], ["Cyanos", 0.5], ["Ödem", 0.5]],
        "Inspektionen kommer först eftersom allmäntillståndet ofta säger mest: andfåddhet (dyspné) och perifera ödem talar för hjärtsvikt, central cyanos för otillräcklig syresättning. 0,5 p för 1 rätt, 1,0 p för 2 eller flera rätt.",
        1,
      ),
      tool(
        "exam",
        "auscultation",
        "Går vidare med palpation - praktiskt!",
        [
          ["palp-before-ausk", "Själva utförandet", 1],
          ["palp-carotis", "Palperar carotispuls", 0.5],
          ["palp-iktus", "Palperar iktus", 0.5],
          ["ausk-cycle", "Avslutar med auskultation", 0.5],
          ["ausk-4", "Lyssnar över I2dx, I2sin, I4sin samt apex (färre ausk-punkter än de 4 = 0p)", 1],
          ["ausk-extra", "Ytterligare ausk-punkt", 0.5],
        ],
        "Iktus (apexstöten) ligger normalt i I5 medioklavikulärt vänster; förskjutning lateralt talar för förstorat hjärta. Kom ihåg att patientens vänstra sida är på DIN högra sida när du står framför patienten. Membranet förstärker högfrekventa ljud (S1, S2), klockan lågfrekventa (S3, S4).",
        { mode: "heart" },
        ["Går vidare med palpation - praktiskt!", "Avslutar med auskultation", "Lyssnar över I2dx, I2sin, I4sin samt apex + extra punkt"],
      ),
      self(
        "palp-what",
        "Vad palperar du?",
        [["Carotispuls", 0.5], ["Iktus", 0.5]],
        "Carotis ligger närmast hjärtat och ger bäst information om pulsvågens karaktär. Iktus läge speglar vänsterkammarens storlek.",
      ),
      self(
        "valves",
        "Vilka klaffar stänger vid första hjärttonen respektive andra hjärttonen?",
        [
          ["1a tonen: Mitralis", 0.5],
          ["1a tonen: Trikuspidalis", 0.5],
          ["2a tonen: Aortaklaffen", 0.5],
          ["2a tonen: Pulmonalisklaffen", 0.5],
        ],
        "Om studenten svarar ”AV-klaffarna” på första tonen frågar examinatorn efter de specifika klaffarna. Kan studenten inte specificera ges 0 p på den tonen.",
      ),
      self(
        "split",
        "Andratonens klyvning varierar med andningen- hur och varför?",
        [["Bredare klyvning på inandning", 0.5], ["Högre flöde genom högerhjärtat- pulm stänger senare", 0.5]],
        "Venösa återflödet till hjärtat ökar under inandning (då det intrathorakala trycket sjunker) vilket ger en förskjutning av pulmonalisklaffens stängning i förhållande till aortaklaffen.",
      ),
      self(
        "s3",
        "Man kan också ha en tredje hjärtton, vad orsakar den?",
        [["Uppstår tidigt i diastole, då snabbt inströmmande blod slår i kammarväggen", 1]],
        "S3 hörs i den snabba fyllnadsfasen. Den är normal hos unga och vältränade, men hos äldre ett tecken på volymbelastad kammare.",
      ),
    ],
  },
  {
    id: "cren-blodtryck",
    theme: "CREN",
    title: "Armblodtryck och spirometri",
    skills: ["Blodtrycksmätning", "Spirometri"],
    scenario:
      "Din uppgift är att mäta överarmsblodtryck på vår försöksperson. Berätta hur du tänker och vad du gör, så tittar jag och ställer några frågor under tiden. Vi använder ett dubbelstetoskop så jag hör vad du hör.",
    material: ["Tre blodtrycksmanschetter: 9 cm bred rak, 12 cm bred rak, 14 cm bred konisk", "En bordsmanometer", "Ett dubbelstetoskop + ett enkelstetoskop", "Timer", "Måttband"],
    exam: exam("VT25", "ordinarie", "fm"),
    items: [
      tool(
        "bp",
        "bloodpressure",
        "Tar rätt manschett och placerar i hjärthöjd",
        [
          ["bp-cuff", "Tar rätt manschett", 0.5],
          ["bp-heart-level", "Placerar i hjärthöjd", 0.5],
          ["bp-palp-value", "Mäter palpatoriskt tryck + rapporterar rimligt SBP", 0.5],
          ["bp-inflation", "Inflation 30-40 mmHg över palpatorisk nivå", 0.5],
          ["bp-deflation", "Kontinuerlig långsam deflation", 0.5],
          ["bp-sys", "Rapporterar blodtryck: Syst (+/- 10 mmHg jmf tentator)", 1],
          ["bp-dia", "Rapporterar blodtryck: Diast (+/- 10 mmHg jmf tentator)", 1],
        ],
        "Manschettens gummiblåsa ska vara ca 40 % av armens omkrets. Armen ska vara i hjärthöjd eftersom varje 13 cm höjdskillnad ger ca 10 mmHg fel. Korotkoff I (första tydliga ljudet) = systoliskt tryck, Korotkoff V (ljuden försvinner) = diastoliskt tryck.",
        { armCircumference: 29, sys: 148, dia: 86, silentGap: [136, 122] },
        [
          "Tar rätt manschett och placerar i hjärthöjd",
          "Mäter palpatoriskt tryck + rapporterar rimligt SBP",
          "Genomför adekvat manschettinflation/deflation",
          "Rapporterar blodtryck: Syst Diast.",
        ],
      ),
      self(
        "cuff-error",
        "Om fel storlek på manschett samt ej i hjärthöjd – hur påverkar det resultatet?",
        [["För smal manschett = högre tryck", 0.5], ["BA lägre än hjärtnivå = högre tryck, eller motsatsen", 0.5]],
        "En för smal manschett behöver ett högre tryck för att komprimera artären. Om armen hänger under hjärtnivå adderas vätskepelarens hydrostatiska tryck.",
      ),
      self(
        "why-palp",
        "Varför är det viktigt att mäta palpatoriskt?",
        [["Reducerar risken att underskatta auskultatoriskt SBP. T.ex om individen har ”Silent Gap” fenomen", 0.5]],
        "Vid silent gap tystnar Korotkoffljuden en bit under det verkliga systoliska trycket och återkommer sedan. Har du bara pumpat upp till gapet tror du att de återkommande ljuden är Korotkoff I.",
      ),
      self(
        "arteries",
        "Namnge och peka ut två armartärer där pulsen bör kunna palperas",
        [["A. radialis", 0.5], ["A. brachialis", 0.5], ["Annan korrekt namngiven och utpekad artär", 0.5]],
        "0,5 p per korrekt namngiven och utpekad artär. A. radialis palperas på tumsidan av handleden, a. brachialis medialt om bicepssenan i armbågsvecket.",
        1,
      ),
      figure("curve", "Nu kommer du att få bedöma en kurva från en dynamisk spirometri.", ["cren-vt25-fm-spirometri"]),
      self(
        "axes",
        "Vad är det vi mäter och i vilken enhet på x- respektive y-axel?",
        [["x-axel: volym som mäts i liter", 0.5], ["y-axel: flöde mäts i liter/sek", 0.5]],
        "Flöde–volymkurvan har volym på x-axeln och flöde på y-axeln. Exspiration ritas uppåt, inspiration nedåt.",
      ),
      self(
        "axes-max",
        "Vad motsvarar högsta värdet på respektive axel?",
        [["x-axel: vitalkapaciteten/forcerad vitalkapacitet", 1], ["y-axel: peak exp flow", 1]],
        "Kurvan slutar när all luft som går att blåsa ut har lämnat lungorna. Den högsta punkten är det maximala flödet vid forcerad utandning.",
      ),
    ],
  },
  {
    id: "cren-ekg-koppling",
    theme: "CREN",
    title: "EKG",
    skills: ["12-avlednings-EKG", "EKG-tolkning", "Elektrodplacering"],
    scenario: "Denna examinationsuppgift handlar om EKG koppling och tolkning.",
    material: ["EKG 1, Fråga 3."],
    exam: exam("HT24", "ordinarie", "em"),
    items: [
      tool(
        "electrodes",
        "electrodes",
        "Din första uppgift är att på övningsdocka/eller dig själv visa och beskriv med ord, var du placerar bröstelektroderna V1- V6.",
        [
          ["el-v1v2", "V1 V2 korrekt (V1=I4dx, V2=I4sin)", 0.5],
          ["el-v4", "V4 korrekt (medio-klavikulärt i I5)", 0.5],
          ["el-v3-line", "Rak linje V2-V4", 0.5],
          ["el-v5v6", "V5 och V6 korrekt (V5 främre axilarlinjen, V6 medioaxilart)", 0.5],
          ["el-v4v6-line", "Rak linje V4-V6", 0.5],
        ],
        "Räkna interkostalrummen från angulus sterni – där fäster revben 2 och under det ligger I2. V5 och V6 ligger i samma höjd som V4, inte i I5 längre ut.",
        { leads: ["V1", "V2", "V3", "V4", "V5", "V6"] },
      ),
      REGISTRATION,
      self(
        "acute",
        "Vid en akut situation när du vill ha en utskrift snabbt (utan att apparaten samlar in 10s), vilka elektroder och sladdar behövs, beskriv också var på kroppen du placerar dem?",
        [["Extremitetselektroderna dvs. ben och armar", 0.5]],
        "Med bara de fyra extremitetselektroderna får du de sex extremitetsavledningarna, vilket räcker för rytmbedömning.",
      ),
      figure("ecg1", "EKG 1", ["cren-ht24-em-ekg"]),
      self(
        "ecg",
        "Du ser här EKG 1: bestäm aktuell hjärtfrekvens och rytm samt ange el-axel (normalställd eller vä- hö-ställd?) (beskriv hur du gör och ange gradantal på aktuell el-axel)",
        [
          ["HR: 12,5x6=75 (72-78)", 0.5],
          ["Sinusrytm", 0.5],
          ["Lätt vänsterställd el-axel/normalställd", 0.5],
          ["Korrekt motivering val av elaxel (ex. i avl II tar de ut varandra + 3 avl uppåt alt högsta nettoutslaget i aVL)", 0.5],
        ],
        "Räkna QRS-komplex på 10-sekundersremsan × 6. El-axeln: leta efter den extremitetsavledning där QRS är isoelektriskt – axeln ligger vinkelrätt mot den.",
      ),
      walls("Efter en hjärtinfarkt kan man på EKG se vilken/vilka kammarväggar som är skadade. Vilka avledningar avspeglar septum, ateriora, laterala och inferiora kammarväggar bäst?"),
      TREMOR_LEFT_ARM,
      TREMOR_FIX,
    ],
  },
  {
    id: "cren-ekg-avblock",
    theme: "CREN",
    title: "EKG",
    skills: ["12-avlednings-EKG", "EKG-tolkning", "AV-block"],
    scenario: "Denna examinationsuppgift handlar om EKG koppling och tolkning.",
    material: ["EKG 1, Fråga 3."],
    exam: exam("VT25", "ordinarie", "em"),
    items: [
      self(
        "inform",
        "Du ska ta ett vilo-EKG på en person som aldrig tidigare tagit EKG. Hur informerar du personen om hur det går till och vilka resultat man får fram?",
        [
          ["Ligga ner på rygg med bar överkropp", 0.5],
          ["Placera elektroder på bröstkorgen och på armar och ben", 0.5],
          ["Gör inte ont; viktigt att slappna av", 0.5],
          ["Kort tid – där vi läser av din elektriska aktivitet i hjärtat", 0.5],
        ],
        "God information ger en avslappnad patient – och en avslappnad patient ger ett störningsfritt EKG.",
      ),
      REGISTRATION,
      WRONG_CABLE,
      figure("ecg1", "EKG 1", ["cren-vt25-em-ekg"]),
      self(
        "ecg",
        "Du ser här EKG 1: bestäm aktuell hjärtfrekvens och rytm samt ev. annat av vikt för tolkning.",
        [
          ["HR: 9x6=54 (51-54)", 0.5],
          ["Sinusrytm", 0.5],
          ["AV-block 1 (PQ-tid=240 ms dvs. >200ms/2 rutor)", 0.5],
          ["Förklaring till AV-block I", 0.5],
        ],
        "PQ-tiden speglar överledningen från förmak till kammare. Över 200 ms kallas AV-block I – alla impulser når kamrarna men med fördröjning.",
      ),
      walls(WALLS_TEXT),
      TREMOR_LEFT_ARM,
      TREMOR_FIX,
    ],
  },
  {
    id: "cren-ekg-infarkt",
    theme: "CREN",
    title: "EKG",
    skills: ["12-avlednings-EKG", "EKG-tolkning", "Infarktlokalisation"],
    scenario: "Denna examinationsuppgift handlar om EKG koppling och tolkning.",
    material: ["EKG 1, Fråga 3."],
    exam: exam("HT25", "ordinarie", "em"),
    items: [
      self(
        "inform",
        "Du ska ta ett akut EKG på en person som har ont i bröstet. Hur informerar du patienten innan du kopplar EKG?",
        [
          ["Ligga ner på rygg med bar överkropp", 0.5],
          ["Placera elektroder på bröstkorgen och på armar och ben; gör inte ont", 0.5],
          ["Viktigt att slappna av; snabb undersökning – där vi läser av din elektriska aktivitet i hjärtat", 0.5],
        ],
        "God information ger en avslappnad patient – och en avslappnad patient ger ett störningsfritt EKG.",
      ),
      self(
        "quality",
        "Vad kan du göra för att få ett fint och störningsfritt EKG? Nämn 2 förslag.",
        [
          ["Patienten ligger avslappnat och ej fryser", 0.5],
          ["Ta bort hudmotstånd", 0.5],
          ["Ha färska elektroder", 0.5],
          ["Flytta upp elektroder högre upp på extremiteter", 0.5],
        ],
        "Muskelaktivitet (frysningar, spänningar) och dålig elektrodkontakt är de vanligaste orsakerna till störningar.",
        1,
      ),
      WRONG_CABLE,
      figure("ecg1", "EKG 1", ["cren-ht25-em-ekg"]),
      self(
        "ecg",
        "Du ser här det aktuella EKG från patienten: bestäm aktuell hjärtfrekvens och rytm samt ev. annan avvikelse av vikt vid tolkning.",
        [
          ["12,5x6=75 (72-78)", 0.5],
          ["Förmaksflimmer", 0.5],
          ["ST-höjningar V2-V4", 0.5],
          ["Sammanfattning Akut pågående (ischemi) infarkt", 0.5],
          ["Anteroseptal", 0.5],
        ],
        "Förmaksflimmer: inga P-vågor och oregelbundet oregelbundna RR-intervall. ST-höjningar i angränsande bröstavledningar hos en patient med bröstsmärta är en akut STEMI tills motsatsen är bevisad.",
      ),
      walls(WALLS_TEXT),
      self(
        "tremor-right",
        "Du ska ta ett EKG på en patient som har lätta skakningar i höger arm. Beskriv i vilka bipolära extremitetsavledningar du ser avvikelser i EKG bilden och vad är det du ser som är avvikande?",
        [["Störningar i avl I", 0.5], ["Störningar i avl II", 0.5], ["Muskelstörningar från höger arm", 0.5]],
        TREMOR_WHY,
      ),
      self(
        "tremor-leg",
        "Om patienten i stället haft skakningar i vänster ben, i vilken bipolär avledning kommer EKG;t vara fritt från avvikelser?",
        [["Rätt svar är avledning I, muskelstörningar ses i avledning II och III", 0.5]],
        TREMOR_WHY,
      ),
    ],
  },
  {
    id: "cren-ekg-pq",
    theme: "CREN",
    title: "EKG",
    skills: ["12-avlednings-EKG", "EKG-tolkning", "Elektrodplacering", "AV-block"],
    scenario: "Denna examinationsuppgift handlar om EKG koppling och tolkning.",
    material: ["Bild med Bröstkorg inklusive revben, Fråga 1."],
    exam: exam("VT26", "ordinarie", "em"),
    items: [
      figure("thorax", "Bild med Bröstkorg inklusive revben", ["cren-vt26-em-brostkorg"]),
      tool(
        "electrodes",
        "electrodes",
        "Din första uppgift är att på bilden rita in och beskriva var du placerar bröstelektroderna V1, V2, V3 och V4.",
        [
          ["el-v1", "V1=I4dx", 0.5],
          ["el-v2", "V2=I4sin", 0.5],
          ["el-v3", "V3= på en rak linje mellan V2 och V4", 0.5],
          ["el-v4", "V4= medio-klavikulärt i I5", 0.5],
        ],
        "V1 och V2 sitter precis intill sternum. Räkna interkostalrummen från angulus sterni.",
        { leads: ["V1", "V2", "V3", "V4"] },
      ),
      figure("ecg1", "EKG 1", ["cren-vt26-em-ekg"]),
      self(
        "ecg",
        "Du ser här EKG 1: bestäm aktuell hjärtfrekvens och grundrytm samt ev. annat av vikt för tolkning",
        [["7,5x6= 45 slag/min", 0.5], ["Sinusrytm", 0.5], ["Bradykardi", 0.5]],
        "Varje QRS föregås av en P-våg och RR är regelbundet ⇒ sinusrytm. Bradykardi är vanligt hos vältränade och under sömn.",
      ),
      self(
        "pq",
        "Varför är man intresserad av att mäta P-Q tid och vad är orsaken till en förlängd PQ-tid?",
        [["Förlängd P-Q tid = AV-block I", 1], ["Att impulsen tar längre tid att passera AV-noden och ner i kamrarna", 0.5]],
        "PQ-tiden speglar överledningstiden från förmak till kammare, främst fördröjningen i AV-noden.",
      ),
      self(
        "pq-normal",
        "Vad räknas som ett normalt P-Q intervall (min-max)",
        [["Normal P-Q tid min=120 ms", 0.5], ["Max=200 ms", 0.5]],
        "Kort PQ (< 120 ms) kan tyda på en accessorisk ledningsbana.",
      ),
      self(
        "rprog",
        "I vilka avledningar på ett EKG bedömer du om R-vågsprogressionen är normal eller patologisk? Hur ser du att R-vågsprogressionen är patologisk?",
        [["I bröstavledningarna", 0.5], ["R-vågen ska öka från V1-(v3-v4) och därefter minska, ska finnas enbart en topp", 0.5]],
        "R-vågen blir högre ju närmare vänster kammares massa elektroden kommer.",
      ),
      self(
        "rprog-ex",
        "Nämn två exempel när det kan förekomma patologisk R-vågsprogression?",
        [["Vid infarkt", 0.5], ["Ex i V2-V4 avledningar, dvs. anterior eller anteroseptal infarkt", 0.5], ["Vid felkoppling av bröstelektroder", 1]],
        "Ärrvävnad efter en framväggsinfarkt genererar ingen depolarisation, så R-vågen uteblir.",
      ),
      self(
        "muscle",
        "Om du ser att det finns muskelstörningar i bipolära avledningarna I och II, vad kan du då göra För att minimera dessa muskelstörningar?",
        [["Preparera/byt elektrod (dåligt klister)", 0.5], ["Flytta upp på armen", 0.5]],
        "0,5 p per vettigt förslag, max 1,0 p. Störning i I och II pekar ut höger arm.",
      ),
    ],
  },
  spirometryStation("cren-spirometri-vt26", exam("VT26", "ordinarie", "fm"), ["poor-effort", "obstructive", "normal", "short"], "Luftvolymer vid spirometri rapporteras enligt BTPS standard. Förklara innebörden.", "cren-vt26-fm-spirometri"),
  spirometryStation("cren-spirometri-ht24", exam("HT24", "ordinarie", "fm"), ["short", "obstructive", "normal", "poor-effort"], "Luftvolymer vid spirometri rapporteras enligt BTPS standard. Förklara innebörden!", "cren-ht24-fm-spirometri"),
  {
    id: "cren-lungstatus",
    theme: "CREN",
    title: "Lungstatus och Spirometri",
    skills: ["Lungstatus", "Auskultation", "Spirometri"],
    scenario: "De fyra stegen som ingår i ett lungstatus är inspektion, palpation, perkussion och auskultation.",
    material: ["Spirometrikurva A, B, C."],
    exam: exam("HT25", "ordinarie", "fm"),
    items: [
      self(
        "percussion",
        "Vi vill nu att du perkuterar lungorna på försökspersonen framför dig.",
        [["Acceptabel teknik med bedömbar ton", 0.5], ["Jämför sidor och identifierar lunggränsen", 0.5]],
        "Lägg mellanfingret platt i ett interkostalrum och slå med andra handens långfinger från handleden. Jämför alltid motsvarande punkt höger–vänster.",
      ),
      self(
        "why-perc",
        "Varför är det viktigt att perkutera innan man auskulterar lungorna?",
        [["Man vill identifiera lunggränserna så man vet hur långt man skall auskultera", 0.5]],
        "Perkussionen ger en karta: dämpning talar för vätska eller konsolidering, hypersonor ton för luft.",
      ),
      tool(
        "ausk",
        "auscultation",
        "Vi vill nu att du auskulterar lungorna på försökspersonen framför dig. Vi använder ett dubbelstetoskop så jag hör vad du gör.",
        [
          ["lung-all-lobes", "Lyssnar över samtliga lober minst en andningscykel", 0.5],
          ["lung-compare", "Jämför sidor", 0.5],
          ["lung-bases", "Lyssnar till lunggräns", 0.5],
        ],
        "Lyssna sida mot sida på samma nivå – asymmetri är det viktigaste fyndet.",
        { mode: "lung", finding: "obstructive" },
      ),
      self(
        "diag",
        "Vi tänker att du hör ett förlängt expirium och ronki. Nämn två diagnoser som kan stämma överens med fynden.",
        [["Astma", 0.5], ["KOL", 0.5]],
        "Ronki uppstår när luft passerar trånga luftvägar. Förlängt expirium visar att det tar längre tid att tömma lungorna.",
      ),
      self(
        "next",
        "Vilken undersökningsmetod kan du gå vidare med för att ta reda på orsaken till förlängd expirium och ronki?",
        [["Gör spirometri", 0.5], ["Dynamisk spirometri", 0.5]],
        "Dynamisk spirometri mäter FEV1 och FVC och kan bekräfta obstruktivitet.",
      ),
      figure("curves", "Jag kommer nu visa dig tre olika kurvor med dynamisk spirometri A, B, C:", ["cren-ht25-fm-spirometri"]),
      self(
        "point",
        "Peka ut inspiration, PEF, och FVC.",
        [
          ["Pekar korrekt ut inspiration", 0.5, "sp-insp"],
          ["Pekar korrekt ut PEF", 0.5, "sp-pef"],
          ["Pekar korrekt ut FVC", 0.5, "sp-fvc"],
        ],
        "Exspirationen ritas ovanför x-axeln och inspirationen under. PEF är kurvans högsta punkt, FVC där exspirationskurvan möter x-axeln.",
      ),
      self(
        "defs",
        "Förklara vad PEF och FEV1 innebär",
        [
          ["PEF = luftens maximala flöde vid forcerad utandning från maximal inspiration", 0.5],
          ["FEV1 = Den volym som kan blåsas ut på en sekund efter maximal inspiration", 0.5],
        ],
        "PEF speglar främst de stora luftvägarna och ansträngningen, FEV1 är det viktigaste måttet för att gradera obstruktivitet.",
      ),
      self(
        "judge",
        "Vi vill nu att du granska och bedömer kurvorna",
        [["A = ”dåligt utförd”", 0.5], ["B = obstruktiv", 0.5], ["C = normal", 0.5]],
        "Låg rundad topp = dåligt utförd, konkav exspirationsdel = obstruktiv, brant uppgång och rak nedgång = normal.",
      ),
      self(
        "contra",
        "Nämn två kontraindikationer för en dynamisk spirometri?",
        [["Akut infektion", 0.5], ["Akut hjärtpåverkan (infarkt, svikt)", 0.5]],
        "Forcerad utandning höjer det intrathorakala trycket kraftigt och belastar hjärtat.",
      ),
    ],
  },
  {
    id: "cren-ankeltryck",
    theme: "CREN",
    title: "Perifer cirkulation",
    skills: ["Ankeltryck", "Blodtrycksmätning", "ABI"],
    scenario:
      "Visa först hur Du mäter ankeltryck vänster ben. Allt nödvändigt material finns på rullbordet. Försökspersonen sitter på britsen när studenten kommer in i rummet. Studenten instruerar själv fp att ligga ner på rygg.",
    material: ["Överarmsblodtrycket höger och vänster står på whiteboard, sidoskillnad 20 mmHg mellan armar"],
    exam: exam("HT24", "omtenta"),
    items: [
      self(
        "cuff",
        "Lagom bred manschett placerad runt ankeln",
        [["Rätt storlek", 0.5], ["Korrekt placering", 0.5]],
        "Väl utförd Ankel BT mätning med sittande/stående fp ger falskt högt BT då hydrostatiskt tryck adderas. Det ger chans till poäng på första punkterna, men 0 poäng på sista.",
      ),
      self("cuff-why", "Motivera valet av manschett", [["För bred manschett falskt lågt BT och motsatt om för smal", 0.5]], "Samma princip som vid armtryck."),
      self("doppler", "Detekterar stabilt artärflöde distalt om manschett med Doppler", [["Detekterar stabilt artärflöde", 1]], "Lägg gel och håll Dopplern stilla, ca 45° mot flödet."),
      self(
        "arteries",
        "Namnge fotartären du lyssnar på samt peka ut och namnge den andra fotartären",
        [["A dorsalis pedis", 0.5], ["A tibialis posterior", 0.5]],
        "Rätt namn och plats krävs.",
      ),
      self("inflation", "Tillräcklig manschettinflation med bibehållen flödessignal", [["Fyller manschetten till suprasystolisk trycknivå", 0.5]], ""),
      self(
        "deflation",
        "Följt av…. en kontrollerad, långsam manschettdeflation",
        [["Kontrollerad, långsam deflation (långvarig artärstas, hög deflationshastighet eller annat tveksamt handhavande= 0p)", 0.5]],
        "",
      ),
      self("value", "Mäter upp ett BT värde", [["Uppmätt tryck: anger systoliskt tryck, max +/-10 mm Hg vs tentator, ej diastoliskt bltr", 2]], ""),
      self(
        "diastolic",
        "Varför kan inte diastoliska trycket bestämmas med Doppler?",
        [["Dopplersignalen reagerar på flöde eller inte flöde. Då manschettblåsans tryck understiger systoliskt artärblodtryck hörs pulserande artärflöde perifert", 0.5]],
        "",
      ),
      self(
        "abi",
        "Beskriv din ABI beräkning i aktuella patientfallet",
        [["SBT ankel / SBT överarm = ABI", 0.5], ["Väljer armen med högst tryck för ABI beräkning", 0.5]],
        "Det högsta armtrycket speglar bäst det centrala aortatrycket.",
      ),
      self(
        "abi-limit",
        "Ange den nedre gränsen för normalt systoliskt ankel-brachialindex",
        [["Ankel-brachialindex, d.v.s. ABI är normalt minst 1.0, ABI <0.9 anses patologiskt lågt", 1]],
        "",
      ),
      self(
        "high",
        "Ankelmanschettens tryck är >250 mmHg hos din liggande patient med normalt armblodtryck. Distala dopplerflödet upphör aldrig. Ange tänkbar orsak",
        [
          ["Svårkomprimerad underbensartär ger ”falskt högt” non-invasivt BT", 0.5],
          ["T.ex. arterioskleros i artärväggen eller artären ”skyddad” av närliggande ben eller mjukdelssvullnad", 0.5],
        ],
        "",
      ),
    ],
  },
]
