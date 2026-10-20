import { useEffect, useState } from 'react'
import { CaseDetail } from '@/components/CaseDetail'
import { DemoTour } from '@/components/DemoTour'
import { Loading, Skeleton } from '@/components/common'
import { Queue } from '@/components/Queue'
import { NewCheckDialog } from '@/components/NewCheckDialog'
import { Sidebar, type Role } from '@/components/Sidebar'
import { Stats } from '@/components/Stats'
import { TimelinePage } from '@/components/Timeline'
import { api, data, type TriggerSummary } from '@/lib/api'

type Screen = { name: 'list' } | { name: 'stats' } | { name: 'detail'; triggerId: string; focus?: string } | { name: 'timeline'; triggerId: string }

function parse(hash: string): Screen {
  const [path, query] = hash.replace(/^#/, '').split('?')
  const [, kind, id, sub] = path.split('/')
  if (kind === 'stats') return { name: 'stats' }
  if (kind !== 'case' || !id) return { name: 'list' }
  const triggerId = decodeURIComponent(id)
  if (sub === 'timeline') return { name: 'timeline', triggerId }
  return { name: 'detail', triggerId, focus: new URLSearchParams(query).get('focus') ?? undefined }
}

function format(s: Screen): string {
  if (s.name === 'list') return '#/'
  if (s.name === 'stats') return '#/stats'
  const base = `#/case/${encodeURIComponent(s.triggerId)}`
  if (s.name === 'timeline') return `${base}/timeline`
  return s.focus ? `${base}?focus=${encodeURIComponent(s.focus)}` : base
}

export default function App() {
  const [triggers, setTriggers] = useState<TriggerSummary[] | null>(null)
  const role: Role = 'collector'
  const [screen, setRouteScreen] = useState<Screen>(() => parse(window.location.hash))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sync = () => setRouteScreen(parse(window.location.hash))
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  const setScreen = (s: Screen) => {
    window.location.hash = format(s)
  }

  useEffect(() => {
    if (screen.name !== 'list' && screen.name !== 'stats') return
    data(api.GET('/api/triggers'))
      .then((ts) => {
        setTriggers(ts)
        setError(null)
      })
      .catch(() => setError('Seznam spouštěčů se nepodařilo načíst.'))
  }, [screen.name])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [screen.name])

  const open = (triggerId: string) => setScreen({ name: 'detail', triggerId })
  const created = (t: TriggerSummary) => {
    setTriggers((ts) => (ts?.some((x) => x.trigger.id === t.trigger.id) ? ts : [...(ts ?? []), t]))
    open(t.trigger.id)
  }
  const actionable = (triggers ?? []).filter((t) => t.to_decide > 0 || t.open_requests > 0).length

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <DemoTour />
      <Sidebar
        count={actionable}
        screen={screen.name}
        onHome={() => setScreen({ name: 'list' })}
        onStats={() => setScreen({ name: 'stats' })}
        newCheck={<NewCheckDialog onCreated={created} />}
      />
      <div className="min-w-0 flex-1">
        {error && <p className="p-8 text-destructive">{error}</p>}
        {screen.name === 'list' &&
          (triggers ? (
            <Queue role={role} triggers={triggers} onOpen={open} />
          ) : (
            !error && (
              <div className="flex flex-col gap-4 px-4 py-7.5 md:px-9">
                <Loading label="Načítám spouštěče…" hint="První načtení z IRIS může trvat až 10 s." />
                <Skeleton className="h-24" />
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-36 max-w-[calc(100%-376px)]" />
                ))}
              </div>
            )
          ))}
        {screen.name === 'stats' && (triggers ? <Stats triggers={triggers} onOpen={open} /> : !error && <div className="px-4 py-7.5 md:px-9"><Loading label="Načítám přehled…" /></div>)}
        {screen.name === 'detail' && (
          <CaseDetail
            key={screen.triggerId}
            triggerId={screen.triggerId}
            role={role}
            focus={screen.focus}
            onBack={() => setScreen({ name: 'list' })}
          />
        )}
        {screen.name === 'timeline' && (
          <TimelinePage
            triggerId={screen.triggerId}
            role={role}
            onBack={() => setScreen({ name: 'detail', triggerId: screen.triggerId })}
            onOpenPrior={(focus) => setScreen({ name: 'detail', triggerId: screen.triggerId, focus })}
          />
        )}
      </div>
    </div>
  )
}
