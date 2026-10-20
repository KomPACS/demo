import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createStore } from '../src/mock/store.ts'
import { isValidBirthNumber } from '../src/mock/rc.ts'
import type { Scenario } from '../src/mock/types.ts'

const scenariosDir = path.join(import.meta.dirname, '../src/mock/scenarios')

type Loaded = { file: string; scenario: Scenario; source: string }

async function loadScenarios(): Promise<Loaded[]> {
  const files = (await readdir(scenariosDir)).filter((f) => f.endsWith('.ts')).sort()
  const out: Loaded[] = []
  for (const file of files) {
    const full = path.join(scenariosDir, file)
    const mod = (await import(pathToFileURL(full).href)) as { default: Scenario }
    const source = await readFile(full, 'utf8')
    out.push({ file, scenario: mod.default, source })
  }
  return out
}

const CUTOFF_YEAR = new Date().getFullYear() - 20

function assertRecent(dateStr: string | null | undefined, context: string) {
  if (!dateStr) return
  const year = Number(dateStr.slice(0, 4))
  assert.ok(year >= CUTOFF_YEAR, `${context}: date ${dateStr} is older than ${CUTOFF_YEAR}`)
}

test('seed scenarios: invariants', async () => {
  const entries = await loadScenarios()
  assert.equal(entries.length, 14, 'expected 14 scenarios')

  const ids = {
    patient: new Set<string>(),
    trigger: new Set<string>(),
    candidate: new Set<string>(),
    request: new Set<string>(),
    event: new Set<string>(),
  }

  for (const { file, scenario, source } of entries) {
    assert.ok(source.trimStart().startsWith('/**'), `${file}: must start with a /** story comment */`)

    assert.ok(scenario.patient.name, `${file}: patient.name must be set`)
    assert.ok(scenario.patient.rc, `${file}: patient.rc must be set`)
    assert.ok(isValidBirthNumber(scenario.patient.rc), `${file}: invalid RC ${scenario.patient.rc}`)

    const match = /^(\d{2})(\d{2})(\d{2})\/(\d{3})(\d)$/.exec(scenario.patient.rc)
    assert.ok(match, `${file}: RC does not match the expected format`)
    const [, yy, mm] = match as RegExpExecArray
    const isFemaleRc = Number(mm) > 50
    assert.equal(isFemaleRc, scenario.patient.sex === 'female', `${file}: RC month vs. patient.sex mismatch`)
    assert.ok(scenario.patient.birth_year, `${file}: patient.birth_year must be set`)
    assert.equal(Number(yy), scenario.patient.birth_year % 100, `${file}: RC year vs. patient.birth_year mismatch`)

    assert.ok(!ids.patient.has(scenario.patient.id), `duplicate patient id ${scenario.patient.id}`)
    ids.patient.add(scenario.patient.id)

    assertRecent(scenario.patient.index_date, `${file} patient.index_date`)

    const allTriggers = scenario.live ? [...scenario.triggers, scenario.live] : scenario.triggers

    for (const st of allTriggers) {
      assert.ok(!ids.trigger.has(st.trigger.id), `duplicate trigger id ${st.trigger.id}`)
      ids.trigger.add(st.trigger.id)
      assertRecent(st.trigger.date, `${file} trigger ${st.trigger.id}.date`)

      for (const c of st.candidates) {
        assert.ok(!ids.candidate.has(c.id), `duplicate candidate id ${c.id}`)
        ids.candidate.add(c.id)
        assertRecent(c.date, `${file} candidate ${c.id}.date`)

        if (c.source !== 'collector') {
          assert.ok(c.verdict.reason, `${file} candidate ${c.id}: verdict.reason must be set`)
          assert.ok(c.verdict.kroky && c.verdict.kroky.length > 0, `${file} candidate ${c.id}: verdict.kroky must be non-empty`)
        }

        if (c.status === 'available' && c.study_id) {
          const hasEvent = scenario.timeline.some((e) => e.resource === `ImagingStudy/${c.study_id}`)
          assert.ok(hasEvent, `${file} candidate ${c.id}: available with study_id ${c.study_id} needs an imaging timeline event`)
        }
      }

      if (st.duplicate_alert) assertRecent(st.duplicate_alert.date, `${file} duplicate_alert.date`)
      if (st.insurer_request) assertRecent(st.insurer_request.since, `${file} insurer_request.since`)
    }

    for (const r of scenario.requests) {
      assert.ok(!ids.request.has(r.id), `duplicate request id ${r.id}`)
      ids.request.add(r.id)
      const st = allTriggers.find((t) => t.trigger.id === r.trigger_id)
      assert.ok(st, `${file} request ${r.id}: trigger ${r.trigger_id} not found`)
      assert.ok(
        st?.candidates.some((c) => c.id === r.candidate_id),
        `${file} request ${r.id}: candidate ${r.candidate_id} not found on trigger ${r.trigger_id}`,
      )
    }

    for (const e of scenario.timeline) {
      assert.ok(!ids.event.has(e.id), `duplicate event id ${e.id}`)
      ids.event.add(e.id)
      assertRecent(e.date, `${file} event ${e.id}.date`)
    }
  }
})

test('seed scenarios: store integration (getCase, timeline, llmTrace)', async () => {
  const entries = await loadScenarios()
  const store = createStore(entries.map((e) => e.scenario))
  for (const { scenario } of entries) {
    for (const st of scenario.triggers) {
      const kase = store.getCase(st.trigger.id)
      assert.equal(kase.trigger.id, st.trigger.id)
      const events = store.timeline(scenario.patient.id)
      assert.ok(events.length > 0)
      const trace = store.llmTrace(st.trigger.id)
      assert.ok(Array.isArray(trace))
    }
  }
})

test('seed scenarios: evidence fields', async () => {
  const entries = await loadScenarios()
  for (const { file, scenario } of entries) {
    const allTriggers = scenario.live ? [...scenario.triggers, scenario.live] : scenario.triggers
    for (const st of allTriggers) {
      for (const c of st.candidates) {
        const v = c.verdict
        if (c.source === 'report_text') {
          assert.ok(v.source_sentence, `${file} candidate ${c.id}: report_text needs source_sentence`)
          assert.ok(v.event_word, `${file} candidate ${c.id}: report_text needs event_word`)
          assert.ok(
            v.source_sentence?.includes(v.event_word ?? ''),
            `${file} candidate ${c.id}: event_word "${v.event_word}" not found in source_sentence "${v.source_sentence}"`,
          )
        }
        if (v.event_status === 'planned' || v.event_status === 'recommended') {
          assert.notEqual(v.label, 'relevant', `${file} candidate ${c.id}: ${v.event_status} event must not be relevant`)
        }
        for (const step of v.steps ?? []) {
          if (step.kind === 'lookup') assert.ok(step.at, `${file} candidate ${c.id}: lookup step "${step.label}" needs at`)
          else assert.ok(!step.at, `${file} candidate ${c.id}: llm step "${step.label}" must not have at`)
        }
      }
    }
    for (const r of scenario.requests) {
      if (r.channel === 'email' && r.email_draft) {
        assert.ok(scenario.patient.rc && r.email_draft.includes(scenario.patient.rc), `${file} request ${r.id}: draft must contain RČ`)
        if (r.prior_date) {
          const [y, m, d] = r.prior_date.slice(0, 10).split('-')
          const czech = `${Number(d)}. ${Number(m)}. ${y}`
          assert.ok(r.email_draft.includes(czech), `${file} request ${r.id}: draft must contain prior date ${czech}`)
        }
      }
    }
  }
})

test('seed scenarios: scenario 1 baseline and prepared dispute', async () => {
  const entries = await loadScenarios()
  const s01 = entries.find((e) => e.file === '01-zpravy.ts')
  assert.ok(s01, 's01-zpravy.ts not found')
  const st = s01.scenario.triggers.find((t) => t.trigger.id === 's01-zpravy')
  assert.ok(st)
  const baselines = st.candidates.filter((c) => c.is_baseline)
  assert.equal(baselines.length, 1, 'expected exactly one baseline candidate')

  const abd = st.candidates.find((c) => c.description.includes('CT břicha'))
  assert.ok(abd, 'CT břicha candidate not found')
  const versions = st.verdicts?.[abd.id]
  assert.ok(versions && versions.length > 1, 'expected a prepared next version for the CT břicha candidate')
  const prepared = versions[versions.length - 1]
  assert.ok(prepared.new_evidence, 'prepared version must have new_evidence')

  const abdSourceReportId = abd.report_id
  assert.ok(abdSourceReportId, 'CT břicha candidate must link to a report')
  const otherReport = s01.scenario.reports.find((r) => r.id !== abdSourceReportId && r.text.includes(prepared.new_evidence ?? '\0'))
  assert.ok(otherReport, 'prepared new_evidence must occur in a scenario report other than the CT břicha source report')
})

test('seed scenarios: evidence context is checkable against the cited report', async () => {
  const entries = await loadScenarios()
  for (const { file, scenario } of entries) {
    const reportById = new Map(scenario.reports.map((r) => [r.id, r]))
    const allTriggers = scenario.live ? [...scenario.triggers, scenario.live] : scenario.triggers
    for (const st of allTriggers) {
      for (const c of st.candidates) {
        const v = c.verdict
        if (!v.source_sentence || !c.report_id) continue
        const report = reportById.get(c.report_id)
        assert.ok(report, `${file} candidate ${c.id}: report ${c.report_id} not found`)
        const text = report.text

        if (v.context_before !== null && v.context_before !== undefined) {
          assert.ok(text.includes(v.context_before), `${file} candidate ${c.id}: context_before not found verbatim in report ${c.report_id}`)
          assert.ok(
            text.includes(`${v.context_before} ${v.source_sentence}`),
            `${file} candidate ${c.id}: context_before is not the real sentence directly before source_sentence`,
          )
        }
        if (v.context_after !== null && v.context_after !== undefined) {
          assert.ok(text.includes(v.context_after), `${file} candidate ${c.id}: context_after not found verbatim in report ${c.report_id}`)
          assert.ok(
            text.includes(`${v.source_sentence} ${v.context_after}`),
            `${file} candidate ${c.id}: context_after is not the real sentence directly after source_sentence`,
          )
        }
      }
    }
  }
})

test('seed scenarios: global coverage', async () => {
  const scenarios = (await loadScenarios()).map((e) => e.scenario)
  const all = scenarios.flatMap((s) => s.triggers)
  const requests = scenarios.flatMap((s) => s.requests)
  const candidates = all.flatMap((t) => t.candidates)

  assert.equal(new Set(scenarios.map((s) => s.patient.id)).size, 14)
  assert.deepEqual([...new Set(scenarios.map((s) => s.insurer))].sort(), ['111', '201', '205', '207', '209', '211', '213'])

  const surnames = scenarios.map((s) => s.patient.name?.split(' ').at(-1)?.replace(/(ová|á|ý)$/, ''))
  assert.equal(new Set(surnames).size, surnames.length, `surnames repeat: ${surnames.join(', ')}`)
  const firstNames = scenarios.map((s) => s.patient.name?.split(' ')[0])
  assert.equal(new Set(firstNames).size, firstNames.length, `first names repeat: ${firstNames.join(', ')}`)

  const triggerIds = new Set(all.map((t) => t.trigger.id))
  for (const id of ['s01-zpravy', 's02-pojistovna', 's03-mdt-nedoruceno', 's04-duplicita', 's05-dlouha-historie', 's06-fhir-bulovka', 's07-dite-mr', 's08-bez-predchozich', 's09-vse-v-pacs']) {
    assert.ok(triggerIds.has(id), `missing hero trigger ${id}`)
  }
  const live = scenarios.find((s) => s.patient.id === 'pac-10')
  assert.ok(live && live.triggers.length === 0 && live.live)

  for (const state of ['draft', 'sent', 'requested', 'not_delivered', 'received', 'not_found']) {
    assert.ok(requests.some((r) => r.state === state), `no request in state ${state}`)
  }
  assert.ok(requests.some((r) => r.channel === 'fhir'))
  assert.ok(all.some((t) => t.duplicate_alert))
  assert.ok(all.some((t) => t.insurer_request))
  assert.ok(candidates.some((c) => c.decision === 'removed'))
  assert.ok(all.some((t) => Object.values(t.verdicts ?? {}).some((v) => v.length >= 2)))

  for (const c of [...candidates, ...scenarios.flatMap((s) => s.live?.candidates ?? [])]) {
    if (c.pacs_source) assert.ok(c.pacs_source.startsWith('PACS Fakultní nemocnice v Motole'), `${c.id}: pacs_source must be our PACS, got ${c.pacs_source}`)
  }

  const contactIds = scenarios.flatMap((s) => Object.keys(s.contacts))
  assert.equal(new Set(contactIds).size, contactIds.length, `contact defined twice: ${contactIds.join(', ')}`)

  const liveCandidates = scenarios.flatMap((s) => s.live?.candidates ?? [])
  const orgs: (readonly [string | null | undefined, string | null | undefined])[] = [
    ...[...candidates, ...liveCandidates].map((c) => [c.organization_id, c.place] as const),
    ...requests.map((r) => [r.organization_id, r.place] as const),
    ...scenarios.flatMap((s) => Object.values(s.contacts).map((c) => [c.organization_id, c.organization_name] as const)),
  ]
  const nameOf = new Map<string, string>()
  const idOf = new Map<string, string>()
  for (const [id, name] of orgs) {
    if (!id || !name) continue
    assert.equal(nameOf.get(id) ?? name, name, `${id} is both ${nameOf.get(id)} and ${name}`)
    assert.equal(idOf.get(name) ?? id, id, `${name} is both ${idOf.get(name)} and ${id}`)
    nameOf.set(id, name)
    idOf.set(name, id)
  }
})
