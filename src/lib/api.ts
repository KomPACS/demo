import createClient from 'openapi-fetch'
import type { components, paths } from '@/api'
import { mockFetch } from '@/mock'

export type Schemas = components['schemas']
export type Case = Schemas['Case']
export type Candidate = Schemas['Candidate']
export type Contact = Schemas['Contact']
export type LlmCall = Schemas['LlmCall']
export type Patient = Schemas['Patient']
export type RequestItem = Schemas['RequestItem']
export type TimelineEvent = Schemas['TimelineEvent']
export type TriggerSummary = Schemas['TriggerSummary']

export const api = createClient<paths>({ fetch: mockFetch })

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
  return data(
    api.PATCH('/api/triggers/{trigger_id}/candidates/{candidate_id}', {
      params: { path: { trigger_id: triggerId, candidate_id: candidateId } },
      body: { decision, reason, role },
    }),
  )
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
