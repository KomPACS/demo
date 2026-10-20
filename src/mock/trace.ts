import type { components } from '@/api.ts'
import type { Report } from './types.ts'

type Verdict = components['schemas']['Verdict']
type VerdictStep = components['schemas']['VerdictStep']
type LlmCall = components['schemas']['LlmCall']
type LlmStep = components['schemas']['LlmStep']
type Patient = components['schemas']['Patient']
type Trigger = components['schemas']['Trigger']
type Candidate = Omit<components['schemas']['Candidate'], 'request_id' | 'request_state'>

const verdictText: Record<Verdict['label'], string> = {
  relevant: 'relevantní',
  not_relevant: 'nerelevantní',
  uncertain: 'nejisté',
}

export function verdict(v: {
  label: Verdict['label']
  reason: string
  query?: string
  source_sentence?: string
  guideline?: { page: number; quote: string }
  event_status?: Verdict['event_status']
  event_word?: string
  context_before?: string
  context_after?: string
  source_doc?: Verdict['source_doc']
  sources?: string[]
  steps?: VerdictStep[]
}): Verdict {
  const kroky: string[] = []
  if (v.query) kroky.push(`Dotaz: „${v.query}“`)
  if (v.source_sentence) kroky.push(`Nalezená věta ve zprávě: „${v.source_sentence}“`)
  if (v.guideline) kroky.push(`Modrá kniha ČOS, s. ${v.guideline.page}: „${v.guideline.quote}“`)
  kroky.push(`Hodnocení: ${verdictText[v.label]} – ${v.reason}`)
  return {
    label: v.label,
    reason: v.reason,
    source_sentence: v.source_sentence ?? null,
    guideline: v.guideline ?? null,
    kroky,
    event_status: v.event_status ?? null,
    event_word: v.event_word ?? null,
    context_before: v.context_before ?? null,
    context_after: v.context_after ?? null,
    source_doc: v.source_doc ?? null,
    sources: v.sources ?? [],
    steps: v.steps ?? [],
  }
}

export function lookupStep(label: string, text: string, at: string): VerdictStep {
  return { kind: 'lookup', label, text, at }
}

export function llmStep(label: string, text: string): VerdictStep {
  return { kind: 'llm', label, text }
}

function czechDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${Number(d)}. ${Number(m)}. ${y}`
}

export function emailDraft(opts: {
  sex: Patient['sex']
  name: string
  rc: string
  examDescription: string
  examDate: string | null
  triggerDate: string
}): string {
  const patientLabel = opts.sex === 'female' ? 'Pacientka' : 'Pacient'
  const dateSuffix = opts.examDate ? ` ze dne ${czechDate(opts.examDate)}` : ''
  return [
    'Dobrý den,',
    `žádáme o zaslání zprávy a snímků z vyšetření ${opts.examDescription}${dateSuffix}.`,
    `${patientLabel}: ${opts.name}, RČ ${opts.rc}.`,
    'Snímky prosím odešlete přes ePACS na FN v Motole, Radiologická klinika.',
    `Důvod: srovnání s plánovaným vyšetřením ${czechDate(opts.triggerDate)}.`,
    '',
    'Děkujeme,',
    'Demo účet, koordinátor/ka, Onkologická klinika FN v Motole, tel. +420 000 000 000',
  ].join('\n')
}

function judgeCall(patient: Patient, trigger: Trigger, candidates: Candidate[], reports: Report[]): LlmCall {
  const reportById = new Map(reports.map((r) => [r.id, r]))
  const input = {
    trigger_kind: trigger.kind,
    trigger_modality: trigger.modality,
    diagnoses: patient.diagnoses.map((d) => `${d.code} ${d.display}`),
    index_date: patient.index_date,
    candidates: candidates.map((c) => ({
      id: c.id,
      modality: c.modality,
      description: c.description,
      date: c.date,
      place: c.place,
      source: c.source,
      is_baseline: c.is_baseline,
      text: c.source === 'report_text' ? (reportById.get(c.report_id ?? '')?.text ?? null) : null,
    })),
  }
  const output = {
    verdicts: candidates.map((c) => ({
      candidate_id: c.id,
      label: c.verdict.label,
      reason: c.verdict.reason,
      source_sentence: c.verdict.source_sentence ?? null,
      guideline: c.verdict.guideline ?? null,
    })),
  }
  const steps: LlmStep[] = candidates.flatMap((c): LlmStep[] => {
    const tools: LlmStep[] = [
      { kind: 'tool', tool: 'search_reports', query: c.description, text: `Hledání zmínek o „${c.description}“ ve zprávách pacienta.` },
    ]
    if (c.verdict.guideline) {
      tools.push({
        kind: 'tool',
        tool: 'search_guideline',
        query: trigger.modality ?? c.modality,
        text: `Hledání doporučení v Modré knize ČOS, s. ${c.verdict.guideline.page}.`,
      })
    }
    tools.push({ kind: 'reasoning', text: c.verdict.reason })
    return tools
  })
  return {
    kind: 'judge',
    model: 'mock-judge',
    traced: true,
    input: JSON.stringify(input),
    output: JSON.stringify(output),
    steps,
  }
}

function mentionsCall(report: Report, candidates: Candidate[]): LlmCall {
  const input = { date: report.date, text: report.text }
  const output = {
    mentions: candidates.map((c) => ({
      description: c.description,
      modality: c.modality,
      date: c.date,
      place: c.place,
      source_sentence: c.verdict.source_sentence ?? null,
    })),
  }
  return {
    kind: 'mentions',
    model: 'mock-mentions',
    traced: true,
    input: JSON.stringify(input),
    output: JSON.stringify(output),
  }
}

export function llmTrace(patient: Patient, trigger: Trigger, candidates: Candidate[], reports: Report[]): LlmCall[] {
  const calls: LlmCall[] = [judgeCall(patient, trigger, candidates, reports)]
  const byReport = new Map<string, Candidate[]>()
  for (const c of candidates) {
    if (c.source !== 'report_text' || !c.report_id) continue
    const list = byReport.get(c.report_id) ?? []
    list.push(c)
    byReport.set(c.report_id, list)
  }
  for (const report of reports) {
    const mine = byReport.get(report.id)
    if (mine?.length) calls.push(mentionsCall(report, mine))
  }
  return calls
}
