/**
 * Všechny dřívější snímky tohoto pacienta jsou už v PACS. Nic se nemusí vyžadovat, nic rozhodovat.
 * Zastávka prohlídky: 6.
 */
import { birthNumber } from '../rc.ts'
import { day, at, workingDaysAhead } from '../dates.ts'
import { verdict, lookupStep, llmStep } from '../trace.ts'
import type { Scenario } from '../types.ts'

const patientId = 'pac-09'
const triggerId = 's09-vse-v-pacs'

let stepMinute = 14
function nextAt(): string {
  return at(0, `09:${String(stepMinute++).padStart(2, '0')}`)
}

const guideline = {
  page: 220,
  quote: 'Základním vyšetřením je CT vyšetření břicha a pánve (možno též zvážit i MRI pro snížení radiační zátěže), CT hrudníku.',
}

const scenario: Scenario = {
  patient: {
    id: patientId,
    sex: 'male',
    birth_year: 1962,
    diagnoses: [{ code: 'C64', display: 'Zhoubný novotvar ledviny, kromě pánvičky ledvinné' }],
    index_date: day(-650),
    name: 'Karel Procházka',
    rc: birthNumber('1962-08-14', 'male', 33),
  },
  insurer: '205',
  triggers: [
    {
      trigger: {
        id: triggerId,
        patient_id: patientId,
        kind: 'exam',
        modality: 'CT',
        body_part: 'břicho a pánev',
        date: workingDaysAhead(6),
        simulated: false,
      },
      duplicate_alert: null,
      insurer_request: null,
      candidates: [
        {
          id: 'cand-s09-1',
          source: 'nis_record',
          modality: 'CT',
          date: day(-620),
          description: 'CT břicha a pánve – vstupní staging',
          place: 'Fakultní nemocnice Královské Vinohrady',
          organization_id: 'org-vinohrady',
          study_id: 'STU-s09-1',
          report_id: null,
          status: 'available',
          is_baseline: true,
          pacs_source: 'PACS Fakultní nemocnice v Motole · přijato přes ePACS z Fakultní nemocnice Královské Vinohrady',
          decision: null,
          decision_reason: null,
          verdict: verdict({
            label: 'relevant',
            reason: 'Vstupní stagingové CT před nefrektomií, dostupné v PACS.',
            query: 'Vstupní staging CT u C64',
            guideline,
            sources: ['PACS', 'NIS'],
            steps: [
              lookupStep('PACS', 'Studie nalezena v PACS FN v Motole, přijato přes ePACS z FN Královské Vinohrady: CT břicha a pánve.', nextAt()),
              llmStep('Doporučení', 'Modrá kniha ČOS, s. 220: CT břicha a pánve, CT hrudníku.'),
              llmStep('Závěr', 'Relevantní. Vstupní staging CT, dostupné v PACS.'),
            ],
          }),
        },
        {
          id: 'cand-s09-2',
          source: 'nis_record',
          modality: 'CT',
          date: day(-600),
          description: 'CT hrudníku',
          place: 'Fakultní nemocnice Královské Vinohrady',
          organization_id: 'org-vinohrady',
          study_id: 'STU-s09-2',
          report_id: null,
          status: 'available',
          is_baseline: false,
          pacs_source: 'PACS Fakultní nemocnice v Motole · přijato přes ePACS z Fakultní nemocnice Královské Vinohrady',
          decision: null,
          decision_reason: null,
          verdict: verdict({
            label: 'relevant',
            reason: 'Součást vstupního stagingu před nefrektomií, dle doporučení doplněno i CT hrudníku.',
            query: 'CT hrudníku u C64 v době stagingu',
            guideline,
            sources: ['PACS', 'NIS'],
            steps: [
              lookupStep('PACS', 'Studie nalezena v PACS FN v Motole, přijato přes ePACS z FN Královské Vinohrady: CT hrudníku.', nextAt()),
              llmStep('Závěr', 'Relevantní. Součást vstupního stagingu.'),
            ],
          }),
        },
        {
          id: 'cand-s09-3',
          source: 'nis_record',
          modality: 'CT',
          date: day(-300),
          description: 'CT břicha a pánve – kontrola po nefrektomii',
          place: 'Fakultní nemocnice Královské Vinohrady',
          organization_id: 'org-vinohrady',
          study_id: 'STU-s09-3',
          report_id: null,
          status: 'available',
          is_baseline: false,
          pacs_source: 'PACS Fakultní nemocnice v Motole · přijato přes ePACS z Fakultní nemocnice Královské Vinohrady',
          decision: null,
          decision_reason: null,
          verdict: verdict({
            label: 'relevant',
            reason: 'Kontrolní CT po nefrektomii dle schématu dispenzarizace renálního karcinomu.',
            query: 'Kontrolní CT po nefrektomii u C64',
            guideline,
            sources: ['PACS', 'NIS'],
            steps: [
              lookupStep('PACS', 'Studie nalezena v PACS FN v Motole, přijato přes ePACS z FN Královské Vinohrady: CT břicha a pánve.', nextAt()),
              llmStep('Závěr', 'Relevantní. Kontrola dle schématu dispenzarizace.'),
            ],
          }),
        },
        {
          id: 'cand-s09-4',
          source: 'nis_record',
          modality: 'USG',
          date: day(-40),
          description: 'USG břicha',
          place: 'Fakultní nemocnice Královské Vinohrady',
          organization_id: 'org-vinohrady',
          study_id: 'STU-s09-4',
          report_id: null,
          status: 'available',
          is_baseline: false,
          pacs_source: 'PACS Fakultní nemocnice v Motole · přijato přes ePACS z Fakultní nemocnice Královské Vinohrady',
          decision: null,
          decision_reason: null,
          verdict: verdict({
            label: 'relevant',
            reason: 'Nedávné kontrolní USG břicha u pacienta s nízkým rizikem rekurence.',
            query: 'USG břicha v rámci dispenzarizace u C64',
            sources: ['PACS', 'NIS'],
            steps: [
              lookupStep('PACS', 'Studie nalezena v PACS FN v Motole, přijato přes ePACS z FN Královské Vinohrady: USG břicha.', nextAt()),
              llmStep('Závěr', 'Relevantní. Nedávná kontrola, dostupná v PACS.'),
            ],
          }),
        },
      ],
    },
  ],
  requests: [],
  timeline: [
    {
      id: 'evt-s09-dx',
      date: at(-650, '09:00'),
      type: 'condition',
      title: 'Stanovena diagnóza C64',
      detail: 'Zhoubný novotvar ledviny, kromě pánvičky ledvinné',
      resource: `Condition/dx-${patientId}`,
      simulated: false,
    },
    {
      id: 'evt-s09-imaging-1',
      date: at(-620, '10:00'),
      type: 'imaging',
      title: 'CT břicha a pánve – vstupní staging',
      detail: null,
      resource: 'ImagingStudy/STU-s09-1',
      simulated: false,
    },
    {
      id: 'evt-s09-imaging-2',
      date: at(-600, '11:00'),
      type: 'imaging',
      title: 'CT hrudníku',
      detail: null,
      resource: 'ImagingStudy/STU-s09-2',
      simulated: false,
    },
    {
      id: 'evt-s09-imaging-3',
      date: at(-300, '09:30'),
      type: 'imaging',
      title: 'CT břicha a pánve – kontrola po nefrektomii',
      detail: null,
      resource: 'ImagingStudy/STU-s09-3',
      simulated: false,
    },
    {
      id: 'evt-s09-imaging-4',
      date: at(-40, '08:45'),
      type: 'imaging',
      title: 'USG břicha',
      detail: null,
      resource: 'ImagingStudy/STU-s09-4',
      simulated: false,
    },
  ],
  contacts: {
    'org-vinohrady': {
      organization_id: 'org-vinohrady',
      organization_name: 'Fakultní nemocnice Královské Vinohrady',
      email: 'radiologie@fnkv.example.com',
      phone: null,
      source_url: null,
      verified_at: day(-90),
      needs_reverify: false,
      fhir_endpoint: null,
    },
  },
  reports: [],
}

export default scenario
