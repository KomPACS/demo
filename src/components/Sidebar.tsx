import { ChartColumn, ExternalLink, List, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type Role = 'doctor' | 'collector'

export function Sidebar({
  count,
  screen,
  onHome,
  onStats,
  newCheck,
}: {
  count: number
  screen: string
  onHome: () => void
  onStats: () => void
  newCheck: ReactNode
}) {
  return (
    <nav
      aria-label="Hlavní menu"
      className="flex flex-col gap-2 border-b bg-card px-4 py-5 md:sticky md:top-0 md:h-screen md:w-72 md:shrink-0 md:border-r md:border-b-0"
    >
      <div className="flex items-center gap-3 px-1.5 pb-5">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary">
          <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" fill="none" stroke="#fff" strokeWidth="2" />
            <path d="M16.5 7.5 13.6 13.6 10.4 10.4z" fill="#fff" />
            <path d="M7.5 16.5 10.4 10.4 13.6 13.6z" fill="#7DBFB6" />
          </svg>
        </div>
        <div className="leading-tight">
          <div className="text-lg font-extrabold tracking-wide">KomPACS</div>
          <div className="text-sm text-muted-foreground">
            <b className="text-primary">KOM</b>parátor <b className="text-primary">PACS</b>
          </div>
        </div>
      </div>
      <div className="mb-3.5 flex items-center gap-3 rounded-2xl bg-background p-3.5">
        <div className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <UserRound className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-base font-bold">Demo účet</div>
          <div className="text-sm text-muted-foreground">Koordinátor/ka</div>
        </div>
      </div>
      <button
        type="button"
        onClick={onHome}
        aria-current={screen === 'list' ? 'page' : undefined}
        className={cn(
          'flex min-h-13 items-center gap-3.5 rounded-[14px] px-4 text-left text-base font-semibold text-text',
          screen === 'list' ? 'bg-primary-soft text-primary-hover' : 'hover:bg-background',
        )}
      >
        <List className="size-6 shrink-0" />
        Fronta k vyřízení
        {count > 0 && (
          <span className="ml-auto rounded-full bg-primary px-2.75 py-0.5 text-sm font-bold text-primary-foreground">{count}</span>
        )}
      </button>
      <button
        type="button"
        onClick={onStats}
        aria-current={screen === 'stats' ? 'page' : undefined}
        className={cn(
          'flex min-h-13 items-center gap-3.5 rounded-[14px] px-4 text-left text-base font-semibold text-text',
          screen === 'stats' ? 'bg-primary-soft text-primary-hover' : 'hover:bg-background',
        )}
      >
        <ChartColumn className="size-6 shrink-0" />
        Přehled
      </button>
      <div className="px-4 pt-4.5 pb-1 text-[13px] font-bold tracking-wider text-subtle uppercase">Odkazy</div>
      {['ePACS', 'NIS'].map((name) => (
        <span
          key={name}
          title="Ukázka. Odkaz není napojen."
          className="flex min-h-13 items-center gap-3.5 rounded-[14px] px-4 text-base font-semibold text-text"
        >
          <ExternalLink className="size-5.5" />
          {name}
        </span>
      ))}
      <div className="mt-auto flex flex-col gap-3 pt-6">
        {newCheck}
        <div className="flex flex-wrap items-center gap-2 px-1.5 text-[13px] text-subtle">
          <Badge variant="outline">Fiktivní data</Badge>
          Prototyp, není zdravotnický prostředek
        </div>
      </div>
    </nav>
  )
}
