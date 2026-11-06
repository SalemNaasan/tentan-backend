import type { ToolItem } from "@/lib/osce/types"

export interface ToolProps {
  item: ToolItem
  /** Kriterier som redan uppnåtts */
  achieved: string[]
  /** Rapportera nya uppnådda kriterier (läggs till befintliga) */
  onAchieve: (ids: string[]) => void
  /** Full simulering: dölj ledtrådar och facit under tiden */
  exam: boolean
  /** Stationen är avslutad – verktyget visas men går inte att ändra */
  locked: boolean
}
