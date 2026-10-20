import { ArrowLeft, X } from 'lucide-react'
import { AiLog } from '@/components/AiLog'
import { Button } from '@/components/ui/button'
import type { Candidate, Case, Schemas } from '@/lib/api'
import { gapLabel } from '@/lib/case'
import { formatDate, triggerTitle } from '@/lib/labels'
import { cn } from '@/lib/utils'

type Trigger = Schemas['Trigger']
type Verdict = Candidate['verdict']
type VerdictStep = NonNullable<Verdict['steps']>[number]

const eventLabel: Record<NonNullable<Verdict['event_status']>, string> = {
  done: 'proběhlo',
  planned: 'plánováno',
  recommended: 'doporučeno',
  unclear: 'nejasné',
}

const eventTone: Record<NonNullable<Verdict['event_status']>, string> = {
  done: 'bg-ok-bg text-ok-ink',
  planned: 'bg-warn-bg text-warn-ink',
  recommended: 'bg-warn-bg text-warn-ink',
  unclear: 'bg-warn-bg text-warn-ink',
}

const chip = 'h-auto rounded-full px-3 py-1 text-sm font-bold'

function Quote({ v }: { v: Verdict }) {
  if (!v.source_sentence) return null
  const idx = v.event_word ? v.source_sentence.indexOf(v.event_word) : -1
  return (
    <blockquote className="rounded-xl bg-background px-3.5 py-3 text-[15px] leading-relaxed text-muted-foreground">
      {v.context_before && <>{v.context_before} </>}
      <span className="text-text">
        {idx === -1 ? (
          v.source_sentence
        ) : (
          <>
            {v.source_sentence.slice(0, idx)}
            <b className="text-primary-hover underline decoration-2 underline-offset-2">{v.event_word}</b>
            {v.source_sentence.slice(idx + (v.event_word?.length ?? 0))}
          </>
        )}
      </span>
      {v.context_after && <> {v.context_after}</>}
    </blockquote>
  )
}

function Steps({ steps }: { steps: VerdictStep[] }) {
  return (
    <ol className="flex flex-col gap-3 lg:gap-2.5">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-2 text-sm lg:flex-wrap lg:items-baseline">
          <span className="inline-flex size-5.5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-extrabold">
            {i + 1}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1 lg:contents">
            <div className="flex items-center justify-between gap-2 lg:contents">
              <span
                className={cn(
                  'shrink-0 rounded-md px-2 py-0.5 text-xs font-extrabold tracking-wide uppercase',
                  s.kind === 'llm' ? 'bg-decide/10 text-decide' : 'bg-primary-soft text-primary-hover',
                )}
              >
                {s.kind === 'llm' ? 'AI' : 'Systém'}
              </span>
              {s.kind === 'lookup' && s.at && (
                <span className="text-xs text-muted-foreground tabular-nums lg:order-last">{new Date(s.at).toLocaleTimeString('cs-CZ')}</span>
              )}
            </div>
            <span className="lg:min-w-0 lg:flex-1">
              <b>{s.label}:</b> {s.text}
            </span>
          </div>
        </li>
      ))}
    </ol>
  )
}

export function EvidencePanel({
  candidate,
  trigger,
  checkedAt,
  triggerId,
  onCase,
  onClose,
}: {
  candidate: Candidate
  trigger: Trigger
  checkedAt?: string | null
  triggerId: string
  onCase: (c: Case) => void
  onClose: () => void
}) {
  const v = candidate.verdict
  const gap = gapLabel(candidate.date, trigger.date)
  const sources = v.sources ?? []
  const weakSources = sources.length <= 1
  const time = checkedAt ? new Date(checkedAt).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) : null

  return (
    <aside
      aria-label="Souhrn úvah"
      className="fixed inset-0 z-45 flex flex-col gap-4 overflow-y-auto bg-card px-5 py-5 lg:sticky lg:inset-auto lg:top-42 lg:z-auto lg:w-125 lg:max-h-[calc(100vh-10.5rem)] lg:shrink-0 lg:self-start lg:border-l lg:px-6"
    >
      <div className="flex items-start justify-between gap-3">
        <Button variant="ghost" size="icon" aria-label="Zpět na případ" onClick={onClose} className="-ml-2 lg:hidden">
          <ArrowLeft />
        </Button>
        <div className="flex-1">
          <div className="text-xs font-extrabold tracking-widest text-primary uppercase">Souhrn úvah</div>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-2xl font-extrabold tabular-nums">{formatDate(candidate.date)}</span>
            <span className="text-lg font-bold">{candidate.description}</span>
          </div>
          {gap && (
            <div className="text-sm font-semibold text-text">
              {gap} ({triggerTitle(trigger)} {formatDate(trigger.date)})
            </div>
          )}
          {time && (
            <div className="text-sm text-muted-foreground">
              Kontrola {formatDate(checkedAt)} {time} · automaticky z{' '}
              {triggerTitle(trigger).charAt(0).toLowerCase() + triggerTitle(trigger).slice(1)}
            </div>
          )}
        </div>
        <Button variant="outline" size="icon" aria-label="Zavřít panel" onClick={onClose} className="hidden lg:flex">
          <X />
        </Button>
      </div>

      {v.source_doc && (
        <section aria-label="Důkaz" className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm text-muted-foreground">
            <span>
              <b className="text-text">{v.source_doc.type}</b> · {v.source_doc.department} · {formatDate(v.source_doc.date)}
            </span>
            <button
              type="button"
              disabled
              title="Ukázka: odkaz do zprávy není v prototypu propojen."
              className="font-bold text-primary underline disabled:cursor-not-allowed disabled:opacity-60"
            >
              Otevřít na tomto místě
            </button>
          </div>
          <Quote v={v} />
          <div className="flex flex-wrap gap-2">
            {v.event_status && <span className={cn(chip, eventTone[v.event_status])}>{eventLabel[v.event_status]}</span>}
            <span className={cn(chip, weakSources ? 'bg-warn-bg text-warn-ink' : 'bg-ok-bg text-ok-ink')}>
              {weakSources ? '1 zdroj · jen zmínka ve zprávě' : `${sources.length} nezávislé zdroje · ${sources.join(' + ')}`}
            </span>
          </div>
        </section>
      )}

      {v.steps && v.steps.length > 0 && (
        <section aria-label="Kroky" className="flex flex-col gap-2.5 border-t pt-4">
          <div className="text-xs font-extrabold tracking-widest text-muted-foreground uppercase">Kroky</div>
          <Steps steps={v.steps} />
          <p className="text-xs text-muted-foreground">
            <b>Systém</b> = vyhledání v datech, opakovatelné. <b>AI</b> = výklad textu modelem. Čas u kroků Systém = kdy se data četla.
          </p>
        </section>
      )}

      <div className="border-t pt-4">{candidate.source !== 'collector' && <AiLog triggerId={triggerId} candidate={candidate} onCase={onCase} />}</div>
    </aside>
  )
}
