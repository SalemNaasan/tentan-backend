// Alternativ blandas i ny ordning varje gång sidan laddas, så att man inte lär sig positionen.

export function shuffled<T>(list: T[]): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// Alternativ som syftar på andra alternativ ("Alla ovanstående", "Både A och B") blir fel om ordningen ändras
const REFERS_TO_OTHERS = /ovan|nedan|samtliga|inget av|ingen av|alla alternativ|både\s+[a-e]\b|[a-e]\s+(och|samt|\+)\s+[a-e]\b|alternativ\s+[a-e]\b/i

export function canShuffleOptions(options: string[]) {
  return options.length > 1 && !options.some(o => REFERS_TO_OTHERS.test(o))
}

/** Index i den ordning alternativen ska visas */
export function shuffledOrder(options: string[]): number[] {
  const order = options.map((_, i) => i)
  return canShuffleOptions(options) ? shuffled(order) : order
}
