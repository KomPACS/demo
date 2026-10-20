/**
 * Pacientka ještě nemá naplánovanou kontrolu. Koordinátorka ji spustí ručně tlačítkem „Spustit kontrolu“.
 * Zastávka prohlídky: 1.
 */
import { birthNumber } from '../rc.ts'
import { day, at, workingDaysAhead } from '../dates.ts'
import { verdict, lookupStep, llmStep, emailDraft } from '../trace.ts'
import type { Scenario } from '../types.ts'

const patientId = 'pac-10'
const triggerId = 's10-ziva-kontrola'
const reportId = 'rep-s10-1'
const patientRc = birthNumber('1969-02-09', 'female', 58)
const triggerDate = workingDaysAhead(5)

let stepMinute = 14
function nextAt(): string {
  return at(0, `09:${String(stepMinute++).padStart(2, '0')}`)
}

const guideline = {
  page: 80,
  quote: 'CT vyšetření na zvážení při symptomech a elevaci CA 19-9.',
}

const scenario: Scenario = {
  patient: {
    id: patientId,
    sex: 'female',
    birth_year: 1969,
    diagnoses: [{ code: 'C25', display: 'Zhoubný novotvar slinivky břišní' }],
    index_date: day(-300),
    name: 'Lenka Pokorná',
    rc: patientRc,
  },
  insurer: '211',
  triggers: [],
  live: {
    trigger: {
      id: triggerId,
      patient_id: patientId,
      kind: 'exam',
      modality: 'CT',
      body_part: 'břicho',
      date: triggerDate,
      simulated: false,
    },
    duplicate_alert: null,
    insurer_request: null,
    candidates: [
      {
        id: 'cand-s10-1',
        source: 'nis_record',
        modality: 'CT',
        date: day(-90),
        description: 'CT břicha',
        place: 'Pardubická nemocnice',
        organization_id: 'org-pardubice',
        study_id: null,
        report_id: null,
        status: 'missing',
        is_baseline: false,
        pacs_source: null,
        decision: null,
        decision_reason: null,
        verdict: verdict({
          label: 'relevant',
          reason: 'Kontrolní CT břicha po resekci pankreatu, provedené blíže bydliště, zatím není v místním PACS.',
          query: 'CT břicha po resekci pankreatu za poslední půlrok',
          guideline,
          sources: ['NIS'],
          steps: [
            lookupStep('PACS', 'Pardubická nemocnice: studie zatím nenalezena.', nextAt()),
            llmStep('Doporučení', 'Modrá kniha ČOS, s. 80: CT při symptomech a elevaci CA 19-9.'),
            llmStep('Závěr', 'Relevantní. Kontrolní CT po resekci pankreatu, zatím mimo PACS.'),
          ],
        }),
      },
      {
        id: 'cand-s10-2',
        source: 'report_text',
        modality: 'CT',
        date: null,
        description: 'Vyšetření břicha – blíže neurčeno',
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
          label: 'uncertain',
          reason: 'Zmínka ve zprávě neuvádí modalitu, datum ani pracoviště, nelze ověřit souvislost se sledováním pankreatu.',
          query: 'Vyšetření břicha u C25 zmíněné ve zprávě',
          source_sentence:
            'V dokumentaci zmíněno také vyšetření břicha z jiného pracoviště, bližší údaje (modalita, datum) nejsou v textu uvedeny.',
          event_status: 'unclear',
          event_word: 'zmíněno',
          context_before: 'Pacientka po resekci pankreatu, v dispenzarizaci, aktuálně bez obtíží, CA 19-9 bez elevace.',
          context_after: 'Doporučeno doplnit při příští kontrole.',
          source_doc: { type: 'Ambulantní zpráva', department: 'chirurgie, FN Hradec Králové', date: day(-70) },
          sources: ['zpráva'],
          steps: [
            llmStep('Zmínka', 'Vyšetření břicha zmíněno bez modality a data.'),
            lookupStep('PACS', 'Studie nenalezena, pracoviště neznámé.', nextAt()),
            llmStep('Závěr', 'Nejisté. Nelze ověřit souvislost se sledováním pankreatu.'),
          ],
        }),
      },
      {
        id: 'cand-s10-3',
        source: 'nis_record',
        modality: 'CT',
        date: day(-290),
        description: 'CT břicha a pánve – vstupní staging po resekci',
        place: 'Fakultní nemocnice Hradec Králové',
        organization_id: 'org-fnhk',
        study_id: 'STU-s10-3',
        report_id: null,
        status: 'available',
        is_baseline: true,
        pacs_source: 'PACS Fakultní nemocnice Hradec Králové',
        decision: null,
        decision_reason: null,
        verdict: verdict({
          label: 'relevant',
          reason: 'Vstupní kontrolní CT po radikální resekci pankreatu, dostupné v PACS.',
          query: 'Vstupní kontrolní CT po resekci pankreatu',
          guideline,
          sources: ['PACS', 'NIS'],
          steps: [
            lookupStep('PACS', 'Studie nalezena: FN Hradec Králové, CT břicha a pánve.', nextAt()),
            llmStep('Závěr', 'Relevantní. Vstupní kontrolní CT po resekci, dostupné v PACS.'),
          ],
        }),
      },
      {
        id: 'cand-s10-4',
        source: 'nis_record',
        modality: 'USG',
        date: day(-30),
        description: 'USG jater',
        place: 'Fakultní nemocnice Hradec Králové',
        organization_id: 'org-fnhk',
        study_id: 'STU-s10-4',
        report_id: null,
        status: 'available',
        is_baseline: false,
        pacs_source: 'PACS Fakultní nemocnice Hradec Králové',
        decision: null,
        decision_reason: null,
        verdict: verdict({
          label: 'relevant',
          reason: 'Nedávné kontrolní USG jater v rámci dispenzarizace po resekci pankreatu.',
          query: 'USG jater v rámci dispenzarizace u C25',
          sources: ['PACS', 'NIS'],
          steps: [
            lookupStep('PACS', 'Studie nalezena: FN Hradec Králové, USG jater.', nextAt()),
            llmStep('Závěr', 'Relevantní. Nedávná kontrola, dostupná v PACS.'),
          ],
        }),
      },
    ],
  },
  requests: [
    {
      id: 'req-s10-1',
      trigger_id: triggerId,
      trigger_date: triggerDate,
      patient_id: patientId,
      candidate_id: 'cand-s10-1',
      prior_modality: 'CT',
      prior_date: day(-90),
      prior_description: 'CT břicha',
      place: 'Pardubická nemocnice',
      organization_id: 'org-pardubice',
      channel: 'email',
      state: 'draft',
      email_draft: emailDraft({ sex: 'female', name: 'Lenka Pokorná', rc: patientRc, examDescription: 'CT břicha', examDate: day(-90), triggerDate }),
      created_at: at(-1),
      sent_at: null,
      study_id: null,
      fhir_task: null,
    },
  ],
  timeline: [
    {
      id: 'evt-s10-dx',
      date: at(-300, '09:00'),
      type: 'condition',
      title: 'Stanovena diagnóza C25',
      detail: 'Zhoubný novotvar slinivky břišní',
      resource: `Condition/dx-${patientId}`,
      simulated: false,
    },
    {
      id: 'evt-s10-imaging-3',
      date: at(-290, '09:30'),
      type: 'imaging',
      title: 'CT břicha a pánve – vstupní staging po resekci',
      detail: null,
      resource: 'ImagingStudy/STU-s10-3',
      simulated: false,
    },
    {
      id: 'evt-s10-report',
      date: at(-70, '13:00'),
      type: 'report',
      title: 'Chirurgická ambulance – kontrola',
      detail: null,
      resource: `DiagnosticReport/${reportId}`,
      simulated: false,
    },
    {
      id: 'evt-s10-imaging-4',
      date: at(-30, '08:15'),
      type: 'imaging',
      title: 'USG jater',
      detail: null,
      resource: 'ImagingStudy/STU-s10-4',
      simulated: false,
    },
  ],
  contacts: {
    'org-pardubice': {
      organization_id: 'org-pardubice',
      organization_name: 'Pardubická nemocnice',
      email: 'radiologie@nemocnicepardubice.example.com',
      phone: null,
      source_url: null,
      verified_at: null,
      needs_reverify: false,
      fhir_endpoint: null,
    },
  },
  reports: [
    {
      id: reportId,
      date: day(-70),
      title: 'Chirurgická ambulance – kontrola',
      text:
        'Pacientka po resekci pankreatu, v dispenzarizaci, aktuálně bez obtíží, CA 19-9 bez elevace. ' +
        'V dokumentaci zmíněno také vyšetření břicha z jiného pracoviště, bližší údaje (modalita, datum) nejsou v textu uvedeny. ' +
        'Doporučeno doplnit při příští kontrole.',
    },
  ],
}

export default scenario
