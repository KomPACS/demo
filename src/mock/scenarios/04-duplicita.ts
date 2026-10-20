/**
 * Plánované CT je skoro jistě duplicita nedávného kontrolního CT, které ještě nedorazilo do PACS.
 * Zastávka prohlídky: 5.
 */
import { birthNumber } from '../rc.ts'
import { day, at, workingDaysAhead } from '../dates.ts'
import { verdict, lookupStep, llmStep, emailDraft } from '../trace.ts'
import type { Scenario } from '../types.ts'

const patientId = 'pac-04'
const triggerId = 's04-duplicita'
const reportId = 'rep-s04-1'
const patientRc = birthNumber('1972-03-10', 'female', 44)

const triggerDate = workingDaysAhead(4)
const duplicateDate = day(-26)
const daysApart = Math.round((Date.parse(triggerDate) - Date.parse(duplicateDate)) / 86_400_000)

let stepMinute = 25
function nextAt(): string {
  return at(0, `08:${String(stepMinute++).padStart(2, '0')}`)
}

const scenario: Scenario = {
  patient: {
    id: patientId,
    sex: 'female',
    birth_year: 1972,
    diagnoses: [{ code: 'C64', display: 'Zhoubný novotvar ledviny' }],
    index_date: day(-900),
    name: 'Hana Veselá',
    rc: patientRc,
  },
  insurer: '211',
  triggers: [
    {
      trigger: {
        id: triggerId,
        patient_id: patientId,
        kind: 'exam',
        modality: 'CT',
        body_part: 'břicho a pánev',
        date: triggerDate,
        simulated: false,
      },
      duplicate_alert: {
        candidate_id: 'cand-s04-1',
        modality: 'CT',
        date: duplicateDate,
        days_apart: daysApart,
      },
      insurer_request: null,
      candidates: [
        {
          id: 'cand-s04-1',
          source: 'report_text',
          modality: 'CT',
          date: duplicateDate,
          description: 'CT břicha a pánve',
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
            reason: 'Kontrolní CT po nefrektomii, pravděpodobně duplicitní s nově plánovaným vyšetřením.',
            query: 'CT břicha a pánve po nefrektomii za poslední měsíc',
            source_sentence: 'Provedeno kontrolní CT břicha a pánve, výsledek zatím není v systému.',
            guideline: {
              page: 220,
              quote:
                'Základním vyšetřením je CT vyšetření břicha a pánve (možno též zvážit i MRI pro snížení radiační zátěže), CT hrudníku.',
            },
            event_status: 'done',
            event_word: 'Provedeno',
            context_before: 'Pacientka po nefrektomii pro karcinom ledviny v dispenzární péči.',
            context_after: 'Stav bez komplikací, doporučena další kontrola za půl roku.',
            source_doc: { type: 'Ambulantní zpráva', department: 'nefrologie, FN Plzeň', date: duplicateDate },
            sources: ['zpráva'],
            steps: [
              lookupStep('Zprávy', 'Nalezené zprávy pacientky z NIS.', nextAt()),
              llmStep('Zmínka', 'CT břicha a pánve, FN Plzeň, provedeno.'),
              lookupStep('PACS', 'FN Plzeň: studie nenalezena.', nextAt()),
              lookupStep('Datum', `${daysApart} dnů před plánovaným CT: pravděpodobná duplicita.`, nextAt()),
              llmStep('Závěr', 'Relevantní. Pravděpodobně duplicitní s nově plánovaným vyšetřením.'),
            ],
          }),
        },
        {
          id: 'cand-s04-2',
          source: 'nis_record',
          modality: 'CT',
          date: day(-900),
          description: 'CT hrudníku, břicha a pánve',
          place: 'Fakultní nemocnice Plzeň',
          organization_id: 'org-fnplzen',
          study_id: 'STU-s04-2',
          report_id: null,
          status: 'available',
          is_baseline: true,
          pacs_source: 'PACS Fakultní nemocnice Plzeň',
          decision: null,
          decision_reason: null,
          verdict: verdict({
            label: 'relevant',
            reason: 'Vstupní stagingové CT před nefrektomií.',
            query: 'Vstupní staging CT u karcinomu ledviny',
            sources: ['PACS', 'NIS'],
            steps: [
              lookupStep('PACS', 'Studie nalezena: FN Plzeň, CT hrudníku, břicha a pánve.', nextAt()),
              llmStep('Závěr', 'Relevantní. Vstupní staging CT, dostupné v PACS.'),
            ],
          }),
        },
        {
          id: 'cand-s04-3',
          source: 'nis_record',
          modality: 'UZ',
          date: day(-180),
          description: 'UZ ledvin a jater',
          place: 'Fakultní nemocnice Plzeň',
          organization_id: 'org-fnplzen',
          study_id: 'STU-s04-3',
          report_id: null,
          status: 'available',
          is_baseline: false,
          pacs_source: 'PACS Fakultní nemocnice Plzeň',
          decision: null,
          decision_reason: null,
          verdict: verdict({
            label: 'relevant',
            reason: 'Pravidelná ultrazvuková kontrola u nízkorizikového nálezu po nefrektomii.',
            query: 'UZ kontrola po nefrektomii',
            sources: ['PACS', 'NIS'],
            steps: [
              lookupStep('PACS', 'Studie nalezena: FN Plzeň, UZ ledvin a jater.', nextAt()),
              llmStep('Závěr', 'Relevantní. Pravidelná ultrazvuková kontrola, dostupná v PACS.'),
            ],
          }),
        },
      ],
    },
  ],
  requests: [
    {
      id: 'req-s04-1',
      trigger_id: triggerId,
      trigger_date: triggerDate,
      patient_id: patientId,
      candidate_id: 'cand-s04-1',
      prior_modality: 'CT',
      prior_date: duplicateDate,
      prior_description: 'CT břicha a pánve',
      place: 'Fakultní nemocnice Plzeň',
      organization_id: 'org-fnplzen',
      channel: 'email',
      state: 'draft',
      email_draft: emailDraft({ sex: 'female', name: 'Hana Veselá', rc: patientRc, examDescription: 'CT břicha a pánve', examDate: duplicateDate, triggerDate }),
      created_at: at(-1),
      sent_at: null,
      study_id: null,
      fhir_task: null,
    },
  ],
  timeline: [
    {
      id: 'evt-s04-dx',
      date: at(-900, '09:00'),
      type: 'condition',
      title: 'Stanovena diagnóza C64',
      detail: 'Zhoubný novotvar ledviny',
      resource: `Condition/dx-${patientId}`,
      simulated: false,
    },
    {
      id: 'evt-s04-imaging-1',
      date: at(-900, '10:00'),
      type: 'imaging',
      title: 'CT hrudníku, břicha a pánve',
      detail: null,
      resource: 'ImagingStudy/STU-s04-2',
      simulated: false,
    },
    {
      id: 'evt-s04-imaging-2',
      date: at(-180, '10:30'),
      type: 'imaging',
      title: 'UZ ledvin a jater',
      detail: null,
      resource: 'ImagingStudy/STU-s04-3',
      simulated: false,
    },
    {
      id: 'evt-s04-report-1',
      date: at(-26, '11:00'),
      type: 'report',
      title: 'Nefrologická ambulance – kontrola',
      detail: null,
      resource: `DiagnosticReport/${reportId}`,
      simulated: false,
    },
  ],
  contacts: {
    'org-fnplzen': {
      organization_id: 'org-fnplzen',
      organization_name: 'Fakultní nemocnice Plzeň',
      email: 'radiologie@fnplzen.example.com',
      phone: '+420 000 456 789',
      source_url: null,
      verified_at: day(-400),
      needs_reverify: true,
      fhir_endpoint: null,
    },
  },
  reports: [
    {
      id: reportId,
      date: duplicateDate,
      title: 'Nefrologická ambulance – kontrola',
      text:
        'Pacientka po nefrektomii pro karcinom ledviny v dispenzární péči. Provedeno kontrolní CT břicha a pánve, ' +
        'výsledek zatím není v systému. Stav bez komplikací, doporučena další kontrola za půl roku.',
    },
  ],
}

export default scenario
