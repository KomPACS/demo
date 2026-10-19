/**
 * Nová diagnóza bez jakékoli zobrazovací historie; první stagingové CT se teprve plánuje.
 */
import { birthNumber } from '../rc.ts'
import { day, at, workingDaysAhead } from '../dates.ts'
import type { Scenario } from '../types.ts'

const patientId = 'pac-08'
const triggerId = 's08-bez-predchozich'
const report1Id = 'rep-s08-1'
const report2Id = 'rep-s08-2'

const scenario: Scenario = {
  patient: {
    id: patientId,
    sex: 'female',
    birth_year: 1975,
    diagnoses: [{ code: 'C50', display: 'Zhoubný novotvar prsu' }],
    index_date: day(-18),
    name: 'Lenka Veselá',
    rc: birthNumber('1975-07-02', 'female', 9),
  },
  insurer: '209',
  triggers: [
    {
      trigger: {
        id: triggerId,
        patient_id: patientId,
        kind: 'exam',
        modality: 'CT',
        body_part: 'hrudník a břicho',
        date: workingDaysAhead(3),
        simulated: false,
      },
      duplicate_alert: null,
      insurer_request: null,
      candidates: [],
    },
  ],
  requests: [],
  timeline: [
    {
      id: 'evt-s08-dx',
      date: at(-18, '09:00'),
      type: 'condition',
      title: 'Stanovena diagnóza C50',
      detail: 'Zhoubný novotvar prsu',
      resource: `Condition/dx-${patientId}`,
      simulated: false,
    },
    {
      id: 'evt-s08-report-1',
      date: at(-16, '10:00'),
      type: 'report',
      title: 'Mamografie a core-cut biopsie',
      detail: null,
      resource: `DiagnosticReport/${report1Id}`,
      simulated: false,
    },
    {
      id: 'evt-s08-report-2',
      date: at(-10, '11:00'),
      type: 'report',
      title: 'Onkologická ambulance – předléčebné vyšetření',
      detail: null,
      resource: `DiagnosticReport/${report2Id}`,
      simulated: false,
    },
  ],
  contacts: {},
  reports: [
    {
      id: report1Id,
      date: day(-16),
      title: 'Mamografie a core-cut biopsie',
      text:
        'Core-cut biopsií prsu histologicky potvrzen invazivní duktální karcinom. Pacientka dosud onkologicky ' +
        'nesledována, žádná dřívější zobrazovací vyšetření k dispozici.',
    },
    {
      id: report2Id,
      date: day(-10),
      title: 'Onkologická ambulance – předléčebné vyšetření',
      text:
        'Nově diagnostikovaný karcinom prsu, indikováno stagingové CT hrudníku a břicha před zahájením ' +
        'neoadjuvantní léčby. Pacientka bez předchozí onkologické anamnézy.',
    },
  ],
}

export default scenario
