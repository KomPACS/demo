/**
 * Tři dřívější vyšetření AI našla jen ve zprávách, ne v PACS. Koordinátorka je musí vyžádat.
 * Zastávka prohlídky: 2.
 */
import { birthNumber } from '../rc.ts'
import { day, month, at, workingDaysAhead } from '../dates.ts'
import { verdict, lookupStep, llmStep, emailDraft } from '../trace.ts'
import type { Scenario } from '../types.ts'

const [painYear, painMonth] = month(-10).split('-')
const painSentence = `Pacientka udává bolesti břicha v ${Number(painMonth)}/${painYear}.`

const patientId = 'pac-01'
const triggerId = 's01-zpravy'
const report0Id = 'rep-s01-0'
const report1Id = 'rep-s01-1'
const report2Id = 'rep-s01-2'
const patientRc = birthNumber('1968-05-22', 'female', 14)
const triggerDate = workingDaysAhead(3)

let stepMinute = 14
function nextAt(): string {
  return at(0, `08:${String(stepMinute++).padStart(2, '0')}`)
}

const guideline = {
  page: 106,
  quote:
    'Po radikální léčbě karcinomu plic je v prvních dvou letech od jejího ukončení doporučeno provádět kontroly po 3–6 měsících s CT vyšetřením každých 6 měsíců.',
}

const abdVerdict = verdict({
  label: 'uncertain',
  reason: 'Zmínka je nejasná, může jít o jiné vyšetření než sledování plicního nálezu.',
  query: 'CT břicha u C34',
  source_sentence: 'V minulosti také doplněno CT břicha, důvod indikace ve zprávě není jasný.',
  event_status: 'done',
  event_word: 'doplněno',
  context_before: 'Hospitalizace bez komplikací.',
  context_after: painSentence,
  source_doc: { type: 'Propouštěcí zpráva', department: 'onkologie, FN v Motole', date: day(-80) },
  sources: ['zpráva'],
  steps: [
    lookupStep('Zprávy', '12 dokumentů z NIS.', nextAt()),
    llmStep('Zmínka', 'CT břicha v propouštěcí zprávě.'),
    lookupStep('PACS', 'FN v Motole a VFN: studie nenalezena.', nextAt()),
    lookupStep('Doporučení', 'Modrá kniha ČOS pro C34: samostatné CT břicha neuvedeno.', nextAt()),
    llmStep('Závěr', 'Nejisté. Může jít o vyšetření bolesti břicha, ne o sledování plic.'),
  ],
})

const scenario: Scenario = {
  patient: {
    id: patientId,
    sex: 'female',
    birth_year: 1968,
    diagnoses: [{ code: 'C34', display: 'Zhoubný novotvar průdušky a plíce' }],
    index_date: day(-260),
    name: 'Jana Nováková',
    rc: patientRc,
  },
  insurer: '111',
  triggers: [
    {
      trigger: {
        id: triggerId,
        patient_id: patientId,
        kind: 'exam',
        modality: 'CT',
        body_part: 'hrudník',
        date: triggerDate,
        simulated: false,
      },
      duplicate_alert: null,
      insurer_request: null,
      checked_at: at(0, '08:14'),
      candidates: [
        {
          id: 'cand-s01-0',
          source: 'report_text',
          modality: 'CT',
          date: day(-240),
          description: 'CT hrudníku',
          place: 'Fakultní nemocnice v Motole',
          organization_id: 'org-fn-motol',
          study_id: 'STU-s01-0',
          report_id: report0Id,
          status: 'available',
          is_baseline: true,
          pacs_source: 'PACS Fakultní nemocnice v Motole',
          decision: null,
          decision_reason: null,
          verdict: verdict({
            label: 'relevant',
            reason: 'Vstupní CT před léčbou, výchozí bod pro srovnání.',
            query: 'Vstupní staging CT hrudníku u C34',
            source_sentence: 'Vstupní provedeno CT hrudníku s kontrastem, tumor pravého horního laloku 34 mm.',
            event_status: 'done',
            event_word: 'provedeno',
            context_before: 'Indikace: staging nově zjištěného tumoru plíce.',
            context_after: 'Doporučeno MDT.',
            source_doc: { type: 'Radiologický nález', department: 'Radiologická klinika, FN v Motole', date: day(-240) },
            sources: ['PACS', 'zpráva'],
            steps: [
              lookupStep('PACS', 'Studie nalezena: FN v Motole, CT hrudníku.', nextAt()),
              lookupStep('Datum', 'Před zahájením léčby: vstupní vyšetření.', nextAt()),
              llmStep('Závěr', 'Relevantní. Výchozí bod pro hodnocení odpovědi na léčbu.'),
            ],
          }),
        },
        {
          id: 'cand-s01-1',
          source: 'report_text',
          modality: 'CT',
          date: day(-210),
          description: 'CT hrudníku a břicha',
          place: 'Fakultní nemocnice v Motole',
          organization_id: 'org-fn-motol',
          study_id: 'STU-s01-1',
          report_id: report1Id,
          status: 'available',
          is_baseline: false,
          pacs_source: 'PACS Fakultní nemocnice v Motole',
          decision: null,
          decision_reason: null,
          verdict: verdict({
            label: 'relevant',
            reason: 'Poslední stagingové CT hrudníku, přímo srovnatelné s plánovaným vyšetřením.',
            query: 'CT hrudníku u C34 za poslední rok',
            source_sentence: 'Kontrolní CT hrudníku a břicha provedeno, beze změn oproti předchozímu nálezu.',
            guideline,
            event_status: 'done',
            event_word: 'provedeno',
            context_before: 'Kontrola po 3. cyklu chemoterapie.',
            context_after: 'Pokračovat v zavedené léčbě.',
            source_doc: { type: 'Ambulantní zpráva', department: 'pneumologie, FN v Motole', date: day(-140) },
            sources: ['PACS', 'zpráva'],
            steps: [
              lookupStep('PACS', 'Studie nalezena: FN v Motole, CT hrudníku a břicha.', nextAt()),
              llmStep('Zmínka', 'Ambulantní zpráva potvrzuje stejné vyšetření.'),
              llmStep('Závěr', 'Relevantní. Snímky jsou dostupné, žádost není potřeba.'),
            ],
          }),
        },
        {
          id: 'cand-s01-2',
          source: 'report_text',
          modality: 'CT',
          date: day(-150),
          description: 'CT hrudníku',
          place: 'Všeobecná fakultní nemocnice v Praze',
          organization_id: 'org-vfn',
          study_id: null,
          report_id: report1Id,
          status: 'missing',
          is_baseline: false,
          pacs_source: null,
          decision: null,
          decision_reason: null,
          verdict: verdict({
            label: 'relevant',
            reason: 'Novější kontrolní CT hrudníku po poslední linii léčby, zatím není v PACS.',
            query: 'CT hrudníku po poslední léčbě',
            source_sentence: 'Dále doloženo kontrolní CT hrudníku ze Všeobecné fakultní nemocnice v Praze, bez popisu v systému.',
            guideline,
            event_status: 'done',
            event_word: 'doloženo',
            context_before: 'Poslední podání chemoterapie.',
            context_after: 'Nález dle sdělení pacientky stacionární.',
            source_doc: { type: 'Ambulantní zpráva', department: 'pneumologie, FN v Motole', date: day(-140) },
            sources: ['zpráva'],
            steps: [
              lookupStep('Zprávy', 'Nalezené zprávy pacientky z NIS.', nextAt()),
              llmStep('Zmínka', 'CT hrudníku z VFN, doloženo.'),
              lookupStep('PACS', 'FN v Motole a VFN: studie nenalezena.', nextAt()),
              llmStep('Doporučení', 'Modrá kniha ČOS, s. 106: kontrolní CT každých 6 měsíců.'),
              llmStep('Závěr', 'Relevantní. Nejnovější srovnatelné CT, chybí v PACS.'),
            ],
          }),
        },
        {
          id: 'cand-s01-3',
          source: 'report_text',
          modality: 'RTG',
          date: day(-90),
          description: 'RTG hrudníku',
          place: 'Thomayerova nemocnice',
          organization_id: 'org-thomayerova',
          study_id: null,
          report_id: report2Id,
          status: 'missing',
          is_baseline: false,
          pacs_source: null,
          decision: null,
          decision_reason: null,
          verdict: verdict({
            label: 'relevant',
            reason: 'Kontrolní RTG hrudníku krátce po poslední hospitalizaci, vhodné pro srovnání rozsahu nálezu.',
            query: 'RTG hrudníku za poslední 3 měsíce',
            source_sentence: 'Pacientka byla kontrolována RTG hrudníku na plicním oddělení Thomayerovy nemocnice.',
            event_status: 'done',
            event_word: 'byla kontrolována',
            context_before: 'Pacientka přijata pro dušnost.',
            context_after: 'Bez nových ložisek.',
            source_doc: { type: 'Ambulantní zpráva', department: 'onkologie, FN v Motole', date: day(-80) },
            sources: ['zpráva'],
            steps: [
              llmStep('Zmínka', 'RTG hrudníku, Thomayerova nemocnice.'),
              lookupStep('PACS', 'Studie nenalezena.', nextAt()),
              lookupStep('Kontakt', 'E-mail neznámý, jen telefon. Ověření chybí.', nextAt()),
              llmStep('Závěr', 'Relevantní. Ukazuje rozsah nálezu po hospitalizaci.'),
            ],
          }),
        },
        {
          id: 'cand-s01-4',
          source: 'report_text',
          modality: 'CT',
          date: month(-9),
          description: 'CT břicha',
          place: 'Všeobecná fakultní nemocnice v Praze',
          organization_id: 'org-vfn',
          study_id: null,
          report_id: report2Id,
          status: 'missing',
          is_baseline: false,
          pacs_source: null,
          decision: null,
          decision_reason: null,
          verdict: abdVerdict,
        },
      ],
      verdicts: {
        'cand-s01-4': [
          { n: 0, verdict: abdVerdict, active: true },
          {
            n: 1,
            verdict: verdict({
              label: 'not_relevant',
              reason: 'CT břicha souviselo s bolestmi břicha, ne se sledováním plicního nálezu.',
              query: 'CT břicha u C34',
            }),
            active: false,
            category: null,
            new_evidence: painSentence,
          },
        ],
      },
    },
  ],
  requests: [
    {
      id: 'req-s01-1',
      trigger_id: triggerId,
      trigger_date: triggerDate,
      patient_id: patientId,
      candidate_id: 'cand-s01-2',
      prior_modality: 'CT',
      prior_date: day(-150),
      prior_description: 'CT hrudníku',
      place: 'Všeobecná fakultní nemocnice v Praze',
      organization_id: 'org-vfn',
      channel: 'email',
      state: 'draft',
      email_draft: emailDraft({
        sex: 'female',
        name: 'Jana Nováková',
        rc: patientRc,
        examDescription: 'CT hrudníku',
        examDate: day(-150),
        triggerDate,
      }),
      created_at: at(-1),
      sent_at: null,
      study_id: null,
      fhir_task: null,
    },
    {
      id: 'req-s01-2',
      trigger_id: triggerId,
      trigger_date: triggerDate,
      patient_id: patientId,
      candidate_id: 'cand-s01-3',
      prior_modality: 'RTG',
      prior_date: day(-90),
      prior_description: 'RTG hrudníku',
      place: 'Thomayerova nemocnice',
      organization_id: 'org-thomayerova',
      channel: 'phone',
      state: 'draft',
      email_draft: null,
      created_at: at(-1),
      sent_at: null,
      study_id: null,
      fhir_task: null,
    },
  ],
  timeline: [
    {
      id: 'evt-s01-dx',
      date: at(-260, '09:00'),
      type: 'condition',
      title: 'Stanovena diagnóza C34',
      detail: 'Zhoubný novotvar průdušky a plíce',
      resource: `Condition/dx-${patientId}`,
      simulated: false,
    },
    {
      id: 'evt-s01-imaging-0',
      date: at(-240, '10:00'),
      type: 'imaging',
      title: 'CT hrudníku',
      detail: null,
      resource: 'ImagingStudy/STU-s01-0',
      simulated: false,
    },
    {
      id: 'evt-s01-imaging-1',
      date: at(-210, '10:30'),
      type: 'imaging',
      title: 'CT hrudníku a břicha',
      detail: null,
      resource: 'ImagingStudy/STU-s01-1',
      simulated: false,
    },
    {
      id: 'evt-s01-report-1',
      date: at(-140, '14:00'),
      type: 'report',
      title: 'Pneumologická ambulance – kontrola',
      detail: null,
      resource: `DiagnosticReport/${report1Id}`,
      simulated: false,
    },
    {
      id: 'evt-s01-report-2',
      date: at(-80, '11:15'),
      type: 'report',
      title: 'Onkologická ambulance – záznam',
      detail: null,
      resource: `DiagnosticReport/${report2Id}`,
      simulated: false,
    },
  ],
  contacts: {
    'org-vfn': {
      organization_id: 'org-vfn',
      organization_name: 'Všeobecná fakultní nemocnice v Praze',
      email: 'radiologie@vfn.example.com',
      phone: null,
      source_url: null,
      verified_at: day(-30),
      needs_reverify: false,
      fhir_endpoint: null,
    },
    'org-thomayerova': {
      organization_id: 'org-thomayerova',
      organization_name: 'Thomayerova nemocnice',
      email: null,
      phone: '+420 000 123 456',
      source_url: null,
      verified_at: null,
      needs_reverify: false,
      fhir_endpoint: null,
    },
  },
  reports: [
    {
      id: report0Id,
      date: day(-240),
      title: 'Radiologický nález – vstupní CT',
      text: 'Indikace: staging nově zjištěného tumoru plíce. Vstupní provedeno CT hrudníku s kontrastem, tumor pravého horního laloku 34 mm. Doporučeno MDT.',
    },
    {
      id: report1Id,
      date: day(-140),
      title: 'Pneumologická ambulance – kontrola',
      text:
        'Pacientka docházející na dispenzární kontroly pro karcinom plic. Kontrolní CT hrudníku a břicha provedeno, beze změn ' +
        'oproti předchozímu nálezu. Dále doloženo kontrolní CT hrudníku ze Všeobecné fakultní nemocnice v Praze, bez popisu v systému. ' +
        'Doporučeno pokračovat v dispenzarizaci dle standardního schématu.',
    },
    {
      id: report2Id,
      date: day(-80),
      title: 'Onkologická ambulance – záznam',
      text:
        'Pacientka byla kontrolována RTG hrudníku na plicním oddělení Thomayerovy nemocnice, nález stacionární. ' +
        'V minulosti také doplněno CT břicha, důvod indikace ve zprávě není jasný. Stav dobrý, bez nových potíží.',
    },
  ],
}

export default scenario
