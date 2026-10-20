import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createStore, NotFound, Conflict, type Store } from '../src/mock/store.ts'
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
type Verdict = components['schemas']['Verdict']
type CandidateCreate = components['schemas']['CandidateCreate']
type DecisionUpdate = components['schemas']['DecisionUpdate']
type TriggerCreate = components['schemas']['TriggerCreate']
type ContactUpdate = components['schemas']['ContactUpdate']
type PacsFeedResult = components['schemas']['PacsFeedResult']

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

// --- Store mutations -------------------------------------------------

function buildMutationFixtures() {
  const patientM: Patient = {
    id: 'pac-store-m',
    sex: 'male',
    birth_year: 1980,
    diagnoses: [{ code: 'C34', display: 'Zhoubný novotvar průdušky a plíce' }],
    index_date: '2026-09-01',
    name: 'Milan Novák',
    rc: birthNumber('1980-04-10', 'male', 11),
  }

  const triggerM: Trigger = {
    id: 'trig-store-m',
    patient_id: patientM.id,
    kind: 'exam',
    modality: 'CT',
    date: '2026-10-20',
    simulated: false,
  }

  type RawCandidate = Omit<Candidate, 'request_id' | 'request_state'>
  type RawRequest = Omit<RequestItem, 'contact'>

  const relevantVerdict = (reason: string): Verdict => ({
    label: 'relevant',
    reason,
    source_sentence: null,
    guideline: null,
    kroky: [],
  })

  const base: RawCandidate = {
    id: 'm-c1',
    source: 'nis_record',
    modality: 'CT',
    date: '2023-02-01',
    description: 'CT plic',
    place: 'Nemocnice M',
    organization_id: 'org-m-email',
    study_id: null,
    report_id: null,
    status: 'missing',
    is_baseline: false,
    verdict: { label: 'uncertain', reason: 'Nejasné.', source_sentence: null, guideline: null, kroky: [] },
    decision: null,
    decision_reason: null,
  }

  const mC1: RawCandidate = { ...base, id: 'm-c1' }
  const mC2: RawCandidate = {
    ...base,
    id: 'm-c2',
    verdict: relevantVerdict('Shoda s diagnózou.'),
    decision: 'relevant',
    decision_reason: 'Koordinátor/ka potvrdila relevanci.',
  }
  const mC3: RawCandidate = { ...base, id: 'm-c3', verdict: relevantVerdict('Shoda s diagnózou.') }
  const mC4: RawCandidate = { ...base, id: 'm-c4', verdict: relevantVerdict('Shoda s diagnózou.') }
  const mC5: RawCandidate = { ...base, id: 'm-c5', verdict: relevantVerdict('Shoda s diagnózou.') }
  const mC6: RawCandidate = { ...base, id: 'm-c6', organization_id: 'org-m-none' }
  const mC7: RawCandidate = { ...base, id: 'm-c7', organization_id: 'org-m-none' }
  const mC8: RawCandidate = { ...base, id: 'm-c8', organization_id: 'org-m-none', study_id: 'STU-M-8' }
  const mC9: RawCandidate = { ...base, id: 'm-c9', organization_id: 'org-m-new', place: 'Nemocnice Nová' }
  const mC10: RawCandidate = { ...base, id: 'm-c10', verdict: relevantVerdict('Výchozí nález.') }
  const mC12: RawCandidate = {
    ...base,
    id: 'm-c12',
    verdict: { label: 'uncertain', reason: 'Výchozí nejistota.', source_sentence: null, guideline: null, kroky: [] },
  }

  const reqBase: RawRequest = {
    id: 'req-m-2',
    trigger_id: triggerM.id,
    trigger_date: triggerM.date,
    patient_id: patientM.id,
    candidate_id: 'm-c2',
    prior_modality: 'CT',
    prior_date: '2023-02-01',
    prior_description: 'CT plic',
    place: 'Nemocnice M',
    organization_id: 'org-m-email',
    channel: 'email',
    state: 'draft',
    email_draft: 'Dobrý den, žádáme o zaslání zprávy z vyšetření CT plic.',
    created_at: '2026-10-18T09:00:00.000Z',
    sent_at: null,
    study_id: null,
    fhir_task: null,
  }

  const rM2: RawRequest = { ...reqBase, id: 'req-m-2', candidate_id: 'm-c2' }
  const rM3: RawRequest = {
    ...reqBase,
    id: 'req-m-3',
    candidate_id: 'm-c3',
    state: 'sent',
    sent_at: '2026-10-18T10:00:00.000Z',
    study_id: 'STU-M-3',
  }
  const rM4: RawRequest = { ...reqBase, id: 'req-m-4', candidate_id: 'm-c4', state: 'draft' }
  const rM5: RawRequest = {
    ...reqBase,
    id: 'req-m-5',
    candidate_id: 'm-c5',
    state: 'received',
    sent_at: '2026-10-10T09:00:00.000Z',
  }
  const rM6: RawRequest = {
    ...reqBase,
    id: 'req-m-6',
    candidate_id: 'm-c6',
    channel: 'phone',
    email_draft: null,
    organization_id: 'org-m-none',
    state: 'draft',
  }
  const rM7: RawRequest = {
    ...reqBase,
    id: 'req-m-7',
    candidate_id: 'm-c7',
    channel: 'phone',
    email_draft: null,
    organization_id: 'org-m-none',
    state: 'draft',
  }
  const rM8: RawRequest = {
    ...reqBase,
    id: 'req-m-8',
    candidate_id: 'm-c8',
    channel: 'phone',
    email_draft: null,
    organization_id: 'org-m-none',
    state: 'sent',
    sent_at: '2026-10-15T09:00:00.000Z',
  }
  const rM9: RawRequest = {
    ...reqBase,
    id: 'req-m-9',
    candidate_id: 'm-c9',
    channel: 'phone',
    email_draft: null,
    organization_id: 'org-m-new',
    place: 'Nemocnice Nová',
    state: 'draft',
  }

  const contactEmail: Contact = {
    organization_id: 'org-m-email',
    organization_name: 'Nemocnice M Email',
    email: 'm-email@example.com',
    phone: null,
    source_url: null,
    verified_at: '2024-01-01T09:00:00.000Z',
    needs_reverify: true,
    fhir_endpoint: null,
  }
  const contactFhir: Contact = {
    organization_id: 'org-m-fhir',
    organization_name: 'Nemocnice M FHIR',
    email: null,
    phone: null,
    source_url: null,
    verified_at: null,
    needs_reverify: false,
    fhir_endpoint: 'https://fhir.example/org-m-fhir',
  }

  const eM8: TimelineEvent = {
    id: 'evt-m-8',
    date: '2026-10-19T08:00:00.000Z',
    type: 'imaging',
    title: 'Plánované zobrazení',
    detail: 'bez snímků v PACS',
    resource: 'ImagingStudy/STU-M-8',
    simulated: false,
  }

  const verdictsM: Record<string, VerdictVersion[]> = {
    'm-c10': [{ n: 0, verdict: mC10.verdict, active: true }],
    'm-c12': [
      { n: 0, verdict: mC12.verdict, active: true },
      {
        n: 1,
        verdict: { label: 'relevant', reason: 'Potvrzeno dle doplněné zprávy.', source_sentence: null, guideline: null, kroky: [] },
        active: false,
      },
    ],
  }

  const scenarioM = {
    patient: patientM,
    insurer: '111' as const,
    triggers: [
      {
        trigger: triggerM,
        candidates: [mC1, mC2, mC3, mC4, mC5, mC6, mC7, mC8, mC9, mC10, mC12],
        duplicate_alert: null,
        insurer_request: null,
        verdicts: verdictsM,
        checked_at: '2026-10-19T07:30:00.000Z',
      },
    ],
    requests: [rM2, rM3, rM4, rM5, rM6, rM7, rM8, rM9],
    timeline: [eM8],
    contacts: { 'org-m-email': contactEmail, 'org-m-fhir': contactFhir },
    reports: [],
  }

  const patientE: Patient = {
    id: 'pac-store-e',
    sex: 'female',
    birth_year: 1965,
    diagnoses: [{ code: 'C50', display: 'Zhoubný novotvar prsu' }],
    index_date: '2026-06-01',
    name: 'Eva Veselá',
    rc: birthNumber('1965-05-05', 'female', 2),
  }
  const triggerE1: Trigger = {
    id: 'trig-store-e1',
    patient_id: patientE.id,
    kind: 'exam',
    modality: 'CT',
    date: '2026-01-10',
    simulated: false,
  }
  const triggerE2: Trigger = {
    id: 'trig-store-e2',
    patient_id: patientE.id,
    kind: 'exam',
    modality: 'MR',
    date: '2026-09-15',
    simulated: false,
  }
  const eC1: RawCandidate = { ...base, id: 'e-c1', organization_id: null, place: null, decision: 'not_relevant', decision_reason: 'Mimo oblast.' }
  const eC2: RawCandidate = {
    ...base,
    id: 'e-c2',
    organization_id: null,
    place: null,
    verdict: relevantVerdict('Shoda s diagnózou.'),
    decision: 'relevant',
    decision_reason: 'Potvrzeno.',
  }
  const eC3: RawCandidate = { ...base, id: 'e-c3', organization_id: null, place: null }

  const scenarioE = {
    patient: patientE,
    insurer: '205' as const,
    triggers: [
      { trigger: triggerE1, candidates: [eC1], duplicate_alert: null, insurer_request: null },
      { trigger: triggerE2, candidates: [eC2, eC3], duplicate_alert: null, insurer_request: null },
    ],
    requests: [],
    timeline: [],
    contacts: {},
    reports: [],
  }

  return {
    scenarioM,
    scenarioE,
    patientMId: patientM.id,
    triggerMId: triggerM.id,
    patientEId: patientE.id,
    triggerE1Id: triggerE1.id,
    triggerE2Id: triggerE2.id,
  }
}

function makeMutationStore() {
  const fx = buildMutationFixtures()
  const store: Store = createStore([fx.scenarioM, fx.scenarioE])
  return { store, fx }
}

test('addCandidate(): creates a draft request; channel follows the contact (fhir/email/phone)', () => {
  const { store, fx } = makeMutationStore()

  const bodyEmail: CandidateCreate = { modality: 'MR', description: 'MR testovací', place: 'Nemocnice M', organization_id: 'org-m-email' }
  const caseEmail = store.addCandidate(fx.triggerMId, bodyEmail)
  const addedEmail = caseEmail.candidates.find((c) => c.description === 'MR testovací')
  assert.ok(addedEmail)
  assert.equal(addedEmail.source, 'collector')
  assert.equal(addedEmail.decision, 'relevant')
  assert.equal(addedEmail.verdict.label, 'relevant')
  assert.equal(addedEmail.verdict.reason, 'Přidal/a koordinátor/ka.')
  assert.equal(addedEmail.status, 'missing')
  const reqEmail = store.queue().find((r) => r.candidate_id === addedEmail.id)
  assert.equal(reqEmail?.state, 'draft')
  assert.equal(reqEmail?.channel, 'email')
  assert.ok(reqEmail?.email_draft)

  const bodyFhir: CandidateCreate = { modality: 'MR', description: 'MR testovací FHIR', place: 'Nemocnice M', organization_id: 'org-m-fhir' }
  const caseFhir = store.addCandidate(fx.triggerMId, bodyFhir)
  const addedFhir = caseFhir.candidates.find((c) => c.description === 'MR testovací FHIR')
  assert.ok(addedFhir)
  const reqFhir = store.queue().find((r) => r.candidate_id === addedFhir.id)
  assert.equal(reqFhir?.channel, 'fhir')

  const bodyNone: CandidateCreate = { modality: 'MR', description: 'MR bez místa' }
  const caseNone = store.addCandidate(fx.triggerMId, bodyNone)
  const addedNone = caseNone.candidates.find((c) => c.description === 'MR bez místa')
  assert.ok(addedNone)
  assert.equal(addedNone.status, 'place_unknown')
  const reqNone = store.queue().find((r) => r.candidate_id === addedNone.id)
  assert.equal(reqNone?.channel, 'phone')
})

test('decide(): relevant on a non-available candidate with no request creates a draft request', () => {
  const { store, fx } = makeMutationStore()
  const body: DecisionUpdate = { decision: 'relevant', reason: 'Potvrzeno koordinátorem.', role: 'collector' }
  const kase = store.decide(fx.triggerMId, 'm-c1', body)
  const c1 = kase.candidates.find((c) => c.id === 'm-c1')
  assert.equal(c1?.decision, 'relevant')
  assert.equal(c1?.decision_reason, 'Potvrzeno koordinátorem.')
  assert.equal(c1?.request_state, 'draft')
  assert.ok(c1?.request_id)
})

test('decide(): removed deletes the candidate\'s existing draft request', () => {
  const { store, fx } = makeMutationStore()
  const before = store.getCase(fx.triggerMId).candidates.find((c) => c.id === 'm-c2')
  assert.equal(before?.request_state, 'draft')

  const body: DecisionUpdate = { decision: 'removed', reason: 'Duplicitní záznam.', role: 'collector' }
  const kase = store.decide(fx.triggerMId, 'm-c2', body)
  const c2 = kase.candidates.find((c) => c.id === 'm-c2')
  assert.equal(c2?.decision, 'removed')
  assert.equal(c2?.request_id, null)
  assert.equal(c2?.request_state, null)
  assert.ok(!store.queue().some((r) => r.candidate_id === 'm-c2'))
})

test('rejudge(): appends an active version with the note stored separately (verdict unchanged) when no prepared verdict is seeded, twice', () => {
  const { store, fx } = makeMutationStore()
  const before = store.verdicts(fx.triggerMId, 'm-c10')[0]
  assert.ok(before)

  const v1 = store.rejudge(fx.triggerMId, 'm-c10', 'Nová zpráva z nemocnice.', null)
  const versions1 = store.verdicts(fx.triggerMId, 'm-c10')
  assert.equal(versions1.length, 2)
  assert.equal(versions1[0]?.active, false)
  assert.equal(versions1[1]?.active, true)
  assert.equal(versions1[1]?.n, 1)
  assert.deepEqual(versions1[1]?.verdict, before.verdict)
  assert.equal(versions1[1]?.note, 'Nová zpráva z nemocnice.')
  assert.equal(versions1[1]?.new_evidence, null)
  assert.ok(versions1[1]?.trace)
  const c10after1 = v1.candidates.find((c) => c.id === 'm-c10')
  assert.deepEqual(c10after1?.verdict, versions1[1]?.verdict)

  store.rejudge(fx.triggerMId, 'm-c10', 'Druhé přehodnocení.', null)
  const versions2 = store.verdicts(fx.triggerMId, 'm-c10')
  assert.equal(versions2.length, 3)
  assert.equal(versions2[0]?.active, false)
  assert.equal(versions2[1]?.active, false)
  assert.equal(versions2[2]?.active, true)
  assert.equal(versions2[2]?.n, 2)
})

test('rejudge(): stores the category on the new version', () => {
  const { store, fx } = makeMutationStore()
  store.rejudge(fx.triggerMId, 'm-c10', 'Chybná modalita uvedená v žádosti.', 'modality_region')
  const versions = store.verdicts(fx.triggerMId, 'm-c10')
  const active = versions.find((v) => v.active)
  assert.equal(active?.category, 'modality_region')
  assert.equal(active?.note, 'Chybná modalita uvedená v žádosti.')
})

test('rejudge(): uses the scenario\'s prepared verdict when seeded, instead of citing the note', () => {
  const { store, fx } = makeMutationStore()
  const kase = store.rejudge(fx.triggerMId, 'm-c12', 'Poznámka koordinátora.')
  const versions = store.verdicts(fx.triggerMId, 'm-c12')
  const active = versions.find((v) => v.active)
  assert.equal(active?.verdict.label, 'relevant')
  assert.equal(active?.verdict.reason, 'Potvrzeno dle doplněné zprávy.')
  const c12 = kase.candidates.find((c) => c.id === 'm-c12')
  assert.deepEqual(c12?.verdict, active?.verdict)
})

test('restore(): candidate.verdict equals the restored version\'s verdict (rejudge twice, then restore 0)', () => {
  const { store, fx } = makeMutationStore()
  store.rejudge(fx.triggerMId, 'm-c10', 'První přehodnocení.')
  store.rejudge(fx.triggerMId, 'm-c10', 'Druhé přehodnocení.')
  const original = store.verdicts(fx.triggerMId, 'm-c10').find((v) => v.n === 0)
  assert.ok(original)

  const kase = store.restore(fx.triggerMId, 'm-c10', 0)
  const versions = store.verdicts(fx.triggerMId, 'm-c10')
  assert.equal(versions.length, 4)
  const restored = versions.find((v) => v.active)
  assert.equal(restored?.n, 3)
  assert.equal(restored?.restored_from, 0)
  assert.deepEqual(restored?.verdict, original.verdict)

  const c10 = kase.candidates.find((c) => c.id === 'm-c10')
  assert.deepEqual(c10?.verdict, original.verdict)
})

test('approve(): draft becomes approved, no sent_at set; queue() and getCase() both reflect it', () => {
  const { store, fx } = makeMutationStore()
  const approved = store.approve('req-m-4')
  assert.equal(approved.state, 'approved')
  assert.equal(approved.sent_at, null)

  const queued = store.queue().find((r) => r.id === 'req-m-4')
  assert.equal(queued?.state, 'approved')
  const kase = store.getCase(fx.triggerMId)
  const c4 = kase.candidates.find((c) => c.id === 'm-c4')
  assert.equal(c4?.request_state, 'approved')
})

test('approve(): on an already-received request throws Conflict', () => {
  const { store } = makeMutationStore()
  assert.throws(() => store.approve('req-m-5'), Conflict)
})

test('send(): approved becomes sent with sent_at set', () => {
  const { store } = makeMutationStore()
  store.approve('req-m-4')
  const sent = store.send('req-m-4')
  assert.equal(sent.state, 'sent')
  assert.ok(sent.sent_at)
})

test('send(): on a draft request throws Conflict', () => {
  const { store } = makeMutationStore()
  assert.throws(() => store.send('req-m-6'), Conflict)
})

test('saveDraft(): from draft sets email_draft and state approved', () => {
  const { store } = makeMutationStore()
  const updated = store.saveDraft('req-m-2', 'Nový text žádosti.')
  assert.equal(updated.email_draft, 'Nový text žádosti.')
  assert.equal(updated.state, 'approved')
})

test('saveDraft(): from approved keeps it approved and updates email_draft', () => {
  const { store } = makeMutationStore()
  store.approve('req-m-4')
  const updated = store.saveDraft('req-m-4', 'Upravený text žádosti.')
  assert.equal(updated.state, 'approved')
  assert.equal(updated.email_draft, 'Upravený text žádosti.')
})

test('saveDraft(): on a sent request throws Conflict', () => {
  const { store } = makeMutationStore()
  assert.throws(() => store.saveDraft('req-m-3', 'Text.'), Conflict)
})

test('callAgain(): phone channel in draft appends an ISO timestamp to call_attempts, twice; state stays draft', () => {
  const { store } = makeMutationStore()
  const after1 = store.callAgain('req-m-6')
  assert.equal(after1.state, 'draft')
  assert.equal(after1.call_attempts?.length, 1)
  assert.ok(Date.parse(after1.call_attempts?.[0] ?? ''))

  const after2 = store.callAgain('req-m-6')
  assert.equal(after2.state, 'draft')
  assert.equal(after2.call_attempts?.length, 2)
})

test('callAgain(): non-phone channel throws Conflict', () => {
  const { store } = makeMutationStore()
  assert.throws(() => store.callAgain('req-m-2'), Conflict)
})

test('callAgain(): a non-draft phone request throws Conflict', () => {
  const { store } = makeMutationStore()
  assert.throws(() => store.callAgain('req-m-8'), Conflict)
})

test('getCase(): checked_at is taken from the scenario trigger when set', () => {
  const { store, fx } = makeMutationStore()
  const kase = store.getCase(fx.triggerMId)
  assert.equal(kase.checked_at, '2026-10-19T07:30:00.000Z')
})

test('getCase(): checked_at falls back to the trigger date when not set on the scenario trigger', () => {
  const { store, fx } = makeMutationStore()
  const kase = store.getCase(fx.triggerE1Id)
  assert.ok(kase.checked_at)
  assert.ok(kase.checked_at.startsWith('2026-01-10'))
})

test('requested(): draft becomes requested', () => {
  const { store } = makeMutationStore()
  const updated = store.requested('req-m-6')
  assert.equal(updated.state, 'requested')
})

test('notFound(): draft becomes not_found', () => {
  const { store } = makeMutationStore()
  const updated = store.notFound('req-m-7')
  assert.equal(updated.state, 'not_found')
})

test('deliver(): received; candidate becomes available with pacs_source; adds a simulated imaging event; stats().in_pacs grows by 1', () => {
  const { store, fx } = makeMutationStore()
  const before = store.stats().in_pacs
  const delivered = store.deliver('req-m-3')
  assert.equal(delivered.state, 'received')

  const kase = store.getCase(fx.triggerMId)
  const c3 = kase.candidates.find((c) => c.id === 'm-c3')
  assert.equal(c3?.status, 'available')
  assert.ok(c3?.pacs_source)

  const events = store.timeline(fx.patientMId, 'imaging')
  const imagingEvent = events.find((e) => e.resource === 'ImagingStudy/STU-M-3')
  assert.ok(imagingEvent)
  assert.equal(imagingEvent.simulated, true)

  assert.equal(store.stats().in_pacs, before + 1)
})

test('pacsArrival(): a matching study clears the PACS-missing detail, marks the candidate available, and its request received', () => {
  const { store, fx } = makeMutationStore()
  const result: PacsFeedResult = store.pacsArrival('STU-M-8')
  assert.equal(result.rows, 1)
  assert.equal(result.patched, 1)
  assert.equal(result.unmatched, 0)

  const events = store.timeline(fx.patientMId, 'imaging')
  const event = events.find((e) => e.resource === 'ImagingStudy/STU-M-8')
  assert.notEqual(event?.detail, 'bez snímků v PACS')

  const kase = store.getCase(fx.triggerMId)
  const c8 = kase.candidates.find((c) => c.id === 'm-c8')
  assert.equal(c8?.status, 'available')
  assert.equal(c8?.request_state, 'received')
})

test('pacsArrival(): no matching study returns unmatched 1, patched 0, and changes nothing', () => {
  const { store } = makeMutationStore()
  const result: PacsFeedResult = store.pacsArrival('STU-DOES-NOT-EXIST')
  assert.equal(result.rows, 1)
  assert.equal(result.patched, 0)
  assert.equal(result.unmatched, 1)
})

test('saveContact(): updates an existing contact, resets needs_reverify and verified_at', () => {
  const { store } = makeMutationStore()
  const body: ContactUpdate = { email: 'novy@example.com' }
  const updated = store.saveContact('org-m-email', body)
  assert.equal(updated.email, 'novy@example.com')
  assert.equal(updated.needs_reverify, false)
  assert.notEqual(updated.verified_at, '2024-01-01T09:00:00.000Z')
  assert.ok(updated.verified_at)
})

test('saveContact(): creates the contact when missing, naming it from an existing request for that org', () => {
  const { store } = makeMutationStore()
  assert.equal(store.lookupContact('org-m-new'), null)
  const body: ContactUpdate = { phone: '+420 000 111 222' }
  const created = store.saveContact('org-m-new', body)
  assert.equal(created.organization_id, 'org-m-new')
  assert.equal(created.phone, '+420 000 111 222')
  assert.ok(created.organization_name)
  assert.ok(created.verified_at)
  assert.equal(created.needs_reverify, false)
  assert.deepEqual(store.lookupContact('org-m-new'), created)
})

test('createTrigger(): for the live patient, creates the templated trigger; a second call returns the existing summary; reset() removes it', () => {
  const fx = buildFixtures()
  const store: Store = createStore([fx.scenarioLive])

  const body: TriggerCreate = { patient_id: fx.patientCId, kind: 'exam', modality: 'CT', date: '2026-11-05' }
  const summary1 = store.createTrigger(body)
  assert.equal(summary1.trigger.id, fx.triggerLiveId)
  assert.equal(summary1.trigger.simulated, true)
  assert.equal(summary1.trigger.modality, 'CT')
  assert.equal(summary1.trigger.date, '2026-11-05')
  assert.equal(store.triggers().filter((t) => t.trigger.patient_id === fx.patientCId).length, 1)

  const body2: TriggerCreate = { patient_id: fx.patientCId, kind: 'exam', modality: 'MR', date: '2026-12-01' }
  const summary2 = store.createTrigger(body2)
  assert.equal(summary2.trigger.id, fx.triggerLiveId)
  assert.equal(summary2.trigger.date, '2026-11-05')
  assert.equal(store.triggers().filter((t) => t.trigger.patient_id === fx.patientCId).length, 1)

  store.reset()
  assert.ok(!store.triggers().some((t) => t.trigger.patient_id === fx.patientCId))
  assert.throws(() => store.getCase(fx.triggerLiveId), NotFound)
})

test('createTrigger(): for a patient without live, copies the latest trigger\'s candidates with fresh ids and no decisions', () => {
  const { store, fx } = makeMutationStore()
  const body: TriggerCreate = { patient_id: fx.patientEId, kind: 'exam', modality: 'MR', date: '2026-10-23' }
  const summary = store.createTrigger(body)

  assert.equal(summary.trigger.patient_id, fx.patientEId)
  assert.notEqual(summary.trigger.id, fx.triggerE1Id)
  assert.notEqual(summary.trigger.id, fx.triggerE2Id)
  assert.equal(summary.trigger.simulated, true)
  assert.equal(summary.trigger.modality, 'MR')
  assert.equal(summary.trigger.date, '2026-10-23')

  const kase = store.getCase(summary.trigger.id)
  assert.equal(kase.candidates.length, 2)
  assert.ok(!kase.candidates.some((c) => c.id === 'e-c2' || c.id === 'e-c3'))
  assert.ok(kase.candidates.every((c) => c.decision === null && c.decision_reason === null))
})

test('reset(): restores request and candidate state after mutations (T6)', () => {
  const { store, fx } = makeMutationStore()
  store.approve('req-m-4')
  store.deliver('req-m-3')
  store.reset()

  const kase = store.getCase(fx.triggerMId)
  const c3 = kase.candidates.find((c) => c.id === 'm-c3')
  assert.equal(c3?.status, 'missing')
  const req4 = store.queue().find((r) => r.id === 'req-m-4')
  assert.equal(req4?.state, 'draft')
})
