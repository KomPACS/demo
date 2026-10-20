/**
 * Dřívější mamografie je zmíněna jen ve zprávě, pracoviště se nepodařilo telefonicky dohledat.
 */
import { birthNumber } from '../rc.ts'
import { day, at, workingDaysAhead } from '../dates.ts'
import { verdict } from '../trace.ts'
import type { Scenario } from '../types.ts'

const patientId = 'pac-12'
const triggerId = 'f12-mg-misto-neznamo'
const reportId = 'rep-f12-1'

const scenario: Scenario = {
  patient: {
    id: patientId,
    sex: 'female',
    birth_year: 1975,
    diagnoses: [{ code: 'C50', display: 'Zhoubný novotvar prsu' }],
    index_date: day(-300),
    name: 'Martina Krejčí',
    rc: birthNumber('1975-02-10', 'female', 512),
  },
  insurer: '209',
  triggers: [
    {
      trigger: {
        id: triggerId,
        patient_id: patientId,
        kind: 'exam',
        modality: 'MR',
        body_part: 'prsy',
        date: workingDaysAhead(7),
        simulated: false,
      },
      duplicate_alert: null,
      insurer_request: null,
      candidates: [
        {
          id: 'cand-f12-1',
          source: 'report_text',
          modality: 'MG',
          date: day(-200),
          description: 'MG prsou',
          place: null,
          organization_id: null,
          study_id: null,
          report_id: reportId,
          status: 'place_unknown',
          is_baseline: false,
          pacs_source: null,
          decision: null,
          decision_reason: null,
          verdict: verdict({
            label: 'relevant',
            reason:
              'Zmíněné mamografické vyšetření prsou mohlo zachytit časné změny, pracoviště ani přesné datum ale nelze z textu dohledat.',
            query: 'Předchozí zobrazovací vyšetření prsou u C50',
            source_sentence: 'V minulosti podstoupila mamografické vyšetření prsou, bližší údaje o pracovišti chybí.',
            guideline: {
              page: 128,
              quote:
                'MRI vyšetření prsů je indikováno individuálně, nejčastěji v případě nejasného nálezu na MG/UZ vyšetření nebo upřesnění rozsahu postižení v prsu.',
            },
          }),
        },
      ],
    },
  ],
  requests: [
    {
      id: 'req-f12-1',
      trigger_id: triggerId,
      trigger_date: workingDaysAhead(7),
      patient_id: patientId,
      candidate_id: 'cand-f12-1',
      prior_modality: 'MG',
      prior_date: day(-200),
      prior_description: 'MG prsou',
      place: null,
      organization_id: null,
      channel: 'phone',
      state: 'not_found',
      email_draft: null,
      created_at: at(-3),
      sent_at: null,
      study_id: null,
      fhir_task: null,
    },
  ],
  timeline: [
    {
      id: 'evt-f12-dx',
      date: at(-300, '09:00'),
      type: 'condition',
      title: 'Stanovena diagnóza C50',
      detail: 'Zhoubný novotvar prsu',
      resource: `Condition/dx-${patientId}`,
      simulated: false,
    },
    {
      id: 'evt-f12-report-1',
      date: at(-200, '13:00'),
      type: 'report',
      title: 'Chirurgická ambulance – kontrola',
      detail: null,
      resource: `DiagnosticReport/${reportId}`,
      simulated: false,
    },
  ],
  contacts: {},
  reports: [
    {
      id: reportId,
      date: day(-200),
      title: 'Chirurgická ambulance – kontrola',
      text:
        'Pacientka po záchovné operaci prsu pro karcinom, dispenzarizována na chirurgické ambulanci. V minulosti ' +
        'podstoupila mamografické vyšetření prsou, bližší údaje o pracovišti chybí. Doporučeno doplnit MR prsů ' +
        'k upřesnění rozsahu nálezu.',
    },
  ],
}

export default scenario
