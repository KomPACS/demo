import type { Schemas } from '@/lib/api'

type Candidate = Schemas['Candidate']
type RequestState = Schemas['RequestItem']['state']

export const priorStatus: Record<Candidate['status'], string> = {
  available: 'dostupné',
  missing_report: 'chybí popis',
  missing: 'chybí',
  place_unknown: 'místo neznámé',
}

export const verdictLabel: Record<Schemas['Verdict']['label'], string> = {
  relevant: 'relevantní',
  not_relevant: 'nerelevantní',
  uncertain: 'nejisté',
}

export const decisionLabel: Record<NonNullable<Candidate['decision']>, string> = {
  relevant: 'relevantní',
  not_relevant: 'nerelevantní',
  removed: 'vyřazeno koordinátorem',
}

export const requestState: Record<RequestState, string> = {
  draft: 'návrh',
  sent: 'odesláno (demo)',
  requested: 'vyžádáno',
  not_delivered: 'nedoručeno',
  received: 'doručeno',
  not_found: 'nedohledáno',
}

export const channelLabel: Record<Schemas['RequestItem']['channel'], string> = {
  email: 'e-mail',
  phone: 'telefon',
  fhir: 'FHIR',
}

export const sourceLabel: Record<Candidate['source'], string> = {
  nis_record: 'záznam v NIS',
  report_text: 'zmínka ve zprávě',
  insurer: 'Výpis pojištěnce (souhlas pacienta)',
  collector: 'přidal/a koordinátor/ka',
}

export const eventType: Record<Schemas['TimelineEvent']['type'], string> = {
  imaging: 'zobrazovací vyšetření',
  report: 'zpráva',
  lab: 'laboratoř',
  medication: 'léčba',
  procedure: 'výkon',
  condition: 'diagnóza',
  trigger: 'spouštěč',
}

export const triggerKind: Record<Schemas['Trigger']['kind'], string> = {
  exam: 'plánované vyšetření',
  mdt: 'MDT',
}

export const sexLabel: Record<Schemas['Patient']['sex'], string> = {
  male: 'muž',
  female: 'žena',
  other: 'jiné',
  unknown: 'neuvedeno',
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return 'datum neznámé'
  const [y, m, d] = iso.slice(0, 10).split('-')
  if (d) return `${Number(d)}. ${Number(m)}. ${y}`
  if (m) return `${Number(m)}/${y}`
  return y
}

export function triggerTitle(t: Schemas['Trigger']) {
  return t.kind === 'mdt' ? 'MDT, indikační seminář' : `Plánované ${t.modality === 'PT' ? 'PET' : t.modality}`
}


export function parseDay(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const todayKey = () => dayKey(new Date())

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function weekdayDate(iso: string): string {
  const d = parseDay(iso)
  const year = iso.slice(0, 4) === todayKey().slice(0, 4) ? '' : ` ${d.getFullYear()}`
  return `${capitalize(d.toLocaleDateString('cs', { weekday: 'long' }))} ${d.getDate()}. ${d.getMonth() + 1}.${year}`
}

export function monthTitle(d: Date): string {
  return capitalize(d.toLocaleDateString('cs', { month: 'long', year: 'numeric' }))
}

export function daysFromToday(iso: string): number {
  const today = parseDay(todayKey())
  return Math.round((parseDay(iso).getTime() - today.getTime()) / 86_400_000)
}

export function relativeDays(n: number): string {
  if (n === 0) return 'dnes'
  if (n === 1) return 'zítra'
  if (n === -1) return 'včera'
  if (n > 0) return `za ${n} ${n < 5 ? 'dny' : 'dní'}`
  return `před ${-n} dny`
}

export function workingDaysFromToday(iso: string): number {
  const target = parseDay(iso)
  const d = parseDay(todayKey())
  if (target < d) return -1
  let n = 0
  while (d < target) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) n++
  }
  return n
}

export function age(patient: { birth_year: number | null; age_band?: string | null }): string | null {
  if (patient.birth_year) return `${new Date().getFullYear() - patient.birth_year} let`
  return patient.age_band ? `${patient.age_band.replace('-', '–')} let` : null
}
