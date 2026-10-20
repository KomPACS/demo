import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import type { Candidate, RequestItem } from '@/lib/api'
import { priorStatus, requestState } from '@/lib/labels'
import { useReadOnly } from '@/lib/readonly'
import { cn } from '@/lib/utils'

const statusColor: Record<Candidate['status'], string> = {
  available: 'bg-ok-bg text-ok-ink',
  missing_report: 'bg-warn-bg text-warn-ink',
  missing: 'bg-missing-bg text-missing-ink',
  place_unknown: 'bg-warn-bg text-warn-ink',
}

const requestColor: Record<RequestItem['state'], string> = {
  draft: 'bg-divider text-text',
  approved: 'bg-primary-soft text-primary-hover',
  sent: 'bg-primary-soft text-primary-hover',
  requested: 'bg-primary-soft text-primary-hover',
  not_delivered: 'bg-missing text-white',
  received: 'bg-ok-bg text-ok-ink',
  not_found: 'bg-divider text-subtle',
}

const chip = 'h-auto rounded-full px-3 py-1 text-sm font-bold'

export function StatusBadge({ status }: { status: Candidate['status'] }) {
  return <Badge className={cn(chip, statusColor[status])}>{priorStatus[status]}</Badge>
}

export function RequestBadge({ state }: { state: RequestItem['state'] }) {
  return <Badge className={cn(chip, requestColor[state])}>{requestState[state]}</Badge>
}

export function Loading({ label, hint, className }: { label: string; hint?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn('flex items-center gap-3 text-base text-muted-foreground', className)}>
      <Loader2 className="size-6 shrink-0 animate-spin text-primary" aria-hidden="true" />
      <div>
        <div className="font-semibold text-text">{label}</div>
        {hint && <div className="text-sm">{hint}</div>}
      </div>
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-[20px] bg-[#E6ECEE]', className)} />
}

export function WriteGroup({ children }: { children: ReactNode }) {
  const readOnly = useReadOnly()
  return (
    <fieldset disabled={readOnly} title={readOnly ? 'Jen na počítači' : undefined} className="contents">
      {children}
    </fieldset>
  )
}
