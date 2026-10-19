import { useEffect, useMemo, useState } from 'react'
import { Loading } from '@/components/common'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api, data, type RequestItem, type Schemas, type TriggerSummary } from '@/lib/api'
import { channelLabel, priorStatus, requestState, triggerTitle, weekdayDate, workingDaysFromToday } from '@/lib/labels'
import { cn, panel } from '@/lib/utils'

type Dataset = Schemas['DatasetStats']
type Metric = 'decide' | 'drafts' | 'notDelivered' | 'placeUnknown'

const STATUS_COLOR: Record<keyof Schemas['StatusCounts'], string> = {
  available: 'bg-primary',
  missing_report: 'bg-warn',
  missing: 'bg-missing',
  place_unknown: 'bg-decide',
}

const STATE_ORDER: RequestItem['state'][] = ['draft', 'sent', 'requested', 'not_delivered', 'received', 'not_found']
const STATE_COLOR: Record<RequestItem['state'], string> = {
  draft: 'bg-decide',
  sent: 'bg-chart-2',
  requested: 'bg-primary-tint',
  not_delivered: 'bg-missing',
  received: 'bg-primary',
  not_found: 'bg-disabled',
}

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0)
const cases = (n: number) => `${n} ${n === 1 ? 'případ' : n >= 2 && n <= 4 ? 'případy' : 'případů'}`
const czk = (n: number) => `${Math.round(n).toLocaleString('cs-CZ')} Kč`

function StackedBar({ parts }: { parts: { key: string; value: number; color: string; label: string }[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0)
  return (
    <div>
      <div className="flex h-4 overflow-hidden rounded-full bg-divider" role="img" aria-label={parts.map((p) => `${p.label} ${p.value}`).join(', ')}>
        {parts.map((p) => p.value > 0 && <div key={p.key} className={p.color} style={{ width: `${(p.value / total) * 100}%` }} />)}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-text">
        {parts.map((p) => (
          <li key={p.key} className="flex items-center gap-2">
            <span className={cn('size-2.5 rounded-full', p.color)} />
            {p.label}
            <b className="tabular-nums">{p.value}</b>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Rows({ rows, unit }: { rows: { key: string; value: number; extra?: string }[]; unit?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[minmax(0,14rem)_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate text-text" title={r.key}>{r.key}</span>
          <span className="h-2.5 rounded-full bg-divider">
            <span className="block h-full rounded-full bg-primary" style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className="tabular-nums font-bold">
            {r.value}
            {unit}
            {r.extra && <span className="ml-1.5 font-normal text-subtle">{r.extra}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}

function PacsGap({ rows }: { rows: Schemas['PacsCount'][] }) {
  const max = Math.max(1, ...rows.map((r) => r.in_pacs + r.not_in_pacs))
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((r) => {
        const total = r.in_pacs + r.not_in_pacs
        return (
          <li key={r.key} className="grid grid-cols-[3.5rem_1fr_6.5rem] items-center gap-3 text-sm">
            <span className="font-bold text-text">{r.key}</span>
            <span className="flex h-3 overflow-hidden rounded-full" style={{ width: `${(total / max) * 100}%` }}>
              <span className="bg-primary" style={{ width: `${pct(r.in_pacs, total)}%` }} />
              <span className="bg-missing" style={{ width: `${100 - pct(r.in_pacs, total)}%` }} />
            </span>
            <span className="text-right tabular-nums">
              <b className={r.not_in_pacs ? 'text-missing-ink' : 'text-ok-ink'}>{pct(r.not_in_pacs, total)} %</b>
              <span className="ml-1.5 text-subtle">z {total}</span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function Section({ title, hint, children, className }: { title: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn(panel, 'flex flex-col gap-4 px-6 py-5.5', className)}>
      <div>
        <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>
        {hint && <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

function Minutes({ id, label, value, onChange, suffix }: { id: string; label: string; value: number; onChange: (n: number) => void; suffix: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-sm font-bold text-text">{label}</Label>
      <div className="flex items-center gap-2">
        <Input id={id} type="number" min={0} className="w-24 tabular-nums" value={value} onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))} />
        <span className="text-sm text-muted-foreground">{suffix}</span>
      </div>
    </div>
  )
}

export function Stats({ triggers, onOpen }: { triggers: TriggerSummary[]; onOpen: (triggerId: string) => void }) {
  const [requests, setRequests] = useState<RequestItem[] | null>(null)
  const [dataset, setDataset] = useState<Dataset | null | 'error'>(null)
  const [metric, setMetric] = useState<Metric | null>(null)
  const [contactMin, setContactMin] = useState(10)
  const [requestMin, setRequestMin] = useState(5)
  const [rate, setRate] = useState(600)

  useEffect(() => {
    data(api.GET('/api/queue')).then(setRequests).catch(() => setRequests([]))
    data(api.GET('/api/stats')).then(setDataset).catch(() => setDataset('error'))
  }, [])

  const reqs = useMemo(() => requests ?? [], [requests])
  const byTrigger = useMemo(() => {
    const m = new Map<string, RequestItem[]>()
    for (const r of reqs) m.set(r.trigger_id, [...(m.get(r.trigger_id) ?? []), r])
    return m
  }, [reqs])

  const metrics: { id: Metric; label: string; hint: string; tone: string; cases: TriggerSummary[]; count: number }[] = useMemo(() => {
    const of = (t: TriggerSummary) => byTrigger.get(t.trigger.id) ?? []
    const pick = (f: (t: TriggerSummary) => number) => {
      const cases = triggers.filter((t) => f(t) > 0)
      return { cases, count: cases.reduce((s, t) => s + f(t), 0) }
    }
    return [
      { id: 'decide', label: 'Předchozí vyšetření k rozhodnutí', hint: 'AI si není jistá nebo čeká na koordinátora', tone: 'border-decide-border bg-decide-bg text-decide', ...pick((t) => t.to_decide) },
      { id: 'drafts', label: 'Žádosti ke schválení', hint: 'Návrh e-mailu je připraven', tone: 'border-decide-border bg-decide-bg text-decide', ...pick((t) => of(t).filter((r) => r.state === 'draft' && (r.organization_id || r.place)).length) },
      { id: 'notDelivered', label: 'Nedoručeno', hint: 'Snímky nejsou v PACS 2 pracovní dny po odeslání', tone: 'border-missing/30 bg-missing-bg text-missing-ink', ...pick((t) => of(t).filter((r) => r.state === 'not_delivered').length) },
      { id: 'placeUnknown', label: 'Místo neznámé', hint: 'Je třeba zjistit, kde vyšetření proběhlo', tone: 'border-warn/50 bg-warn-bg text-warn-ink', ...pick((t) => of(t).filter((r) => r.state === 'draft' && !r.place && !r.organization_id).length) },
    ]
  }, [triggers, byTrigger])

  if (!requests) return <div className="px-4 py-7.5 md:px-9"><Loading label="Načítám přehled…" /></div>

  const status = triggers.reduce(
    (s, t) => ({
      available: s.available + (t.status_counts.available ?? 0),
      missing_report: s.missing_report + (t.status_counts.missing_report ?? 0),
      missing: s.missing + (t.status_counts.missing ?? 0),
      place_unknown: s.place_unknown + (t.status_counts.place_unknown ?? 0),
    }),
    { available: 0, missing_report: 0, missing: 0, place_unknown: 0 },
  )
  const priors = Object.values(status).reduce((a, b) => a + b, 0)
  const ready = triggers.filter((t) => t.to_decide === 0 && t.open_requests === 0).length
  const soon = triggers.filter((t) => {
    const n = workingDaysFromToday(t.trigger.date)
    return n >= 0 && n <= 2
  })
  const soonBlocked = soon.filter((t) => t.to_decide > 0 || t.open_requests > 0)

  const count = <K extends string>(keys: K[]) => {
    const m = new Map<K, number>()
    for (const k of keys) m.set(k, (m.get(k) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }
  const byState = count(reqs.map((r) => r.state))
  const byChannel = count(reqs.map((r) => r.channel))
  const byPlace = count(reqs.filter((r) => r.place).map((r) => r.place as string)).slice(0, 6)

  const contactsFound = reqs.filter((r) => r.contact).length
  const savedMin = contactsFound * contactMin + reqs.length * requestMin
  const savedH = savedMin / 60
  const active = metrics.find((m) => m.id === metric)

  return (
    <div className="flex flex-col gap-6.5 px-4 py-7.5 md:px-9">
      <div>
        <div className="text-[15px] text-muted-foreground">Stav všech {triggers.length} kontrol a požadavků</div>
        <h1 className="mt-1 text-[32px] font-extrabold tracking-tight">Přehled</h1>
      </div>

      <section aria-label="Co je třeba udělat" className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={metric === m.id}
            disabled={m.count === 0}
            onClick={() => setMetric(metric === m.id ? null : m.id)}
            className={cn(
              'flex flex-col gap-1 rounded-[18px] border-2 px-5 py-4 text-left transition-shadow disabled:cursor-default',
              m.count ? m.tone : 'border-border bg-card text-subtle',
              metric === m.id && 'ring-4 ring-ring/25',
            )}
          >
            <span className="text-[34px] leading-none font-extrabold tabular-nums">{m.count}</span>
            <span className="text-base font-bold">{m.label}</span>
            <span className="text-sm opacity-80">{m.count ? `${cases(m.cases.length)} · ${m.hint}` : 'Nic nečeká'}</span>
          </button>
        ))}
      </section>

      {active && (
        <Section title={active.label} hint="Klikněte na případ a otevřete ho.">
          <ul className="flex flex-wrap gap-2">
            {active.cases.map((t) => (
              <li key={t.trigger.id}>
                <button type="button" onClick={() => onOpen(t.trigger.id)} className="rounded-full border bg-background px-3.5 py-1.5 text-sm font-semibold text-text hover:border-primary hover:text-primary">
                  {triggerTitle(t.trigger)} · {weekdayDate(t.trigger.date)} · {t.patient.id}
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="grid gap-6.5 lg:grid-cols-2">
        <Section title="Připravenost případů" hint={`${ready} z ${triggers.length} případů má všechna předchozí vyšetření vyřešená.`}>
          <div className="flex items-baseline gap-3">
            <span className="text-[40px] leading-none font-extrabold tabular-nums text-primary">{pct(ready, triggers.length)} %</span>
            <span className="text-sm text-muted-foreground">připraveno</span>
          </div>
          <p className={cn('rounded-xl px-4 py-3 text-sm font-semibold', soonBlocked.length ? 'bg-missing-bg text-missing-ink' : 'bg-ok-bg text-ok-ink')}>
            {soon.length === 0
              ? 'V příštích 2 pracovních dnech není naplánováno žádné vyšetření ani MDT.'
              : soonBlocked.length
                ? `${soonBlocked.length} z ${soon.length} vyšetření nebo MDT v příštích 2 pracovních dnech ještě není připraveno.`
                : `Všech ${soon.length} vyšetření nebo MDT v příštích 2 pracovních dnech je připraveno.`}
          </p>
          <div>
            <h3 className="mb-2.5 text-sm font-bold text-text">Předchozí vyšetření ({priors})</h3>
            <StackedBar
              parts={(Object.keys(status) as (keyof typeof status)[]).map((k) => ({ key: k, value: status[k], color: STATUS_COLOR[k], label: priorStatus[k] }))}
            />
          </div>
        </Section>

        <Section title="Ušetřený čas" hint="Odhad: kolik ruční práce systém převzal. Hodnoty upravte podle svého pracoviště.">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <span className="text-[40px] leading-none font-extrabold tabular-nums text-primary">{savedH.toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} h</span>
            <span className="text-xl font-bold tabular-nums text-text">{czk(savedH * rate)}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {contactsFound} automaticky dohledaných kontaktů × {contactMin} min + {reqs.length} připravených žádostí × {requestMin} min.
            {triggers.length > 0 && ` Na jeden případ ${Math.round(savedMin / triggers.length)} min.`}
          </p>
          <div className="flex flex-wrap gap-5 rounded-xl bg-background px-4 py-3.5">
            <Minutes id="s-contact" label="Dohledání kontaktu" value={contactMin} onChange={setContactMin} suffix="min" />
            <Minutes id="s-request" label="Napsání žádosti" value={requestMin} onChange={setRequestMin} suffix="min" />
            <Minutes id="s-rate" label="Cena práce" value={rate} onChange={setRate} suffix="Kč / h" />
          </div>
        </Section>

        <Section title="Žádosti o snímky" hint={`${reqs.length} žádostí celkem, podle stavu a kanálu.`}>
          <StackedBar
            parts={STATE_ORDER.map((s) => ({ key: s, value: byState.find(([k]) => k === s)?.[1] ?? 0, color: STATE_COLOR[s], label: requestState[s] }))}
          />
          <div>
            <h3 className="mb-2.5 text-sm font-bold text-text">Kanál</h3>
            <Rows rows={byChannel.map(([k, v]) => ({ key: channelLabel[k], value: v }))} />
          </div>
        </Section>

        <Section title="Odkud chybí nejvíc" hint="Pracoviště s nejvíce žádostmi. Ověřený kontakt tady ušetří nejvíc času.">
          {byPlace.length ? <Rows rows={byPlace.map(([k, v]) => ({ key: k, value: v }))} /> : <p className="text-sm text-muted-foreground">Zatím žádné žádosti s místem.</p>}
        </Section>
      </div>

      <Section
        title="Snímky v PACS: celá data FN Motol"
        hint={
          dataset && dataset !== 'error'
            ? `${dataset.patients.toLocaleString('cs-CZ')} pacientů · ${dataset.studies.toLocaleString('cs-CZ')} vyšetření · ${pct(dataset.studies - dataset.in_pacs, dataset.studies)} % bez snímků v PACS. Data z IRIS FHIR.`
            : undefined
        }
      >
        {dataset === null && <Loading label="Načítám data z IRIS…" />}
        {dataset === 'error' && <p className="text-sm text-missing-ink">Data z IRIS se nepodařilo načíst. Zkuste stránku obnovit.</p>}
        {dataset && dataset !== 'error' && (
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-bold text-text">Podíl bez snímků podle modality</h3>
              <PacsGap rows={dataset.by_modality} />
            </div>
            <div>
              <h3 className="mb-3 text-sm font-bold text-text">Podíl bez snímků podle roku</h3>
              <PacsGap rows={dataset.by_year} />
              <p className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-primary" />v PACS</span>
                <span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-missing" />chybí</span>
              </p>
            </div>
          </div>
        )}
      </Section>
    </div>
  )
}
