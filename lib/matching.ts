// Matchningsfrågor sparas som "Begrepp | Förklaring", ett par per alternativ.
// Äldre redigeringsfält delade allt på "|", så vissa frågor ligger sparade som en
// platt lista där begrepp och förklaring varvas. Båda formaten tolkas här.
export function parseMatchingPairs(options?: string[] | null): [string, string][] {
  const list = (options ?? []).map(o => String(o).trim()).filter(Boolean)
  if (list.some(o => o.includes("|"))) {
    return list
      .filter(o => o.includes("|"))
      .map(o => {
        const [src, ...rest] = o.split("|")
        return [src.trim(), rest.join("|").trim()]
      })
  }
  const pairs: [string, string][] = []
  for (let i = 0; i + 1 < list.length; i += 2) pairs.push([list[i], list[i + 1]])
  return pairs
}
