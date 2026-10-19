function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function day(offset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return dayKey(d)
}

export function month(offset: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() + offset)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export function at(offset: number, hhmm = '09:00'): string {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date()
  d.setDate(d.getDate() + offset)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

export function workingDaysAgo(n: number): string {
  const d = new Date()
  let left = n
  while (left > 0) {
    d.setDate(d.getDate() - 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) left--
  }
  return dayKey(d)
}
