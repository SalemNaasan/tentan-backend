import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { FEATURES } from "@/lib/features"

export default function CasesLayout({ children }: { children: ReactNode }) {
  if (!FEATURES.cases) redirect("/")
  return children
}
