import { exam, figure, self, tool } from "../builders"
import type { OsceStation } from "../types"

// Frågorna är ordagranna från examinatorsprotokollen. Ändra inte ordalydelsen.

const CELLS: [string, number][] = [["Alfa-", 1], ["Beta-", 1], ["Delta-", 1], ["PP-celler (f-celler)", 1]]
const HORMONES: [string, number][] = [
  ["Beta-celler insöndrar insulin (och gastrin)", 1],
  ["Delta-celler insöndrar somatostatin", 1],
  ["Alfa-celler insöndrar glukagon", 1],
  ["PP-celler (f-celler eller gamma-celler) insöndrar pankreatisk polypeptid", 1],
]

export const erlStations: OsceStation[] = [
  {
    id: "erl-pankreas",
    theme: "ERL",
    title: "Pankreas",
    skills: ["Digital mikroskopi", "Endokrina organ", "Histologi"],
    scenario: "",
    exam: exam("HT25", "ordinarie", "em"),
    items: [
      tool("slide", "microscope", "Histologiskt preparat", [], "", { specimen: "pankreas" }),
      self("organ", "Identifiera vilken typ av preparat som visas på bilden.", [["Bukspottkörtel/pankreas", 1]], "Exokrina acinära celler dominerar; de endokrina öarna är ljusare, rundade cellansamlingar."),
      self("islets", "Peka på och namnge de endokrina delarna av preparatet.", [["Langerhanska öar", 1]], ""),
      self("cells", "Vilka celler ingår i Langerhans öar?", CELLS, "Minst 2 celltyper ger 2 p.", 2),
      self("hormones", "Vilka hormoner produceras i de endokrina delarna av preparatet?", HORMONES, "Även VIP och serotonin kan bildas."),
      self(
        "fetal",
        "Vilka är de viktigaste fetala endokrina tillväxtfaktorerna för tillväxt under fosterstadiet?",
        [["IGF-I/IGF-II", 1], ["Insulin", 1]],
        "Även tyreoideahormoner, glukokortikoider m.fl.",
      ),
    ],
  },
  {
    id: "erl-pankreas-ht24-omtenta",
    theme: "ERL",
    title: "Pankreas",
    skills: ["Digital mikroskopi", "Endokrina organ", "Histologi"],
    scenario: "",
    exam: exam("HT24", "omtenta"),
    note: "Protokollet saknar poäng per fråga, så fördelningen är uppskattad utifrån HT25 em.",
    items: [
      tool("slide", "microscope", "Histologiskt preparat", [], "", { specimen: "pankreas" }),
      self("organ", "Identifiera vilken typ av preparat som visas i histologiskt", [["Bukspottkörtel/pankreas", 1]], ""),
      self(
        "islets",
        "Peka och nämn den endokrina delen av preparatet",
        [["Langerhanska öar", 1], ["Alfa-, beta-, delta- och f-celler (minst två celltyper)", 2]],
        "",
      ),
      self("hormones", "Vilka hormoner produceras i endokrina delen av preparatet?", HORMONES, ""),
      self("fetal", "Vilka hormoner är viktiga för tillväxt under fosterstadiet?", [["IGF-I/IGF-II", 1], ["Insulin", 1]], ""),
    ],
  },
  {
    id: "erl-binjure",
    theme: "ERL",
    title: "Binjuren",
    skills: ["Digital mikroskopi", "Endokrina organ", "Histologi"],
    scenario: "",
    exam: exam("HT25", "ordinarie", "fm"),
    items: [
      tool("slide", "microscope", "Histologiskt preparat", [], "", { specimen: "binjure" }),
      self(
        "identify",
        "Identifiera kapsel, cortex och märgen",
        [
          ["Identifierat gränserna i preparatets två endokrina enheter: barken (cortex) och märgen (medulla) samt den kapsel som omger organet", 2],
          ["Pekat ut de olika lagren i cortex (zona glomerulosa, zona fasciculata, zona reticularis)", 1],
        ],
        "Zona glomerulosa: yttersta lagret under kapseln. Zona fasciculata: mellanlagret med celler i radiala, parallella strängar. Zona reticularis: det innersta lagret där cellerna ger intryck av ett retikel.",
      ),
      self(
        "hormones",
        "Beskriv binjurebarkens uppbyggnad histologiskt och vilka hormoner som bildas i olika celltyper",
        [["Aldosteron (zona glomerulosa)", 1], ["Kortisol (zona fasciculata)", 1], ["Androgener (zona reticularis)", 1]],
        "Minnesregel 'salt, socker, sex' utifrån och in.",
      ),
      self("vessels", "Peka ut blodkärl i såväl cortex som märgen", [["Blodkärl i cortex", 1], ["Blodkärl i märgen", 1]], ""),
      self("medulla", "Vad bildas i binjuremärgen?", [["Katekolaminer (Adrenalin och Noradrenalin)", 2]], ""),
    ],
  },
  {
    id: "erl-thyroidea",
    theme: "ERL",
    title: "Sköldkörteln",
    skills: ["Digital mikroskopi", "Endokrina organ", "Histologi"],
    scenario: "",
    exam: exam("VT25", "omtenta"),
    items: [
      figure("slide", "Histologiskt preparat", ["erl-vt25-omtenta-thyroidea-1", "erl-vt25-omtenta-thyroidea-2"]),
      self("structures", "Identifiera folliklar och interstitiet i histologiskt preparat.", [["Folliklar", 1], ["Interstitiet", 1]], ""),
      self(
        "cells",
        "Beskriv och peka ut nedanstående strukturer i histologiskt preparat.",
        [["Follikulära celler", 1], ["Parafollikulära C-celler", 1], ["Kapillärer", 1]],
        "",
      ),
      self(
        "colloid",
        "Folliklarna är fyllda med kolloid, vad består primärt kolloiden av och vilket huvudsakligt syfte har innehållet?",
        [["Tyreoglobulin", 1], ["Via inbundna tyrosinrester lagrar tyroxin och trijodtyronin. Alternativt, lagrat T4, T3", 1]],
        "",
      ),
      self("size", "Folliklarna verkar ha olika storlek (diameter), varför?", [["Snittade på olika nivåer, och varierande uppfyllnad av kolloid (ett av svaren räcker)", 1]], ""),
      self(
        "iodine",
        "Vilket grundämne är essentiellt för bildningen av sköldkörtelhormoner? Hur har myndigheterna i Sverige (och i de flesta andra länder) agerat sedan många år för att minska risken för brist på detta grundämne i kosten?",
        [["Jod", 1], ["Sedan över 75 år finns i Sverige ett frivilligt joderingsprogram med att tillsätta jod till bordssalt", 1]],
        "",
      ),
    ],
  },
]
