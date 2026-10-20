import type { components } from '@/api.ts'

export type InsurerCode = '111' | '201' | '205' | '207' | '209' | '211' | '213'

export type Report = {
  id: string
  date: string
  title: string
  text: string
}

export type ScenarioTrigger = {
  trigger: components['schemas']['Trigger']
  candidates: Omit<components['schemas']['Candidate'], 'request_id' | 'request_state'>[]
  duplicate_alert: components['schemas']['DuplicateAlert'] | null
  insurer_request: components['schemas']['InsurerRequest'] | null
  verdicts?: Record<string, components['schemas']['VerdictVersion'][]>
  checked_at?: string | null
}

export type Scenario = {
  patient: components['schemas']['Patient']
  insurer: InsurerCode
  triggers: ScenarioTrigger[]
  requests: Omit<components['schemas']['RequestItem'], 'contact'>[]
  timeline: components['schemas']['TimelineEvent'][]
  contacts: Record<string, components['schemas']['Contact']>
  reports: Report[]
  live?: ScenarioTrigger
}
