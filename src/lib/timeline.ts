import type { Candidate, Case, TimelineEvent } from '@/lib/api'
import { parseDay, todayKey } from '@/lib/labels'

export type LaneId = 'imaging' | 'mdt' | 'visit' | 'stay' | 'emergency' | 'report' | 'treatment' | 'lab' | 'condition'

export const lanes: { id: LaneId; label: string }[] = [
  { id: 'imaging', label: 'Zobrazovací vyšetření' },
  { id: 'mdt', label: 'MDT' },
  { id: 'visit', label: 'Návštěvy' },
  { id: 'stay', label: 'Hospitalizace' },
  { id: 'emergency', label: 'Pohotovost' },
  { id: 'report', label: 'Zprávy' },
  { id: 'treatment', label: 'Léčba' },
  { id: 'lab', label: 'Laboratoř' },
  { id: 'condition', label: 'Diagnóza' },
]

const reportRules: [RegExp, LaneId | 'radiotherapy'][] = [
  [/board|MDT|Indik|semin|konzil|Multidisciplin/i, 'mdt'],
  [/Příjm|Prop|Překl|Epikr/i, 'stay'],
  [/Ozař|brachy|stacion/i, 'radiotherapy'],
  [/urgent|OUPD/i, 'emergency'],
  [/Recept/i, 'treatment'],
  [/Amb/i, 'visit'],
]

export function laneOf(e: TimelineEvent): LaneId | 'radiotherapy' {
  switch (e.type) {
    case 'imaging':
      return 'imaging'
    case 'lab':
      return 'lab'
    case 'medication':
    case 'procedure':
      return 'treatment'
    case 'condition':
      return 'condition'
    case 'trigger':
      return /MDT/.test(e.title) ? 'mdt' : 'imaging'
    case 'report': {
      const title = e.title.replace(/ /g, ' ')
      return reportRules.find(([re]) => re.test(title))?.[1] ?? 'report'
    }
  }
}

export type Item =
  | { kind: 'candidate'; key: string; lane: 'imaging'; at: number; from: number; to: number; partial: boolean; c: Candidate }
  | { kind: 'events'; key: string; lane: LaneId; at: number; from: number; to: number; events: TimelineEvent[]; bar: boolean }

const DAY = 86_400_000

export function candidateSpan(date: string | null): { from: number; to: number; partial: boolean } | null {
  if (!date) return null
  const [y, m, d] = date.slice(0, 10).split('-').map(Number)
  if (d) return { from: parseDay(date).getTime(), to: parseDay(date).getTime(), partial: false }
  const from = new Date(y, m ? m - 1 : 0, 1).getTime()
  const to = (m ? new Date(y, m, 1) : new Date(y + 1, 0, 1)).getTime() - DAY
  return { from, to, partial: true }
}

const eventDay = (e: TimelineEvent) => parseDay(e.date).getTime()

function radiotherapyBars(events: TimelineEvent[]): Item[] {
  const sorted = [...events].sort((a, b) => eventDay(a) - eventDay(b))
  const runs: TimelineEvent[][] = []
  for (const e of sorted) {
    const run = runs.at(-1)
    // A gap over 14 days starts a new course.
    if (run && eventDay(e) - eventDay(run.at(-1)!) <= 14 * DAY) run.push(e)
    else runs.push([e])
  }
  return runs.map((run) => {
    const from = eventDay(run[0])
    const to = eventDay(run.at(-1)!)
    return { kind: 'events', key: `rt-${from}`, lane: 'treatment', at: from, from, to, events: run, bar: run.length > 1 }
  })
}

export function buildItems(kase: Case, events: TimelineEvent[]): Item[] {
  const items: Item[] = []
  const studies = new Set(kase.candidates.map((c) => c.study_id).filter(Boolean))
  for (const c of kase.candidates) {
    const span = candidateSpan(c.date)
    if (span) items.push({ kind: 'candidate', key: c.id, lane: 'imaging', at: (span.from + span.to) / 2, ...span, c })
  }
  const byDay = new Map<string, TimelineEvent[]>()
  const radiotherapy: TimelineEvent[] = []
  for (const e of events) {
    if (e.type === 'imaging' && studies.has(e.resource.split('/')[1])) continue
    const lane = laneOf(e)
    if (lane === 'radiotherapy') {
      radiotherapy.push(e)
      continue
    }
    const key = `${lane}|${e.date.slice(0, 10)}`
    byDay.set(key, [...(byDay.get(key) ?? []), e])
  }
  for (const [key, group] of byDay) {
    const at = eventDay(group[0])
    items.push({ kind: 'events', key, lane: key.split('|')[0] as LaneId, at, from: at, to: at, events: group, bar: false })
  }
  return [...items, ...radiotherapyBars(radiotherapy)]
}

export type Range = '3m' | '1y' | 'all'

export function timeWindow(items: Item[], range: Range, anchor: number): { start: number; end: number } {
  const today = parseDay(todayKey()).getTime()
  const end = Math.max(today, anchor) + 20 * DAY
  if (range === '3m') return { start: end - 120 * DAY, end }
  if (range === '1y') return { start: end - 385 * DAY, end }
  const first = Math.min(...items.map((i) => i.from), end - 385 * DAY)
  return { start: first - 20 * DAY, end }
}

export function ticks(start: number, end: number): { at: number; label: string }[] {
  const years = (end - start) / (365 * DAY)
  const step = years > 6 ? 12 : years > 2.5 ? 6 : years > 1.2 ? 3 : 1
  const out: { at: number; label: string }[] = []
  const d = new Date(start)
  const t = new Date(d.getFullYear(), d.getMonth() + 1, 1)
  while (t.getMonth() % step) t.setMonth(t.getMonth() + 1)
  for (; t.getTime() < end; t.setMonth(t.getMonth() + step)) {
    const label = step === 12 ? String(t.getFullYear()) : t.getMonth() === 0 || !out.length ? `${t.getMonth() + 1}/${t.getFullYear()}` : String(t.getMonth() + 1)
    out.push({ at: t.getTime(), label })
  }
  return out
}

export function stackRows(spans: { x: number; w: number }[], margin = 4): number[] {
  const rowEnds: number[] = []
  const rows = new Array<number>(spans.length)
  const order = spans.map((_, i) => i).sort((a, b) => spans[a].x - spans[b].x)
  for (const i of order) {
    const { x, w } = spans[i]
    const row = rowEnds.findIndex((end) => x - w / 2 - end >= margin)
    const r = row === -1 ? rowEnds.length : row
    rowEnds[r] = x + w / 2
    rows[i] = r
  }
  return rows
}

export function clusterIndices(xs: number[], gap: number): number[][] {
  const groups: number[][] = []
  for (const i of xs.map((_, i) => i).sort((a, b) => xs[a] - xs[b])) {
    const g = groups.at(-1)
    if (g && xs[i] - xs[g.at(-1)!] < gap && xs[i] - xs[g[0]] < 2 * gap) g.push(i)
    else groups.push([i])
  }
  return groups
}
