import type { Metadata } from "next"
import { Header } from "@/components/header"
import { ExamSession } from "@/components/osce/exam-session"

export const metadata: Metadata = {
  title: "Full OSCE-simulering – tentan.nu",
}

export default function SimulationPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <ExamSession />
      </main>
    </div>
  )
}
