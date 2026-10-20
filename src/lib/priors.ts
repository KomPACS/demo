type DatedCandidate = { date: string | null; is_baseline: boolean }

function periodValue(date: string): [number, number, number] {
  const [y, m, d] = date.slice(0, 10).split('-')
  return [Number(y), Number(m) || 0, Number(d) || 0]
}

function compareDates(a: string | null, b: string | null): number {
  if (a === b) return 0
  if (a === null) return 1
  if (b === null) return -1
  const [ay, am, ad] = periodValue(a)
  const [by, bm, bd] = periodValue(b)
  if (ay !== by) return by - ay
  if (am !== bm) return bm - am
  return bd - ad
}

export function sortPriors<T extends DatedCandidate>(candidates: T[]): T[] {
  return [...candidates].sort((a, b) => {
    if (a.is_baseline !== b.is_baseline) return a.is_baseline ? -1 : 1
    return compareDates(a.date, b.date)
  })
}
