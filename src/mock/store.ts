import type { components } from '@/api.ts'
import type { Scenario, ScenarioTrigger } from './types.ts'
import { llmTrace, verdict } from './trace.ts'

type Patient = components['schemas']['Patient']
type Candidate = components['schemas']['Candidate']
type TriggerSummary = components['schemas']['TriggerSummary']
type Case = components['schemas']['Case']
type RequestItem = components['schemas']['RequestItem']
type Contact = components['schemas']['Contact']
type TimelineEvent = components['schemas']['TimelineEvent']
type DatasetStats = components['schemas']['DatasetStats']
type VerdictVersion = components['schemas']['VerdictVersion']
type Verdict = components['schemas']['Verdict']
type PacsCount = components['schemas']['PacsCount']
type StatusCounts = components['schemas']['StatusCounts']
type LlmCall = components['schemas']['LlmCall']
type CandidateCreate = components['schemas']['CandidateCreate']
type DecisionUpdate = components['schemas']['DecisionUpdate']
type TriggerCreate = components['schemas']['TriggerCreate']
type ContactUpdate = components['schemas']['ContactUpdate']
type PacsFeedResult = components['schemas']['PacsFeedResult']

type RawCandidate = Omit<Candidate, 'request_id' | 'request_state'>
type RawRequest = Omit<RequestItem, 'contact'>

export class NotFound extends Error {}
export class Conflict extends Error {}

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
  createTrigger(body: TriggerCreate): TriggerSummary
  addCandidate(triggerId: string, body: CandidateCreate): Case
  decide(triggerId: string, candidateId: string, body: DecisionUpdate): Case
  rejudge(triggerId: string, candidateId: string, note: string | null): Case
  restore(triggerId: string, candidateId: string, n: number): Case
  approve(id: string): RequestItem
  requested(id: string): RequestItem
  notFound(id: string): RequestItem
  saveContact(orgId: string, body: ContactUpdate): Contact
  deliver(id: string): RequestItem
  pacsArrival(studyId: string): PacsFeedResult
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

function toCase(scenario: Scenario, st: ScenarioTrigger): Case {
  return {
    trigger: st.trigger,
    patient: scenario.patient,
    candidates: st.candidates.map((c) => buildCandidate(st.trigger.id, c, scenario.requests)),
    duplicate_alert: st.duplicate_alert,
    insurer_request: st.insurer_request,
  }
}

function channelFor(contact: Contact | undefined): RequestItem['channel'] {
  if (contact?.fhir_endpoint) return 'fhir'
  if (contact?.email) return 'email'
  return 'phone'
}

function makeDraftRequest(scenario: Scenario, st: ScenarioTrigger, raw: RawCandidate, contacts: Record<string, Contact>): RawRequest {
  const contact = raw.organization_id ? contacts[raw.organization_id] : undefined
  const channel = channelFor(contact)
  return {
    id: `req-${raw.id}`,
    trigger_id: st.trigger.id,
    trigger_date: st.trigger.date,
    patient_id: scenario.patient.id,
    candidate_id: raw.id,
    prior_modality: raw.modality,
    prior_date: raw.date,
    prior_description: raw.description,
    place: raw.place,
    organization_id: raw.organization_id,
    channel,
    state: 'draft',
    email_draft: channel === 'email' ? `Dobrý den, žádáme o zaslání zprávy z vyšetření ${raw.description}.` : null,
    created_at: new Date().toISOString(),
    sent_at: null,
    study_id: null,
    fhir_task: null,
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
  let candidateSeq = 0
  let liveSeq = 0

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

  function findCandidate(triggerId: string, candidateId: string): { scenario: Scenario; st: ScenarioTrigger; raw: RawCandidate } {
    const { scenario, st } = findScenarioTrigger(triggerId)
    const raw = st.candidates.find((c) => c.id === candidateId)
    if (!raw) throw new NotFound(`candidate not found: ${candidateId}`)
    return { scenario, st, raw }
  }

  function findRequest(id: string): { scenario: Scenario; req: RawRequest } {
    for (const scenario of state) {
      const req = scenario.requests.find((r) => r.id === id)
      if (req) return { scenario, req }
    }
    throw new NotFound(`request not found: ${id}`)
  }

  function attachContact(req: RawRequest): RequestItem {
    return { ...req, contact: req.organization_id ? (allContacts()[req.organization_id] ?? null) : null }
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

    createTrigger(body: TriggerCreate): TriggerSummary {
      const scenario = state.find((s) => s.patient.id === body.patient_id)
      if (!scenario) throw new NotFound(`patient not found: ${body.patient_id}`)

      if (scenario.live) {
        const liveId = scenario.live.trigger.id
        const existing = scenario.triggers.find((t) => t.trigger.id === liveId)
        if (existing) return buildSummary(scenario, existing)
        const st: ScenarioTrigger = structuredClone(scenario.live)
        st.trigger = { ...st.trigger, kind: body.kind, modality: body.modality ?? null, date: body.date, simulated: true }
        scenario.triggers.push(st)
        return buildSummary(scenario, st)
      }

      const latest = [...scenario.triggers].sort((a, b) => Date.parse(b.trigger.date) - Date.parse(a.trigger.date))[0]
      const newId = `live-${++liveSeq}`
      const candidates: RawCandidate[] = (latest?.candidates ?? []).map((c, i) => ({
        ...structuredClone(c),
        id: `${newId}-c${i + 1}`,
        decision: null,
        decision_reason: null,
      }))
      const st: ScenarioTrigger = {
        trigger: { id: newId, patient_id: body.patient_id, kind: body.kind, modality: body.modality ?? null, date: body.date, simulated: true },
        candidates,
        duplicate_alert: null,
        insurer_request: null,
      }
      scenario.triggers.push(st)
      return buildSummary(scenario, st)
    },

    addCandidate(triggerId: string, body: CandidateCreate): Case {
      const { scenario, st } = findScenarioTrigger(triggerId)
      const id = `${triggerId}-new-${++candidateSeq}`
      const status: Candidate['status'] = body.place || body.organization_id ? 'missing' : 'place_unknown'
      const raw: RawCandidate = {
        id,
        source: 'collector',
        modality: body.modality,
        date: body.date ?? null,
        description: body.description,
        place: body.place ?? null,
        organization_id: body.organization_id ?? null,
        study_id: null,
        report_id: null,
        status,
        is_baseline: false,
        verdict: verdict({ label: 'relevant', reason: 'Přidal/a koordinátor/ka.' }),
        decision: 'relevant',
        decision_reason: null,
      }
      st.candidates.push(raw)
      scenario.requests.push(makeDraftRequest(scenario, st, raw, allContacts()))
      return toCase(scenario, st)
    },

    decide(triggerId: string, candidateId: string, body: DecisionUpdate): Case {
      const { scenario, st, raw } = findCandidate(triggerId, candidateId)
      raw.decision = body.decision
      raw.decision_reason = body.reason ?? null
      const existingReq = scenario.requests.find((r) => r.trigger_id === triggerId && r.candidate_id === candidateId)
      if (body.decision === 'relevant') {
        if (raw.status !== 'available' && !existingReq) {
          scenario.requests.push(makeDraftRequest(scenario, st, raw, allContacts()))
        }
      } else if (existingReq?.state === 'draft') {
        scenario.requests = scenario.requests.filter((r) => r.id !== existingReq.id)
      }
      return toCase(scenario, st)
    },

    rejudge(triggerId: string, candidateId: string, note: string | null): Case {
      const { scenario, st, raw } = findCandidate(triggerId, candidateId)
      const verdicts = st.verdicts ?? (st.verdicts = {})
      const history = verdicts[candidateId] ?? [{ n: 0, verdict: raw.verdict, active: true }]
      const prepared = history.length > 1 ? history[history.length - 1] : undefined
      const nextVerdict: Verdict =
        prepared && !prepared.active
          ? prepared.verdict
          : verdict({ label: raw.verdict.label, reason: note ? `Přehodnoceno: ${note}` : 'Přehodnoceno bez poznámky.' })
      const nextN = Math.max(...history.map((v) => v.n)) + 1
      for (const v of history) v.active = false
      const traced: RawCandidate = { ...raw, verdict: nextVerdict }
      const trace = llmTrace(scenario.patient, st.trigger, [traced], scenario.reports)[0] ?? null
      const entry: VerdictVersion = { n: nextN, verdict: nextVerdict, note: note ?? null, created: new Date().toISOString(), active: true, trace }
      verdicts[candidateId] = [...history, entry]
      raw.verdict = nextVerdict
      return toCase(scenario, st)
    },

    restore(triggerId: string, candidateId: string, n: number): Case {
      const { scenario, st, raw } = findCandidate(triggerId, candidateId)
      const verdicts = st.verdicts ?? (st.verdicts = {})
      const history = verdicts[candidateId] ?? [{ n: 0, verdict: raw.verdict, active: true }]
      const target = history.find((v) => v.n === n)
      if (!target) throw new NotFound(`verdict version not found: ${n}`)
      const nextN = Math.max(...history.map((v) => v.n)) + 1
      for (const v of history) v.active = false
      const entry: VerdictVersion = { n: nextN, verdict: target.verdict, restored_from: n, created: new Date().toISOString(), active: true }
      verdicts[candidateId] = [...history, entry]
      raw.verdict = target.verdict
      return toCase(scenario, st)
    },

    approve(id: string): RequestItem {
      const { req } = findRequest(id)
      if (req.state !== 'draft') throw new Conflict(`cannot approve request in state ${req.state}`)
      req.state = 'sent'
      req.sent_at = new Date().toISOString()
      return attachContact(req)
    },

    requested(id: string): RequestItem {
      const { req } = findRequest(id)
      if (req.state !== 'draft' && req.state !== 'not_delivered') throw new Conflict(`cannot request from state ${req.state}`)
      req.state = 'requested'
      return attachContact(req)
    },

    notFound(id: string): RequestItem {
      const { req } = findRequest(id)
      req.state = 'not_found'
      return attachContact(req)
    },

    saveContact(orgId: string, body: ContactUpdate): Contact {
      const now = new Date().toISOString()
      for (const scenario of state) {
        const existing = scenario.contacts[orgId]
        if (existing) {
          const updated: Contact = {
            ...existing,
            email: body.email !== undefined ? body.email : existing.email,
            phone: body.phone !== undefined ? body.phone : existing.phone,
            verified_at: now,
            needs_reverify: false,
          }
          scenario.contacts[orgId] = updated
          return updated
        }
      }
      let name: string | null = null
      let owner = state[0]
      for (const scenario of state) {
        const req = scenario.requests.find((r) => r.organization_id === orgId)
        if (req) {
          name = req.place
          owner = scenario
          break
        }
      }
      if (!owner) throw new NotFound(`no scenario to attach contact ${orgId}`)
      const created: Contact = {
        organization_id: orgId,
        organization_name: name ?? orgId,
        email: body.email ?? null,
        phone: body.phone ?? null,
        source_url: null,
        verified_at: now,
        needs_reverify: false,
        fhir_endpoint: null,
      }
      owner.contacts[orgId] = created
      return created
    },

    deliver(id: string): RequestItem {
      const { scenario, req } = findRequest(id)
      req.state = 'received'
      const { st } = findScenarioTrigger(req.trigger_id)
      const raw = st.candidates.find((c) => c.id === req.candidate_id)
      const studyId = req.study_id ?? raw?.study_id ?? `STU-${req.candidate_id}`
      if (raw) {
        raw.status = 'available'
        raw.pacs_source = 'PACS-FEED-SIMULACE'
        if (!raw.study_id) raw.study_id = studyId
      }
      scenario.timeline.push({
        id: `evt-deliver-${req.id}`,
        date: new Date().toISOString(),
        type: 'imaging',
        title: `Doručeno: ${req.prior_description}`,
        detail: null,
        resource: `ImagingStudy/${studyId}`,
        simulated: true,
      })
      return attachContact(req)
    },

    pacsArrival(studyId: string): PacsFeedResult {
      let patched = 0
      for (const scenario of state) {
        for (const event of scenario.timeline) {
          if (event.resource === `ImagingStudy/${studyId}` && event.detail === 'bez snímků v PACS') {
            event.detail = 'Staženo z PACS feedu.'
          }
        }
        for (const st of scenario.triggers) {
          for (const c of st.candidates) {
            if (c.study_id === studyId) {
              c.status = 'available'
              const req = scenario.requests.find((r) => r.candidate_id === c.id)
              if (req) req.state = 'received'
              patched = 1
            }
          }
        }
      }
      return { rows: 1, patched, unchanged: 0, unmatched: patched ? 0 : 1 }
    },

    reset(): void {
      state = structuredClone(initial)
    },
  }
}
