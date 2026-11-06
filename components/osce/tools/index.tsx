"use client"

import dynamic from "next/dynamic"
import type { ComponentType } from "react"
import type { ToolId } from "@/lib/osce/types"
import type { ToolProps } from "./tool-props"

// Verktygen laddas först när de behövs, så att stationslistan förblir snabb.
const load = (loader: () => Promise<ComponentType<ToolProps>>) =>
  dynamic(loader, { ssr: false, loading: () => <div className="h-40 animate-pulse rounded-xl bg-muted" /> })

export const TOOLS: Record<ToolId, ComponentType<ToolProps>> = {
  auscultation: load(() => import("./auscultation-tool").then(m => m.AuscultationTool)),
  electrodes: load(() => import("./electrode-tool").then(m => m.ElectrodeTool)),
  ecg: load(() => import("./ecg-viewer").then(m => m.EcgViewer)),
  spirometry: load(() => import("./spirometry-viewer").then(m => m.SpirometryViewer)),
  bloodpressure: load(() => import("./blood-pressure-tool").then(m => m.BloodPressureTool)),
  cpr: load(() => import("./cpr-tool").then(m => m.CprTool)),
  choking: load(() => import("./choking-tool").then(m => m.ChokingTool)),
  microscope: load(() => import("./microscope").then(m => m.MicroscopeTool)),
  gram: load(() => import("./microbiology").then(m => m.GramStainTool)),
  agar: load(() => import("./microbiology").then(m => m.AgarTool)),
  image: load(() => import("./exam-image").then(m => m.ExamImageTool)),
}

export type { ToolProps }
