import type { ReactNode } from 'react'
import type { Case } from '@/lib/api'
import { age, sexLabel, triggerTitle, weekdayDate } from '@/lib/labels'

function Item({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-0.5 ${className ?? ''}`}>
      <span className="text-xs font-semibold tracking-wider text-bar-muted uppercase">{label}</span>
      <span className="text-base font-bold text-white">{children}</span>
    </div>
  )
}

export function PatientBar({
  kase,
  ready,
  total,
  backLabel,
  onBack,
  action,
}: {
  kase: Case
  ready: number
  total: number
  backLabel: string
  onBack: () => void
  action?: ReactNode
}) {
  const { patient, trigger } = kase
  const dx = patient.diagnoses[0]
  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center gap-x-7.5 gap-y-3 bg-bar px-4 py-3.5 text-white shadow-[0_6px_20px_rgba(16,40,44,.18)] md:px-9">
      <button type="button" onClick={onBack} className="basis-full text-left text-[15px] font-bold text-bar-muted hover:text-white">
        ‹ {backLabel}
      </button>
      <div className="text-[26px] font-extrabold tracking-tight">{patient.id}</div>
      <Item label="Pacient">{[sexLabel[patient.sex], age(patient)].filter(Boolean).join(', ')}</Item>
      {dx && (
        <Item label="Diagnóza">
          {[dx.code, dx.display].filter(Boolean).join(' ')}
        </Item>
      )}
      <Item label="Spouštěč">
        {triggerTitle(trigger)} · {weekdayDate(trigger.date)}
      </Item>
      {trigger.body_part && <Item label="Oblast">{trigger.body_part}</Item>}
      <Item label="Připraveno" className="min-w-36">
        <span className="flex items-center gap-2.5">
          {ready} z {total}
          <span className="flex h-2 flex-1 overflow-hidden rounded-full bg-bar-track">
            <span className="bg-bar-accent" style={{ width: `${total ? (100 * ready) / total : 0}%` }} />
          </span>
        </span>
      </Item>
      {action && <div className="ml-auto">{action}</div>}
    </header>
  )
}
