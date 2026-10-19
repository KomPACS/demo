import type { components } from '@/api.ts'
import type { Scenario, ScenarioTrigger } from './types.ts'
import { llmTrace } from './trace.ts'

type Patient = components['schemas']['Patient']
type Candidate = components['schemas']['Candidate']
type TriggerSummary = components['schemas']['TriggerSummary']
type Case = components['schemas']['Case']
type RequestItem = components['schemas']['RequestItem']
type Contact = components['schemas']['Contact']
type TimelineEvent = components['schemas']['TimelineEvent']
type DatasetStats = components['schemas']['DatasetStats']
type VerdictVersion = components['schemas']['VerdictVersion']
type PacsCount = components['schemas']['PacsCount']
type StatusCounts = components['schemas']['StatusCounts']
type LlmCall = components['schemas']['LlmCall']

type RawCandidate = Omit<Candidate, 'request_id' | 'request_state'>
type RawRequest = Omit<RequestItem, 'contact'>

export class NotFound extends Error {}

export interface Store {
  patients(q?: string): Patient[]
  triggers(): TriggerSummary[]
  getCase(triggerId: string): Case
  timeline(patientId: string, type?: TimelineEvent['type'], q?: string): TimelineEvent[]
  queue(): RequestItem[]
  stats(): DatasetStats
  verdicts(triggerId: string, candidateId: string): VerdictVersion[]
  lookupContact(orgId: string): Contact | null
  llmTrace(triggerId: string): LlmCall[]
  reset(): void
}

function buildCandidate(triggerId: string, raw: RawCandidate, requests: RawRequest[]): Candidate {
  const req = requests.find((r) => r.trigger_id === triggerId && r.candidate_id === raw.id)
  return { ...raw, request_id: req?.id ?? null, request_state: req?.state ?? null }
}

function inPacs(c: Candidate): boolean {
  return c.status === 'available' || c.status === 'missing_report'
}

function isRelevant(c: Candidate): boolean {
  return c.decision === 'relevant' || (!c.decision && c.verdict.label === 'relevant')
}

function buildSummary(scenario: Scenario, st: ScenarioTrigger): TriggerSummary {
  const candidates = st.candidates.map((c) => buildCandidate(st.trigger.id, c, scenario.requests))
  const status_counts: StatusCounts = { available: 0, missing_report: 0, missing: 0, place_unknown: 0 }
  for (const c of candidates.filter(isRelevant)) status_counts[c.status]++
  const to_decide = candidates.filter((c) => c.verdict.label === 'uncertain' && !c.decision).length
  const open_requests = scenario.requests.filter(
    (r) => r.trigger_id === st.trigger.id && r.state !== 'received' && r.state !== 'not_found',
  ).length
  return {
    trigger: st.trigger,
    patient: scenario.patient,
    status_counts,
    to_decide,
    open_requests,
    duplicate: st.duplicate_alert !== null,
  }
}

function triggerTimelineEvent(st: ScenarioTrigger): TimelineEvent {
  const { trigger } = st
  const title = trigger.kind === 'mdt' ? 'MDT' : `Plánované vyšetření${trigger.modality ? ` ${trigger.modality}` : ''}`
  return {
    id: `evt-trigger-${trigger.id}`,
    date: `${trigger.date}T00:00:00.000Z`,
    type: 'trigger',
    title,
    detail: null,
    resource: `ServiceRequest/${trigger.id}`,
    simulated: trigger.simulated,
  }
}

export function createStore(scenarios: Scenario[]): Store {
  const initial = structuredClone(scenarios)
  let state: Scenario[] = structuredClone(initial)

  function allContacts(): Record<string, Contact> {
    const merged: Record<string, Contact> = {}
    for (const scenario of state) Object.assign(merged, scenario.contacts)
    return merged
  }

  function findScenarioTrigger(triggerId: string): { scenario: Scenario; st: ScenarioTrigger } {
    for (const scenario of state) {
      const st = scenario.triggers.find((t) => t.trigger.id === triggerId)
      if (st) return { scenario, st }
    }
    throw new NotFound(`trigger not found: ${triggerId}`)
  }

  return {
    patients(q?: string): Patient[] {
      const list = state.map((s) => s.patient)
      if (!q) return list
      const needle = q.toLowerCase()
      return list.filter(
        (p) =>
          p.id.toLowerCase().includes(needle) ||
          (p.name?.toLowerCase().includes(needle) ?? false) ||
          (p.rc?.toLowerCase().includes(needle) ?? false),
      )
    },

    triggers(): TriggerSummary[] {
      const result: TriggerSummary[] = []
      for (const scenario of state) for (const st of scenario.triggers) result.push(buildSummary(scenario, st))
      return result
    },

    getCase(triggerId: string): Case {
      const { scenario, st } = findScenarioTrigger(triggerId)
      return {
        trigger: st.trigger,
        patient: scenario.patient,
        candidates: st.candidates.map((c) => buildCandidate(st.trigger.id, c, scenario.requests)),
        duplicate_alert: st.duplicate_alert,
        insurer_request: st.insurer_request,
      }
    },

    timeline(patientId: string, type?: TimelineEvent['type'], q?: string): TimelineEvent[] {
      const scenario = state.find((s) => s.patient.id === patientId)
      if (!scenario) throw new NotFound(`patient not found: ${patientId}`)
      let events = [...scenario.timeline, ...scenario.triggers.map(triggerTimelineEvent)].sort(
        (a, b) => Date.parse(a.date) - Date.parse(b.date),
      )
      if (type) events = events.filter((e) => e.type === type)
      if (q) {
        const needle = q.toLowerCase()
        events = events.filter(
          (e) => e.title.toLowerCase().includes(needle) || (e.detail?.toLowerCase().includes(needle) ?? false),
        )
      }
      return events
    },

    queue(): RequestItem[] {
      const contacts = allContacts()
      const items: RequestItem[] = []
      for (const scenario of state) {
        for (const r of scenario.requests) {
          items.push({ ...r, contact: r.organization_id ? (contacts[r.organization_id] ?? null) : null })
        }
      }
      return items
    },

    stats(): DatasetStats {
      const all: Candidate[] = []
      for (const scenario of state) {
        for (const st of scenario.triggers) all.push(...st.candidates.map((c) => buildCandidate(st.trigger.id, c, scenario.requests)))
      }
      const byKey = (keyOf: (c: Candidate) => string): PacsCount[] => {
        const map = new Map<string, PacsCount>()
        for (const c of all) {
          const key = keyOf(c)
          const row = map.get(key) ?? { key, in_pacs: 0, not_in_pacs: 0 }
          if (inPacs(c)) row.in_pacs++
          else row.not_in_pacs++
          map.set(key, row)
        }
        return [...map.values()]
      }
      return {
        patients: state.length,
        studies: all.length,
        in_pacs: all.filter(inPacs).length,
        by_modality: byKey((c) => c.modality),
        by_year: byKey((c) => (c.date ? c.date.slice(0, 4) : 'neznámý')),
      }
    },

    verdicts(triggerId: string, candidateId: string): VerdictVersion[] {
      const { st } = findScenarioTrigger(triggerId)
      const raw = st.candidates.find((c) => c.id === candidateId)
      if (!raw) throw new NotFound(`candidate not found: ${candidateId}`)
      return st.verdicts?.[candidateId] ?? [{ n: 0, verdict: raw.verdict, active: true }]
    },

    lookupContact(orgId: string): Contact | null {
      return allContacts()[orgId] ?? null
    },

    llmTrace(triggerId: string): LlmCall[] {
      const { scenario, st } = findScenarioTrigger(triggerId)
      return llmTrace(scenario.patient, st.trigger, st.candidates, scenario.reports)
    },

    reset(): void {
      state = structuredClone(initial)
    },
  }
}
