/**
 * Dřívější CT je jen v Nemocnici Na Bulovce; žádost jde přes její FHIR endpoint, ne e-mailem.
 */
import { birthNumber } from '../rc.ts'
import { day, at, workingDaysAhead } from '../dates.ts'
import { verdict } from '../trace.ts'
import type { Scenario } from '../types.ts'

const patientId = 'pac-06'
const triggerId = 's06-fhir-bulovka'
const reportId = 'rep-s06-1'

const scenario: Scenario = {
  patient: {
    id: patientId,
    sex: 'male',
    birth_year: 1962,
    diagnoses: [{ code: 'C67', display: 'Zhoubný novotvar močového měchýře' }],
    index_date: day(-600),
    name: 'Miroslav Beneš',
    rc: birthNumber('1962-02-14', 'male', 8),
  },
  insurer: '201',
  triggers: [
    {
      trigger: {
        id: triggerId,
        patient_id: patientId,
        kind: 'exam',
        modality: 'CT',
        body_part: 'břicho a pánev',
        date: workingDaysAhead(4),
        simulated: false,
      },
      duplicate_alert: null,
      insurer_request: null,
      candidates: [
        {
          id: 'cand-s06-1',
          source: 'nis_record',
          modality: 'CT',
          date: day(-600),
          description: 'CT břicha a pánve',
          place: 'Fakultní nemocnice Královské Vinohrady',
          organization_id: null,
          study_id: 'STU-s06-1',
          report_id: null,
          status: 'available',
          is_baseline: true,
          pacs_source: 'PACS Fakultní nemocnice Královské Vinohrady',
          decision: null,
          decision_reason: null,
          verdict: verdict({
            label: 'relevant',
            reason: 'Vstupní stagingové CT před léčbou, dostupné v PACS.',
            query: 'Vstupní staging CT u C67',
          }),
        },
        {
          id: 'cand-s06-2',
          source: 'report_text',
          modality: 'CT',
          date: day(-120),
          description: 'CT břicha a pánve',
          place: 'Nemocnice Na Bulovce',
          organization_id: 'org-bulovka',
          study_id: null,
          report_id: reportId,
          status: 'missing',
          is_baseline: false,
          pacs_source: null,
          decision: null,
          decision_reason: null,
          verdict: verdict({
            label: 'relevant',
            reason: 'Kontrolní CT během hospitalizace v Nemocnici Na Bulovce, dosud nedoloženo v PACS.',
            query: 'CT břicha a pánve za poslední půlrok',
            source_sentence: 'Během hospitalizace na Bulovce doplněno kontrolní CT břicha a pánve, výsledek zdejšímu pracovišti neznámý.',
          }),
        },
      ],
    },
  ],
  requests: [
    {
      id: 'req-s06-1',
      trigger_id: triggerId,
      trigger_date: workingDaysAhead(4),
      patient_id: patientId,
      candidate_id: 'cand-s06-2',
      prior_modality: 'CT',
      prior_date: day(-120),
      prior_description: 'CT břicha a pánve',
      place: 'Nemocnice Na Bulovce',
      organization_id: 'org-bulovka',
      channel: 'fhir',
      state: 'draft',
      email_draft: null,
      created_at: at(-1),
      sent_at: null,
      study_id: null,
      fhir_task: {
        resourceType: 'Task',
        status: 'draft',
        intent: 'order',
        for: { reference: `Patient/${patientId}` },
        focus: { reference: 'ServiceRequest/req-s06-1' },
        description: 'Žádost o zaslání nálezu a snímků z CT břicha a pánve provedeného v Nemocnici Na Bulovce.',
      },
    },
  ],
  timeline: [
    {
      id: 'evt-s06-dx',
      date: at(-600, '09:00'),
      type: 'condition',
      title: 'Stanovena diagnóza C67',
      detail: 'Zhoubný novotvar močového měchýře',
      resource: `Condition/dx-${patientId}`,
      simulated: false,
    },
    {
      id: 'evt-s06-imaging-1',
      date: at(-600, '10:15'),
      type: 'imaging',
      title: 'CT břicha a pánve',
      detail: null,
      resource: 'ImagingStudy/STU-s06-1',
      simulated: false,
    },
    {
      id: 'evt-s06-report-1',
      date: at(-120, '13:00'),
      type: 'report',
      title: 'Propouštěcí zpráva – Nemocnice Na Bulovce',
      detail: null,
      resource: `DiagnosticReport/${reportId}`,
      simulated: false,
    },
  ],
  contacts: {
    'org-bulovka': {
      organization_id: 'org-bulovka',
      organization_name: 'Nemocnice Na Bulovce',
      email: null,
      phone: null,
      source_url: null,
      verified_at: day(-60),
      needs_reverify: false,
      fhir_endpoint: 'https://fhir.nemocnicebulovka.example/r4',
    },
  },
  reports: [
    {
      id: reportId,
      date: day(-120),
      title: 'Propouštěcí zpráva – Nemocnice Na Bulovce',
      text:
        'Pacient hospitalizován pro komplikace po transuretrální resekci. Během hospitalizace na Bulovce doplněno ' +
        'kontrolní CT břicha a pánve, výsledek zdejšímu pracovišti neznámý. Stav při propuštění stabilizovaný, ' +
        'doporučeno pokračovat v dispenzarizaci na urologii dle spádu.',
    },
  ],
}

export default scenario
