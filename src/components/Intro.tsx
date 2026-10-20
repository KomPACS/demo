import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { STOPS } from '@/lib/tour'

const STEPS = [
  'Přijde objednávka CT, MR, PET nebo zápis na MDT.',
  'KomPACS projde NIS, PACS, zprávy a výpis pojištěnce.',
  'Koordinátor/ka potvrdí, co chybí, a odešle žádost.',
]

export function Intro({ onTour, onExplore, onPick }: { onTour: () => void; onExplore: () => void; onPick: () => void }) {
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <section className="flex flex-col gap-5 bg-[#072B29] px-6 py-10 text-white md:px-14 md:py-11">
        <div className="flex items-center gap-2 text-xs font-extrabold tracking-widest text-bar-accent">
          <span className="size-2 rounded-full bg-bar-accent" />
          KONCEPT VE VÝVOJI · FIKTIVNÍ DATA
        </div>
        <div className="text-5xl leading-none font-extrabold">
          <span className="text-bar-accent">Kom</span>PA<span className="text-[#FF7A6B]">C</span>S
        </div>
        <h1 className="text-[28px] leading-tight font-extrabold md:text-3xl">Před vyšetřením víte, které předchozí snímky chybí.</h1>
        <ol className="flex flex-col gap-3.5">
          {STEPS.map((step, i) => (
            <li key={step} className="flex items-start gap-3.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-bar-accent">{i + 1}</span>
              <span className="text-[15px] leading-normal text-ok-bg">{step}</span>
            </li>
          ))}
        </ol>
        <div className="mt-auto flex flex-col gap-2.5 rounded-2xl border border-[#1F5A56] bg-[#0B3836] px-4.5 py-4">
          <p className="text-[15px] font-extrabold">Toto je koncept ve vývoji (proof of concept).</p>
          <p className="text-sm leading-normal text-ok-bg">
            Ukázka běží na smyšlených datech. Postup v ní je to, co nabízíme. Rádi probereme úpravy, vaše nápady i napojení na stávající systémy
            (NIS, PACS, ePACS).
          </p>
          <a
            href="mailto:info@kompacs.cz?subject=KomPACS"
            className="inline-flex min-h-11 items-center self-start rounded-xl bg-bar-accent px-4.5 text-[15px] font-extrabold text-bar-accent-ink hover:bg-white"
          >
            Napište nám: info@kompacs.cz
          </a>
          <p className="text-xs text-bar-muted">
            Pacienti jsou smyšlení · bez sledování a bez cookies ·{' '}
            <a href="https://kompacs.cz" className="text-bar-accent underline">
              kompacs.cz
            </a>{' '}
            · <a href="#/integrace" className="text-bar-accent underline">integrace s AI asistentem</a> · není zdravotnický prostředek
          </p>
        </div>
      </section>
      <section className="flex flex-col gap-3.5 px-6 py-10 md:px-12 md:py-14">
        <h2 className="text-[22px] font-extrabold">Vyberte příběh</h2>
        <p className="-mt-1 text-sm text-muted-foreground">Každý trvá asi 30 sekund. Prohlídka projde všechny po řadě.</p>
        {STOPS.map((s, i) => (
          <a
            key={s.href}
            href={s.href}
            onClick={onPick}
            className="flex min-h-11 items-center gap-3.5 rounded-[14px] border bg-card px-4 py-3 hover:border-primary"
          >
            <span className="flex size-7.5 shrink-0 items-center justify-center rounded-[9px] bg-primary-soft text-sm font-extrabold text-primary-hover">{i + 1}</span>
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="text-[15px] font-bold">{s.story}</span>
              <span className="text-[13px] text-muted-foreground">{s.who}</span>
            </span>
            <ChevronRight className="size-5 text-primary" aria-hidden="true" />
          </a>
        ))}
        <div className="mt-2 flex flex-wrap gap-3">
          <Button onClick={onTour}>Provést ukázkou</Button>
          <Button variant="outline" onClick={onExplore}>
            Prozkoumat sám
          </Button>
        </div>
      </section>
    </div>
  )
}
