export const runtime = "nodejs"
export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import AnkiExport from "@steve2955/anki-apkg-export"
type AnkiCard = {
  front: string
  back: string
}

type AnkiExportRequestBody = {
  deckName?: string
  cards: AnkiCard[]
}

export async function POST(req: NextRequest) {
  try {
    const { deckName = "tentan.nu Deck", cards }: AnkiExportRequestBody = await req.json()

    if (!cards || !Array.isArray(cards) || cards.length === 0) {
      return new NextResponse("No cards provided", { status: 400 })
    }

    const apkg = new AnkiExport(deckName)

    for (const card of cards) {
      if (typeof card.front !== "string" || typeof card.back !== "string") {
        continue
      }
      apkg.addCard(card.front, card.back)
    }

    const zip = await apkg.save()
    const body = new Uint8Array(zip)

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/apkg",
        "Content-Disposition": 'attachment; filename="tentan-nu-anki-export.apkg"',
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("Failed to generate Anki package", error)
    return new NextResponse("Failed to generate Anki package", { status: 500 })
  }
}

