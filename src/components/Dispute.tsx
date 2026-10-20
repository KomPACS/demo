import { useEffect, useState } from 'react'
import { WriteGroup } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { api, data, type Candidate, type Case, type Schemas } from '@/lib/api'
import { formatDate, verdictLabel } from '@/lib/labels'
import { cn } from '@/lib/utils'

type DisputeCategory = Schemas['DisputeCategory']
type VerdictVersion = Schemas['VerdictVersion']
type VerdictLabel = Schemas['Verdict']['label']
type Stage = 'idle' | 'form' | 'run' | 'done'

const categoryLabel: Record<DisputeCategory, string> = {
  event_status: 'Stav události',
  date: 'Datum',
  modality_region: 'Modalita / oblast',
  place: 'Pracoviště',
  guideline_relevance: 'Relevance dle doporučení',
  duplicate: 'Duplicita',
  other: 'Jiné',
}
const categories = Object.keys(categoryLabel) as DisputeCategory[]

const chip = 'h-auto rounded-full px-3 py-1 text-sm font-bold'
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const opposite = (label: VerdictLabel): 'relevant' | 'not_relevant' => (label === 'not_relevant' ? 'relevant' : 'not_relevant')

function contextLine(v: Candidate['verdict']): string {
  const sd = v.source_doc
  return sd ? `${sd.department}, ${formatDate(sd.date)}: kontext nalezen.` : 'Zdrojový dokument: kontext nalezen.'
}

export function Dispute({
  triggerId,
  candidate,
  onCase,
  onDecide,
}: {
  triggerId: string
  candidate: Candidate
  onCase: (c: Case) => void
  onDecide: (decision: 'relevant' | 'not_relevant', reason: string | null) => void
}) {
  const [stage, setStage] = useState<Stage>('idle')
  const [category, setCategory] = useState<DisputeCategory | null>(null)
  const [note, setNote] = useState('')
  const [runStep, setRunStep] = useState(0)
  const [v1, setV1] = useState<VerdictVersion | null>(null)
  const [v2, setV2] = useState<VerdictVersion | null>(null)
  const [kept, setKept] = useState<'a' | 'b' | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const path = { trigger_id: triggerId, candidate_id: candidate.id }

  useEffect(() => {
    setStage('idle')
    setCategory(null)
    setNote('')
    setRunStep(0)
    setV1(null)
    setV2(null)
    setKept(null)
    setError(null)
  }, [candidate.id])

  const cancel = () => {
    setStage('idle')
    setCategory(null)
    setNote('')
  }

  const run = async () => {
    if (!category) return
    setStage('run')
    setRunStep(0)
    setError(null)
    try {
      const prevVersions = await data(api.GET('/api/triggers/{trigger_id}/candidates/{candidate_id}/verdicts', { params: { path } }))
      const v1Entry = prevVersions.find((x) => x.active) ?? { n: 0, verdict: candidate.verdict, active: true }
      setRunStep(1)
      const rejudgePromise = data(
        api.POST('/api/triggers/{trigger_id}/candidates/{candidate_id}/rejudge', {
          params: { path },
          body: { note: note.trim() || null, category },
        }),
      )
      const [kase] = await Promise.all([rejudgePromise, sleep(700)])
      const postVersions = await data(api.GET('/api/triggers/{trigger_id}/candidates/{candidate_id}/verdicts', { params: { path } }))
      const v2Entry = postVersions.find((x) => x.active) ?? postVersions[postVersions.length - 1]
      setRunStep(2)
      await sleep(700)
      onCase(kase)
      setV1(v1Entry)
      setV2(v2Entry)
      setKept(null)
      setStage('done')
    } catch {
      setError('Nové hodnocení se nepodařilo spustit. Zkuste to znovu.')
      setStage('form')
    }
  }

  const toolLines = v2
    ? [
        { name: 'reports.get_context', out: contextLine(candidate.verdict) },
        { name: 'kompacs.rejudge', out: `v2: ${verdictLabel[v2.verdict.label]}${v2.new_evidence ? ', nový důkaz' : ', beze změny'}` },
      ]
    : [{ name: 'reports.get_context', out: contextLine(candidate.verdict) }]

  if (stage === 'idle') {
    return (
      <WriteGroup>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => setStage('form')}>
            Nesouhlasím s hodnocením
          </Button>
          <span className="min-w-45 flex-1 text-xs text-muted-foreground">
            Spustí nové hodnocení. Vaše volba se uloží jako zpětná vazba pro model.
          </span>
        </div>
      </WriteGroup>
    )
  }

  if (stage === 'form') {
    return (
      <WriteGroup>
        <div className="flex flex-col gap-2.5 rounded-2xl border border-decide-border bg-decide-bg p-4">
          <div className="text-xs font-extrabold tracking-widest text-decide uppercase">Námitka · co je špatně?</div>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
                className={cn(
                  'min-h-9 rounded-full px-3 text-sm font-semibold',
                  category === c ? 'bg-decide text-white' : 'border border-decide-border bg-card text-decide',
                )}
              >
                {categoryLabel[c]}
              </button>
            ))}
          </div>
          <label htmlFor="dispute-note" className="text-sm font-bold text-text">
            Důkaz: která věta, které slovo
          </label>
          <Textarea
            id="dispute-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
            aria-label="Důkaz: která věta, které slovo"
          />
          <p className="text-xs text-muted-foreground">Popište důkaz, ne závěr. Model pak přehodnotí text, ne váš názor.</p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button disabled={!category} onClick={run}>
              Přehodnotit
            </Button>
            <Button variant="ghost" onClick={cancel}>
              Zrušit
            </Button>
          </div>
        </div>
      </WriteGroup>
    )
  }

  if (stage === 'run') {
    return (
      <div className="flex flex-col gap-1.5 rounded-2xl border p-3.5 text-sm">
        <div className="font-bold text-text">Přehodnocuji s vaší námitkou…</div>
        {toolLines.slice(0, runStep).map((t) => (
          <div key={t.name} className="flex flex-wrap gap-2">
            <code className="text-primary-hover">{t.name}</code>
            <span className="text-muted-foreground">{t.out}</span>
          </div>
        ))}
      </div>
    )
  }

  if (!v1 || !v2) return null
  const changed = v2.new_evidence != null
  const catLabel = category ? categoryLabel[category] : ''

  const keepV2 = () => setKept('a')
  const restoreV1 = async () => {
    setBusy(true)
    setError(null)
    try {
      const kase = await data(
        api.POST('/api/triggers/{trigger_id}/candidates/{candidate_id}/verdicts/{n}/restore', { params: { path: { ...path, n: v1.n } } }),
      )
      onCase(kase)
      setKept('b')
    } catch {
      setError('Obnovení se nepodařilo.')
    } finally {
      setBusy(false)
    }
  }
  const keepCurrent = () => setKept('a')
  const manualOverride = () => {
    onDecide(opposite(v2.verdict.label), note.trim() || null)
    setKept('b')
  }

  const keptNote = !kept
    ? null
    : changed
      ? `Uloženo: ${kept === 'a' ? 'ponecháno v2' : 'vráceno v1'} · kategorie ${catLabel}`
      : `Uloženo: ${kept === 'a' ? 'hodnocení potvrzeno' : 'ruční rozhodnutí proti modelu'} · kategorie ${catLabel}`

  return (
    <WriteGroup>
      <div className="flex flex-col gap-2.5 rounded-2xl border p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-extrabold tracking-widest text-muted-foreground uppercase">Výsledek námitky</div>
          <span className={cn(chip, changed ? 'bg-ok-bg text-ok-ink' : 'bg-warn-bg text-warn-ink')}>
            {changed ? 'změna s novým důkazem' : 'beze změny · námitka bez opory v textu'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-background px-3 py-2.5 text-[13.5px] leading-relaxed">
            <div className="text-[11px] font-extrabold text-muted-foreground uppercase">V1 · původní</div>
            <b>{verdictLabel[v1.verdict.label]}</b> {v1.verdict.reason}
          </div>
          <div
            className={cn(
              'rounded-xl px-3 py-2.5 text-[13.5px] leading-relaxed',
              changed ? 'border border-ok-ink/30 bg-ok-bg' : 'bg-background',
            )}
          >
            <div className="text-[11px] font-extrabold text-muted-foreground uppercase">V2 · po námitce</div>
            <b>{verdictLabel[v2.verdict.label]}</b> {v2.verdict.reason}
          </div>
        </div>
        <p className="text-[13.5px] leading-relaxed">
          {changed ? (
            <>
              <b>Důkaz pro v2:</b> {v2.new_evidence}
            </>
          ) : (
            'Námitka nepřinesla nový důkaz v textu. Hodnocení ponecháno.'
          )}
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={changed ? keepV2 : keepCurrent}>
            {changed ? 'Ponechat v2' : 'Ponechat hodnocení'}
          </Button>
          <Button variant="outline" disabled={busy} loading={busy} onClick={changed ? restoreV1 : manualOverride}>
            {changed ? 'Vrátit v1' : 'Přesto rozhodnout ručně'}
          </Button>
        </div>
        {keptNote && <p className="text-sm font-semibold text-ok-ink">{keptNote}</p>}
        <div className="text-xs text-muted-foreground">
          Uloží se: kategorie · důkaz · volba v1/v2 · verze promptu a modelu · pseudonymizováno.
        </div>
      </div>
    </WriteGroup>
  )
}
