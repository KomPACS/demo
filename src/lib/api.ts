import createClient from 'openapi-fetch'
import type { components, paths } from '@/api'

export type Schemas = components['schemas']
export type Case = Schemas['Case']
export type Candidate = Schemas['Candidate']
export type Contact = Schemas['Contact']
export type LlmCall = Schemas['LlmCall']
export type Patient = Schemas['Patient']
export type RequestItem = Schemas['RequestItem']
export type TimelineEvent = Schemas['TimelineEvent']
export type TriggerSummary = Schemas['TriggerSummary']

export const api = createClient<paths>()

export async function data<T>(call: Promise<{ data?: T; error?: unknown }>): Promise<T> {
  const { data, error } = await call
  if (error !== undefined || data === undefined) throw new Error(JSON.stringify(error))
  return data
}

export async function decide(
  triggerId: string,
  candidateId: string,
  decision: NonNullable<Candidate['decision']>,
  reason: string | null,
  role: 'doctor' | 'collector',
): Promise<Case> {
  const updated = await data(
    api.PATCH('/api/triggers/{trigger_id}/candidates/{candidate_id}', {
      params: { path: { trigger_id: triggerId, candidate_id: candidateId } },
      body: { decision, reason, role },
    }),
  )
  // shortcut: T1 stubs return the case unchanged, so apply the decision here; drop after T7 (#21).
  return {
    ...updated,
    candidates: updated.candidates.map((c) =>
      c.id === candidateId ? { ...c, decision, decision_reason: reason } : c,
    ),
  }
}

export type Action = 'approve' | 'requested' | 'not-found' | 'deliver'

const actionPath = {
  approve: '/api/requests/{request_id}/approve',
  requested: '/api/requests/{request_id}/requested',
  'not-found': '/api/requests/{request_id}/not-found',
  deliver: '/api/demo/deliver/{request_id}',
} as const

export const act = (id: string, action: Action) =>
  data(api.POST(actionPath[action], { params: { path: { request_id: id } } }))
