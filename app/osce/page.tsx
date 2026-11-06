import type { Metadata } from "next"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { OsceHub } from "@/components/osce/osce-hub"

export const metadata: Metadata = {
  title: "OSCE-simulator T3 – tentan.nu",
  description: "Öva inför den praktiska tentamen på termin 3: virtuell patient, stetoskop, EKG, HLR och bedömning mot examinatorsprotokollen.",
}

export default function OscePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12">
        <OsceHub />
      </main>
      <Footer />
    </div>
  )
}
