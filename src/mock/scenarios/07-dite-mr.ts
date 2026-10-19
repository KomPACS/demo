/**
 * Dětská pacientka v dispenzarizaci po radioterapii gliomu mozkového kmene; pravidelné kontrolní MR mozku.
 */
import { birthNumber } from '../rc.ts'
import { day, at, workingDaysAhead } from '../dates.ts'
import { verdict } from '../trace.ts'
import type { Scenario } from '../types.ts'

const patientId = 'pac-07'
const triggerId = 's07-dite-mr'

const guideline = {
  page: 242,
  quote: 'High grade gliomy (grade 3 a 4): à 3–4 měsíce po 3 roky, poté à 3–6 měsíců do 5. roku, poté à 6 měsíců.',
}

const scenario: Scenario = {
  patient: {
    id: patientId,
    sex: 'female',
    birth_year: 2014,
    diagnoses: [{ code: 'C71', display: 'Zhoubný novotvar mozku' }],
    index_date: day(-540),
    name: 'Eliška Horáková',
    rc: birthNumber('2014-04-18', 'female', 5),
  },
  insurer: '213',
  triggers: [
    {
      trigger: {
        id: triggerId,
        patient_id: patientId,
        kind: 'exam',
        modality: 'MR',
        body_part: 'mozek',
        date: workingDaysAhead(5),
        simulated: false,
      },
      duplicate_alert: null,
      insurer_request: null,
      candidates: [
        {
          id: 'cand-s07-1',
          source: 'nis_record',
          modality: 'MR',
          date: day(-540),
          description: 'MR mozku a mozkového kmene – vstupní nález',
          place: 'Fakultní nemocnice v Motole',
          organization_id: 'org-fn-motol-detska',
          study_id: 'STU-s07-1',
          report_id: null,
          status: 'available',
          is_baseline: true,
          pacs_source: 'PACS Fakultní nemocnice v Motole',
          decision: null,
          decision_reason: null,
          verdict: verdict({
            label: 'relevant',
            reason: 'Vstupní MR mozku před zahájením radioterapie, dostupné v PACS.',
            query: 'Vstupní MR mozku u difuzního gliomu mozkového kmene',
          }),
        },
        {
          id: 'cand-s07-2',
          source: 'nis_record',
          modality: 'MR',
          date: day(-270),
          description: 'MR mozku – kontrola po radioterapii',
          place: 'Fakultní nemocnice v Motole',
          organization_id: 'org-fn-motol-detska',
          study_id: 'STU-s07-2',
          report_id: null,
          status: 'available',
          is_baseline: false,
          pacs_source: 'PACS Fakultní nemocnice v Motole',
          decision: null,
          decision_reason: null,
          verdict: verdict({
            label: 'relevant',
            reason: 'První kontrolní MR po ukončení radioterapie, standardní součást dispenzarizace.',
            query: 'Kontrolní MR mozku po radioterapii',
            guideline,
          }),
        },
        {
          id: 'cand-s07-3',
          source: 'nis_record',
          modality: 'MR',
          date: day(-90),
          description: 'MR mozku – kontrola v rámci dispenzarizace',
          place: 'Fakultní nemocnice v Motole',
          organization_id: 'org-fn-motol-detska',
          study_id: 'STU-s07-3',
          report_id: null,
          status: 'available',
          is_baseline: false,
          pacs_source: 'PACS Fakultní nemocnice v Motole',
          decision: null,
          decision_reason: null,
          verdict: verdict({
            label: 'relevant',
            reason: 'Další kontrolní MR v rámci dispenzarizace, ke srovnání s aktuálním nálezem.',
            query: 'Kontrolní MR mozku v rámci dispenzarizace',
            guideline,
          }),
        },
      ],
    },
  ],
  requests: [],
  timeline: [
    {
      id: 'evt-s07-dx',
      date: at(-540, '09:00'),
      type: 'condition',
      title: 'Stanovena diagnóza C71',
      detail: 'Zhoubný novotvar mozku',
      resource: `Condition/dx-${patientId}`,
      simulated: false,
    },
    {
      id: 'evt-s07-imaging-1',
      date: at(-540, '10:00'),
      type: 'imaging',
      title: 'MR mozku a mozkového kmene – vstupní nález',
      detail: null,
      resource: 'ImagingStudy/STU-s07-1',
      simulated: false,
    },
    {
      id: 'evt-s07-imaging-2',
      date: at(-270, '10:30'),
      type: 'imaging',
      title: 'MR mozku – kontrola po radioterapii',
      detail: null,
      resource: 'ImagingStudy/STU-s07-2',
      simulated: false,
    },
    {
      id: 'evt-s07-imaging-3',
      date: at(-90, '10:30'),
      type: 'imaging',
      title: 'MR mozku – kontrola v rámci dispenzarizace',
      detail: null,
      resource: 'ImagingStudy/STU-s07-3',
      simulated: false,
    },
  ],
  contacts: {},
  reports: [],
}

export default scenario
