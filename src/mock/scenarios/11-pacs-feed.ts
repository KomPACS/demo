/**
 * Jedno dřívější vyšetření se vrátilo externě žádostí, druhé čeká na ukázkový příjezd PACS feedu.
 */
import { birthNumber } from '../rc.ts'
import { day, at, workingDaysAhead } from '../dates.ts'
import { verdict } from '../trace.ts'
import type { Scenario } from '../types.ts'

const patientId = 'pac-11'
const triggerId = 'f11-pacs-feed'

const guideline = {
  page: 230,
  quote:
    'Zobrazovací metody (CT hrudníku, břicha a malé pánve s vylučovací fází, UZ břicha a pánve) by měla být indikována na základě rizika možné rekurence onemocnění v intervalu à 6 měsíců po dobu 3 let a poté à 1 rok po dobu 5 let.',
}

const scenario: Scenario = {
  patient: {
    id: patientId,
    sex: 'male',
    birth_year: 1956,
    diagnoses: [{ code: 'C67', display: 'Zhoubný novotvar močového měchýře' }],
    index_date: day(-500),
    name: 'Jaroslav Veselý',
    rc: birthNumber('1956-03-20', 'male', 61),
  },
  insurer: '207',
  triggers: [
    {
      trigger: {
        id: triggerId,
        patient_id: patientId,
        kind: 'exam',
        modality: 'CT',
        body_part: 'hrudník, břicho a pánev',
        date: workingDaysAhead(7),
        simulated: false,
      },
      duplicate_alert: null,
      insurer_request: null,
      candidates: [
        {
          id: 'cand-f11-1',
          source: 'nis_record',
          modality: 'CT',
          date: day(-150),
          description: 'CT hrudníku, břicha a pánve – kontrola po cystektomii',
          place: 'Oblastní nemocnice Kolín',
          organization_id: 'org-kolin',
          study_id: 'STU-f11-1',
          report_id: null,
          status: 'available',
          is_baseline: false,
          pacs_source: 'Doručeno z Oblastní nemocnice Kolín',
          decision: null,
          decision_reason: null,
          verdict: verdict({
            label: 'relevant',
            reason: 'Kontrolní CT hrudníku, břicha a pánve po cystektomii dle dispenzarizačního schématu.',
            query: 'Kontrolní CT po cystektomii u C67',
            guideline,
          }),
        },
        {
          id: 'cand-f11-2',
          source: 'nis_record',
          modality: 'CT',
          date: day(-2),
          description: 'CT břicha a pánve – kontrola',
          place: null,
          organization_id: null,
          study_id: 'STU-f11-2',
          report_id: null,
          status: 'missing',
          is_baseline: false,
          pacs_source: null,
          decision: null,
          decision_reason: null,
          verdict: verdict({
            label: 'relevant',
            reason: 'Nedávné kontrolní CT provedené ve vlastním zařízení, zatím nesynchronizováno z PACS feedu.',
            query: 'Nedávné kontrolní CT po cystektomii u C67',
            guideline,
          }),
        },
      ],
    },
  ],
  requests: [
    {
      id: 'req-f11-1',
      trigger_id: triggerId,
      trigger_date: workingDaysAhead(7),
      patient_id: patientId,
      candidate_id: 'cand-f11-1',
      prior_modality: 'CT',
      prior_date: day(-150),
      prior_description: 'CT hrudníku, břicha a pánve – kontrola po cystektomii',
      place: 'Oblastní nemocnice Kolín',
      organization_id: 'org-kolin',
      channel: 'email',
      state: 'received',
      email_draft: 'Dobrý den, žádáme o zaslání zprávy a snímků z vyšetření CT hrudníku, břicha a pánve po cystektomii.',
      created_at: at(-20),
      sent_at: at(-10),
      study_id: 'STU-f11-1',
      fhir_task: null,
    },
  ],
  timeline: [
    {
      id: 'evt-f11-dx',
      date: at(-500, '09:00'),
      type: 'condition',
      title: 'Stanovena diagnóza C67',
      detail: 'Zhoubný novotvar močového měchýře',
      resource: `Condition/dx-${patientId}`,
      simulated: false,
    },
    {
      id: 'evt-f11-imaging-1',
      date: at(-150, '10:15'),
      type: 'imaging',
      title: 'CT hrudníku, břicha a pánve – kontrola po cystektomii',
      detail: null,
      resource: 'ImagingStudy/STU-f11-1',
      simulated: false,
    },
    {
      id: 'evt-f11-imaging-2',
      date: at(-2, '08:30'),
      type: 'imaging',
      title: 'CT břicha a pánve – kontrola',
      detail: 'bez snímků v PACS',
      resource: 'ImagingStudy/STU-f11-2',
      simulated: false,
    },
  ],
  contacts: {
    'org-kolin': {
      organization_id: 'org-kolin',
      organization_name: 'Oblastní nemocnice Kolín',
      email: 'radiologie@nemocnicekolin.example.com',
      phone: null,
      source_url: null,
      verified_at: day(-60),
      needs_reverify: false,
      fhir_endpoint: null,
    },
  },
  reports: [],
}

export default scenario
