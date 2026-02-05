import { NextResponse } from "next/server"
import { mockQuestions } from "@/lib/mock-data"

export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json(mockQuestions, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  })
}
