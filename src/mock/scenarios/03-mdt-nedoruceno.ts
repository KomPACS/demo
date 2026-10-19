/**
 * Pacient čeká na MDT, ale klíčová MR pánve ze spádové nemocnice zatím nedorazila.
 * Zastávka prohlídky: 4.
 */
import { birthNumber } from '../rc.ts'
import { day, at, workingDaysAhead, workingDaysAgo } from '../dates.ts'
import { verdict } from '../trace.ts'
import type { Scenario } from '../types.ts'

const patientId = 'pac-03'
const triggerId = 's03-mdt-nedoruceno'
const reportId = 'rep-s03-1'

const mdtGuideline = {
  page: 52,
  quote:
    'Plán léčby by měl být stanoven v prostředí multidisciplinárního týmu na pracovišti, kde je komplexní léčba nádorů rekta rutinně prováděna.',
}

const scenario: Scenario = {
  patient: {
    id: patientId,
    sex: 'male',
    birth_year: 1962,
    diagnoses: [{ code: 'C20', display: 'Zhoubný novotvar rekta' }],
    index_date: day(-60),
    name: 'Tomáš Svoboda',
    rc: birthNumber('1962-07-14', 'male', 31),
  },
  insurer: '205',
  triggers: [
    {
      trigger: {
        id: triggerId,
        patient_id: patientId,
        kind: 'mdt',
        modality: null,
        body_part: null,
        date: workingDaysAhead(3),
        simulated: false,
      },
      duplicate_alert: null,
      insurer_request: null,
      candidates: [
        {
          id: 'cand-s03-1',
          source: 'report_text',
          modality: 'MR',
          date: day(-20),
          description: 'MR pánve',
          place: 'Fakultní nemocnice Hradec Králové',
          organization_id: 'org-fnhk',
          study_id: null,
          report_id: reportId,
          status: 'missing',
          is_baseline: false,
          pacs_source: null,
          decision: null,
          decision_reason: null,
          verdict: verdict({
            label: 'relevant',
            reason: 'MR pánve je nezbytná pro posouzení resekability před MDT projednáním.',
            query: 'Předoperační staging u karcinomu rekta',
            source_sentence: 'Doplněno MR pánve k posouzení cirkumferenčního okraje nádoru.',
            guideline: mdtGuideline,
          }),
        },
        {
          id: 'cand-s03-2',
          source: 'nis_record',
          modality: 'CT',
          date: day(-35),
          description: 'CT hrudníku a břicha',
          place: 'Nemocnice Na Bulovce',
          organization_id: 'org-bulovka',
          study_id: 'STU-s03-2',
          report_id: null,
          status: 'available',
          is_baseline: true,
          pacs_source: 'PACS Nemocnice Na Bulovce',
          decision: null,
          decision_reason: null,
          verdict: verdict({
            label: 'relevant',
            reason: 'Vstupní stagingové CT hrudníku a břicha před zahájením léčby.',
            query: 'Vstupní staging CT u karcinomu rekta',
          }),
        },
        {
          id: 'cand-s03-3',
          source: 'report_text',
          modality: 'PT',
          date: day(-15),
          description: 'PET/CT celotělové',
          place: 'Fakultní nemocnice Hradec Králové',
          organization_id: 'org-fnhk',
          study_id: null,
          report_id: reportId,
          status: 'place_unknown',
          is_baseline: false,
          pacs_source: null,
          decision: null,
          decision_reason: null,
          verdict: verdict({
            label: 'uncertain',
            reason: 'Zmínka o PET/CT ve zprávě je nejasná, nelze potvrdit, že bylo provedeno.',
            query: 'PET/CT u karcinomu rekta',
            source_sentence: 'Zvažováno doplnění PET/CT, zatím není jasné, zda bylo provedeno.',
          }),
        },
      ],
    },
  ],
  requests: [
    {
      id: 'req-s03-1',
      trigger_id: triggerId,
      trigger_date: workingDaysAhead(3),
      patient_id: patientId,
      candidate_id: 'cand-s03-1',
      prior_modality: 'MR',
      prior_date: day(-20),
      prior_description: 'MR pánve',
      place: 'Fakultní nemocnice Hradec Králové',
      organization_id: 'org-fnhk',
      channel: 'email',
      state: 'not_delivered',
      email_draft: 'Dobrý den, žádáme o zaslání zprávy a snímků z vyšetření MR pánve.',
      created_at: at(-6),
      sent_at: `${workingDaysAgo(4)}T09:15:00.000Z`,
      study_id: null,
      fhir_task: null,
    },
    {
      id: 'req-s03-2',
      trigger_id: triggerId,
      trigger_date: workingDaysAhead(3),
      patient_id: patientId,
      candidate_id: 'cand-s03-2',
      prior_modality: 'CT',
      prior_date: day(-35),
      prior_description: 'CT hrudníku a břicha',
      place: 'Nemocnice Na Bulovce',
      organization_id: 'org-bulovka',
      channel: 'email',
      state: 'received',
      email_draft: 'Dobrý den, žádáme o zaslání zprávy a snímků z vyšetření CT hrudníku a břicha.',
      created_at: at(-10),
      sent_at: at(-8),
      study_id: 'STU-s03-2',
      fhir_task: null,
    },
  ],
  timeline: [
    {
      id: 'evt-s03-dx',
      date: at(-60, '09:00'),
      type: 'condition',
      title: 'Stanovena diagnóza C20',
      detail: 'Zhoubný novotvar rekta',
      resource: `Condition/dx-${patientId}`,
      simulated: false,
    },
    {
      id: 'evt-s03-imaging-1',
      date: at(-35, '10:00'),
      type: 'imaging',
      title: 'CT hrudníku a břicha',
      detail: null,
      resource: 'ImagingStudy/STU-s03-2',
      simulated: false,
    },
    {
      id: 'evt-s03-report-1',
      date: at(-20, '11:00'),
      type: 'report',
      title: 'Onkochirurgická ambulance – předoperační vyšetření',
      detail: null,
      resource: `DiagnosticReport/${reportId}`,
      simulated: false,
    },
  ],
  contacts: {
    'org-fnhk': {
      organization_id: 'org-fnhk',
      organization_name: 'Fakultní nemocnice Hradec Králové',
      email: 'radiologie@fnhradec.example.com',
      phone: null,
      source_url: null,
      verified_at: day(-30),
      needs_reverify: false,
      fhir_endpoint: null,
    },
  },
  reports: [
    {
      id: reportId,
      date: day(-20),
      title: 'Onkochirurgická ambulance – předoperační vyšetření',
      text:
        'Pacient indikován k MDT projednání karcinomu rekta. Doplněno MR pánve k posouzení cirkumferenčního okraje ' +
        'nádoru. Zvažováno doplnění PET/CT, zatím není jasné, zda bylo provedeno. Stav celkově dobrý, bez komplikací.',
    },
  ],
}

export default scenario
