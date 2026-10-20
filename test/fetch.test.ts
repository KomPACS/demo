import { test } from 'node:test'
import assert from 'node:assert/strict'
import createClient from 'openapi-fetch'
import type { components, paths } from '@/api.ts'
import { createStore, type Store } from '../src/mock/store.ts'
import { createMockFetch } from '../src/mock/fetch.ts'

type Patient = components['schemas']['Patient']
type Trigger = components['schemas']['Trigger']
type Candidate = components['schemas']['Candidate']
type Contact = components['schemas']['Contact']
type RequestItem = components['schemas']['RequestItem']
type Verdict = components['schemas']['Verdict']

type RawCandidate = Omit<Candidate, 'request_id' | 'request_state'>
type RawRequest = Omit<RequestItem, 'contact'>

const okVerdict = (label: Verdict['label'], reason: string): Verdict => ({ label, reason, kroky: [] })

function buildFixtures() {
  const patientA: Patient = {
    id: 'pac-fetch-1',
    sex: 'female',
    birth_year: 1960,
    diagnoses: [{ code: 'C34', display: 'Zhoubný novotvar průdušky a plíce' }],
    index_date: '2026-08-01',
    name: 'Fetch Testová',
    rc: null,
  }
  const triggerA: Trigger = {
    id: 'trig-fetch-1',
    patient_id: patientA.id,
    kind: 'exam',
    modality: 'CT',
    date: '2026-10-25',
    simulated: false,
  }

  const c1: RawCandidate = {
    id: 'c-fetch-1',
    source: 'nis_record',
    modality: 'CT',
    date: '2024-05-10',
    description: 'CT plic',
    place: 'Nemocnice Fetch',
    organization_id: 'org-fetch-1',
    study_id: null,
    report_id: null,
    status: 'missing',
    is_baseline: false,
    verdict: okVerdict('uncertain', 'Nejasné.'),
    decision: null,
    decision_reason: null,
  }
  const c2: RawCandidate = {
    id: 'c-fetch-2',
    source: 'nis_record',
    modality: 'MR',
    date: '2023-01-01',
    description: 'MR mozku',
    place: 'Nemocnice Fetch',
    organization_id: 'org-fetch-1',
    study_id: 'STU-FETCH-2',
    report_id: null,
    status: 'missing',
    is_baseline: false,
    verdict: okVerdict('relevant', 'Shoda s diagnózou.'),
    decision: null,
    decision_reason: null,
  }

  const contact1: Contact = {
    organization_id: 'org-fetch-1',
    organization_name: 'Nemocnice Fetch',
    email: 'fetch@example.com',
    phone: null,
    source_url: null,
    verified_at: '2026-01-01T09:00:00.000Z',
    needs_reverify: false,
    fhir_endpoint: null,
  }

  // id with a space, to test path-param decode (openapi-fetch encodes it).
  const reqSpace: RawRequest = {
    id: 'req fetch 1',
    trigger_id: triggerA.id,
    trigger_date: triggerA.date,
    patient_id: patientA.id,
    candidate_id: c2.id,
    prior_modality: 'MR',
    prior_date: '2023-01-01',
    prior_description: 'MR mozku',
    place: 'Nemocnice Fetch',
    organization_id: 'org-fetch-1',
    channel: 'email',
    state: 'draft',
    email_draft: 'Dobrý den, žádáme o zaslání zprávy z vyšetření MR mozku.',
    created_at: '2026-10-18T09:00:00.000Z',
    sent_at: null,
    study_id: null,
    fhir_task: null,
  }
  const reqDraft2: RawRequest = { ...reqSpace, id: 'req-fetch-2' }
  const reqDraft3: RawRequest = { ...reqSpace, id: 'req-fetch-3' }

  const scenarioA = {
    patient: patientA,
    insurer: '111' as const,
    triggers: [{ trigger: triggerA, candidates: [c1, c2], duplicate_alert: null, insurer_request: null }],
    requests: [reqSpace, reqDraft2, reqDraft3],
    timeline: [],
    contacts: { 'org-fetch-1': contact1 },
    reports: [],
  }

  const patientLive: Patient = {
    id: 'pac-fetch-live',
    sex: 'male',
    birth_year: 1975,
    diagnoses: [{ code: 'C61', display: 'Zhoubný novotvar prostaty' }],
    index_date: '2026-09-01',
    name: 'Live Testovací',
    rc: null,
  }
  const triggerLive: Trigger = {
    id: 'trig-fetch-live',
    patient_id: patientLive.id,
    kind: 'exam',
    modality: 'CT',
    date: '2026-10-20',
    simulated: true,
  }
  const cLive: RawCandidate = {
    id: 'c-fetch-live-1',
    source: 'nis_record',
    modality: 'CT',
    date: '2025-01-01',
    description: 'CT (živá kontrola)',
    place: 'Nemocnice Fetch',
    organization_id: null,
    study_id: null,
    report_id: null,
    status: 'available',
    is_baseline: true,
    verdict: okVerdict('relevant', 'Shoda s diagnózou.'),
    decision: null,
    decision_reason: null,
  }

  const scenarioLive = {
    patient: patientLive,
    insurer: '205' as const,
    triggers: [],
    requests: [],
    timeline: [],
    contacts: {},
    reports: [],
    live: { trigger: triggerLive, candidates: [cLive], duplicate_alert: null, insurer_request: null },
  }

  return { scenarioA, scenarioLive, patientA, triggerA, c1, c2, reqSpace, reqDraft2, reqDraft3, patientLive }
}

function makeClient() {
  const fx = buildFixtures()
  const store: Store = createStore([fx.scenarioA, fx.scenarioLive])
  const mockFetch = createMockFetch(store, { readMs: 0, checkMs: [0, 0] })
  const client = createClient<paths>({ fetch: mockFetch, baseUrl: 'http://localhost' })
  return { client, store, fx }
}

test('routes: every one of the 21 paths responds through openapi-fetch (table-driven)', async () => {
  const { client, fx } = makeClient()

  const health = await client.GET('/api/health', {})
  assert.equal(health.error, undefined)

  const patients = await client.GET('/api/patients', {})
  assert.ok(patients.data?.some((p) => p.id === fx.patientA.id))

  const triggersBefore = await client.GET('/api/triggers', {})
  assert.ok(triggersBefore.data?.some((t) => t.trigger.id === fx.triggerA.id))

  const created = await client.POST('/api/triggers', {
    body: { patient_id: fx.patientLive.id, kind: 'exam', modality: 'CT', date: '2026-11-05' },
  })
  assert.equal(created.data?.trigger.patient_id, fx.patientLive.id)

  const kase = await client.GET('/api/triggers/{trigger_id}', { params: { path: { trigger_id: fx.triggerA.id } } })
  assert.equal(kase.data?.trigger.id, fx.triggerA.id)

  const trace = await client.GET('/api/triggers/{trigger_id}/llm-trace', { params: { path: { trigger_id: fx.triggerA.id } } })
  assert.ok(Array.isArray(trace.data))

  const added = await client.POST('/api/triggers/{trigger_id}/candidates', {
    params: { path: { trigger_id: fx.triggerA.id } },
    body: { modality: 'MR', description: 'MR nové' },
  })
  assert.ok(added.data?.candidates.some((c) => c.description === 'MR nové'))

  const decided = await client.PATCH('/api/triggers/{trigger_id}/candidates/{candidate_id}', {
    params: { path: { trigger_id: fx.triggerA.id, candidate_id: fx.c1.id } },
    body: { decision: 'relevant', reason: 'Potvrzeno.', role: 'collector' },
  })
  assert.equal(decided.data?.candidates.find((c) => c.id === fx.c1.id)?.decision, 'relevant')

  const rejudged = await client.POST('/api/triggers/{trigger_id}/candidates/{candidate_id}/rejudge', {
    params: { path: { trigger_id: fx.triggerA.id, candidate_id: fx.c1.id } },
    body: { note: 'Nová zpráva.' },
  })
  assert.ok(rejudged.data)

  const versions = await client.GET('/api/triggers/{trigger_id}/candidates/{candidate_id}/verdicts', {
    params: { path: { trigger_id: fx.triggerA.id, candidate_id: fx.c1.id } },
  })
  assert.equal(versions.data?.length, 2)

  const restored = await client.POST('/api/triggers/{trigger_id}/candidates/{candidate_id}/verdicts/{n}/restore', {
    params: { path: { trigger_id: fx.triggerA.id, candidate_id: fx.c1.id, n: 0 } },
  })
  assert.equal(restored.data?.candidates.find((c) => c.id === fx.c1.id)?.verdict.reason, 'Nejasné.')

  const timeline = await client.GET('/api/patients/{patient_id}/timeline', { params: { path: { patient_id: fx.patientA.id } } })
  assert.ok(Array.isArray(timeline.data))

  const stats = await client.GET('/api/stats', {})
  assert.equal(stats.data?.patients, 2)

  const queue = await client.GET('/api/queue', {})
  assert.ok(queue.data?.some((r) => r.id === fx.reqSpace.id))

  const approved = await client.POST('/api/requests/{request_id}/approve', { params: { path: { request_id: fx.reqSpace.id } } })
  assert.equal(approved.data?.state, 'sent')

  const requested = await client.POST('/api/requests/{request_id}/requested', { params: { path: { request_id: fx.reqDraft2.id } } })
  assert.equal(requested.data?.state, 'requested')

  const notFound = await client.POST('/api/requests/{request_id}/not-found', { params: { path: { request_id: fx.reqDraft3.id } } })
  assert.equal(notFound.data?.state, 'not_found')

  const looked = await client.POST('/api/contacts/lookup', { body: { organization_id: 'org-fetch-1' } })
  assert.equal(looked.data?.organization_id, 'org-fetch-1')

  const saved = await client.PUT('/api/contacts/{organization_id}', {
    params: { path: { organization_id: 'org-fetch-1' } },
    body: { email: 'novy@example.com' },
  })
  assert.equal(saved.data?.email, 'novy@example.com')

  const delivered = await client.POST('/api/demo/deliver/{request_id}', { params: { path: { request_id: fx.reqSpace.id } } })
  assert.equal(delivered.data?.state, 'received')

  const pacs = await client.POST('/api/demo/pacs-arrival/{study_id}', { params: { path: { study_id: 'STU-FETCH-2' } } })
  assert.equal(pacs.data?.rows, 1)
})

test('GET /api/triggers/{trigger_id}: unknown id gives error, no data (404)', async () => {
  const { client } = makeClient()
  const res = await client.GET('/api/triggers/{trigger_id}', { params: { path: { trigger_id: 'does-not-exist' } } })
  assert.equal(res.data, undefined)
  assert.ok(res.error)
  assert.equal(res.response.status, 404)
})

test('POST /api/contacts/lookup: unknown org returns data null, not an error', async () => {
  const { client } = makeClient()
  const res = await client.POST('/api/contacts/lookup', { body: { organization_id: 'org-does-not-exist' } })
  assert.equal(res.data, null)
  assert.equal(res.error, undefined)
})

test('PATCH then GET of the same candidate show the persisted decision', async () => {
  const { client, fx } = makeClient()
  await client.PATCH('/api/triggers/{trigger_id}/candidates/{candidate_id}', {
    params: { path: { trigger_id: fx.triggerA.id, candidate_id: fx.c1.id } },
    body: { decision: 'not_relevant', reason: 'Mimo oblast.', role: 'doctor' },
  })
  const after = await client.GET('/api/triggers/{trigger_id}', { params: { path: { trigger_id: fx.triggerA.id } } })
  const c1 = after.data?.candidates.find((c) => c.id === fx.c1.id)
  assert.equal(c1?.decision, 'not_relevant')
  assert.equal(c1?.decision_reason, 'Mimo oblast.')
})

test('path param decode: a request id containing a space round-trips through encodeURIComponent', async () => {
  const { client, fx } = makeClient()
  const res = await client.POST('/api/requests/{request_id}/approve', { params: { path: { request_id: fx.reqSpace.id } } })
  assert.equal(res.data?.id, 'req fetch 1')
})

test('unknown route: a path not in the contract returns 404 with a detail body', async () => {
  const { store } = makeClient()
  const mockFetch = createMockFetch(store, { readMs: 0, checkMs: [0, 0] })
  const res = await mockFetch(new Request('http://localhost/api/not-a-real-route'))
  assert.equal(res.status, 404)
  const body = (await res.json()) as { detail: string }
  assert.equal(typeof body.detail, 'string')
  assert.equal(res.headers.get('content-type'), 'application/json')
})

test('conflict: approving an already-sent request returns 409', async () => {
  const { client, fx } = makeClient()
  await client.POST('/api/requests/{request_id}/approve', { params: { path: { request_id: fx.reqSpace.id } } })
  const second = await client.POST('/api/requests/{request_id}/approve', { params: { path: { request_id: fx.reqSpace.id } } })
  assert.equal(second.response.status, 409)
  assert.ok(second.error)
})

test('POST /api/triggers: default delay is 4000-6000 ms (captured via setTimeout, never actually awaited)', async () => {
  const { store } = makeClient()
  const originalSetTimeout = globalThis.setTimeout
  let capturedMs: number | undefined
  // @ts-expect-error: test shim resolves immediately instead of waiting the real delay
  globalThis.setTimeout = (fn: () => void, ms?: number) => {
    capturedMs = ms
    fn()
    return 0
  }
  try {
    const mockFetch = createMockFetch(store)
    const req = new Request('http://localhost/api/triggers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: 'pac-fetch-live', kind: 'exam', modality: 'CT', date: '2026-11-05' }),
    })
    await mockFetch(req)
  } finally {
    globalThis.setTimeout = originalSetTimeout
  }
  assert.ok(capturedMs !== undefined && capturedMs >= 4000 && capturedMs <= 6000)
})
