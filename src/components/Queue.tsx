import { CircleAlert } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Role } from '@/components/Sidebar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api, data, type RequestItem, type TriggerSummary } from '@/lib/api'
import {
  age,
  dayKey,
  daysFromToday,
  monthTitle,
  todayKey,
  relativeDays,
  sexLabel,
  triggerTitle,
  weekdayDate,
  workingDaysFromToday,
} from '@/lib/labels'
import { cn, panel } from '@/lib/utils'

type Kind = 'all' | 'CT' | 'MR' | 'PT' | 'mdt'
type State = 'all' | 'action' | 'waiting' | 'ready'

type Work = { toDecide: number; drafts: number; notDelivered: number; placeUnknown: number; fhir: boolean }

function work(t: TriggerSummary, requests: RequestItem[]): Work {
  const mine = requests.filter((r) => r.trigger_id === t.trigger.id)
  return {
    toDecide: t.to_decide,
    drafts: mine.filter((r) => r.state === 'draft' && (r.channel === 'email' || r.channel === 'fhir')).length,
    notDelivered: mine.filter((r) => r.state === 'not_delivered').length,
    placeUnknown: mine.filter((r) => r.state === 'draft' && !r.place && !r.organization_id).length,
    fhir: mine.some((r) => r.channel === 'fhir'),
  }
}

const isSoon = (date: string) => {
  const n = workingDaysFromToday(date)
  return n >= 0 && n <= 2
}

function stateOf(t: TriggerSummary, w: Work): Exclude<State, 'all'> {
  if (w.toDecide || w.drafts || w.notDelivered || w.placeUnknown) return 'action'
  return t.open_requests > 0 ? 'waiting' : 'ready'
}

export function Queue({
  role,
  triggers,
  onOpen,
}: {
  role: Role
  triggers: TriggerSummary[]
  onOpen: (triggerId: string) => void
}) {
  const [requests, setRequests] = useState<RequestItem[]>([])
  const [q, setQ] = useState('')
  const [kind, setKind] = useState<Kind>('all')
  const [state, setState] = useState<State>('all')
  const [urgent, setUrgent] = useState(false)
  const [day, setDay] = useState<string | null>(null)
  const collector = role === 'collector'

  useEffect(() => {
    // The queue only adds counts; the list works without it.
    data(api.GET('/api/queue'))
      .then(setRequests)
      .catch(() => setRequests([]))
  }, [])

  const rows = useMemo(
    () =>
      [...triggers]
        .sort((a, b) => a.trigger.date.localeCompare(b.trigger.date))
        .map((t) => {
          const w = work(t, requests)
          return { t, w, state: stateOf(t, w) }
        }),
    [triggers, requests],
  )

  const needle = q.trim().toLowerCase()
  const shown = rows.filter(
    ({ t, state: s }) =>
      (!needle || t.patient.id.toLowerCase().includes(needle)) &&
      (kind === 'all' || (kind === 'mdt' ? t.trigger.kind === 'mdt' : t.trigger.modality === kind)) &&
      (!collector || state === 'all' || s === state) &&
      (!urgent || (isSoon(t.trigger.date) && (t.to_decide > 0 || t.open_requests > 0))) &&
      (!day || t.trigger.date.slice(0, 10) === day),
  )
  const today = todayKey()
  const day10 = (r: (typeof shown)[number]) => r.t.trigger.date.slice(0, 10)
  const ordered = [...shown.filter((r) => day10(r) >= today), ...shown.filter((r) => day10(r) < today).reverse()]
  const groups = new Map<string, typeof shown>()
  for (const r of ordered) groups.set(day10(r), [...(groups.get(day10(r)) ?? []), r])
  const firstPast = [...groups.keys()].find((d) => d < today)
  const total = (k: Exclude<keyof Work, 'fhir'>) => rows.reduce((n, r) => n + r.w[k], 0)

  return (
    <div className="flex flex-col gap-6.5 px-4 py-7.5 md:px-9">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[15px] text-muted-foreground">{weekdayDate(today)} {today.slice(0, 4)}</div>
          <h1 className="mt-1 text-[32px] font-extrabold tracking-tight">
            {collector ? 'Fronta k vyřízení' : 'Plánovaná vyšetření a MDT'}
          </h1>
        </div>
        <div className="text-[15px] text-muted-foreground">Seřazeno podle data vyšetření nebo MDT, nejbližší nahoře</div>
      </div>

      <section aria-label="Filtry" className={cn(panel, 'flex flex-wrap items-end gap-4 px-5 py-4.5')}>
        <div className="flex flex-[2_1_240px] flex-col gap-2">
          <Label htmlFor="f-patient" className="text-sm font-bold text-text">Pacient</Label>
          <Input id="f-patient" placeholder="ID pacienta" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <FilterSelect label="Spouštěč" value={kind} onChange={(v) => setKind(v as Kind)} options={{ all: 'Vše', CT: 'CT', MR: 'MR', PT: 'PET', mdt: 'MDT' }} />
        {collector && (
          <FilterSelect
            label="Stav"
            value={state}
            onChange={(v) => setState(v as State)}
            options={{ all: 'Vše', action: 'Vyžaduje akci', waiting: 'Čeká na doručení', ready: 'Připraveno' }}
          />
        )}
        <label className="flex min-h-12 items-center gap-3 px-1 text-base font-semibold">
          <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} className="size-6 accent-primary" />
          Jen naléhavé
        </label>
      </section>

      <div className="flex flex-wrap items-start gap-6.5">
        <main className="flex min-w-0 flex-[999_1_520px] flex-col gap-4">
          {day && (
            <Button variant="outline" className="self-start" onClick={() => setDay(null)}>
              Zobrazit všechny dny
            </Button>
          )}
          {[...groups].map(([date, items], i) => (
            <section key={date} className="flex flex-col gap-4">
              {date === firstPast && <h2 className="mt-6 border-t pt-6 text-xl font-extrabold text-muted-foreground">Proběhlé</h2>}
              <h2 className={cn('text-[17px] font-bold text-text', i > 0 && 'mt-3')}>
                {weekdayDate(date)} · {relativeDays(daysFromToday(date))}
              </h2>
              {items.map(({ t, w }) => (
                <TriggerCard key={t.trigger.id} t={t} w={w} collector={collector} onOpen={onOpen} />
              ))}
            </section>
          ))}
          <div className="rounded-[20px] border border-dashed border-input p-5 text-center text-base text-muted-foreground">
            {shown.length ? 'Další spouštěče nejsou.' : 'Filtrům neodpovídá žádný spouštěč.'}
          </div>
        </main>

        <aside className="flex min-w-0 max-w-[350px] flex-[1_1_310px] flex-col gap-4.5">
          <Calendar dates={new Set(rows.map((r) => r.t.trigger.date.slice(0, 10)))} selected={day} onSelect={setDay} />
          {collector && (
            <section className={cn(panel, 'flex flex-col gap-3 p-5')}>
              <h2 className="text-lg font-bold">K vyřízení</h2>
              <CountRow label="Rozhodnout nejisté" n={total('toDecide')} className="text-decide" />
              <CountRow label="Odeslat e-maily" n={total('drafts')} />
              <CountRow label="Urgovat nedoručené" n={total('notDelivered')} className="text-missing" />
              <CountRow label="Dohledat místo" n={total('placeUnknown')} />
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Record<string, string>
}) {
  return (
    <div className="flex flex-[1_1_170px] flex-col gap-2">
      <Label className="text-sm font-bold text-text">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(options).map(([k, v]) => (
            <SelectItem key={k} value={k}>
              {v}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function CountRow({ label, n, className }: { label: string; n: number; className?: string }) {
  return (
    <div className="flex justify-between text-base">
      <span>{label}</span>
      <b className={n ? className : 'text-muted-foreground'}>{n}</b>
    </div>
  )
}

function TriggerCard({
  t,
  w,
  collector,
  onOpen,
}: {
  t: TriggerSummary
  w: Work
  collector: boolean
  onOpen: (id: string) => void
}) {
  const { patient, trigger, status_counts: sc } = t
  const all = sc.available + sc.missing_report + sc.missing + sc.place_unknown
  const dx = patient.diagnoses[0]
  return (
    <button
      type="button"
      onClick={() => onOpen(trigger.id)}
      className="flex flex-col gap-4 rounded-[20px] border bg-card p-5.5 text-left shadow-[0_1px_2px_rgba(16,40,44,.04)] hover:border-primary focus-visible:outline-3 focus-visible:outline-foreground"
    >
      <div className="flex w-full flex-wrap items-center gap-4">
        <div className="min-w-0 flex-[1_1_240px]">
          <div className="text-[21px] font-extrabold">{patient.id}</div>
          <div className="text-[15px] text-muted-foreground">
            {[sexLabel[patient.sex], age(patient)].filter(Boolean).join(', ')}
            {dx && ` · ${[dx.code, dx.display].filter(Boolean).join(' ')}`}
          </div>
        </div>
        <div className="rounded-xl bg-primary-soft px-3.5 py-2 text-base font-bold text-primary">{triggerTitle(trigger)}</div>
        {w.fhir && <div className="rounded-xl bg-primary-soft px-2.5 py-1 text-sm font-bold text-primary">FHIR</div>}
      </div>
      <div className="flex w-full flex-wrap items-center justify-between gap-4.5">
        <div className="flex flex-[1_1_220px] flex-col gap-2">
          <div className="text-[15px] font-semibold">
            V PACS {sc.available} z {all} kandidátních
          </div>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-[#E6ECEE]">
            <div className="bg-primary" style={{ width: `${all ? (100 * sc.available) / all : 0}%` }} />
          </div>
        </div>
        <div className="flex flex-col gap-0.5 text-base font-bold">
          {collector && w.notDelivered > 0 && (
            <span className="flex items-center gap-2 text-[#A1271D]">
              <CircleAlert className="size-5.5" />
              {w.notDelivered} {w.notDelivered === 1 ? 'žádost nedoručena' : 'žádosti nedoručeny'}
            </span>
          )}
          {collector && w.toDecide > 0 && <span className="text-decide">{w.toDecide} k rozhodnutí</span>}
          {t.duplicate && <span className="text-[15px] text-warn-ink">Upozornění na duplicitu</span>}
        </div>
        <span className="text-base font-bold text-primary">Otevřít ›</span>
      </div>
    </button>
  )
}

function Calendar({
  dates,
  selected,
  onSelect,
}: {
  dates: Set<string>
  selected: string | null
  onSelect: (d: string | null) => void
}) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const today = todayKey()
  const start = new Date(month)
  start.setDate(1 - ((month.getDay() + 6) % 7))
  const days = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1))

  return (
    <section className={cn(panel, 'p-5')}>
      <div className="mb-3.5 flex items-center justify-between">
        <h2 className="text-lg font-bold">{monthTitle(month)}</h2>
        <div className="flex gap-1.5">
          <Button variant="outline" size="icon" className="size-10.5" aria-label="Předchozí měsíc" onClick={() => shift(-1)}>
            ‹
          </Button>
          <Button variant="outline" size="icon" className="size-10.5" aria-label="Další měsíc" onClick={() => shift(1)}>
            ›
          </Button>
        </div>
      </div>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[13px] font-bold text-muted-foreground">
        {['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[15px]">
        {days.map((d) => {
          const k = dayKey(d)
          const has = dates.has(k)
          return (
            <button
              key={k}
              type="button"
              disabled={!has}
              aria-pressed={selected === k}
              aria-label={`${d.getDate()}. ${d.getMonth() + 1}.${has ? ', má spouštěč' : ''}`}
              onClick={() => onSelect(selected === k ? null : k)}
              className={cn(
                'relative flex h-10.5 items-center justify-center rounded-xl',
                d.getMonth() !== month.getMonth() && 'text-disabled',
                has && 'bg-primary-soft font-bold hover:outline-2 hover:outline-primary',
                k === today && 'bg-foreground font-bold text-white',
                selected === k && 'outline-3 outline-primary',
              )}
            >
              {d.getDate()}
              {has && <i className="absolute bottom-1.25 size-1.5 rounded-full bg-primary" />}
            </button>
          )
        })}
      </div>
      <div className="mt-3.5 text-sm text-muted-foreground">Klikněte na den a seznam ukáže jen jeho pacienty.</div>
    </section>
  )
}
