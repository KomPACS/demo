import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createStore, NotFound, type Store } from '../src/mock/store.ts'
import { birthNumber } from '../src/mock/rc.ts'
import type { components } from '@/api.ts'

type Patient = components['schemas']['Patient']
type Candidate = components['schemas']['Candidate']
type Trigger = components['schemas']['Trigger']
type TriggerSummary = components['schemas']['TriggerSummary']
type Case = components['schemas']['Case']
type RequestItem = components['schemas']['RequestItem']
type Contact = components['schemas']['Contact']
type TimelineEvent = components['schemas']['TimelineEvent']
type DatasetStats = components['schemas']['DatasetStats']
type VerdictVersion = components['schemas']['VerdictVersion']

function buildFixtures() {
  const rcA = birthNumber('1958-09-12', 'female', 7)
  const rcB = birthNumber('1970-02-20', 'male', 3)
  const rcC = birthNumber('1975-11-05', 'male', 9)

  const patientA: Patient = {
    id: 'pac-store-1',
    sex: 'female',
    birth_year: 1958,
    diagnoses: [{ code: 'C34', display: 'Zhoubný novotvar průdušky a plíce' }],
    index_date: '2026-08-01',
    name: 'Jana Nováková',
    rc: rcA,
  }
  const patientB: Patient = {
    id: 'pac-store-2',
    sex: 'male',
    birth_year: 1970,
    diagnoses: [{ code: 'C61', display: 'Zhoubný novotvar prostaty' }],
    index_date: '2026-07-15',
    name: 'Petr Svoboda',
    rc: rcB,
  }
  const patientC: Patient = {
    id: 'pac-store-3',
    sex: 'male',
    birth_year: 1975,
    diagnoses: [{ code: 'C18', display: 'Zhoubný novotvar tlustého střeva' }],
    index_date: '2026-09-10',
    name: 'Karel Dvořák',
    rc: rcC,
  }

  const triggerA: Trigger = {
    id: 'trig-store-1',
    patient_id: 'pac-store-1',
    kind: 'exam',
    modality: 'CT',
    date: '2026-10-25',
    simulated: false,
  }
  const triggerB: Trigger = {
    id: 'trig-store-2',
    patient_id: 'pac-store-2',
    kind: 'exam',
    modality: 'MR',
    date: '2026-10-22',
    simulated: false,
  }
  const triggerLive: Trigger = {
    id: 'trig-live-1',
    patient_id: 'pac-store-3',
    kind: 'exam',
    modality: 'CT',
    date: '2026-10-21',
    simulated: true,
  }

  const aC1: Omit<Candidate, 'request_id' | 'request_state'> = {
    id: 'a-c1',
    source: 'nis_record',
    modality: 'CT',
    date: '2024-05-10',
    description: 'CT břicha a pánve',
    place: 'Nemocnice Test',
    organization_id: 'org-1',
    study_id: 'STU-A-1',
    report_id: null,
    status: 'available',
    is_baseline: true,
    verdict: { label: 'relevant', reason: 'Shoda s diagnózou C34, do 1 roku od indexu.', kroky: [] },
    decision: null,
    decision_reason: null,
    pacs_source: 'PACS-FEED-2026',
  }
  const aC2: Omit<Candidate, 'request_id' | 'request_state'> = {
    id: 'a-c2',
    source: 'report_text',
    modality: 'CT',
    date: '2024-05-11',
    description: 'CT hrudníku',
    place: 'Nemocnice Test',
    organization_id: 'org-1',
    study_id: null,
    report_id: 'rep-a-1',
    status: 'missing_report',
    is_baseline: false,
    verdict: { label: 'not_relevant', reason: 'Mimo sledovanou oblast.', kroky: [] },
    decision: 'relevant',
    decision_reason: 'Koordinátor/ka potvrdila relevanci.',
  }
  const aC3: Omit<Candidate, 'request_id' | 'request_state'> = {
    id: 'a-c3',
    source: 'nis_record',
    modality: 'MR',
    date: '2023-01-15',
    description: 'MR mozku',
    place: 'Nemocnice Test',
    organization_id: 'org-2',
    study_id: null,
    report_id: null,
    status: 'missing',
    is_baseline: false,
    verdict: { label: 'uncertain', reason: 'Nejasná souvislost s diagnózou.', kroky: [] },
    decision: null,
    decision_reason: null,
  }
  const aC4: Omit<Candidate, 'request_id' | 'request_state'> = {
    id: 'a-c4',
    source: 'nis_record',
    modality: 'MR',
    date: '2021-07-01',
    description: 'MR páteře',
    place: null,
    organization_id: null,
    study_id: null,
    report_id: null,
    status: 'available',
    is_baseline: false,
    verdict: { label: 'relevant', reason: 'Shoda s diagnózou.', kroky: [] },
    decision: 'not_relevant',
    decision_reason: 'Jiná anatomická oblast.',
  }
  const aC5: Omit<Candidate, 'request_id' | 'request_state'> = {
    id: 'a-c5',
    source: 'insurer',
    modality: 'PT',
    date: null,
    description: 'PET/CT (bez data)',
    place: null,
    organization_id: null,
    study_id: null,
    report_id: null,
    status: 'place_unknown',
    is_baseline: false,
    verdict: { label: 'relevant', reason: 'Shoda s diagnózou, pracoviště neznámé.', kroky: [] },
    decision: 'removed',
    decision_reason: 'Duplicitní záznam.',
  }

  const bC1: Omit<Candidate, 'request_id' | 'request_state'> = {
    id: 'b-c1',
    source: 'nis_record',
    modality: 'CT',
    date: '2022-03-01',
    description: 'CT vyšetření',
    place: 'Nemocnice B',
    organization_id: null,
    study_id: null,
    report_id: null,
    status: 'available',
    is_baseline: true,
    verdict: { label: 'relevant', reason: 'Shoda s diagnózou.', kroky: [] },
    decision: null,
    decision_reason: null,
  }
  const bC2: Omit<Candidate, 'request_id' | 'request_state'> = {
    id: 'b-c2',
    source: 'nis_record',
    modality: 'MR',
    date: null,
    description: 'MR vyšetření (bez data)',
    place: null,
    organization_id: null,
    study_id: null,
    report_id: null,
    status: 'missing',
    is_baseline: false,
    verdict: { label: 'not_relevant', reason: 'Mimo sledovanou oblast.', kroky: [] },
    decision: null,
    decision_reason: null,
  }

  const lC1: Omit<Candidate, 'request_id' | 'request_state'> = {
    id: 'l-c1',
    source: 'nis_record',
    modality: 'CT',
    date: '2025-01-01',
    description: 'CT (živá kontrola)',
    place: 'Nemocnice C',
    organization_id: null,
    study_id: null,
    report_id: null,
    status: 'available',
    is_baseline: true,
    verdict: { label: 'relevant', reason: 'Shoda s diagnózou.', kroky: [] },
    decision: null,
    decision_reason: null,
  }

  const contactOrg1: Contact = {
    organization_id: 'org-1',
    organization_name: 'Nemocnice Test',
    email: 'test@example.com',
    phone: null,
    source_url: null,
    verified_at: '2026-01-05T09:00:00.000Z',
    needs_reverify: false,
    fhir_endpoint: null,
  }

  const r1: Omit<RequestItem, 'contact'> = {
    id: 'req-a-1',
    trigger_id: 'trig-store-1',
    trigger_date: '2026-10-25',
    patient_id: 'pac-store-1',
    candidate_id: 'a-c2',
    prior_modality: 'CT',
    prior_date: '2024-05-11',
    prior_description: 'CT hrudníku',
    place: 'Nemocnice Test',
    organization_id: 'org-1',
    channel: 'email',
    state: 'not_delivered',
    email_draft: 'Dobrý den, žádáme o zaslání zprávy z vyšetření CT hrudníku ze dne 11. 5. 2024.',
    created_at: '2026-10-18T09:00:00.000Z',
    sent_at: '2026-10-18T09:05:00.000Z',
    study_id: null,
    fhir_task: null,
  }
  const r2: Omit<RequestItem, 'contact'> = {
    id: 'req-a-2',
    trigger_id: 'trig-store-1',
    trigger_date: '2026-10-25',
    patient_id: 'pac-store-1',
    candidate_id: 'a-c3',
    prior_modality: 'MR',
    prior_date: '2023-01-15',
    prior_description: 'MR mozku',
    place: 'Nemocnice Test',
    organization_id: 'org-2',
    channel: 'phone',
    state: 'received',
    email_draft: null,
    created_at: '2026-10-17T09:00:00.000Z',
    sent_at: '2026-10-17T09:10:00.000Z',
    study_id: null,
    fhir_task: null,
  }
  const r3: Omit<RequestItem, 'contact'> = {
    id: 'req-a-3',
    trigger_id: 'trig-store-1',
    trigger_date: '2026-10-25',
    patient_id: 'pac-store-1',
    candidate_id: 'a-c5',
    prior_modality: 'PT',
    prior_date: null,
    prior_description: 'PET/CT (bez data)',
    place: null,
    organization_id: null,
    channel: 'phone',
    state: 'not_found',
    email_draft: null,
    created_at: '2026-10-16T09:00:00.000Z',
    sent_at: null,
    study_id: null,
    fhir_task: null,
  }

  const e1: TimelineEvent = {
    id: 'evt-a-1',
    date: '2024-05-11T08:00:00.000Z',
    type: 'report',
    title: 'Zpráva z CT hrudníku',
    detail: 'Nález beze změn.',
    resource: 'DiagnosticReport/rep-a-1',
    simulated: false,
  }
  const e2: TimelineEvent = {
    id: 'evt-a-2',
    date: '2023-01-20T10:00:00.000Z',
    type: 'lab',
    title: 'Krevní obraz',
    detail: null,
    resource: 'Observation/lab-a-1',
    simulated: false,
  }

  const report1 = {
    id: 'rep-a-1',
    date: '2024-05-11',
    title: 'Zpráva z CT hrudníku',
    text: 'Syntetický text nálezu, bez reálných dat pacienta.',
  }

  const scenarioA = {
    patient: patientA,
    insurer: '111' as const,
    triggers: [{ trigger: triggerA, candidates: [aC1, aC2, aC3, aC4, aC5], duplicate_alert: null, insurer_request: null }],
    requests: [r1, r2, r3],
    timeline: [e1, e2],
    contacts: { 'org-1': contactOrg1 },
    reports: [report1],
  }

  const scenarioB = {
    patient: patientB,
    insurer: '207' as const,
    triggers: [
      {
        trigger: triggerB,
        candidates: [bC1, bC2],
        duplicate_alert: { candidate_id: 'b-c2', modality: 'MR', date: '2026-09-20', days_apart: 32 },
        insurer_request: { task_id: 'task-ins-1', recipient: 'VZP ČR (111)', since: patientB.index_date, task: {} },
      },
    ],
    requests: [],
    timeline: [],
    contacts: {},
    reports: [],
  }

  const scenarioLive = {
    patient: patientC,
    insurer: '213' as const,
    triggers: [],
    requests: [],
    timeline: [],
    contacts: {},
    reports: [],
    live: { trigger: triggerLive, candidates: [lC1], duplicate_alert: null, insurer_request: null },
  }

  return {
    scenarioA,
    scenarioB,
    scenarioLive,
    patientAId: patientA.id,
    patientBId: patientB.id,
    patientCId: patientC.id,
    triggerAId: triggerA.id,
    triggerBId: triggerB.id,
    triggerLiveId: triggerLive.id,
    contactOrg1,
  }
}

function makeStore() {
  const fx = buildFixtures()
  const store: Store = createStore([fx.scenarioA, fx.scenarioB, fx.scenarioLive])
  return { store, fx }
}

test('patients(): lists every patient, including one with only a live trigger', () => {
  const { store, fx } = makeStore()
  const patients = store.patients()
  assert.equal(patients.length, 3)
  assert.ok(patients.some((p) => p.id === fx.patientCId))
})

test('patients(q): matches name, case-insensitively', () => {
  const { store } = makeStore()
  const byName = store.patients('nová')
  assert.equal(byName.length, 1)
  assert.equal(byName[0]?.id, 'pac-store-1')

  const byNameUpper = store.patients('JANA')
  assert.equal(byNameUpper.length, 1)
  assert.equal(byNameUpper[0]?.id, 'pac-store-1')
})

test('patients(q): matches id substring', () => {
  const { store } = makeStore()
  const byId = store.patients('store-2')
  assert.equal(byId.length, 1)
  assert.equal(byId[0]?.id, 'pac-store-2')
})

test('patients(q): matches rc substring', () => {
  const { store, fx } = makeStore()
  const patientA = store.patients().find((p) => p.id === fx.patientAId)
  const rc = patientA?.rc
  assert.ok(rc)
  const bySuffix = store.patients(rc.slice(0, 6))
  assert.equal(bySuffix.length, 1)
  assert.equal(bySuffix[0]?.id, 'pac-store-1')
})

test('triggers(): excludes the live-only patient trigger', () => {
  const { store } = makeStore()
  const summaries: TriggerSummary[] = store.triggers()
  assert.equal(summaries.length, 2)
  assert.ok(!summaries.some((s) => s.trigger.patient_id === 'pac-store-3'))
})

test('triggers(): status_counts over the relevant set, to_decide, open_requests, duplicate for trigger A', () => {
  const { store } = makeStore()
  const summaries = store.triggers()
  const summaryA = summaries.find((s) => s.trigger.id === 'trig-store-1')
  assert.ok(summaryA)
  assert.deepEqual(summaryA.status_counts, { available: 1, missing_report: 1, missing: 0, place_unknown: 0 })
  assert.equal(summaryA.to_decide, 1)
  assert.equal(summaryA.open_requests, 1)
  assert.equal(summaryA.duplicate, false)
})

test('triggers(): duplicate is true when duplicate_alert is set (trigger B)', () => {
  const { store } = makeStore()
  const summaries = store.triggers()
  const summaryB = summaries.find((s) => s.trigger.id === 'trig-store-2')
  assert.ok(summaryB)
  assert.deepEqual(summaryB.status_counts, { available: 1, missing_report: 0, missing: 0, place_unknown: 0 })
  assert.equal(summaryB.to_decide, 0)
  assert.equal(summaryB.open_requests, 0)
  assert.equal(summaryB.duplicate, true)
})

test('getCase(): request_id/request_state are derived from requests; unlinked candidates stay null', () => {
  const { store } = makeStore()
  const kase: Case = store.getCase('trig-store-1')
  assert.equal(kase.candidates.length, 5)

  const c2 = kase.candidates.find((c) => c.id === 'a-c2')
  assert.equal(c2?.request_id, 'req-a-1')
  assert.equal(c2?.request_state, 'not_delivered')

  const c1 = kase.candidates.find((c) => c.id === 'a-c1')
  assert.equal(c1?.request_id, null)
  assert.equal(c1?.request_state, null)
})

test('getCase(): threads duplicate_alert and insurer_request from the scenario trigger', () => {
  const { store } = makeStore()
  const kaseA = store.getCase('trig-store-1')
  assert.equal(kaseA.duplicate_alert, null)

  const kaseB = store.getCase('trig-store-2')
  assert.equal(kaseB.duplicate_alert?.candidate_id, 'b-c2')
  assert.equal(kaseB.insurer_request?.recipient, 'VZP ČR (111)')
})

test('getCase(): unknown trigger id throws NotFound', () => {
  const { store } = makeStore()
  assert.throws(() => store.getCase('does-not-exist'), NotFound)
})

test('getCase(): the live-only trigger is not readable before it is created (T6)', () => {
  const { store, fx } = makeStore()
  assert.throws(() => store.getCase(fx.triggerLiveId), NotFound)
})

test('queue(): contact is derived from the contacts map, null when the org is unregistered', () => {
  const { store, fx } = makeStore()
  const items: RequestItem[] = store.queue()
  assert.equal(items.length, 3)

  const qr1 = items.find((r) => r.id === 'req-a-1')
  assert.deepEqual(qr1?.contact, fx.contactOrg1)

  const qr2 = items.find((r) => r.id === 'req-a-2')
  assert.equal(qr2?.contact, null)
})

test('lookupContact(): known org returns the contact, unknown org returns null', () => {
  const { store, fx } = makeStore()
  assert.deepEqual(store.lookupContact('org-1'), fx.contactOrg1)
  assert.equal(store.lookupContact('org-9-unknown'), null)
})

test('timeline(): scenario events plus one trigger event, date-sorted', () => {
  const { store } = makeStore()
  const events = store.timeline('pac-store-1')
  assert.equal(events.length, 3)
  for (let i = 1; i < events.length; i++) {
    assert.ok(Date.parse(events[i]!.date) >= Date.parse(events[i - 1]!.date))
  }
  assert.ok(events.some((e) => e.type === 'trigger' && e.date.startsWith('2026-10-25')))
})

test('timeline(): type filters to a single event type', () => {
  const { store } = makeStore()
  const reports = store.timeline('pac-store-1', 'report')
  assert.equal(reports.length, 1)
  assert.equal(reports[0]?.id, 'evt-a-1')
})

test('timeline(): q matches title/detail, case-insensitively', () => {
  const { store } = makeStore()
  const matches = store.timeline('pac-store-1', undefined, 'krevní')
  assert.equal(matches.length, 1)
  assert.equal(matches[0]?.id, 'evt-a-2')
})

test('verdicts(): with no stored history returns one version, n 0, active', () => {
  const { store } = makeStore()
  const kase = store.getCase('trig-store-1')
  const c1 = kase.candidates.find((c) => c.id === 'a-c1')
  assert.ok(c1)

  const versions: VerdictVersion[] = store.verdicts('trig-store-1', 'a-c1')
  assert.equal(versions.length, 1)
  assert.equal(versions[0]?.n, 0)
  assert.equal(versions[0]?.active, true)
  assert.deepEqual(versions[0]?.verdict, c1.verdict)
})

test('verdicts(): unknown candidate id throws NotFound', () => {
  const { store } = makeStore()
  assert.throws(() => store.verdicts('trig-store-1', 'does-not-exist'), NotFound)
})

test('stats(): patients, studies and in_pacs counts', () => {
  const { store } = makeStore()
  const stats: DatasetStats = store.stats()
  assert.equal(stats.patients, 3)
  assert.equal(stats.studies, 7)
  assert.equal(stats.in_pacs, 4)
})

test('stats(): by_modality groups candidates across triggers', () => {
  const { store } = makeStore()
  const stats = store.stats()
  const byModality = Object.fromEntries(stats.by_modality.map((row) => [row.key, row]))
  assert.deepEqual(byModality['CT'], { key: 'CT', in_pacs: 3, not_in_pacs: 0 })
  assert.deepEqual(byModality['MR'], { key: 'MR', in_pacs: 1, not_in_pacs: 2 })
  assert.deepEqual(byModality['PT'], { key: 'PT', in_pacs: 0, not_in_pacs: 1 })
})

test('stats(): by_year groups undated candidates under neznámý', () => {
  const { store } = makeStore()
  const stats = store.stats()
  const byYear = Object.fromEntries(stats.by_year.map((row) => [row.key, row]))
  assert.deepEqual(byYear['2024'], { key: '2024', in_pacs: 2, not_in_pacs: 0 })
  assert.deepEqual(byYear['2023'], { key: '2023', in_pacs: 0, not_in_pacs: 1 })
  assert.deepEqual(byYear['2021'], { key: '2021', in_pacs: 1, not_in_pacs: 0 })
  assert.deepEqual(byYear['2022'], { key: '2022', in_pacs: 1, not_in_pacs: 0 })
  assert.deepEqual(byYear['neznámý'], { key: 'neznámý', in_pacs: 0, not_in_pacs: 2 })
})

test('createStore(): deep-copies the scenarios; mutating the input after creation does not affect the store', () => {
  const fx = buildFixtures()
  const store: Store = createStore([fx.scenarioA])
  fx.scenarioA.triggers[0].candidates[0].status = 'place_unknown'

  const kase = store.getCase(fx.triggerAId)
  const c1 = kase.candidates.find((c) => c.id === 'a-c1')
  assert.equal(c1?.status, 'available')
})

test('reset(): returns the fixture start state', () => {
  const fx = buildFixtures()
  const store: Store = createStore([fx.scenarioA])
  const before = store.getCase(fx.triggerAId)
  store.reset()
  const after = store.getCase(fx.triggerAId)
  assert.deepEqual(after, before)
})
