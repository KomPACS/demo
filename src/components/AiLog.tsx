import { Bot, RefreshCw, ThumbsDown, ThumbsUp } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Loading, WriteGroup } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { api, data, type Candidate, type Case, type LlmCall, type Schemas } from '@/lib/api'
import { formatDate, sourceLabel, triggerKind, verdictLabel } from '@/lib/labels'

type Obj = Record<string, unknown>

const parse = (text: string | null | undefined): Obj | null => {
  try {
    const value = JSON.parse((text ?? '').replace(/^```(?:json)?\s*|\s*```$/g, ''))
    return value && typeof value === 'object' ? value : null
  } catch {
    return null
  }
}

const str = (v: unknown) => (typeof v === 'string' && v ? v : null)
const list = (v: unknown): Obj[] => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : [])

const box = 'rounded-xl bg-background px-3.5 py-3 text-[15px]'

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-base font-extrabold">{title}</h3>
      {children}
    </section>
  )
}

function Fold({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <details className="text-[15px]">
      <summary className="cursor-pointer font-semibold">{title}</summary>
      <div className="mt-2 max-h-80 overflow-auto">{children}</div>
    </details>
  )
}

function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[15px]">
      {rows
        .filter(([, v]) => v !== null && v !== '')
        .map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
    </dl>
  )
}

const pretty = (text: string) => {
  try {
    return JSON.stringify(JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, '')), null, 2)
  } catch {
    return text
  }
}

export function Raw({ text }: { text: string }) {
  return (
    <pre className="max-h-96 overflow-auto rounded-xl bg-[#0F1A1C] px-3.5 py-3 font-mono text-[13px] whitespace-pre-wrap text-[#E6EEEE]">
      {pretty(text)}
    </pre>
  )
}

const irisSearch: Record<string, string> = {
  search_guideline: "IRIS vector search · vec.GuidelineChunk · EMBEDDING('minilm') + VECTOR_COSINE",
  search_reports: 'IRIS vector search · vec.ReportSentence · VECTOR_COSINE',
}

function AiSteps({ kroky }: { kroky: string[] }) {
  return (
    <Part title="Postup AI">
      {kroky.length ? (
        <ol className="list-decimal pl-5 text-[15px]">
          {kroky.map((k, i) => (
            <li key={i}>{k}</li>
          ))}
        </ol>
      ) : (
        <p className="text-muted-foreground">Postup u tohoto hodnocení není uložen.</p>
      )}
      <p className="text-[15px]">
        <b>Vstup: IRIS FHIR</b> (Patient, Condition, ImagingStudy, DiagnosticReport) · <b>Výsledek uložen: IRIS FHIR Basic</b>{' '}
        (tag llm-cache)
      </p>
    </Part>
  )
}

function Steps({ steps }: { steps: LlmCall['steps'] }) {
  if (!steps?.length) return <p className="text-muted-foreground">Model odpověděl hned, bez hledání a bez zaznamenané úvahy.</p>
  return (
    <ol className="flex flex-col gap-3">
      {steps.map((s, i) => (
        <li key={i} className="flex flex-col gap-1.5">
          <b className="text-[15px]">
            Krok {i + 1}.{' '}
            {s.kind === 'reasoning' ? 'reasoning' : (irisSearch[s.tool ?? ''] ?? s.tool)}
          </b>
          {s.kind !== 'reasoning' && <code className="text-[13px]">{`${s.tool}(${JSON.stringify({ query: s.query })})`}</code>}
          <Raw text={s.text} />
        </li>
      ))}
    </ol>
  )
}

function verdictFor(output: Obj | null, id: string): Obj | null {
  const verdicts = output?.verdicts
  if (Array.isArray(verdicts)) return list(verdicts).find((v) => v.candidate_id === id) ?? null
  const v = (verdicts as Obj | undefined)?.[id]
  return v && typeof v === 'object' ? (v as Obj) : null
}

function Verdict({ v }: { v: Obj | null }) {
  if (!v) return <p className="text-muted-foreground">Model k tomuto vyšetření nic nevrátil. Použito: nejisté.</p>
  const label = str(v.label) as keyof typeof verdictLabel | null
  const guideline = v.guideline as Obj | null | undefined
  return (
    <Facts
      rows={[
        ['Hodnocení', label ? (verdictLabel[label] ?? label) : null],
        ['Proč', str(v.reason)],
        ['Věta ze zprávy', str(v.source_sentence) && `„${str(v.source_sentence)}“`],
        ['Modrá kniha', guideline && `s. ${guideline.page}: „${str(guideline.quote) ?? ''}“`],
      ]}
    />
  )
}

function Rejected({ items }: { items: string[] }) {
  if (!items.length) return null
  return (
    <Part title="Vyřazeno kontrolou">
      <ul className="list-disc pl-5 text-[15px] text-warn-ink">
        {items.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>
    </Part>
  )
}

function Mention({ call, candidate }: { call: LlmCall; candidate: Candidate }) {
  const mention = list(parse(call.output)?.mentions).find((m) => m.description === candidate.description)
  const report = parse(call.input)
  return (
    <Part title="Kde AI vyšetření našla">
      {mention && (
        <>
          <blockquote className={box}>„{str(mention.source_sentence)}“</blockquote>
          <Facts
            rows={[
              ['Zpráva ze dne', formatDate(str(report?.date))],
              ['Typ', str(mention.modality)],
              ['Datum', formatDate(str(mention.date))],
              ['Místo', str(mention.place) ?? 'neuvedeno'],
            ]}
          />
        </>
      )}
      {str(report?.text) && (
        <Fold title="Celý text zprávy">
          <p className={`${box} whitespace-pre-wrap`}>{str(report?.text)}</p>
        </Fold>
      )}
      {call.output && (
        <Fold title="Surová odpověď modelu">
          <Raw text={call.output} />
        </Fold>
      )}
    </Part>
  )
}

function Judge({ call, candidate }: { call: LlmCall; candidate: Candidate }) {
  const input = parse(call.input)
  const candidates = list(input?.candidates)
  const mine = candidates.find((c) => c.id === candidate.id)
  const kind = str(input?.trigger_kind) as keyof typeof triggerKind | null
  const others = candidates.map((c) => `${c.id}: `).filter((p) => p !== `${candidate.id}: `)
  const rejected = (call.rejected ?? [])
    .filter((r) => !others.some((p) => r.startsWith(p)))
    .map((r) => r.replace(`${candidate.id}: `, ''))
  return (
    <>
      {input && (
        <Part title="Co model dostal">
          <Facts
            rows={[
              ['Spouštěč', kind && [triggerKind[kind] ?? kind, str(input.trigger_modality)].filter(Boolean).join(' ')],
              ['Diagnózy', Array.isArray(input.diagnoses) ? input.diagnoses.join(', ') : null],
              ['Datum prvozáchytu', formatDate(str(input.index_date))],
              ['Vyšetření', mine && [str(mine.modality), str(mine.description), formatDate(str(mine.date))].filter(Boolean).join(' · ')],
              ['Místo', mine && (str(mine.place) ?? 'neznámé')],
              ['Zdroj', mine && sourceLabel[mine.source as Candidate['source']]],
              ['Vstupní vyšetření', mine?.is_baseline ? 'ano' : null],
              ['Posouzeno spolu s', candidates.length > 1 ? `${candidates.length - 1} dalšími vyšetřeními` : null],
            ]}
          />
          {str(mine?.text) && (
            <Fold title="Text zprávy k vyšetření">
              <p className={`${box} whitespace-pre-wrap`}>{str(mine?.text)}</p>
            </Fold>
          )}
        </Part>
      )}
      <Part title="Výsledek pro toto vyšetření">
        <Verdict v={verdictFor(parse(call.output), candidate.id)} />
      </Part>
      <Rejected items={rejected} />
      {call.traced && (
        <Part title="Postup modelu, surově (společný pro celý případ)">
          <Steps steps={call.steps} />
        </Part>
      )}
      {call.output && (
        <Part title="Surová odpověď modelu">
          <Raw text={call.output} />
        </Part>
      )}
      {call.input && (
        <Fold title="Surový vstup modelu">
          <Raw text={call.input} />
        </Fold>
      )}
      {call.system && (
        <Fold title="Pokyny pro model (systémový prompt)">
          <Raw text={call.system} />
        </Fold>
      )}
    </>
  )
}

type VerdictVersion = Schemas['VerdictVersion']

function Rejudge({ busy, onRun }: { busy: boolean; onRun: (note: string) => void }) {
  const [note, setNote] = useState('')
  return (
    <Part title="Posoudit znovu">
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={1000}
        placeholder="Poznámka pro AI (nepovinné), např. „Pacientka měla PET/CT v Homolce, zvaž ho.“"
        aria-label="Poznámka pro AI"
      />
      <Button variant="outline" className="self-start" loading={busy} disabled={busy} onClick={() => onRun(note)}>
        <RefreshCw className="size-4.5" />
        Posoudit znovu
      </Button>
    </Part>
  )
}

function History({ versions, busy, onRestore }: { versions: VerdictVersion[]; busy: boolean; onRestore: (n: number) => void }) {
  if (versions.length < 2) return null
  return (
    <Part title="Historie hodnocení">
      <ol className="flex flex-col gap-2">
        {[...versions].reverse().map((v) => (
          <li key={v.n} className={`${box} flex flex-col gap-1 ${v.active ? '' : 'opacity-70'}`}>
            <div className="flex flex-wrap items-center gap-2">
              <b>{v.n === 0 ? 'Původní hodnocení' : `Verze ${v.n}`}</b>
              <span className="text-muted-foreground">{v.created ? new Date(v.created).toLocaleString('cs-CZ') : ''}</span>
              <span className={v.active ? 'font-bold' : 'text-warn-ink'}>{v.active ? 'platné' : 'nahrazeno'}</span>
            </div>
            <div>
              {verdictLabel[v.verdict.label] ?? v.verdict.label}: {v.verdict.reason}
            </div>
            {v.note && <div className="text-muted-foreground">Poznámka: {v.note}</div>}
            {v.restored_from != null && <div className="text-muted-foreground">Obnoveno z verze {v.restored_from}</div>}
            {!v.active && (
              <Button variant="ghost" size="sm" className="self-start" disabled={busy} onClick={() => onRestore(v.n)}>
                Použít toto hodnocení
              </Button>
            )}
          </li>
        ))}
      </ol>
    </Part>
  )
}

function Rating({ storageKey }: { storageKey: string }) {
  const saved = (() => {
    try {
      return localStorage.getItem(storageKey)
    } catch {
      return null
    }
  })()
  const [vote, setVote] = useState<'up' | 'down' | null>(null)
  const [comment, setComment] = useState('')
  const [done, setDone] = useState(saved !== null)
  const save = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ vote, comment }))
    } catch {
      // Rating is a mock. A blocked storage only loses the vote.
    }
    setDone(true)
  }
  if (done) return <p className="text-[15px] text-muted-foreground">Děkujeme za hodnocení.</p>
  return (
    <Part title="Bylo hodnocení AI správné?">
      <div className="flex gap-2">
        <Button variant={vote === 'up' ? 'default' : 'outline'} size="sm" aria-label="Ano" onClick={() => setVote('up')}>
          <ThumbsUp className="size-4.5" />
        </Button>
        <Button variant={vote === 'down' ? 'default' : 'outline'} size="sm" aria-label="Ne" onClick={() => setVote('down')}>
          <ThumbsDown className="size-4.5" />
        </Button>
      </div>
      {vote && (
        <>
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Komentář (nepovinné)" aria-label="Komentář" />
          <Button size="sm" className="self-start" onClick={save}>
            Odeslat
          </Button>
        </>
      )}
    </Part>
  )
}

export function AiLog({ triggerId, candidate, onCase }: { triggerId: string; candidate: Candidate; onCase: (c: Case) => void }) {
  const [calls, setCalls] = useState<LlmCall[] | null>(null)
  const [versions, setVersions] = useState<VerdictVersion[]>([])
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const path = { trigger_id: triggerId, candidate_id: candidate.id }

  const load = () => {
    setCalls(null)
    setError(false)
    setActionError(null)
    data(api.GET('/api/triggers/{trigger_id}/llm-trace', { params: { path: { trigger_id: triggerId } } }))
      .then(setCalls)
      .catch(() => setError(true))
    data(api.GET('/api/triggers/{trigger_id}/candidates/{candidate_id}/verdicts', { params: { path } }))
      .then(setVersions)
      .catch(() => setVersions([]))
  }

  const change = (call: Promise<Case>, failure: string) => {
    setBusy(true)
    setActionError(null)
    call
      .then((c) => {
        onCase(c)
        return data(api.GET('/api/triggers/{trigger_id}/candidates/{candidate_id}/verdicts', { params: { path } })).then(setVersions)
      })
      .catch(() => setActionError(failure))
      .finally(() => setBusy(false))
  }

  const rejudge = (note: string) =>
    change(
      data(api.POST('/api/triggers/{trigger_id}/candidates/{candidate_id}/rejudge', { params: { path }, body: { note: note.trim() || null } })),
      'Nové hodnocení zatím není. AI selhala nebo pracuje déle. Otevřete dialog znovu za minutu.',
    )

  const restore = (n: number) =>
    change(
      data(api.POST('/api/triggers/{trigger_id}/candidates/{candidate_id}/verdicts/{n}/restore', { params: { path: { ...path, n } } })),
      'Hodnocení se nepodařilo obnovit.',
    )

  const override = versions.find((v) => v.active && v.n > 0)?.trace
  const judge = override ?? calls?.find((c) => c.kind === 'judge')
  const mention =
    candidate.source === 'report_text'
      ? calls?.find((c) => c.kind === 'mentions' && list(parse(c.output)?.mentions).some((m) => m.description === candidate.description))
      : undefined
  const untraced = [judge, mention].some((c) => c && !c.traced)

  return (
    <Dialog onOpenChange={(open) => open && load()}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="self-start text-muted-foreground">
          <Bot className="size-4.5" />
          Celý záznam AI
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] flex-col gap-5 overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Celý záznam AI: {candidate.description} · {formatDate(candidate.date)}
          </DialogTitle>
        </DialogHeader>
        {error && <p className="text-destructive">Záznam se nepodařilo načíst.</p>}
        {!error && calls === null && <Loading label="AI pracuje…" hint="Načítám záznam modelu." />}
        {calls && !judge && !mention && <p className="text-muted-foreground">Pro toto vyšetření model nebyl volán.</p>}
        {untraced && (
          <p className="text-muted-foreground">Uloženo před zapnutím záznamu. Zobrazen jen výsledek.</p>
        )}
        {calls && judge && <AiSteps kroky={candidate.verdict.kroky ?? []} />}
        {calls && judge && (
          <>
            {override && <p className="text-[15px] font-bold">Platí nové hodnocení. Níže je záznam tohoto nového volání.</p>}
            <WriteGroup>
            <Rejudge busy={busy} onRun={rejudge} />
            {actionError && <p className="text-destructive">{actionError}</p>}
            <History versions={versions} busy={busy} onRestore={restore} />
            <Rating storageKey={`ai-rating:${triggerId}:${candidate.id}:${versions.length}`} />
            </WriteGroup>
          </>
        )}
        {mention && <Mention call={mention} candidate={candidate} />}
        {judge && <Judge call={judge} candidate={candidate} />}
      </DialogContent>
    </Dialog>
  )
}
