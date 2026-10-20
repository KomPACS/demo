import { cn, panel } from '@/lib/utils'

const TOOLS = ['kompacs.find_patient', 'kompacs.get_case', 'pacs.search_studies', 'reports.find_mentions', 'reports.get_context']

const CALLS = [
  ['kompacs.find_patient', '1 pacientka, případ: Plánované CT'],
  ['pacs.search_studies', 'modalita CT, oblast hrudník: 2 studie v PACS FN v Motole'],
  ['kompacs.get_case', '1 CT hrudníku mimo PACS, žádost e-mailem připravena'],
]

const POINTS = [
  ['Stejné nástroje', 'jako koordinátor/ka v aplikaci: PACS, zprávy, hodnocení.'],
  ['Každá odpověď se zdrojem.', 'Odkaz vede na zprávu nebo studii v PACS.'],
  ['Přístup přes nemocniční přihlášení.', 'Každý dotaz se zapíše do auditu.'],
]

export function Integration() {
  return (
    <div className="grid gap-10 px-4 py-7.5 md:px-9 lg:grid-cols-[400px_minmax(0,1fr)]">
      <section className="flex flex-col gap-4.5">
        <div className="text-xs font-extrabold tracking-widest text-primary">INTEGRACE · MCP</div>
        <h1 className="text-3xl leading-tight font-extrabold">KomPACS jako zdroj dat pro AI asistenta nemocnice</h1>
        <p className="text-base leading-relaxed text-text">
          Lékař se zeptá ve svém asistentovi. Asistent volá nástroje serveru pacs-mcp. Nové okno ani nová aplikace nejsou potřeba.
        </p>
        <ol className="flex flex-col gap-3 text-[15px] leading-normal">
          {POINTS.map(([lead, rest], i) => (
            <li key={lead} className="grid grid-cols-[28px_minmax(0,1fr)] gap-2.5">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary-soft text-xs font-extrabold text-primary-hover">{i + 1}</span>
              <span>
                <b>{lead}</b> {rest}
              </span>
            </li>
          ))}
        </ol>
        <div className="rounded-2xl border bg-card px-4 py-3.5">
          <div className="mb-2 text-xs font-extrabold tracking-wider text-muted-foreground">NÁSTROJE PACS-MCP</div>
          <div className="flex flex-wrap gap-1.5 font-mono text-xs">
            {TOOLS.map((t) => (
              <span key={t} className="rounded-lg bg-divider px-2 py-1">
                {t}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Názvy nástrojů jsou zatím pracovní.</p>
        </div>
      </section>

      <section aria-label="Ukázkový přepis externího asistenta" className={cn(panel, 'flex flex-col overflow-hidden border')}>
        <div className="flex flex-wrap items-center gap-2.5 border-b border-divider px-5 py-3.5">
          <span className="size-2.5 rounded-full bg-primary-tint" />
          <span className="text-[15px] font-bold">AI asistent nemocnice</span>
          <span className="text-[13px] text-muted-foreground">· připojený server: pacs-mcp (KomPACS)</span>
          <span className="ml-auto rounded-full bg-warn-bg px-2.5 py-0.5 text-xs font-bold text-warn-ink">ukázkový přepis</span>
        </div>
        <div className="flex flex-col gap-3 p-5 text-[15px] leading-relaxed">
          <p className="max-w-[78%] self-end rounded-2xl rounded-br-sm bg-primary px-4 py-3 text-primary-foreground">
            Má pacientka Jana Nováková, RČ 685522/0141, nějaké CT hrudníku mimo náš PACS? Zítra ji hodnotíme na MDT.
          </p>
          <ul className="flex flex-col gap-1.5">
            {CALLS.map(([tool, out]) => (
              <li key={tool} className="flex flex-wrap items-center gap-2.5 rounded-[10px] border bg-[#F7FAFA] px-3 py-2 text-[13px]">
                <span className="font-mono text-primary-hover">{tool}</span>
                <span className="text-muted-foreground">{out}</span>
              </li>
            ))}
          </ul>
          <div className="max-w-[88%] rounded-2xl rounded-bl-sm bg-background px-4 py-3.5">
            Ano, jedno. <b>CT hrudníku z 23. 5. 2026</b> ze Všeobecné fakultní nemocnice není v PACS FN v Motole <b className="text-primary">[1]</b>.
            Zmínka je v propouštěcí zprávě z 2. 6. 2026 („Dále doloženo kontrolní CT hrudníku…“) <b className="text-primary">[2]</b>. Žádost o
            snímky je připravená, snímky zatím nedorazily.
          </div>
          <ol className="flex flex-col gap-0.5 text-[13px] text-muted-foreground">
            <li>[1] KomPACS · případ Jana Nováková · CT hrudníku 23. 5. 2026</li>
            <li>[2] NIS · propouštěcí zpráva, onkologie, 2. 6. 2026</li>
          </ol>
        </div>
        <div className="mt-auto border-t border-divider px-5 py-3 text-xs text-muted-foreground">
          Audit: uživatel přihlášen přes SSO nemocnice · 3 volání nástrojů · fiktivní data
        </div>
      </section>
    </div>
  )
}
