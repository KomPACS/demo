import { ExternalLink, Plus, Send, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Loading, RequestBadge, Skeleton, StatusBadge } from '@/components/common'
import { AiLog, Raw } from '@/components/AiLog'
import { BodyMap } from '@/components/BodyMap'
import { PatientBar } from '@/components/PatientBar'
import { RemoveDialog } from '@/components/RemoveDialog'
import { RequestActions } from '@/components/RequestActions'
import type { Role } from '@/components/Sidebar'
import { TimelineFull } from '@/components/Timeline'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  act,
  api,
  data,
  decide,
  type Action,
  type Candidate,
  type Case,
  type Contact,
  type RequestItem,
} from '@/lib/api'
import { classify, isReady, pacsViewerUrl, priorAnchor, progress, sendable, useCase } from '@/lib/case'
import { channelLabel, decisionLabel, formatDate, sourceLabel } from '@/lib/labels'
import { cn, panel } from '@/lib/utils'

type Decision = NonNullable<Candidate['decision']>

const tile = 'flex flex-col gap-3 rounded-[20px] border bg-card p-5.5'

export function CaseDetail({
  triggerId,
  role,
  focus,
  onBack,
}: {
  triggerId: string
  role: Role
  focus?: string
  onBack: () => void
}) {
  const { kase, setCase, requests, setRequests, loadRequests, loadCase, error } = useCase(triggerId)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const locked = useRef(false)
  const [sent, setSent] = useState(0)
  const [adding, setAdding] = useState(false)
  const [tab, setTab] = useState<'checks' | 'timeline' | 'body'>('checks')
  const collector = role === 'collector'
  const loaded = Boolean(kase)

  useEffect(() => {
    if (loaded && focus) document.getElementById(priorAnchor(focus))?.scrollIntoView({ block: 'center' })
  }, [loaded, focus])

  if (error) return <p className="p-8 text-destructive">{error}</p>
  if (!kase)
    return (
      <div className="flex flex-col">
        <div className="flex h-27 items-center bg-bar px-4 md:px-9">
          <Loading label="Načítám případ…" hint="Pacient, kandidátní vyšetření a žádosti z IRIS." className="[&_div]:text-white [&_svg]:text-bar-accent" />
        </div>
        <div className="flex flex-col gap-5.5 px-4 pt-6.5 md:px-9">
          <Skeleton className="h-28" />
          <Skeleton className="h-72" />
          <div className="grid gap-3.5 lg:grid-cols-2">
            <Skeleton className="h-52" />
            <Skeleton className="h-52" />
          </div>
        </div>
      </div>
    )

  const byCandidate = new Map(requests.map((r) => [r.candidate_id, r]))
  const { toDecide, removed, relevant, notRelevant } = classify(kase.candidates)
  const { ready, total } = progress(kase, requests)
  const toSend = requests.filter(sendable)
  const open = (r?: RequestItem) => r && r.state !== 'received' && r.state !== 'not_found'
  const placeUnknown = relevant.filter((c) => c.status === 'place_unknown' && open(byCandidate.get(c.id)))
  const notDelivered = relevant.filter((c) => byCandidate.get(c.id)?.state === 'not_delivered')
  const waiting = relevant.filter((c) => {
    const s = byCandidate.get(c.id)?.state
    return s === 'sent' || s === 'requested'
  })
  const dup = kase.duplicate_alert

  // One request at a time: buttons stay disabled until the server answers.
  const lock = async (key: string, run: () => Promise<void>) => {
    if (locked.current) return
    locked.current = true
    setPending(key)
    setActionError(null)
    try {
      await run()
    } finally {
      locked.current = false
      setPending(null)
    }
  }

  const setDecision = (id: string, decision: Decision, reason: string | null = null) =>
    lock(`${decision}-${id}`, () =>
      decide(triggerId, id, decision, reason, role)
        .then((c) => {
          setCase(c)
          return loadRequests()
        })
        .catch(() => setActionError('Rozhodnutí se nepodařilo uložit. Zkuste to znovu.')),
    )

  const updateCase = (c: Case) => {
    setCase(c)
    loadRequests()
  }

  const replaceRequest = (r: RequestItem) => setRequests((rs) => rs.map((x) => (x.id === r.id ? r : x)))

  const runAction = (id: string, a: Action) =>
    lock(`${a}-${id}`, () =>
      act(id, a)
        .then(replaceRequest)
        .catch(() => setActionError('Akci se nepodařilo provést. Zkuste to znovu.')),
    )

  const saveContact = (c: Contact) =>
    setRequests((rs) => rs.map((r) => (r.organization_id === c.organization_id ? { ...r, contact: c } : r)))

  const sendAll = () =>
    lock('send-all', async () => {
      setSent(0)
      for (const r of toSend) {
        try {
          replaceRequest(await act(r.id, 'approve'))
          setSent((n) => n + 1)
        } catch {
          setActionError('Některé e-maily se nepodařilo odeslat. Zkuste to znovu.')
          return
        }
      }
    })
  const isPending = (key: string) => pending === key

  const jump = (candidateId: string) => {
    setTab('checks')
    setTimeout(() => document.getElementById(priorAnchor(candidateId))?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }

  const todos: { n: number; label: string; target?: Candidate; tone: string; num: string }[] = collector
    ? [
        { n: toDecide.length, label: 'rozhodnout nejisté', target: toDecide[0], tone: 'text-decide', num: 'bg-decide text-white' },
        {
          n: toSend.length,
          label: 'e-mail připraven k odeslání',
          target: kase.candidates.find((c) => c.id === toSend[0]?.candidate_id),
          tone: 'text-foreground',
          num: 'bg-primary text-white',
        },
        { n: placeUnknown.length, label: 'dohledat místo', target: placeUnknown[0], tone: 'text-warn-ink', num: 'bg-warn text-foreground' },
        { n: notDelivered.length, label: 'urgovat nedoručené', target: notDelivered[0], tone: 'text-[#A1271D]', num: 'bg-missing text-white' },
      ]
    : [
        { n: toDecide.length, label: 'čeká na rozhodnutí koordinátora/ky', target: toDecide[0], tone: 'text-decide', num: 'bg-decide text-white' },
        { n: waiting.length, label: 'čeká na doručení', target: waiting[0], tone: 'text-foreground', num: 'bg-primary text-white' },
        { n: notDelivered.length, label: 'nedoručeno, koordinátor/ka urguje', target: notDelivered[0], tone: 'text-[#A1271D]', num: 'bg-missing text-white' },
        { n: placeUnknown.length, label: 'místo neznámé', target: placeUnknown[0], tone: 'text-warn-ink', num: 'bg-warn text-foreground' },
      ]
  const shownTodos = todos.filter((t) => t.n > 0)

  const requestBlock = (c: Candidate) => {
    const r = byCandidate.get(c.id)
    if (!r) return null
    const contact = r.contact
    const isFhir = r.channel === 'fhir'
    return (
      <div className="flex flex-col gap-2.5 border-t pt-3.5">
        <div className="flex flex-wrap items-center gap-2 text-[15px]">
          <b>Žádost:</b> {channelLabel[r.channel]} <RequestBadge state={r.state} />
          {r.sent_at && <span className="text-muted-foreground">odesláno {formatDate(r.sent_at)}</span>}
        </div>
        {collector && isFhir && (
          <div className="text-[15px]">
            <b>Endpoint:</b> {contact?.fhir_endpoint ?? 'neuveden'}
          </div>
        )}
        {collector && !isFhir && contact && (
          <div className="text-[15px]">
            <b>Kontakt:</b> {[contact.email, contact.phone].filter(Boolean).join(' · ') || 'bez údajů'} ·{' '}
            {contact.verified_at ? (
              <span className="text-ok-ink">ověřený kontakt {formatDate(contact.verified_at)}</span>
            ) : (
              <span className="font-semibold text-warn-ink">kontakt neověřený</span>
            )}
            {contact.needs_reverify && <span className="font-semibold text-warn-ink"> · ověřte znovu (starší 12 měsíců)</span>}
          </div>
        )}
        {isFhir && r.fhir_task && (
          <details className="text-[15px]">
            <summary className="cursor-pointer font-semibold">Zobrazit FHIR</summary>
            <Raw text={JSON.stringify(r.fhir_task)} />
          </details>
        )}
        {r.state === 'not_delivered' && (
          <p className="text-[15px] font-semibold text-[#A1271D]">Nedoručeno do 2 pracovních dnů. Urgujte.</p>
        )}
        {collector && r.email_draft && r.state === 'draft' && (
          <blockquote className="rounded-xl bg-background px-3.5 py-3 text-[15px] whitespace-pre-wrap text-text">{r.email_draft}</blockquote>
        )}
        {collector && (
          <div className="flex flex-wrap gap-2.5">
            <RequestActions r={r} pending={pending} onAct={runAction} onContact={saveContact} />
            <RemoveDialog
              disabled={pending !== null}
              loading={isPending(`removed-${c.id}`)}
              onRemove={(reason) => setDecision(c.id, 'removed', reason)}
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <PatientBar
        kase={kase}
        ready={ready}
        total={total}
        backLabel={collector ? 'Fronta k vyřízení' : 'Plánovaná vyšetření a MDT'}
        onBack={onBack}
        action={
          collector && (
            <Button
              disabled={pending !== null || toSend.length === 0}
              loading={isPending('send-all')}
              onClick={sendAll}
              className="min-h-13 bg-bar-accent font-extrabold text-bar-accent-ink hover:bg-white"
            >
              {!isPending('send-all') && <Send className="size-5.5" />}
              {isPending('send-all')
                ? `Odesílám ${Math.min(sent + 1, sent + toSend.length)} z ${sent + toSend.length}…`
                : `Odeslat všechny připravené (${toSend.length})`}
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-5.5 px-4 pt-6.5 pb-12 md:px-9">
        {actionError && (
          <div role="alert" className="flex items-center justify-between gap-3 rounded-[18px] bg-missing-bg px-5 py-3.5 font-semibold text-missing-ink">
            {actionError}
            <Button variant="ghost" onClick={() => setActionError(null)}>
              Zavřít
            </Button>
          </div>
        )}
        <section className={cn(panel, 'flex flex-wrap items-center gap-x-8 gap-y-4 px-5.5 py-5')}>
          <div className="basis-full text-sm font-extrabold tracking-wider text-muted-foreground uppercase">
            {collector ? 'Co zbývá udělat' : 'Stav kontroly'}
          </div>
          {kase.candidates.length === 0 && (
            <span className="text-base font-semibold text-missing-ink">Nenalezena žádná předchozí vyšetření. Ověřte v časové ose.</span>
          )}
          {kase.candidates.length > 0 && shownTodos.length === 0 && (
            <span className="text-base font-semibold text-ok-ink">Vše potřebné je k dispozici.</span>
          )}
          {shownTodos.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => t.target && jump(t.target.id)}
              className={cn('flex items-center gap-2.5 text-base font-semibold hover:underline', t.tone)}
            >
              <span className={cn('inline-flex h-8 min-w-8 items-center justify-center rounded-full text-[15px] font-extrabold', t.num)}>
                {t.n}
              </span>
              {t.label}
            </button>
          ))}
          <div className="ml-auto text-sm text-muted-foreground">
            {kase.patient.index_date && <>Prvozáchyt {formatDate(kase.patient.index_date)}</>}
            {kase.patient.index_date && kase.patient.birth_year && ' · '}
            {kase.patient.birth_year && <>nar. {kase.patient.birth_year}</>}
          </div>
        </section>

        {dup && (
          <div className="flex items-start gap-3 rounded-[18px] border border-[#F1D48A] bg-warn-bg px-5 py-4 text-base text-[#5E3A00]">
            <TriangleAlert className="size-6 shrink-0" />
            <div>
              <b>Upozornění na duplicitu.</b> Pacient měl {dup.modality} {formatDate(dup.date)}, {dup.days_apart} dní před
              plánovaným vyšetřením. Ověřte s indikujícím lékařem, zda je nové vyšetření nutné.
            </div>
          </div>
        )}

        <div role="tablist" aria-label="Části případu" className="flex flex-wrap gap-1 self-start rounded-[14px] bg-[#E6ECEE] p-0.75">
          {(
            [
              ['checks', 'Kontroly'],
              ['timeline', 'Časová osa'],
              ['body', 'Zobrazení na těle'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn('min-h-11 rounded-xl px-5 text-base font-semibold text-text', tab === id && 'bg-card text-foreground shadow-sm')}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'timeline' && <TimelineFull kase={kase} requests={requests} role={role} onOpenPrior={jump} onCaseChanged={loadCase} />}
        {tab === 'body' && <BodyMap priors={[...toDecide, ...relevant]} triggerPart={kase.trigger.body_part} />}
        {tab === 'checks' && (
          <>
            {kase.insurer_request && <InsurerCard insurer={kase.insurer_request} />}

        {toDecide.length > 0 && (
          <Section title={`1. K rozhodnutí (${toDecide.length})`} className="text-decide">
            <p className="-mt-1.5 text-[15px] text-muted-foreground">
              {collector
                ? 'Systém si není jistý. Rozhodněte, zda vyšetření lékař potřebuje. Žádost vznikne až potom.'
                : 'Systém si není jistý. Rozhoduje koordinátor/ka.'}
            </p>
            {toDecide.map((c) => (
              <PriorTile key={c.id} c={c} triggerId={triggerId} onCase={updateCase} className="border-2 border-decide-border bg-decide-bg" verdictPrefix>
                {collector && (
                  <div className="mt-1 flex flex-wrap gap-3">
                    <Button
                      className="bg-decide hover:bg-decide/85"
                      disabled={pending !== null}
                      loading={isPending(`relevant-${c.id}`)}
                      onClick={() => setDecision(c.id, 'relevant')}
                    >
                      Relevantní
                    </Button>
                    <Button
                      variant="outline"
                      disabled={pending !== null}
                      loading={isPending(`not_relevant-${c.id}`)}
                      onClick={() => setDecision(c.id, 'not_relevant')}
                    >
                      Nerelevantní
                    </Button>
                  </div>
                )}
              </PriorTile>
            ))}
          </Section>
        )}

        <Section title={`${toDecide.length ? 2 : 1}. Relevantní předchozí vyšetření (${relevant.length})`}>
          {relevant.length === 0 && <p className="text-base text-muted-foreground">Žádné relevantní předchozí vyšetření.</p>}
          <div className="grid gap-3.5 lg:grid-cols-2">
            {relevant.map((c) => (
              <PriorTile key={c.id} c={c} triggerId={triggerId} onCase={updateCase} request={byCandidate.get(c.id)}>
                {requestBlock(c)}
              </PriorTile>
            ))}
          </div>
        </Section>

        {notRelevant.length + removed.length > 0 && (
          <Section title={`${toDecide.length ? 3 : 2}. Nerelevantní a vyřazené (${notRelevant.length + removed.length})`} className="text-muted-foreground">
            {[...notRelevant, ...removed].map((c) => (
              <div key={c.id} id={priorAnchor(c.id)} className={cn(tile, 'scroll-mt-40 flex-row flex-wrap items-center gap-3.5 bg-[#F8FAFA]')}>
                <div className="min-w-64 flex-1">
                  <div className="text-lg font-bold text-text">
                    {c.description} · {formatDate(c.date)}
                  </div>
                  <div className="text-[15px] text-muted-foreground">
                    {c.place ?? 'místo neznámé'} · {sourceLabel[c.source]} ·{' '}
                    {c.decision === 'removed'
                      ? `${decisionLabel.removed}: ${c.decision_reason ?? 'bez důvodu'}`
                      : c.decision
                        ? decisionLabel[c.decision]
                        : `LLM: nerelevantní. ${c.verdict.reason}`}
                  </div>
                  {c.source !== 'collector' && <AiLog triggerId={triggerId} candidate={c} onCase={updateCase} />}
                </div>
                {collector ? (
                  <Button
                    variant="outline"
                    disabled={pending !== null}
                    loading={isPending(`relevant-${c.id}`)}
                    onClick={() => setDecision(c.id, 'relevant')}
                  >
                    {c.decision === 'removed' ? 'Vrátit jako relevantní' : 'Označit jako relevantní'}
                  </Button>
                ) : (
                  c.decision === 'removed' && (
                    <Button
                    variant="outline"
                    disabled={pending !== null}
                    loading={isPending(`relevant-${c.id}`)}
                    onClick={() => setDecision(c.id, 'relevant')}
                  >
                      Znovu vyžádat
                    </Button>
                  )
                )}
              </div>
            ))}
          </Section>
        )}

        {collector &&
          (adding ? (
            <AddCandidate
              triggerId={triggerId}
              onAdded={(c) => {
                setCase(c)
                setAdding(false)
                loadRequests()
              }}
              onCancel={() => setAdding(false)}
            />
          ) : (
            <Button variant="outline" className="self-start" onClick={() => setAdding(true)}>
              <Plus className="size-5.5" />
              Přidat předchozí vyšetření ručně
            </Button>
          ))}
          </>
        )}
      </div>
    </div>
  )
}

function InsurerCard({ insurer }: { insurer: NonNullable<Case['insurer_request']> }) {
  const [sent, setSent] = useState(false)
  return (
    <div className={cn(panel, 'flex flex-col gap-3 px-5.5 py-5')}>
      <div className="text-sm font-extrabold tracking-wider text-muted-foreground uppercase">Dotaz na pojišťovnu</div>
      <p className="text-[15px]">
        <span className="font-semibold">{insurer.recipient}</span> ·{' '}
        {insurer.since ? `výkony od ${formatDate(insurer.since)} do dnes` : 'všechny výkony'}
      </p>
      {sent ? (
        <>
          <p className="text-[15px] font-semibold text-primary">Odesláno přes FHIR (demo)</p>
          <Raw text={JSON.stringify(insurer.task)} />
        </>
      ) : (
        <Button className="self-start" onClick={() => setSent(true)}>
          <Send /> Odeslat dotaz pojišťovně (FHIR)
        </Button>
      )}
    </div>
  )
}

function Section({ title, className, children }: { title: string; className?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3.5">
      <h2 className={cn('text-xl font-extrabold', className)}>{title}</h2>
      {children}
    </section>
  )
}

function PriorTile({
  c,
  triggerId,
  onCase,
  request,
  className,
  verdictPrefix,
  children,
}: {
  c: Candidate
  triggerId: string
  onCase: (c: Case) => void
  request?: RequestItem
  className?: string
  verdictPrefix?: boolean
  children?: ReactNode
}) {
  const quote = c.verdict.source_sentence
  return (
    <div id={priorAnchor(c.id)} className={cn(tile, 'scroll-mt-40', className)}>
      <div className="flex flex-wrap justify-between gap-2">
        <div className="text-[19px] font-bold">
          {c.description} · {formatDate(c.date)}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <StatusBadge status={c.status} />
          {!request && c.request_state && <RequestBadge state={c.request_state} />}
        </div>
      </div>
      <div className="text-[15px] text-muted-foreground">
        {c.place ?? 'místo neznámé'} · {sourceLabel[c.source]}
        {c.pacs_source && <> · PACS: {c.pacs_source}</>}
        {c.is_baseline && (
          <>
            {' '}
            · <b className="text-foreground">vstupní vyšetření</b> před léčbou
          </>
        )}
      </div>
      {quote && <blockquote className="rounded-xl bg-background px-3.5 py-3 text-[15px] text-text">„{quote}“</blockquote>}
      <div className="text-base">
        {c.decision === 'relevant' || c.decision === 'not_relevant' ? (
          <>
            <b>Rozhodnutí koordinátora/ky: {decisionLabel[c.decision]}.</b>{' '}
            <span className="text-muted-foreground">Původní hodnocení LLM: {c.verdict.reason}</span>
          </>
        ) : (
          <>
            {verdictPrefix ? <b>Hodnocení LLM: nejisté.</b> : <b>Proč:</b>} {c.verdict.reason}
          </>
        )}
      </div>
      {c.verdict.guideline && (
        <div className="text-[15px] text-muted-foreground">
          <a
            className="font-bold text-primary underline"
            href={`https://www.linkos.cz/files/modra-kniha/26.pdf#page=${c.verdict.guideline.page}`}
            target="_blank"
            rel="noreferrer"
          >
            Modrá kniha ČOS, s. {c.verdict.guideline.page}
          </a>
          : „{c.verdict.guideline.quote}“
        </div>
      )}
      {c.source !== 'collector' && <AiLog triggerId={triggerId} candidate={c} onCase={onCase} />}
      {isReady(c, request) && (
        <Button asChild variant="outline" className="self-start">
          <a href={pacsViewerUrl(c.id)} target="_blank" rel="noreferrer">
            <ExternalLink aria-hidden="true" />
            Otevřít v PACS
          </a>
        </Button>
      )}
      {children}
    </div>
  )
}

function AddCandidate({
  triggerId,
  onAdded,
  onCancel,
}: {
  triggerId: string
  onAdded: (c: Case) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({ modality: '', date: '', description: '', place: '' })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    setError(null)
    const body = { ...form, date: form.date || null, place: form.place || null }
    data(api.POST('/api/triggers/{trigger_id}/candidates', { params: { path: { trigger_id: triggerId } }, body }))
      .then(onAdded)
      .catch(() => setError('Vyšetření se nepodařilo přidat.'))
      .finally(() => setSaving(false))
  }

  return (
    <form onSubmit={submit} className={cn(panel, 'grid gap-4 p-5.5 sm:grid-cols-2')}>
      <h2 className="text-lg font-bold sm:col-span-2">Přidat předchozí vyšetření ručně</h2>
      <Field id="add-modality" label="Modalita">
        <Input id="add-modality" required placeholder="CT, MR, PET…" value={form.modality} onChange={set('modality')} />
      </Field>
      <Field id="add-date" label="Datum (i jen rok nebo měsíc)">
        <Input id="add-date" placeholder="2026-03" value={form.date} onChange={set('date')} />
      </Field>
      <Field id="add-description" label="Popis">
        <Input id="add-description" required placeholder="CT hrudníku" value={form.description} onChange={set('description')} />
      </Field>
      <Field id="add-place" label="Místo (nemocnice)">
        <Input id="add-place" placeholder="neznámé" value={form.place} onChange={set('place')} />
      </Field>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button type="submit" loading={saving}>
          Přidat
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Zrušit
        </Button>
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </form>
  )
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id} className="text-sm font-bold text-text">
        {label}
      </Label>
      {children}
    </div>
  )
}
