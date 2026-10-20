/**
 * Žádost o předchozí PET/CT čeká na telefonické vyřízení, kontakt na pracoviště je potřeba znovu ověřit.
 */
import { birthNumber } from '../rc.ts'
import { day, at, workingDaysAhead } from '../dates.ts'
import { verdict } from '../trace.ts'
import type { Scenario } from '../types.ts'

const patientId = 'pac-13'
const triggerId = 'f13-telefon-cekame'
const reportId = 'rep-f13-1'

const scenario: Scenario = {
  patient: {
    id: patientId,
    sex: 'male',
    birth_year: 1954,
    diagnoses: [{ code: 'C61', display: 'Zhoubný novotvar prostaty' }],
    index_date: day(-900),
    name: 'Zdeněk Fiala',
    rc: birthNumber('1954-06-15', 'male', 513),
  },
  insurer: '201',
  triggers: [
    {
      trigger: {
        id: triggerId,
        patient_id: patientId,
        kind: 'exam',
        modality: 'PT',
        body_part: 'pánev',
        date: workingDaysAhead(4),
        simulated: false,
      },
      duplicate_alert: null,
      insurer_request: null,
      candidates: [
        {
          id: 'cand-f13-1',
          source: 'report_text',
          modality: 'PET/CT',
          date: day(-180),
          description: 'PET/CT restaging',
          place: 'Fakultní nemocnice Plzeň',
          organization_id: 'org-fnplzen',
          study_id: null,
          report_id: reportId,
          status: 'missing',
          is_baseline: false,
          pacs_source: null,
          decision: null,
          decision_reason: null,
          verdict: verdict({
            label: 'relevant',
            reason:
              'Jde o poslední zobrazovací vyšetření po biochemickém relapsu PSA, nutné pro zhodnocení rozsahu nového postižení.',
            query: 'Zobrazovací vyšetření po biochemickém relapsu PSA',
            source_sentence: 'Indikováno PET/CT restaging ve Fakultní nemocnici Plzeň, výsledek dosud nedodán.',
            guideline: {
              page: 200,
              quote: 'PET/CT ev. PET/MR používáme zvláště v rámci restagingu při biochemickém relapsu.',
            },
          }),
        },
      ],
    },
  ],
  requests: [
    {
      id: 'req-f13-1',
      trigger_id: triggerId,
      trigger_date: workingDaysAhead(4),
      patient_id: patientId,
      candidate_id: 'cand-f13-1',
      prior_modality: 'PET/CT',
      prior_date: day(-180),
      prior_description: 'PET/CT restaging',
      place: 'Fakultní nemocnice Plzeň',
      organization_id: 'org-fnplzen',
      channel: 'phone',
      state: 'requested',
      email_draft: null,
      created_at: at(-6),
      sent_at: null,
      study_id: null,
      fhir_task: null,
    },
  ],
  timeline: [
    {
      id: 'evt-f13-dx',
      date: at(-900, '09:00'),
      type: 'condition',
      title: 'Stanovena diagnóza C61',
      detail: 'Zhoubný novotvar prostaty',
      resource: `Condition/dx-${patientId}`,
      simulated: false,
    },
    {
      id: 'evt-f13-report-1',
      date: at(-180, '10:00'),
      type: 'report',
      title: 'Urologická ambulance – záznam',
      detail: null,
      resource: `DiagnosticReport/${reportId}`,
      simulated: false,
    },
  ],
  contacts: {},
  reports: [
    {
      id: reportId,
      date: day(-180),
      title: 'Urologická ambulance – záznam',
      text:
        'Pacient sledován pro karcinom prostaty po radikální prostatektomii, nyní biochemický relaps PSA. ' +
        'Indikováno PET/CT restaging ve Fakultní nemocnici Plzeň, výsledek dosud nedodán. Doporučeno zajistit ' +
        'výsledek před projednáním na MDT.',
    },
  ],
}

export default scenario
