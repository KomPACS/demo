/**
 * Jedno dřívější vyšetření zná jen pojišťovna z výpisu pojištěnce, nemocnice je vůbec nehlásila.
 * Zastávka prohlídky: 3.
 */
import { birthNumber } from '../rc.ts'
import { day, at } from '../dates.ts'
import { verdict } from '../trace.ts'
import type { Scenario } from '../types.ts'

const patientId = 'pac-02'
const triggerId = 's02-pojistovna'
const indexDate = day(-760)

const scenario: Scenario = {
  patient: {
    id: patientId,
    sex: 'male',
    birth_year: 1957,
    diagnoses: [{ code: 'C18', display: 'Zhoubný novotvar tlustého střeva' }],
    index_date: indexDate,
    name: 'Petr Dvořák',
    rc: birthNumber('1957-11-03', 'male', 21),
  },
  insurer: '207',
  triggers: [
    {
      trigger: {
        id: triggerId,
        patient_id: patientId,
        kind: 'exam',
        modality: 'CT',
        body_part: 'břicho a pánev',
        date: day(3),
        simulated: false,
      },
      duplicate_alert: null,
      insurer_request: {
        task_id: 'task-s02-1',
        recipient: 'OZP (207)',
        since: indexDate,
        task: {
          resourceType: 'Task',
          status: 'requested',
          intent: 'order',
          for: `Patient/${patientId}`,
          description: 'Dotaz na výpis pojištěnce: zobrazovací vyšetření od data prvozáchytu do dneška.',
        },
      },
      candidates: [
        {
          id: 'cand-s02-1',
          source: 'insurer',
          modality: 'CT',
          date: day(-150),
          description: 'CT hrudníku, břicha a pánve',
          place: 'Nemocnice Jihlava',
          organization_id: 'org-jihlava',
          study_id: null,
          report_id: null,
          status: 'missing',
          is_baseline: false,
          pacs_source: null,
          decision: null,
          decision_reason: null,
          verdict: verdict({
            label: 'relevant',
            reason: 'Kontrolní CT po metastazektomii dle výpisu pojištěnce, v PACS ani v NIS nedohledáno.',
            query: 'Výkony dle výpisu pojištěnce za poslední rok',
            guideline: {
              page: 64,
              quote:
                'CT hrudníku, břicha a pánve jednou za (3)–6 měsíců 2 roky, pak jednou za 6–12 měsíců do 5 let.',
            },
          }),
        },
        {
          id: 'cand-s02-2',
          source: 'nis_record',
          modality: 'CT',
          date: indexDate,
          description: 'CT břicha a pánve',
          place: 'Masarykův onkologický ústav',
          organization_id: null,
          study_id: 'STU-s02-1',
          report_id: null,
          status: 'available',
          is_baseline: true,
          pacs_source: 'PACS Masarykův onkologický ústav',
          decision: null,
          decision_reason: null,
          verdict: verdict({
            label: 'relevant',
            reason: 'Vstupní stagingové CT před léčbou, dostupné v PACS.',
            query: 'Vstupní staging CT u C18',
          }),
        },
      ],
    },
  ],
  requests: [
    {
      id: 'req-s02-1',
      trigger_id: triggerId,
      trigger_date: day(3),
      patient_id: patientId,
      candidate_id: 'cand-s02-1',
      prior_modality: 'CT',
      prior_date: day(-150),
      prior_description: 'CT hrudníku, břicha a pánve',
      place: 'Nemocnice Jihlava',
      organization_id: 'org-jihlava',
      channel: 'email',
      state: 'draft',
      email_draft: 'Dobrý den, žádáme o zaslání zprávy a snímků z vyšetření CT hrudníku, břicha a pánve.',
      created_at: at(-1),
      sent_at: null,
      study_id: null,
      fhir_task: null,
    },
  ],
  timeline: [
    {
      id: 'evt-s02-dx',
      date: at(-760, '09:00'),
      type: 'condition',
      title: 'Stanovena diagnóza C18',
      detail: 'Zhoubný novotvar tlustého střeva',
      resource: `Condition/dx-${patientId}`,
      simulated: false,
    },
    {
      id: 'evt-s02-imaging-1',
      date: at(-760, '10:00'),
      type: 'imaging',
      title: 'CT břicha a pánve',
      detail: null,
      resource: 'ImagingStudy/STU-s02-1',
      simulated: false,
    },
  ],
  contacts: {
    'org-jihlava': {
      organization_id: 'org-jihlava',
      organization_name: 'Nemocnice Jihlava',
      email: 'radiologie@nemocnicejihlava.example.com',
      phone: null,
      source_url: null,
      verified_at: null,
      needs_reverify: false,
      fhir_endpoint: null,
    },
  },
  reports: [],
}

export default scenario
