import { ChartColumn, Info, List, Play } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ReadOnlyBanner() {
  return (
    <p role="note" className="border-b border-[#F1D48A] bg-warn-bg px-4 py-2.5 text-[13px] leading-snug text-[#5E3A00] md:hidden">
      <b>Na mobilu jen prohlížení.</b> Mobilní aplikaci neplánujeme. Žádosti a rozhodnutí dělejte na počítači.
    </p>
  )
}

export function MobileBar({
  count,
  screen,
  onHome,
  onStats,
  onTour,
}: {
  count: number
  screen: string
  onHome: () => void
  onStats: () => void
  onTour: () => void
}) {
  const tab = 'relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11.5px] font-bold'
  const current = (name: string) => (screen === name ? 'text-primary-hover' : 'text-muted-foreground')
  return (
    <nav aria-label="Hlavní menu" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 gap-1 border-t bg-card px-2 pt-1.5 pb-5 md:hidden">
      <button type="button" onClick={onHome} aria-current={screen === 'list' ? 'page' : undefined} className={cn(tab, current('list'))}>
        <List className="size-5.5" aria-hidden="true" />
        Fronta
        {count > 0 && (
          <span className="absolute top-1 left-[54%] flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1.25 text-[11px] text-primary-foreground">
            {count}
          </span>
        )}
      </button>
      <button type="button" onClick={onStats} aria-current={screen === 'stats' ? 'page' : undefined} className={cn(tab, current('stats'))}>
        <ChartColumn className="size-5.5" aria-hidden="true" />
        Přehled
      </button>
      <button type="button" onClick={onTour} className={cn(tab, 'text-muted-foreground')}>
        <span className="flex h-6.5 w-8.5 items-center justify-center rounded-[9px] bg-primary">
          <Play className="size-3.5 fill-white text-white" aria-hidden="true" />
        </span>
        Prohlídka
      </button>
      <a href="#/intro" className={cn(tab, 'text-muted-foreground')}>
        <Info className="size-5.5" aria-hidden="true" />O ukázce
      </a>
    </nav>
  )
}
