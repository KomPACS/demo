import { ContactDialog } from '@/components/ContactDialog'
import { Button } from '@/components/ui/button'
import type { Action, Contact, RequestItem } from '@/lib/api'

export function RequestActions({
  r,
  pending,
  onAct,
  onContact,
}: {
  r: RequestItem
  pending: string | null
  onAct: (id: string, a: Action) => void
  onContact: (c: Contact) => void
}) {
  const placeKnown = Boolean(r.organization_id || r.place)
  const closed = r.state === 'received' || r.state === 'not_found'
  if (closed) return null
  return (
    <>
      {r.organization_id && (!r.contact?.verified_at || r.contact.needs_reverify) && (
        <ContactDialog disabled={pending !== null} organizationId={r.organization_id} place={r.place} onSaved={onContact} />
      )}
      {r.state === 'draft' && r.channel === 'email' && (
        <Button disabled={!r.contact?.email || pending !== null} loading={pending === `approve-${r.id}`} onClick={() => onAct(r.id, 'approve')}>
          Odeslat
        </Button>
      )}
      {r.state === 'draft' && r.channel === 'fhir' && (
        <Button disabled={pending !== null} loading={pending === `approve-${r.id}`} onClick={() => onAct(r.id, 'approve')}>
          Odeslat přes FHIR (demo)
        </Button>
      )}
      {placeKnown && (r.state === 'draft' || r.state === 'not_delivered') && r.channel === 'phone' && (
        <Button disabled={pending !== null} loading={pending === `requested-${r.id}`} onClick={() => onAct(r.id, 'requested')}>
          Zavoláno, označit jako vyžádáno
        </Button>
      )}
      {r.state === 'not_delivered' && (r.channel === 'email' || r.channel === 'fhir') && (
        <Button variant="outline" disabled={pending !== null} loading={pending === `requested-${r.id}`} onClick={() => onAct(r.id, 'requested')}>
          Urgováno telefonem
        </Button>
      )}
      {!placeKnown && (
        <Button variant="outline" disabled={pending !== null} loading={pending === `not-found-${r.id}`} onClick={() => onAct(r.id, 'not-found')}>
          Uzavřít jako nedohledáno
        </Button>
      )}
      {placeKnown && r.state !== 'draft' && (
        <Button variant="ghost" disabled={pending !== null} loading={pending === `deliver-${r.id}`} onClick={() => onAct(r.id, 'deliver')}>
          Simulovat doručení (demo)
        </Button>
      )}
    </>
  )
}
