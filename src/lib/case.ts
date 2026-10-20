import { useCallback, useEffect, useState } from 'react'
import { api, data, type Candidate, type Case, type RequestItem } from '@/lib/api'

export { sortPriors } from '@/lib/priors'

export function classify(cs: Candidate[]) {
  const toDecide = cs.filter((c) => c.verdict.label === 'uncertain' && !c.decision)
  const removed = cs.filter((c) => c.decision === 'removed')
  const relevant = cs.filter((c) => c.decision === 'relevant' || (!c.decision && c.verdict.label === 'relevant'))
  const notRelevant = cs.filter(
    (c) => c.decision === 'not_relevant' || (!c.decision && c.verdict.label === 'not_relevant'),
  )
  return { toDecide, removed, relevant, notRelevant }
}

export const isReady = (c: Candidate, r?: RequestItem) =>
  c.status === 'available' || (r?.state ?? c.request_state) === 'received'

// shortcut: two static mock viewer screenshots, replace with the hospital PACS viewer deep link.
export const pacsViewerUrl = (candidateId: string) =>
  `/pacs/study-${([...candidateId].reduce((n, ch) => n + ch.charCodeAt(0), 0) % 2) + 1}.jpg`

export const sendable = (r: RequestItem) =>
  r.state === 'draft' && ((r.channel === 'email' && Boolean(r.contact?.email)) || r.channel === 'fhir')

export function progress(kase: Case, requests: RequestItem[]) {
  const { relevant } = classify(kase.candidates)
  const byCandidate = new Map(requests.map((r) => [r.candidate_id, r]))
  return { ready: relevant.filter((c) => isReady(c, byCandidate.get(c.id))).length, total: relevant.length }
}

export const priorAnchor = (id: string) => `prior-${id}`

export function gapLabel(date: string | null, triggerDate: string): string | null {
  if (!date) return null
  const [y, m, d] = date.slice(0, 10).split('-').map(Number)
  const [ty, tm, td] = triggerDate.slice(0, 10).split('-').map(Number)
  const days = Math.round((Date.UTC(ty, (tm || 1) - 1, td || 1) - Date.UTC(y, (m || 1) - 1, d || 1)) / 86_400_000)
  if (days <= 0) return null
  const months = Math.round(days / 30.44)
  return months < 1 ? `${days} dní před` : `${months} měs. před`
}

export function useCase(triggerId: string) {
  const [kase, setCase] = useState<Case | null>(null)
  const [requests, setRequests] = useState<RequestItem[]>([])
  const [error, setError] = useState<string | null>(null)

  const loadRequests = useCallback(
    () =>
      data(api.GET('/api/queue'))
        .then((rs) => setRequests(rs.filter((r) => r.trigger_id === triggerId)))
        .catch(() => setError('Žádosti se nepodařilo načíst.')),
    [triggerId],
  )

  const loadCase = useCallback(
    () =>
      data(api.GET('/api/triggers/{trigger_id}', { params: { path: { trigger_id: triggerId } } }))
        .then(setCase)
        .catch(() => setError('Případ se nepodařilo načíst.')),
    [triggerId],
  )

  useEffect(() => {
    loadCase()
    loadRequests()
  }, [loadCase, loadRequests])

  return { kase, setCase, requests, setRequests, loadRequests, loadCase, error }
}
