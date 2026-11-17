import type { Metadata } from "next"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ExamMode } from "@/components/exam/exam-mode"

export const metadata: Metadata = {
  title: "Tenta på tid – tentan.nu",
  description: "Gör en hel gammal tenta på 5 timmar med automatisk rättning av flervalsfrågor och självrättning av skrivfrågor.",
}

export default function TimedExamPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <ExamMode />
      </main>
      <Footer />
    </div>
  )
}
