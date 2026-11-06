import { exam, figure, self, tool } from "../builders"
import type { OsceItem, OsceStation } from "../types"

// Frågorna är ordagranna från examinatorsprotokollen. Ändra inte ordalydelsen.

const slide = (specimen: string): OsceItem => tool("slide", "microscope", "Histologiskt preparat", [], "", { specimen })

const DUODENUM_LAYERS = self(
  "identify",
  "Identifierar",
  [
    ["Enkelradigt cylinderepitel", 0.5],
    ["Absorptiva celler (enterocyter)", 0.5],
    ["Gobletceller", 0.5],
    ["Lamina propria", 0.5],
    ["Muscularis mucosae", 0.5],
    ["Submucosa", 0.5],
    ["Brunnerska körtlar", 0.5],
    ["Muscularis externa", 0.5],
    ["Adventitia", 0.5],
  ],
  "Brunnerska körtlar i submucosan är det säkraste kännetecknet för duodenum – de utsöndrar alkaliskt slem som neutraliserar det sura maginnehållet.",
)

const DUODENUM_ORGAN = self("organ", "Anger att organet är duodenum", [["Duodenum (0,5p om tunntarm anges)", 1]], "Tunntarm + Brunnerska körtlar = duodenum.")

export const gnmStations: OsceStation[] = [
  {
    id: "gnm-duodenum-hormoner",
    theme: "GNM",
    title: "Duodenum",
    skills: ["Digital mikroskopi", "Histologi", "Fysiologi"],
    scenario: "",
    exam: exam("HT24", "ordinarie", "fm"),
    items: [
      slide("duodenum"),
      DUODENUM_LAYERS,
      DUODENUM_ORGAN,
      self(
        "cck",
        "Tentator visar bild och säger: I duodenum finns också s.k. enteroendokrina celler, vilka utsöndrar hormoner. Några av dessa visas på bilden. Namnge hormon ①",
        [["Cholecystokinin (CCK)", 1]],
        "",
      ),
      self("secretin", "Namnge hormon ②", [["Sekretin", 1]], ""),
      self("cck-effect", "Vilken effekt har CCK på gallblåsan?", [["CCK stimulerar kontraktion av gallblåsan", 1]], "CCK ser till att galla och pankreasenzymer kommer ut samtidigt som fettet."),
      self("secretin-effect", "Vilken huvudsaklig effekt har sekretin på pankreas?", [["Sekretion av vätska rik på bikarbonat", 1]], "Bikarbonatet neutraliserar saltsyran så att pankreasenzymerna fungerar."),
      self("papilla", "Hur benämns den upphöjda struktur i duodenum där ductus choledochus och ductus pancreaticus major mynnar?", [["Papilla duodeni major (Papilla Vateri)", 0.5]], ""),
    ],
  },
  {
    id: "gnm-duodenum-disackarider",
    theme: "GNM",
    title: "Duodenum",
    skills: ["Digital mikroskopi", "Histologi", "Fysiologi"],
    scenario: "",
    exam: exam("HT25", "omtenta"),
    items: [
      slide("duodenum"),
      DUODENUM_LAYERS,
      DUODENUM_ORGAN,
      self(
        "disaccharides",
        "Tentator säger: I duodenum, liksom i övriga tunntarmen, sker bl a nedbrytning av disackarider. Ange namnet på tre disackarider",
        [["Sackaros (rörsocker)", 0.5], ["Laktos (mjölksocker)", 0.5], ["Maltos (maltsocker)", 0.5]],
        "",
      ),
      figure("bild", "Bild", ["gnm-ht25-omtenta-disackarider"]),
      self("mono1", "Tentator visar bild och säger: Namnge kemisk substans ①", [["Glukos", 0.5]], "Maltos = glukos + glukos, laktos = glukos + galaktos, sackaros = glukos + fruktos."),
      self("mono2", "Namnge kemisk substans ②", [["Galaktos", 0.5]], ""),
      self("mono3", "Namnge kemisk substans ③", [["Fruktos", 0.5]], ""),
      self(
        "brush",
        "I vilken cellulär struktur sker digestionen av disackarider?",
        [["I enterocyternas bortsbräm (mikrovilli; brush border)", 1]],
        "Disackaridaserna sitter förankrade i borstbrämens membran. Vid skada på slemhinnan (t.ex. celiaki) förloras de – sekundär laktosintolerans.",
      ),
      self("hydrolysis", "Som framgår av bilden sker digestionen efter att en vattenmolekyl har reagerat med resp. disackarid. Hur benämns denna typ av kemisk reaktion?", [["Hydrolys", 0.5]], ""),
    ],
  },
  {
    id: "gnm-ventrikel",
    theme: "GNM",
    title: "Ventrikeln",
    skills: ["Digital mikroskopi", "Histologi", "Fysiologi"],
    scenario: "",
    exam: exam("VT25", "ordinarie", "em"),
    items: [
      slide("ventrikel"),
      self(
        "identify",
        "Identifierar",
        [
          ["Enkelradigt cylinderepitel", 0.5],
          ["Gastric pits", 0.5],
          ["Körtelceller (mucus neck cells, huvudceller, parietalceller): 1 st ger 0,5 p, minst 2 st ger 1p", 1],
          ["Lamina propria", 0.5],
          ["Muscularis mucosae", 0.5],
          ["Submucosa", 0.5],
          ["Rugae", 0.5],
          ["Serosa", 0.5],
          ["Anger att preparatet härrör från corpus/fundus", 0.5],
          ["…ventriculi", 0.5],
        ],
        "Corpus/fundus känns igen på långa raka körtlar med många parietalceller och huvudceller.",
      ),
      self("hcl", "Tentator säger: Ventrikeln är bl a viktig för utsöndringen av saltsyra Från vilken cell utsöndras saltsyra?", [["Parietalcell", 0.5]], "Parietalcellen bildar också intrinsic factor som behövs för B12-upptaget."),
      figure("bild", "Bild", ["gnm-vt25-em-parietalcell"]),
      self(
        "ach",
        "Tentator visar bild och frågar: Tre substanser fäster på receptorer på parietalcellerna och stimulerar utsöndringen av saltsyra. Två framgår av bilden. Namnge den som fattas.",
        [["Acetylkolin", 1]],
        "",
      ),
      self("m3", "Tentator frågar (efter återkoppling på fråga 3): Vilken receptor binder acetylkolin till på parietalcellen?", [["Muskarinreceptor (M3)", 1]], ""),
      self("ca", "Vad heter enzymet markerat med rött frågetecken?", [["Kolsyraanhydras (karboanhydras; carbonic anhydrase)", 1]], ""),
      self("k", "Vilken jon är markerad med blått frågetecken?", [["K+", 1]], "Protonpumpen byter H⁺ mot K⁺ och är målet för protonpumpshämmare."),
    ],
  },
  {
    id: "gnm-lever",
    theme: "GNM",
    title: "Levern",
    skills: ["Digital mikroskopi", "Histologi", "Fysiologi"],
    scenario: "",
    exam: exam("HT24", "ordinarie", "em"),
    items: [
      slide("lever"),
      self(
        "identify",
        "Identifierar",
        [
          ["Lever", 1],
          ["Hepatocyter", 0.5],
          ["Sinusoider", 0.5],
          ["Centralven", 0.5],
          ["Portatriad (arteriol, venol, gallgång) – korrekt identifiering av varje komponent", 1.5],
          ["Korrekt motivering", 1],
        ],
        "Portatriaden: venolen är störst med tunn vägg, arteriolen har tjock muskelvägg och litet lumen, gallgången har kubiskt epitel.",
      ),
      self(
        "glucose",
        "Amanuens säger: Hepatocyterna är viktiga för många metabola processer, bl a omsättning av kolhydrater. Bild visas. Återkoppling efter varje fråga. Vilken är den viktigaste monosackariden som utsöndras av hepatocyterna? ①",
        [["Glukos", 1]],
        "",
      ),
      self("glycogen", "Från vilken polysackarid, som lagras i hepatocyterna, kan glukos bildas? ②", [["Glykogen", 1]], ""),
      self("processes", "Hur benämns de metabola processerna där glukos bildas från glykogen③ resp. glykogen från glukos④?", [["Glykogenolys", 1], ["Glykogenes", 1]], ""),
      self(
        "muscle",
        "Utöver i hepatocyter finns stora mängder glykogen i en annan typ av celler. Vilka?",
        [["Skelettmuskelceller", 1]],
        "Muskeln saknar glukos-6-fosfatas och kan därför inte släppa ut glukos i blodet.",
      ),
    ],
  },
  {
    id: "gnm-rectum-anus",
    theme: "GNM",
    title: "Övergång rectum–anus",
    skills: ["Digital mikroskopi", "Histologi", "Anatomi"],
    scenario: "Börja med att be studenten scrolla i preparatet från ena kanten till den andra i horisontell riktning och fokusera på epitelet",
    exam: exam("VT25", "ordinarie", "fm"),
    items: [
      slide("rectum-anus"),
      self(
        "epithelia",
        "Identifierar",
        [["Keratiniserat flerskiktat skivepitel", 0.5], ["Icke-keratiniserat flerskiktat skivepitel", 0.5], ["Enkelradigt cylinderepitel", 0.5]],
        "Övergången från tarmens cylinderepitel till keratiniserat skivepitel (hud) visar att preparatet kommer från analkanalen.",
      ),
      self("origin", "Anger att preparatet härrör från övergång rectum anus", [["Rectum", 0.5], ["Anus", 0.5]], ""),
      self(
        "skin",
        "Identifierar strukturer i huden – epidermis, dermis, subcutis, adipocyter, talgkörtlar, glatt muskulatur",
        [["1 st", 0.5], ["2 st", 0.5], ["Minst 3 st", 0.5]],
        "",
      ),
      self(
        "mucosa",
        "Identifierar strukturer i tarmslemhinnan – lamina propria, submucosa muscularis mucosae, gobletceller, adventitia,",
        [["1 st", 0.5], ["2 st", 0.5], ["Minst 3 st", 0.5]],
        "",
      ),
      figure("bild-1", "Bild 1", ["gnm-vt25-fm-bild-1"]),
      self(
        "veins",
        "Tentator visar bild 1 och säger: Ett litet barn får febernedsättande paracetamol som stolpiller. Läkemedlet tas upp i blodbanan och kan transporteras via olika vener i buken. Namnge de markerade.",
        [["V. iliaca interna", 0.5], ["V rectalis sup", 0.5], ["V. mesenterica sup", 0.5], ["V lienalis", 0.5]],
        "",
      ),
      self("portal", "Tentator frågar: Venen markerad med gul pil tillhör den systemiska venösa cirkulationen. Vilken venös cirkulation tillhör de grönmarkerade?", [["Den portala", 0.5]], ""),
      figure("bild-2", "Bild 2", ["gnm-vt25-fm-bild-2"]),
      self("ivc", "Tentator visar bild 2, pekar och namnger v cava inf i nivå med levern och frågar var venen mynnar:", [["Höger förmak", 0.5]], ""),
      self(
        "arch",
        "När paracetamol pumpas ut från vä kammare når det arcus aortae. Hårifrån avgår tre kärl (v g se bild 2). Namnge dessa.",
        [["A. brachiocephalica", 0.5], ["A. carotis communis sin", 0.5], ["A. subclavia sin", 0.5]],
        "",
      ),
    ],
  },
]
