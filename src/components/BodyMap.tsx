import type { Candidate } from '@/lib/api'
import { formatDate, priorStatus } from '@/lib/labels'
import { cn, panel } from '@/lib/utils'

type Zone = { id: string; label: string; keys: string[]; rect: [number, number, number, number] }

// shortcut: keyword match on the exam name, upgrade to a body part from the API if names lack it.
const ZONES: Zone[] = [
  { id: 'head', label: 'Hlava', keys: ['mozek', 'mozk', 'hlav', 'lebk', 'orbit', 'krani', 'brain', 'head'], rect: [72, 8, 56, 62] },
  { id: 'neck', label: 'Krk', keys: ['krk', 'krcn', 'stitn', 'neck'], rect: [84, 66, 32, 22] },
  { id: 'chest', label: 'Hrudník', keys: ['hrud', 'plic', 'thora', 'prs', 'mamm', 'mamo', 'srdc', 'chest'], rect: [56, 90, 88, 82] },
  { id: 'abdomen', label: 'Břicho', keys: ['brich', 'abdom', 'jat', 'ledvin', 'pankre', 'slezin', 'zaludek'], rect: [58, 174, 84, 52] },
  { id: 'pelvis', label: 'Pánev', keys: ['panev', 'panv', 'prostat', 'mocov', 'rekt', 'pelv', 'delo', 'ovari'], rect: [52, 228, 96, 50] },
]
const WHOLE_BODY = ['celotel', 'whole', 'cele telo']

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function zonesOf(text: string | null | undefined): string[] {
  if (!text) return []
  const t = norm(text)
  if (WHOLE_BODY.some((k) => t.includes(k))) return ZONES.map((z) => z.id)
  return ZONES.filter((z) => z.keys.some((k) => t.includes(k))).map((z) => z.id)
}

const RANK: Record<Candidate['status'], number> = { available: 0, missing_report: 1, missing: 2, place_unknown: 2 }
const TONE = [
  { fill: 'var(--ok-bg)', stroke: 'var(--ok-ink)', text: 'text-ok-ink' },
  { fill: 'var(--warn-bg)', stroke: 'var(--warn)', text: 'text-warn-ink' },
  { fill: 'var(--missing-bg)', stroke: 'var(--missing)', text: 'text-missing-ink' },
]

export function BodyMap({ priors, triggerPart }: { priors: Candidate[]; triggerPart: string | null | undefined }) {
  const target = new Set(zonesOf(triggerPart))
  const byZone = new Map(ZONES.map((z) => [z.id, priors.filter((p) => zonesOf(p.description).includes(z.id))]))
  const unmatched = priors.filter((p) => zonesOf(p.description).length === 0).length
  const worst = (ps: Candidate[]) => Math.max(...ps.map((p) => RANK[p.status]))
  const shown = ZONES.filter((z) => byZone.get(z.id)!.length > 0 || target.has(z.id))
  if (shown.length === 0)
    return <p className="text-base text-muted-foreground">Oblast těla se z názvů vyšetření nepodařilo určit.</p>

  return (
    <section className={cn(panel, 'flex flex-wrap items-start gap-6 px-5.5 py-5')}>
      <div className="basis-full text-sm font-extrabold tracking-wider text-muted-foreground uppercase">
        Předchozí vyšetření podle oblasti těla
      </div>
      <svg viewBox="0 0 200 420" className="h-[520px] w-64 shrink-0" role="img" aria-label="Mapa oblastí těla">
        <g stroke="#C9D3D6" strokeLinecap="round" strokeLinejoin="round">
          <g strokeWidth="24">
            <path d="M44 108 L28 238" />
            <path d="M156 108 L172 238" />
            <path d="M80 272 L77 404" />
            <path d="M120 272 L123 404" />
          </g>
          <g stroke="#EDF1F2" strokeWidth="20">
            <path d="M44 108 L28 238" />
            <path d="M156 108 L172 238" />
            <path d="M80 272 L77 404" />
            <path d="M120 272 L123 404" />
          </g>
          <g fill="#EDF1F2" strokeWidth="2">
            <rect x="89" y="60" width="22" height="34" rx="8" />
            <path d="M60 92 Q100 80 140 92 Q150 96 148 112 L142 196 Q140 226 150 272 Q100 290 50 272 Q60 226 58 196 L52 112 Q50 96 60 92 Z" />
            <ellipse cx="100" cy="38" rx="25" ry="29" />
          </g>
        </g>
        {ZONES.map((z) => {
          const ps = byZone.get(z.id)!
          const tone = ps.length ? TONE[worst(ps)] : null
          const [x, y, w, h] = z.rect
          return (
            <rect
              key={z.id}
              x={x}
              y={y}
              width={w}
              height={h}
              rx="14"
              fill={tone?.fill ?? 'transparent'}
              fillOpacity={tone ? 0.85 : 0}
              stroke={target.has(z.id) ? 'var(--decide)' : (tone?.stroke ?? 'transparent')}
              strokeWidth={target.has(z.id) ? 3 : 2}
              strokeDasharray={target.has(z.id) ? '6 4' : undefined}
            >
              <title>{`${z.label}: ${ps.length} vyšetření`}</title>
            </rect>
          )
        })}
      </svg>
      <ul className="flex min-w-60 flex-1 flex-col gap-3 text-[15px]">
        {shown.map((z) => {
          const ps = byZone.get(z.id)!
          return (
            <li key={z.id}>
              <div className="font-bold">
                {z.label}
                {target.has(z.id) && <span className="ml-2 text-sm font-semibold text-decide">plánované vyšetření</span>}
              </div>
              {ps.length === 0 && <div className="text-missing-ink">Žádné předchozí vyšetření této oblasti.</div>}
              {ps.map((p) => (
                <div key={p.id} className={TONE[RANK[p.status]].text}>
                  {p.modality} {p.date && formatDate(p.date)} · {priorStatus[p.status]}
                </div>
              ))}
            </li>
          )
        })}
        {unmatched > 0 && <li className="text-sm text-muted-foreground">Bez určené oblasti: {unmatched}</li>}
      </ul>
    </section>
  )
}
