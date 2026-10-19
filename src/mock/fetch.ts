import type { components, paths } from '@/api.ts'
import type { Store } from './store.ts'
import { NotFound, Conflict } from './store.ts'

type Schemas = components['schemas']
type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete'

type JsonBody<Op> = Op extends { responses: { 200: { content: { 'application/json': infer B } } } } ? B : never

type DefinedMethods<P extends keyof paths> = {
  [M in HttpMethod]: undefined extends paths[P][M] ? never : M
}[HttpMethod]

type RouteContext = { params: Record<string, string>; query: URLSearchParams; body: unknown }

type RouteTable = {
  [P in keyof paths]: {
    [M in DefinedMethods<P>]: (ctx: RouteContext) => JsonBody<paths[P][M]>
  }
}

function num(params: Record<string, string>, key: string): number {
  return Number(params[key])
}

function str(params: Record<string, string>, key: string): string {
  return params[key] ?? ''
}

function buildRouteTable(store: Store): RouteTable {
  return {
    '/api/health': {
      get: () => ({}),
    },
    '/api/patients': {
      get: (ctx) => store.patients(ctx.query.get('q') ?? undefined),
    },
    '/api/triggers': {
      get: () => store.triggers(),
      post: (ctx) => store.createTrigger(ctx.body as Schemas['TriggerCreate']),
    },
    '/api/triggers/{trigger_id}': {
      get: (ctx) => store.getCase(str(ctx.params, 'trigger_id')),
    },
    '/api/triggers/{trigger_id}/llm-trace': {
      get: (ctx) => store.llmTrace(str(ctx.params, 'trigger_id')),
    },
    '/api/triggers/{trigger_id}/candidates': {
      post: (ctx) => store.addCandidate(str(ctx.params, 'trigger_id'), ctx.body as Schemas['CandidateCreate']),
    },
    '/api/triggers/{trigger_id}/candidates/{candidate_id}': {
      patch: (ctx) =>
        store.decide(str(ctx.params, 'trigger_id'), str(ctx.params, 'candidate_id'), ctx.body as Schemas['DecisionUpdate']),
    },
    '/api/triggers/{trigger_id}/candidates/{candidate_id}/rejudge': {
      post: (ctx) => {
        const body = ctx.body as Schemas['RejudgeRequest'] | undefined
        return store.rejudge(str(ctx.params, 'trigger_id'), str(ctx.params, 'candidate_id'), body?.note ?? null)
      },
    },
    '/api/triggers/{trigger_id}/candidates/{candidate_id}/verdicts': {
      get: (ctx) => store.verdicts(str(ctx.params, 'trigger_id'), str(ctx.params, 'candidate_id')),
    },
    '/api/triggers/{trigger_id}/candidates/{candidate_id}/verdicts/{n}/restore': {
      post: (ctx) => store.restore(str(ctx.params, 'trigger_id'), str(ctx.params, 'candidate_id'), num(ctx.params, 'n')),
    },
    '/api/patients/{patient_id}/timeline': {
      get: (ctx) =>
        store.timeline(
          str(ctx.params, 'patient_id'),
          (ctx.query.get('type') as Schemas['TimelineEvent']['type'] | null) ?? undefined,
          ctx.query.get('q') ?? undefined,
        ),
    },
    '/api/stats': {
      get: () => store.stats(),
    },
    '/api/queue': {
      get: () => store.queue(),
    },
    '/api/requests/{request_id}/approve': {
      post: (ctx) => store.approve(str(ctx.params, 'request_id')),
    },
    '/api/requests/{request_id}/requested': {
      post: (ctx) => store.requested(str(ctx.params, 'request_id')),
    },
    '/api/requests/{request_id}/not-found': {
      post: (ctx) => store.notFound(str(ctx.params, 'request_id')),
    },
    '/api/contacts/lookup': {
      post: (ctx) => store.lookupContact((ctx.body as Schemas['ContactLookup']).organization_id),
    },
    '/api/contacts/{organization_id}': {
      put: (ctx) => store.saveContact(str(ctx.params, 'organization_id'), ctx.body as Schemas['ContactUpdate']),
    },
    '/api/demo/deliver/{request_id}': {
      post: (ctx) => store.deliver(str(ctx.params, 'request_id')),
    },
    '/api/demo/pacs-arrival/{study_id}': {
      post: (ctx) => store.pacsArrival(str(ctx.params, 'study_id')),
    },
  }
}

function matchPath(template: string, pathname: string): Record<string, string> | null {
  const templateParts = template.split('/')
  const pathParts = pathname.split('/')
  if (templateParts.length !== pathParts.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < templateParts.length; i++) {
    const t = templateParts[i] ?? ''
    const p = pathParts[i] ?? ''
    if (t.startsWith('{') && t.endsWith('}')) {
      params[t.slice(1, -1)] = decodeURIComponent(p)
    } else if (t !== p) {
      return null
    }
  }
  return params
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

export function createMockFetch(
  store: Store,
  delay: { readMs: number; checkMs: [number, number] } = { readMs: 300, checkMs: [4000, 6000] },
): (req: Request) => Promise<Response> {
  const routeTable = buildRouteTable(store)
  const templates = Object.keys(routeTable)

  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url)
    const method = req.method.toLowerCase() as HttpMethod

    let template: string | undefined
    let params: Record<string, string> | undefined
    for (const t of templates) {
      const m = matchPath(t, url.pathname)
      if (m) {
        template = t
        params = m
        break
      }
    }
    if (!template || !params) {
      return jsonResponse(404, { detail: `not found: ${url.pathname}` })
    }

    const methods = routeTable[template as keyof RouteTable] as Partial<Record<HttpMethod, (ctx: RouteContext) => unknown>>
    const handler = methods[method]
    if (!handler) {
      return jsonResponse(404, { detail: `method not allowed: ${method.toUpperCase()} ${url.pathname}` })
    }

    let body: unknown
    if (method !== 'get') {
      const text = await req.text()
      body = text ? JSON.parse(text) : undefined
    }

    const ms =
      template === '/api/triggers' && method === 'post'
        ? delay.checkMs[0] + Math.random() * (delay.checkMs[1] - delay.checkMs[0])
        : delay.readMs
    if (ms > 0) await new Promise((resolve) => setTimeout(resolve, ms))

    try {
      const result = handler({ params, query: url.searchParams, body })
      return jsonResponse(200, result)
    } catch (err) {
      if (err instanceof NotFound) return jsonResponse(404, { detail: err.message })
      if (err instanceof Conflict) return jsonResponse(409, { detail: err.message })
      throw err
    }
  }
}
