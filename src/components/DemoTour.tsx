import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

// shortcut: trigger ids of the current demo seed; update them after `just send-orders` runs again.
const STOPS = [
  { triggerId: 'sr-528051', title: 'Předchozí vyšetření nalezená ve zprávách, žádosti e-mailem i telefonem' },
  { triggerId: 'sr-528067', title: 'Pojišťovna zná vyšetření z jiné nemocnice' },
  { triggerId: 'mdt-mdt-demo-PAC-FAKE000001', title: 'MDT: žádost nedoručena, urgovat' },
  { triggerId: 'sr-528045', title: 'Upozornění na duplicitu' },
  { triggerId: 'sr-528035', title: 'Dlouhá historie, relevantní jen některá vyšetření' },
]

export function DemoTour() {
  const [open, setOpen] = useState(false)
  return (
    <nav aria-label="Ukázkové případy" className="fixed top-3 right-3 z-50 flex items-center gap-1 rounded-md border bg-background/95 p-1 shadow-sm">
      {open &&
        STOPS.map((s, i) => (
          <div key={s.triggerId} className="group relative">
            <Button asChild size="sm" variant="outline" className="w-8 px-0">
              <a href={`#/case/${encodeURIComponent(s.triggerId)}`} aria-label={`${i + 1}: ${s.title}`}>
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
      <Button size="sm" variant="ghost" className="w-8 px-0" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? 'Skrýt ukázkové případy' : 'Ukázkové případy'}>
        {open ? <ChevronRight /> : <ChevronLeft />}
      </Button>
    </nav>
  )
}
