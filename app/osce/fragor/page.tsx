import type { Metadata } from "next"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { QuestionBank } from "@/components/osce/question-bank"

export const metadata: Metadata = {
  title: "Praktiska tentafrågor – OSCE – tentan.nu",
  description: "Alla frågor från de gamla praktiska tentorna på termin 3, med filter, sökning och svar.",
}

export default function QuestionsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <QuestionBank />
      </main>
      <Footer />
    </div>
  )
}
