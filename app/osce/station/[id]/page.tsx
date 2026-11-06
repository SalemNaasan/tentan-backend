import type { Metadata } from "next"
import { Header } from "@/components/header"
import { PracticeStation } from "@/components/osce/practice-station"
import { ALL_STATIONS, getStation } from "@/lib/osce/stations"

export function generateStaticParams() {
  return ALL_STATIONS.map(s => ({ id: s.id }))
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const station = getStation(id)
  return { title: station ? `${station.title} (${station.theme}) – OSCE – tentan.nu` : "OSCE – tentan.nu" }
}

export default async function StationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <PracticeStation id={id} />
      </main>
    </div>
  )
}
