import { test } from 'node:test'
import assert from 'node:assert/strict'
import { verdict, llmTrace } from '../src/mock/trace.ts'
import type { components } from '@/api.ts'

type Candidate = Omit<components['schemas']['Candidate'], 'request_id' | 'request_state'>
type Patient = components['schemas']['Patient']
type Trigger = components['schemas']['Trigger']

test('verdict(): full kroky in order query, evidence sentence, guideline with page, verdict+reason', () => {
  const v = verdict({
    label: 'relevant',
    reason: 'Shoda s diagnózou C34.',
    query: 'CT hrudníku po léčbě C34',
    source_sentence: 'Na CT hrudníku patrný nový nález.',
    guideline: { page: 42, quote: 'Kontrolní CT se provádí po ukončení léčby.' },
  })
  assert.equal(v.kroky.length, 4)
  assert.ok(v.kroky[2]?.includes('s. 42'))
  assert.equal(v.label, 'relevant')
  assert.equal(v.source_sentence, 'Na CT hrudníku patrný nový nález.')
  assert.equal(v.guideline?.page, 42)
})

test('verdict(): without guideline omits the Modrá kniha step', () => {
  const v = verdict({
    label: 'uncertain',
    reason: 'Nejasná souvislost s diagnózou.',
    query: 'MR mozku',
    source_sentence: 'Zmínka o MR mozku ve zprávě.',
  })
  assert.equal(v.kroky.length, 3)
  assert.equal(v.guideline, null)
  assert.ok(!v.kroky.some((k) => k.includes('Modrá kniha')))
})

function fixtures() {
  const patient: Patient = {
    id: 'pac-trace-1',
    sex: 'female',
    birth_year: 1960,
    diagnoses: [{ code: 'C34', display: 'Zhoubný novotvar průdušky a plíce' }],
    index_date: '2026-08-01',
  }
  const trigger: Trigger = {
    id: 'trig-trace-1',
    patient_id: 'pac-trace-1',
    kind: 'exam',
    modality: 'CT',
    date: '2026-10-25',
    simulated: false,
  }
  const c1: Candidate = {
    id: 'c-1',
    source: 'report_text',
    modality: 'CT',
    date: '2024-05-10',
    description: 'CT hrudníku',
    place: 'Nemocnice Test',
    organization_id: 'org-1',
    study_id: null,
    report_id: 'rep-1',
    status: 'missing_report',
    is_baseline: false,
    verdict: verdict({ label: 'relevant', reason: 'Shoda s diagnózou.', query: 'CT hrudníku', source_sentence: 'Na CT hrudníku nález.' }),
    decision: null,
    decision_reason: null,
  }
  const c2: Candidate = {
    id: 'c-2',
    source: 'report_text',
    modality: 'CT',
    date: '2024-05-10',
    description: 'CT břicha',
    place: 'Nemocnice Test',
    organization_id: 'org-1',
    study_id: null,
    report_id: 'rep-1',
    status: 'missing_report',
    is_baseline: false,
    verdict: verdict({ label: 'uncertain', reason: 'Nejasné.', query: 'CT břicha' }),
    decision: null,
    decision_reason: null,
  }
  const c3: Candidate = {
    id: 'c-3',
    source: 'nis_record',
    modality: 'MR',
    date: '2023-01-15',
    description: 'MR mozku',
    place: 'Nemocnice Test',
    organization_id: 'org-2',
    study_id: 'STU-1',
    report_id: null,
    status: 'available',
    is_baseline: true,
    verdict: verdict({ label: 'relevant', reason: 'Shoda s diagnózou.', query: 'MR mozku' }),
    decision: null,
    decision_reason: null,
  }
  const report1 = { id: 'rep-1', date: '2024-05-10', title: 'Zpráva z CT', text: 'Syntetický text zprávy, CT hrudníku a CT břicha popsány.' }
  return { patient, trigger, c1, c2, c3, report1 }
}

test('llmTrace(): 2 report_text candidates from 1 report gives 1 judge + 1 mentions call', () => {
  const { patient, trigger, c1, c2, report1 } = fixtures()
  const calls = llmTrace(patient, trigger, [c1, c2], [report1])
  assert.equal(calls.length, 2)
  assert.equal(calls.filter((c) => c.kind === 'judge').length, 1)
  assert.equal(calls.filter((c) => c.kind === 'mentions').length, 1)
  for (const c of calls) assert.equal(c.traced, true)

  const judge = calls.find((c) => c.kind === 'judge')
  assert.ok(judge)
  const output = JSON.parse(judge.output ?? '{}') as { verdicts: { candidate_id: string }[] }
  assert.equal(output.verdicts.length, 2)
  assert.ok(output.verdicts.some((v) => v.candidate_id === 'c-1'))
  assert.ok(output.verdicts.some((v) => v.candidate_id === 'c-2'))
})

test('llmTrace(): no report_text candidates gives only the judge call', () => {
  const { patient, trigger, c3, report1 } = fixtures()
  const calls = llmTrace(patient, trigger, [c3], [report1])
  assert.equal(calls.length, 1)
  assert.equal(calls[0]?.kind, 'judge')
})

test('llmTrace(): mentions output description matches the candidate description', () => {
  const { patient, trigger, c1, c2, report1 } = fixtures()
  const calls = llmTrace(patient, trigger, [c1, c2], [report1])
  const mentions = calls.find((c) => c.kind === 'mentions')
  assert.ok(mentions)
  const output = JSON.parse(mentions.output ?? '{}') as { mentions: { description: string }[] }
  assert.ok(output.mentions.some((m) => m.description === 'CT hrudníku'))
  assert.ok(output.mentions.some((m) => m.description === 'CT břicha'))
})
