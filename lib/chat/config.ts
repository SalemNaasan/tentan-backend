import type { Semester } from "../types"

// Inställningar för AI-chatten per termin. Delas av servern och chattsidan.

/** Terminer som har en chatt (materialet är tentafrågorna, och föreläsningar när de lagts in) */
export const CHAT_SEMESTERS: Semester[] = ["T2", "T3"]

/** Antal frågor per besökare och dygn */
export const CHAT_DAILY_LIMIT_PER_USER = 40

/** Tak för hela sajten per dygn – skyddar mot oväntade kostnader */
export const CHAT_DAILY_LIMIT_TOTAL = 3000

/** Längsta fråga man kan skicka */
export const CHAT_MAX_QUESTION_CHARS = 2000
