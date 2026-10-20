import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { STOPS } from '@/lib/tour'
import { cn } from '@/lib/utils'


export function DemoTour({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <nav aria-label="Ukázkové případy" className={cn('fixed top-3 right-3 z-50 items-center gap-1 rounded-md border bg-background/95 p-1 shadow-sm', open ? 'flex' : 'hidden md:flex')}>
      {open &&
        STOPS.map((s, i) => (
          <div key={s.href} className="group relative">
            <Button asChild size="sm" variant="outline" className="w-8 px-0">
              <a href={s.href} aria-label={`${i + 1}: ${s.title}`}>
                {i + 1}
              </a>
            </Button>
            <span
              aria-hidden
              className="pointer-events-none absolute top-full right-0 mt-2 hidden w-max max-w-64 rounded-md bg-foreground px-2.5 py-1.5 text-xs text-background shadow-md group-focus-within:block group-hover:block"
            >
              {s.title}
            </span>
          </div>
        ))}
      <Button size="sm" variant="ghost" className="w-8 px-0" onClick={() => onOpenChange(!open)} aria-expanded={open} aria-label={open ? 'Skrýt ukázkové případy' : 'Ukázkové případy'}>
        {open ? <ChevronRight /> : <ChevronLeft />}
      </Button>
    </nav>
  )
}
