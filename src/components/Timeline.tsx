import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Loading, RequestBadge, Skeleton, StatusBadge } from '@/components/common'
import { PatientBar } from '@/components/PatientBar'
import type { Role } from '@/components/Sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api, data, type Candidate, type Case, type RequestItem, type TimelineEvent } from '@/lib/api'
import { classify, progress, useCase } from '@/lib/case'
import { decisionLabel, eventType, formatDate, parseDay, sourceLabel, todayKey, verdictLabel } from '@/lib/labels'
import { buildItems, clusterIndices, lanes, stackRows, ticks, timeWindow, type Item, type LaneId, type Range } from '@/lib/timeline'
import { cn, panel } from '@/lib/utils'

type Group = 'decide' | 'relevant' | 'out'
type Popup = { item: Item; x: number; y: number; width: number }
type Unit =
  | { kind: 'item'; key: string; x: number; w: number; item: Item }
  | { kind: 'cluster'; key: string; x: number; w: number; items: Item[] }

const ring = (color: string) => `0 0 0 3px #fff, 0 0 0 5px ${color}`
const partialBg = 'repeating-linear-gradient(45deg, var(--tl-partial) 0 6px, var(--tl-partial-bg) 6px 12px)'
const reportLanes: LaneId[] = ['mdt', 'visit', 'stay', 'emergency', 'report']
const tagHalfWidth = 64

function tagPlacement(x: number, width: number): CSSProperties {
  if (x < tagHalfWidth) return { left: 0 }
  if (x > width - tagHalfWidth) return { right: 0 }
  return { left: x, transform: 'translateX(-50%)' }
}

function candidateStyle(c: Candidate, group: Group): CSSProperties {
  const base: CSSProperties =
    group === 'out'
      ? { background: '#fff', border: '3px solid var(--disabled)' }
      : c.status === 'available'
        ? { background: 'var(--primary)' }
        : c.status === 'missing_report'
          ? { background: 'var(--primary-tint)' }
          : c.status === 'missing'
            ? { background: '#fff', border: '3px dashed var(--missing)' }
            : { background: 'var(--tl-partial-border)', width: 18, height: 18 }
  if (group === 'relevant') base.boxShadow = ring('var(--primary)')
  if (group === 'decide') base.boxShadow = ring('#5B3FD0')
  return base
}

function eventStyle(item: Extract<Item, { kind: 'events' }>): { style: CSSProperties; className?: string } {
  const e = item.events[0]
  if (item.lane === 'condition')
    return { style: { width: 0, height: 0, borderLeft: '11px solid transparent', borderRight: '11px solid transparent', borderTop: '16px solid var(--foreground)', borderRadius: 0 } }
  if (e.type === 'trigger') return { style: { width: 18, height: 18, background: 'var(--primary)', borderRadius: 4, transform: 'rotate(45deg)' } }
  if (item.lane === 'imaging')
    return { style: e.detail === 'snímky v PACS' ? { background: 'var(--primary)' } : { background: '#fff', border: '3px dashed var(--missing)' } }
  if (reportLanes.includes(item.lane)) return { style: { width: 22, height: 22, borderRadius: 6, background: 'var(--tl-report)' } }
  if (item.lane === 'treatment') return { style: { width: 22, height: 22, background: 'var(--tl-treatment)' } }
  return { style: { width: 22, height: 22, background: 'var(--tl-lab)' } }
}

const severity: Record<Candidate['status'], number> = { available: 0, missing_report: 1, place_unknown: 2, missing: 3 }

const isTrigger = (i: Item) => i.kind === 'events' && i.events[0].type === 'trigger'

const records = (n: number) => (n === 1 ? 'záznam' : n < 5 ? 'záznamy' : 'záznamů')

function clusterLook(items: Item[], groupOf: (c: Candidate) => Group): { dot: CSSProperties; ring?: string } {
  const cands = items.flatMap((i) => (i.kind === 'candidate' ? [i.c] : []))
  if (!cands.length) return { dot: eventStyle(items[0] as Extract<Item, { kind: 'events' }>).style }
  const groups = cands.map(groupOf)
  const pool = cands.filter((_, n) => groups[n] !== 'out')
  const worst = (pool.length ? pool : cands).reduce((a, b) => (severity[b.status] > severity[a.status] ? b : a))
  const group: Group = groups.includes('decide') ? 'decide' : groups.includes('relevant') ? 'relevant' : 'out'
  return {
    dot: { ...candidateStyle(worst, group), boxShadow: undefined },
    ring: group === 'decide' ? '#5B3FD0' : group === 'relevant' ? 'var(--primary)' : undefined,
  }
}

function clusterTag(items: Item[], total: number, imaging: boolean, embedded: boolean): string {
  if (!imaging) return `${total} ${records(total)}`
  if (!embedded) return `${total} vyšetření`
  const modalities = new Set(items.flatMap((i) => (i.kind === 'candidate' ? [i.c.modality] : [])))
  return modalities.size ? [...modalities].join(' · ') : `${total} vyšetření`
}

function clusterLabel(items: Item[], total: number): string {
  const dates = items.map((i) => i.at).sort((a, b) => a - b)
  const day = (t: number) => new Date(t).toLocaleDateString('cs-CZ')
  return `Skupina: ${total} ${records(total)}, ${day(dates[0])} – ${day(dates.at(-1)!)}. Rozbalit.`
}

function itemLabel(item: Item): string {
  if (item.kind === 'candidate') return `${item.c.description}, ${formatDate(item.c.date)}`
  const e = item.events[0]
  const more = item.events.length > 1 ? ` a ${item.events.length - 1} dalších` : ''
  return `${e.title}, ${formatDate(e.date)}${more}`
}

function matches(item: Item, needle: string): boolean {
  if (!needle) return true
  const text =
    item.kind === 'candidate'
      ? `${item.c.description} ${item.c.modality} ${item.c.place ?? ''}`
      : item.events.map((e) => `${e.title} ${e.detail ?? ''}`).join(' ')
  return text.toLowerCase().includes(needle)
}

export function Timeline({
  kase,
  requests,
  role = 'doctor',
  embedded = false,
  range = '1y',
  query = '',
  onFull,
  onOpenPrior,
  onCaseChanged,
}: {
  kase: Case
  requests: RequestItem[]
  role?: Role
  embedded?: boolean
  range?: Range
  query?: string
  onFull?: () => void
  onOpenPrior?: (candidateId: string) => void
  onCaseChanged?: () => void
}) {
  const [events, setEvents] = useState<TimelineEvent[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [popup, setPopup] = useState<Popup | null>(null)
  const [openCluster, setOpenCluster] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const wrap = useRef<HTMLDivElement>(null)
  const [trackW, setTrackW] = useState(0)
  const resize = useRef<ResizeObserver | null>(null)
  const track = useCallback((el: HTMLDivElement | null) => {
    resize.current?.disconnect()
    if (!el) return
    resize.current = new ResizeObserver(([entry]) => setTrackW(entry.contentRect.width))
    resize.current.observe(el)
  }, [])
  const patientId = kase.patient.id

  useEffect(() => {
    data(api.GET('/api/patients/{patient_id}/timeline', { params: { path: { patient_id: patientId } } }))
      .then(setEvents)
      .catch(() => setError('Časovou osu se nepodařilo načíst.'))
  }, [patientId, version])

  const arriveInPacs = async (studyId: string) => {
    await data(api.POST('/api/demo/pacs-arrival/{study_id}', { params: { path: { study_id: studyId } } }))
    setPopup(null)
    setVersion((v) => v + 1)
    onCaseChanged?.()
  }

  const needle = query.trim().toLowerCase()
  const [hits, setHits] = useState<{ q: string; events: TimelineEvent[] } | null>(null)
  useEffect(() => {
    if (!needle) return
    let live = true
    const timer = setTimeout(() => {
      data(api.GET('/api/patients/{patient_id}/timeline', { params: { path: { patient_id: patientId }, query: { q: needle } } }))
        .then((found) => live && setHits({ q: needle, events: found }))
        .catch(() => {})
    }, 300)
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [patientId, needle])

  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setPopup(null)
      setOpenCluster(null)
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [])

  const { toDecide, relevant } = classify(kase.candidates)
  const groupOf = (c: Candidate): Group => (toDecide.includes(c) ? 'decide' : relevant.includes(c) ? 'relevant' : 'out')
  const triggerAt = parseDay(kase.trigger.date).getTime()
  const all = events ? buildItems(kase, events) : []
  const { start, end } = timeWindow(all, embedded ? '1y' : range, triggerAt)
  const pct = (t: number) => ((t - start) / (end - start)) * 100
  const px = (t: number) => (pct(t) / 100) * trackW
  const serverHits = needle && hits?.q === needle ? hits.events : null
  const searched = serverHits ? buildItems(kase, serverHits) : all
  const beforeTrigger = (i: Item) => i.kind === 'candidate' || i.from <= triggerAt || i.events.some((e) => e.type === 'trigger')
  const shown = searched.filter(
    (i) => i.to >= start && i.from <= end && beforeTrigger(i) && ((serverHits && i.kind === 'events') || matches(i, needle)),
  )
  const byLane = new Map(lanes.map((l) => [l.id, shown.filter((i) => i.lane === l.id)]))
  const visible = lanes.filter((l) => byLane.get(l.id)!.length > 0)
  const empty = lanes.filter((l) => byLane.get(l.id)!.length === 0)
  const labelW = embedded ? 170 : 210
  const todayAt = parseDay(todayKey()).getTime()

  const popupCandidate = popup?.item.kind === 'candidate' ? popup.item.c : null

  const click = (item: Item, el: HTMLElement) => {
    const box = wrap.current!.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    setPopup(popup?.item.key === item.key ? null : { item, x: r.left + r.width / 2 - box.left, y: r.bottom - box.top + 10, width: box.width })
  }

  const caption = (id: LaneId) => {
    const items = byLane.get(id)!
    if (id === 'imaging') {
      const cs = items.filter((i) => i.kind === 'candidate')
      const nis = cs.filter((i) => i.c.source === 'nis_record').length
      return `${nis} v NIS · ${cs.length - nis} odjinud`
    }
    const n = items.reduce((s, i) => s + (i.kind === 'events' ? i.events.length : 1), 0)
    return `${n} ${records(n)}`
  }

  const header = embedded && (
    <div className="flex flex-wrap items-center justify-between gap-2.5 px-5.5 pb-3.5">
      <h2 className="text-xl font-extrabold">Časová osa · posledních 12 měsíců</h2>
      <div className="flex flex-wrap items-center gap-4.5 text-sm text-text">
        <Legend dot={{ background: 'var(--primary)' }}>v PACS</Legend>
        <Legend dot={{ border: '2px dashed var(--missing)' }}>chybí</Legend>
        <Legend dot={{ width: 12, height: 12, margin: 4, background: 'var(--primary)', boxShadow: ring('var(--primary)') }}>relevantní</Legend>
        <button type="button" onClick={onFull} className="text-[15px] font-bold text-primary hover:text-primary-hover hover:underline">
          Celá osa ›
        </button>
      </div>
    </div>
  )

  return (
    <div ref={wrap} className="relative flex flex-col gap-5.5">
      <section className={cn(panel, embedded ? 'pt-5' : 'pt-2.5')}>
        {header}
        {error && <p className="px-5.5 pb-4 text-destructive">{error}</p>}
        {!events && !error && (
          <div className="flex flex-col gap-3 px-5.5 pb-5">
            <Loading label="Načítám časovou osu…" hint="Zprávy, léčba a laboratoř pacienta." />
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 rounded-xl" />
            ))}
          </div>
        )}
        {events && (
          <div className="overflow-x-auto" onScroll={() => setPopup(null)}>
            <div className="relative" style={{ minWidth: embedded ? 900 : 980 }}>
              <div className="flex" style={{ height: embedded ? 30 : 44 }}>
                <div className="shrink-0 border-r border-divider" style={{ width: labelW }} />
                <div ref={track} className="relative min-w-0 flex-1 text-xs font-bold text-muted-foreground">
                  {ticks(start, end).map((t) => (
                    <span key={t.at} className="absolute" style={{ left: `${pct(t.at)}%`, top: embedded ? 8 : 14 }}>
                      {t.label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 right-0" style={{ left: labelW }}>
                  {ticks(start, end).map((t) => (
                    <div key={t.at} className="absolute inset-y-0 w-px bg-divider" style={{ left: `${pct(t.at)}%` }} />
                  ))}
                  <div className="absolute inset-y-0 w-0.5 bg-foreground" style={{ left: `${pct(todayAt)}%` }} title="dnes" />
                  <div className="absolute inset-y-0 border-l-2 border-dashed border-primary" style={{ left: `${pct(triggerAt)}%` }} title="plánované vyšetření" />
                </div>
                {visible.length === 0 && (
                  <p className="border-t border-divider px-5.5 py-6 text-muted-foreground">V tomto období nejsou žádné události.</p>
                )}
                {visible.map((lane) => {
                  const items = byLane.get(lane.id)!
                  const imaging = lane.id === 'imaging'
                  const rowGap = imaging ? 38 : 34
                  const dotW = imaging ? 36 : 28
                  const units: Unit[] = []
                  const openKeys = new Set<string>()
                  let openSpan: { x: number; from: number; to: number } | null = null
                  if (trackW > 0)
                    for (const g of clusterIndices(items.map((i) => px(i.at)), rowGap)) {
                      const members = g.map((n) => items[n])
                      for (const t of members.filter(isTrigger)) units.push({ kind: 'item', key: t.key, x: px(t.at), w: dotW, item: t })
                      const rest = members.filter((i) => !isTrigger(i))
                      if (rest.length === 0) continue
                      const key = `${lane.id}|${rest[0].key}`
                      const xs = rest.map((i) => px(i.at))
                      const x = xs.reduce((a, b) => a + b, 0) / xs.length
                      if (rest.length > 1 && openCluster !== key) {
                        units.push({ kind: 'cluster', key, x, w: 60, items: rest })
                        continue
                      }
                      rest.forEach((i, n) => units.push({ kind: 'item', key: i.key, x: xs[n], w: dotW, item: i }))
                      if (rest.length > 1) {
                        rest.forEach((i) => openKeys.add(i.key))
                        openSpan = { x, from: Math.min(...xs), to: Math.max(...xs) }
                      }
                    }
                  const rows = stackRows(units)
                  const closeRow = openSpan ? Math.max(...units.filter((u) => openKeys.has(u.key)).map((u) => rows[units.indexOf(u)])) + 1 : 0
                  const depth = Math.max(0, closeRow, ...rows)
                  const baseH = embedded ? (imaging ? 78 : 58) : imaging ? 110 : 96
                  const rowY = (row: number) => baseH / 2 + row * rowGap
                  const tagTop = rowY(depth) + (embedded ? 17 : 22)
                  const tagged = new Set<string>()
                  let lastTag = -Infinity
                  for (const u of [...units].sort((a, b) => a.x - b.x)) {
                    if (u.x - lastTag < (embedded && imaging ? 44 : 2 * tagHalfWidth + 8)) continue
                    tagged.add(u.key)
                    lastTag = u.x
                  }
                  const tagSpan = (u: Unit, text: string) =>
                    tagged.has(u.key) && (
                      <span
                        className={cn(
                          'pointer-events-none absolute max-w-32 truncate font-semibold whitespace-nowrap text-text',
                          embedded ? 'text-xs' : 'text-[13px]',
                        )}
                        style={{ top: tagTop, ...tagPlacement(u.x, trackW) }}
                      >
                        {text}
                      </span>
                    )
                  return (
                    <div
                      key={lane.id}
                      className={cn('flex border-t border-divider', imaging && 'bg-[#FAFCFC]')}
                      style={{ minHeight: baseH + depth * rowGap }}
                    >
                      <div className="flex shrink-0 flex-col justify-center gap-0.5 border-r border-divider px-4" style={{ width: labelW }}>
                        <div className={cn('font-bold text-text', embedded ? 'text-[15px]' : 'text-base')}>{lane.label}</div>
                        {!embedded && <div className="text-[13px] text-muted-foreground">{caption(lane.id)}</div>}
                      </div>
                      <div className="relative min-w-0 flex-1">
                        {openSpan && (
                          <div
                            className="pointer-events-none absolute rounded-2xl bg-primary/7"
                            style={{
                              left: openSpan.from - 24,
                              width: openSpan.to - openSpan.from + 48,
                              top: rowY(0) - 24,
                              height: rowY(closeRow) - rowY(0) + 48,
                            }}
                          />
                        )}
                        {units.map((u, n) => {
                          const y = rowY(rows[n])
                          if (u.kind === 'cluster') {
                            const look = clusterLook(u.items, groupOf)
                            const total = u.items.reduce((s, i) => s + (i.kind === 'events' ? i.events.length : 1), 0)
                            return (
                              <div key={u.key}>
                                <button
                                  type="button"
                                  aria-expanded={false}
                                  aria-label={clusterLabel(u.items, total)}
                                  title={clusterLabel(u.items, total)}
                                  onClick={() => {
                                    setOpenCluster(u.key)
                                    setPopup(null)
                                  }}
                                  className="absolute flex h-8 -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full bg-card pr-2.5 pl-0.75 hover:bg-primary/10 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                                  style={{ left: u.x, top: y, boxShadow: `0 0 0 2px ${look.ring ?? 'var(--input)'}` }}
                                >
                                  <span className="box-border block size-6.5 shrink-0 rounded-full" style={look.dot} />
                                  <span className="text-sm font-extrabold text-foreground">{total}</span>
                                </button>
                                {tagSpan(u, clusterTag(u.items, total, imaging, embedded))}
                              </div>
                            )
                          }
                          const item = u.item
                          const isCand = item.kind === 'candidate'
                          const look = isCand ? { style: candidateStyle(item.c, groupOf(item.c)) } : eventStyle(item)
                          const bar = isCand ? item.partial : item.bar
                          const count = item.kind === 'events' && item.events.length > 1 ? item.events.length : 0
                          const tag = isCand ? (embedded ? item.c.modality : item.c.description) : item.events[0].title
                          return (
                            <div key={u.key}>
                              {bar && (
                                <div
                                  className="absolute -translate-y-1/2 rounded-full"
                                  style={{
                                    top: y,
                                    left: `${Math.max(pct(item.from), 0)}%`,
                                    width: `${Math.max(Math.min(pct(item.to), 100) - Math.max(pct(item.from), 0), 0.6)}%`,
                                    height: embedded ? 12 : 18,
                                    ...(isCand
                                      ? { background: partialBg, border: '1px solid var(--tl-partial-border)' }
                                      : { background: 'var(--tl-treatment)', opacity: 0.35 }),
                                  }}
                                />
                              )}
                              <button
                                type="button"
                                aria-label={itemLabel(item)}
                                title={itemLabel(item)}
                                onClick={(e) => click(item, e.currentTarget)}
                                className={cn(
                                  'absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full hover:bg-primary/10 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foreground',
                                  embedded ? 'size-8' : 'size-11',
                                  popup?.item.key === item.key && 'bg-primary/15',
                                )}
                                style={{ left: u.x, top: y }}
                              >
                                <span className="box-border block size-6.5 rounded-full" style={look.style} />
                                {count > 0 && (
                                  <span
                                    className={cn(
                                      'absolute rounded-full bg-card px-1 text-[11px] font-bold text-text shadow',
                                      embedded ? '-top-1 -right-1' : 'top-0.5 right-0.5',
                                    )}
                                  >
                                    {count}
                                  </span>
                                )}
                              </button>
                              {tagSpan(u, tag)}
                            </div>
                          )
                        })}
                        {openSpan && (
                          <button
                            type="button"
                            aria-label="Sbalit skupinu"
                            title="Sbalit skupinu"
                            autoFocus
                            onClick={() => setOpenCluster(null)}
                            className="absolute flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-input bg-card text-xs text-foreground hover:bg-primary/10 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                            style={{ left: openSpan.x, top: rowY(closeRow) }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              {!embedded && empty.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 border-t border-divider px-4.5 py-3.5">
                  <span className="text-sm text-muted-foreground">Skryté prázdné řádky:</span>
                  {empty.map((l) => (
                    <span key={l.id} className="rounded-full border border-input px-3.5 py-2 text-sm font-semibold text-text">
                      {l.label} (0)
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {embedded && (
          <div className="px-5.5 pt-3 pb-4 text-sm text-muted-foreground">
            Klikněte na událost v ose a zobrazí se její detail.
          </div>
        )}
      </section>

      {popup && (
        <EventPopup
          key={popup.item.key}
          popup={popup}
          group={popupCandidate ? groupOf(popupCandidate) : 'out'}
          request={popupCandidate && role === 'collector' ? requests.find((r) => r.candidate_id === popupCandidate.id) : undefined}
          showContact={role === 'collector'}
          onClose={() => setPopup(null)}
          onOpenPrior={onOpenPrior}
          onArriveInPacs={role === 'collector' ? arriveInPacs : undefined}
        />
      )}

      {!embedded && (
        <section className={cn(panel, 'flex flex-wrap items-center gap-x-7 gap-y-3.5 p-5.5')}>
          <h2 className="basis-full text-lg font-bold">Legenda</h2>
          <Legend dot={{ background: 'var(--primary)' }}>snímky v PACS</Legend>
          <Legend dot={{ background: 'var(--primary-tint)' }}>snímky bez popisu</Legend>
          <Legend dot={{ border: '3px dashed var(--missing)' }}>chybí, je jinde</Legend>
          <Legend dot={{ background: 'var(--tl-partial-border)' }}>místo neznámé</Legend>
          <Legend dot={{ border: '3px solid var(--disabled)' }}>vyřazeno nebo nerelevantní</Legend>
          <Legend dot={{ width: 30, height: 14, background: partialBg, border: '1px solid var(--tl-partial-border)' }}>známe jen rok nebo měsíc</Legend>
          <Legend dot={{ width: 12, height: 12, margin: 4, background: 'var(--primary)', boxShadow: ring('var(--primary)') }}>relevantní pro kontrolu</Legend>
          <Legend dot={{ width: 12, height: 12, margin: 4, background: 'var(--primary)', boxShadow: ring('#5B3FD0') }}>k rozhodnutí</Legend>
          <Legend dot={{ borderRadius: 6, background: 'var(--tl-report)' }}>zpráva</Legend>
          <Legend dot={{ background: 'var(--tl-treatment)' }}>léčba</Legend>
          <Legend dot={{ background: 'var(--tl-lab)' }}>laboratoř</Legend>
          <Legend dot={{ width: 2, borderRadius: 0, background: 'var(--foreground)' }}>dnes</Legend>
          <Legend dot={{ width: 0, borderRadius: 0, borderLeft: '2px dashed var(--primary)' }}>plánované vyšetření nebo MDT</Legend>
        </section>
      )}
    </div>
  )
}

function Legend({ dot, children }: { dot: CSSProperties; children: string }) {
  return (
    <span className="inline-flex items-center gap-2.5 text-[15px] text-text">
      <span className="box-border inline-block size-5 rounded-full" style={dot} />
      {children}
    </span>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2.5 text-[15px]">
      <span className="font-semibold text-muted-foreground">{label}</span>
      <span>{children}</span>
    </div>
  )
}

function EventPopup({
  popup,
  group,
  request,
  showContact,
  onClose,
  onOpenPrior,
  onArriveInPacs,
}: {
  popup: Popup
  group: Group
  request?: RequestItem
  showContact: boolean
  onClose: () => void
  onOpenPrior?: (id: string) => void
  onArriveInPacs?: (studyId: string) => Promise<void>
}) {
  const [arriving, setArriving] = useState(false)
  const [arriveError, setArriveError] = useState(false)
  const single = popup.item.kind === 'events' && popup.item.events.length === 1 ? popup.item.events[0] : null
  const missingStudy = single?.type === 'imaging' && single.detail === 'bez snímků v PACS' ? single.resource.split('/')[1] : null
  const arrive = (studyId: string) => {
    setArriving(true)
    setArriveError(false)
    onArriveInPacs!(studyId)
      .catch(() => setArriveError(true))
      .finally(() => setArriving(false))
  }
  const w = Math.min(400, popup.width - 16)
  const left = Math.min(Math.max(popup.x - 60, 8), popup.width - w - 8)
  const { item } = popup
  const close = (
    <Button variant="outline" size="icon" className="size-10 shrink-0" aria-label="Zavřít detail" onClick={onClose} autoFocus>
      ✕
    </Button>
  )
  return (
    <div
      role="dialog"
      aria-label="Detail události"
      className="absolute z-20 flex flex-col gap-3 rounded-[18px] border bg-card p-5 shadow-[0_2px_6px_rgba(16,40,44,.10),0_22px_48px_rgba(16,40,44,.22)]"
      style={{ left, top: popup.y, width: w }}
    >
      <span className="absolute -top-2.5 size-4.5 rotate-45 border-t border-l bg-card" style={{ left: popup.x - left - 9 }} />
      {item.kind === 'candidate' ? (
        <>
          <div className="flex items-start justify-between gap-2.5">
            <div>
              <div className="text-xl font-extrabold">{item.c.description}</div>
              <div className="text-[15px] text-muted-foreground">
                {formatDate(item.c.date)}
                {item.partial && ' · známe jen rok nebo měsíc'}
              </div>
            </div>
            {close}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge status={item.c.status} />
            <span className="rounded-full bg-primary-soft px-3 py-1 text-sm font-bold text-primary">
              {item.c.decision ? decisionLabel[item.c.decision] : `LLM: ${verdictLabel[item.c.verdict.label]}`}
            </span>
            {request && <RequestBadge state={request.state} />}
          </div>
          <Row label="Místo">{item.c.place ?? 'neznámé'}</Row>
          <Row label="Zdroj">{sourceLabel[item.c.source]}</Row>
          {item.c.pacs_source && <Row label="PACS">{item.c.pacs_source}</Row>}
          {item.c.verdict.source_sentence && (
            <blockquote className="rounded-xl bg-background px-3 py-2.5 text-[15px]">„{item.c.verdict.source_sentence}“</blockquote>
          )}
          <Row label="Proč">{item.c.verdict.reason}</Row>
          {showContact && request?.contact && (
            <Row label="Kontakt">
              {[request.contact.email, request.contact.phone].filter(Boolean).join(' · ') || 'bez údajů'} ·{' '}
              {request.contact.verified_at ? 'ověřený' : 'neověřený'}
            </Row>
          )}
          {onOpenPrior && group !== 'out' && (
            <Button className="self-start" onClick={() => onOpenPrior(item.c.id)}>
              Otevřít v kontrole
            </Button>
          )}
        </>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2.5">
            <div>
              <div className="text-xl font-extrabold">
                {item.events.length > 1 ? `${item.events.length} záznamů` : item.events[0].title}
              </div>
              <div className="text-[15px] text-muted-foreground">
                {item.bar ? `${formatDate(item.events[0].date)} – ${formatDate(item.events.at(-1)!.date)}` : formatDate(item.events[0].date)} ·{' '}
                {eventType[item.events[0].type]}
              </div>
            </div>
            {close}
          </div>
          <ul className="flex max-h-72 flex-col gap-1.5 overflow-y-auto text-[15px]">
            {item.events.map((e) => (
              <li key={e.id} className="flex flex-wrap gap-x-2">
                {item.events.length > 1 && <span className="font-semibold">{e.title}</span>}
                {e.detail && <span className="text-text">{e.detail}</span>}
                {item.bar && <span className="text-muted-foreground">{formatDate(e.date)}</span>}
                {e.simulated && <span className="text-sm text-subtle">simulace</span>}
              </li>
            ))}
          </ul>
          {item.events.length === 1 && <Row label="Záznam">{item.events[0].resource}</Row>}
          {missingStudy && onArriveInPacs && (
            <Button variant="outline" className="self-start" loading={arriving} disabled={arriving} onClick={() => arrive(missingStudy)}>
              Simulovat doručení do PACS (demo)
            </Button>
          )}
          {arriveError && <p className="text-destructive">Doručení se nepodařilo.</p>}
        </>
      )}
    </div>
  )
}

export function TimelinePage({
  triggerId,
  role,
  onBack,
  onOpenPrior,
}: {
  triggerId: string
  role: Role
  onBack: () => void
  onOpenPrior: (candidateId: string) => void
}) {
  const { kase, requests, loadCase, error } = useCase(triggerId)

  if (error) return <p className="p-8 text-destructive">{error}</p>
  if (!kase)
    return (
      <div className="flex flex-col">
        <div className="flex h-27 items-center bg-bar px-4 md:px-9">
          <Loading label="Načítám případ…" hint="Pacient, kandidátní vyšetření a žádosti z IRIS." className="[&_div]:text-white [&_svg]:text-bar-accent" />
        </div>
        <div className="flex flex-col gap-5.5 px-4 pt-6.5 md:px-9">
          <Skeleton className="h-16 max-w-md" />
          <Skeleton className="h-[480px]" />
        </div>
      </div>
    )
  const { ready, total } = progress(kase, requests)

  return (
    <div className="flex flex-col">
      <PatientBar kase={kase} ready={ready} total={total} backLabel="Zpět na kontrolu" onBack={onBack} />
      <div className="flex flex-col gap-5.5 px-4 pt-6.5 pb-12 md:px-9">
        <TimelineFull kase={kase} requests={requests} role={role} onOpenPrior={onOpenPrior} onCaseChanged={loadCase} />
      </div>
    </div>
  )
}

export function TimelineFull({
  kase,
  requests,
  role,
  onOpenPrior,
  onCaseChanged,
}: {
  kase: Case
  requests: RequestItem[]
  role: Role
  onOpenPrior: (candidateId: string) => void
  onCaseChanged: () => void
}) {
  const [range, setRange] = useState<Range>('1y')
  const [q, setQ] = useState('')
  return (
    <>
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-[30px] font-extrabold">Časová osa</h1>
        <div className="mt-1 text-[15px] text-muted-foreground">
          Klikněte na událost nebo na ni přejděte klávesou Tab a stiskněte Enter.
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Input aria-label="Hledat v časové ose" placeholder="Hledat, např. PSA nebo metastázy v plicích" className="w-80" value={q} onChange={(e) => setQ(e.target.value)} />
        <div role="group" aria-label="Rozsah" className="flex rounded-[14px] bg-[#E6ECEE] p-0.75">
          {(['3m', '1y', 'all'] as const).map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={range === r}
              onClick={() => setRange(r)}
              className={cn('min-h-11 rounded-xl px-4 text-[15px] font-semibold text-text', range === r && 'bg-card text-foreground shadow-sm')}
            >
              {{ '3m': '3 měsíce', '1y': '1 rok', all: 'Vše' }[r]}
            </button>
          ))}
        </div>
      </div>
    </div>
    <Timeline kase={kase} requests={requests} role={role} range={range} query={q} onOpenPrior={onOpenPrior} onCaseChanged={onCaseChanged} />
    </>
  )
}
