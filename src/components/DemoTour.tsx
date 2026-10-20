import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

const STOPS = [
  { href: '#/', title: 'Spusťte kontrolu u pacientky Lenky Pokorné, která ještě není ve frontě' },
  { href: '#/case/s01-zpravy', title: 'Předchozí vyšetření nalezená jen ve zprávách, žádosti e-mailem i telefonem' },
  { href: '#/case/s02-pojistovna', title: 'Vyšetření z jiné nemocnice podle výpisu pojištěnce' },
  { href: '#/case/s03-mdt-nedoruceno', title: 'MDT: žádost nedoručena, urgovat' },
  { href: '#/case/s04-duplicita', title: 'Upozornění na duplicitu' },
  { href: '#/case/s09-vse-v-pacs', title: 'Vše potřebné je v PACS' },
]

export function DemoTour() {
  const [open, setOpen] = useState(false)
  return (
    <nav aria-label="Ukázkové případy" className="fixed top-3 right-3 z-50 flex items-center gap-1 rounded-md border bg-background/95 p-1 shadow-sm">
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
      <Button size="sm" variant="ghost" className="w-8 px-0" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? 'Skrýt ukázkové případy' : 'Ukázkové případy'}>
        {open ? <ChevronRight /> : <ChevronLeft />}
      </Button>
    </nav>
  )
}
