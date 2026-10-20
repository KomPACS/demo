import { useState } from 'react'
import { ContactDialog } from '@/components/ContactDialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { Action, Contact, Patient, RequestItem } from '@/lib/api'
import { formatDate } from '@/lib/labels'

function callScript(r: RequestItem, patient: Patient): string {
  const who = patient.sex === 'female' ? 'Pacientka' : 'Pacient'
  return `Dobrý den, volám z FN v Motole. Žádáme o zprávu a snímky z vyšetření ${r.prior_description} ze dne ${formatDate(r.prior_date)}. ${who} ${patient.name ?? 'jméno neuvedeno'}, RČ ${patient.rc ?? 'neuvedeno'}. Prosíme o odeslání přes ePACS na FN v Motole.`
}

function ContactLine({ addr, label, contact }: { addr: string | null | undefined; label: string; contact: Contact | null | undefined }) {
  return (
    <>
      {addr ?? label} ·{' '}
      {contact?.verified_at && !contact.needs_reverify ? (
        <span className="text-ok-ink">ověřený kontakt {formatDate(contact.verified_at)}</span>
      ) : (
        <span className="font-semibold text-warn-ink">kontakt neověřený</span>
      )}
    </>
  )
}

export function RequestActions({
  r,
  patient,
  pending,
  onAct,
  onContact,
  onSaveDraft,
}: {
  r: RequestItem
  patient: Patient
  pending: string | null
  onAct: (id: string, a: Action) => void
  onContact: (c: Contact) => void
  onSaveDraft: (id: string, text: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(r.email_draft ?? '')
  const placeKnown = Boolean(r.organization_id || r.place)
  const closed = r.state === 'received' || r.state === 'not_found'
  const contact = r.contact
  const unverified = Boolean(r.organization_id) && (!contact?.email || !contact.verified_at || contact.needs_reverify)
  const verifyButton = r.organization_id && (!contact?.verified_at || contact.needs_reverify) && (
    <ContactDialog disabled={pending !== null} organizationId={r.organization_id} place={r.place} onSaved={onContact} />
  )

  const save = () => {
    onSaveDraft(r.id, draft)
    setEditing(false)
  }

  return (
    <div className="flex flex-col gap-2.5">
      {r.channel === 'email' && (
        <div className="text-[15px]">
          <b>Komu:</b> {r.place ?? 'místo neznámé'} · <ContactLine addr={contact?.email} label="e-mail neuveden" contact={contact} />
        </div>
      )}
      {r.channel === 'phone' && (
        <div className="text-[15px]">
          <b>Volat:</b> {r.place ?? 'místo neznámé'} · <ContactLine addr={contact?.phone} label="telefon neuveden" contact={contact} /> · jméno
          neuvedeno
        </div>
      )}

      {r.channel === 'email' && editing && (
        <div className="flex flex-col gap-2">
          <Textarea aria-label="Text žádosti" className="text-[15px]" rows={8} value={draft} onChange={(e) => setDraft(e.target.value)} />
          <div className="flex gap-2.5">
            <Button disabled={pending !== null} loading={pending === `draft-${r.id}`} onClick={save}>
              Uložit
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setEditing(false)
                setDraft(r.email_draft ?? '')
              }}
            >
              Zrušit
            </Button>
          </div>
        </div>
      )}
      {r.channel === 'email' && !editing && (
        <blockquote className="rounded-xl bg-background px-3.5 py-3 text-[15px] whitespace-pre-wrap text-text">{r.email_draft}</blockquote>
      )}
      {r.channel === 'phone' && !closed && (
        <div className="rounded-xl bg-background px-3.5 py-3 text-[15px] leading-relaxed">
          <div className="mb-1 text-xs font-extrabold tracking-widest text-muted-foreground uppercase">Co říct</div>
          {callScript(r, patient)}
        </div>
      )}
      {r.channel === 'phone' && !closed && <div className="text-sm text-muted-foreground">Po hovoru zapište výsledek:</div>}

      {!closed && !editing && (
        <div className="flex flex-wrap gap-2.5">
          {r.channel === 'email' && r.state === 'draft' && (
            <Button
              disabled={pending !== null || unverified}
              title={unverified ? 'Kontakt je nutné nejprve ověřit.' : undefined}
              loading={pending === `approve-${r.id}`}
              onClick={() => onAct(r.id, 'approve')}
            >
              Schválit
            </Button>
          )}
          {r.channel === 'email' && (
            <Button
              variant="outline"
              disabled={pending !== null}
              onClick={() => {
                setDraft(r.email_draft ?? '')
                setEditing(true)
              }}
            >
              Upravit text
            </Button>
          )}
          {r.channel === 'fhir' && r.state === 'draft' && (
            <Button disabled={pending !== null} loading={pending === `approve-${r.id}`} onClick={() => onAct(r.id, 'approve')}>
              Odeslat přes FHIR (demo)
            </Button>
          )}
          {r.channel === 'phone' && (
            <>
              <Button disabled={pending !== null} loading={pending === `requested-${r.id}`} onClick={() => onAct(r.id, 'requested')}>
                Vyžádáno
              </Button>
              <Button variant="outline" disabled={pending !== null} loading={pending === `not-found-${r.id}`} onClick={() => onAct(r.id, 'not-found')}>
                Nedostupné
              </Button>
              <Button
                variant="outline"
                disabled={pending !== null}
                loading={pending === `call-again-${r.id}`}
                onClick={() => onAct(r.id, 'call-again')}
              >
                Zavolat znovu{r.call_attempts?.length ? ` (pokus ${r.call_attempts.length})` : ''}
              </Button>
            </>
          )}
          {r.state === 'not_delivered' && (r.channel === 'email' || r.channel === 'fhir') && (
            <Button variant="outline" disabled={pending !== null} loading={pending === `requested-${r.id}`} onClick={() => onAct(r.id, 'requested')}>
              Urgováno telefonem
            </Button>
          )}
          {verifyButton}
          {!placeKnown && (
            <Button variant="outline" disabled={pending !== null} loading={pending === `not-found-${r.id}`} onClick={() => onAct(r.id, 'not-found')}>
              Uzavřít jako nedohledáno
            </Button>
          )}
          {placeKnown && r.state !== 'draft' && r.state !== 'approved' && (
            <Button variant="ghost" disabled={pending !== null} loading={pending === `deliver-${r.id}`} onClick={() => onAct(r.id, 'deliver')}>
              Simulovat doručení (demo)
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
