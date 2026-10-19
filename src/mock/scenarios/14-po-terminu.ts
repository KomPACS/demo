/**
 * Kontrolní CT po nefrektomii je už po termínu, žádost o starší snímky byla mezitím odeslána e-mailem.
 */
import { birthNumber } from '../rc.ts'
import { day, at, workingDaysAgo } from '../dates.ts'
import { verdict } from '../trace.ts'
import type { Scenario } from '../types.ts'

const patientId = 'pac-14'
const triggerId = 'f14-po-terminu'
const reportId = 'rep-f14-1'

const scenario: Scenario = {
  patient: {
    id: patientId,
    sex: 'male',
    birth_year: 1962,
    diagnoses: [{ code: 'C64', display: 'Zhoubný novotvar ledviny' }],
    index_date: day(-500),
    name: 'Miroslav Marek',
    rc: birthNumber('1962-09-30', 'male', 514),
  },
  insurer: '213',
  triggers: [
    {
      trigger: {
        id: triggerId,
        patient_id: patientId,
        kind: 'exam',
        modality: 'CT',
        body_part: 'hrudník a břicho',
        date: workingDaysAgo(5),
        simulated: false,
      },
      duplicate_alert: null,
      insurer_request: null,
      candidates: [
        {
          id: 'cand-f14-1',
          source: 'nis_record',
          modality: 'CT',
          date: day(-400),
          description: 'CT břicha a pánve',
          place: 'Fakultní nemocnice Ostrava',
          organization_id: 'org-ostrava',
          study_id: null,
          report_id: null,
          status: 'missing',
          is_baseline: true,
          pacs_source: null,
          decision: null,
          decision_reason: null,
          verdict: verdict({
            label: 'relevant',
            reason: 'Jde o kontrolní CT po nefrektomii v rámci sledování rizika relapsu, zatím nedoloženo.',
            query: 'Sledování po nefrektomii dle rizika relapsu',
            guideline: {
              page: 220,
              quote:
                'Základním vyšetřením je CT vyšetření břicha a pánve (možno též zvážit i MRI pro snížení radiační zátěže), CT hrudníku.',
            },
          }),
        },
        {
          id: 'cand-f14-2',
          source: 'report_text',
          modality: 'CT',
          date: day(-60),
          description: 'CT hrudníku',
          place: 'Nemocnice Pardubice',
          organization_id: 'org-pardubice',
          study_id: 'STU-f14-1',
          report_id: reportId,
          status: 'available',
          is_baseline: false,
          pacs_source: 'PACS Nemocnice Pardubice',
          decision: null,
          decision_reason: null,
          verdict: verdict({
            label: 'relevant',
            reason: 'Nedávné kontrolní CT hrudníku bez nových ložisek, vhodné pro srovnání s plánovaným vyšetřením.',
            query: 'CT hrudníku za poslední půlrok',
            source_sentence: 'Kontrolní CT hrudníku bez známek metastatického postižení.',
          }),
        },
      ],
    },
  ],
  requests: [
    {
      id: 'req-f14-1',
      trigger_id: triggerId,
      trigger_date: workingDaysAgo(5),
      patient_id: patientId,
      candidate_id: 'cand-f14-1',
      prior_modality: 'CT',
      prior_date: day(-400),
      prior_description: 'CT břicha a pánve',
      place: 'Fakultní nemocnice Ostrava',
      organization_id: 'org-ostrava',
      channel: 'email',
      state: 'sent',
      email_draft: 'Dobrý den, žádáme o zaslání zprávy a snímků z vyšetření CT břicha a pánve.',
      created_at: at(-6),
      sent_at: at(-5),
      study_id: null,
      fhir_task: null,
    },
  ],
  timeline: [
    {
      id: 'evt-f14-dx',
      date: at(-500, '09:00'),
      type: 'condition',
      title: 'Stanovena diagnóza C64',
      detail: 'Zhoubný novotvar ledviny',
      resource: `Condition/dx-${patientId}`,
      simulated: false,
    },
    {
      id: 'evt-f14-imaging-1',
      date: at(-60, '11:00'),
      type: 'imaging',
      title: 'CT hrudníku',
      detail: null,
      resource: 'ImagingStudy/STU-f14-1',
      simulated: false,
    },
    {
      id: 'evt-f14-report-1',
      date: at(-60, '14:30'),
      type: 'report',
      title: 'Onkologická ambulance – kontrola',
      detail: null,
      resource: `DiagnosticReport/${reportId}`,
      simulated: false,
    },
  ],
  contacts: {
    'org-ostrava': {
      organization_id: 'org-ostrava',
      organization_name: 'Fakultní nemocnice Ostrava',
      email: 'radiologie@nemocniceostrava.example.com',
      phone: null,
      source_url: null,
      verified_at: day(-60),
      needs_reverify: false,
      fhir_endpoint: null,
    },
  },
  reports: [
    {
      id: reportId,
      date: day(-60),
      title: 'Onkologická ambulance – kontrola',
      text:
        'Pacient dispenzarizován pro karcinom ledviny po nefrektomii. Kontrolní CT hrudníku bez známek ' +
        'metastatického postižení. Stav stabilizovaný, pokračuje v pravidelných kontrolách.',
    },
  ],
}

export default scenario
