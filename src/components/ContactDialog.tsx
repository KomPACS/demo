import { useState } from 'react'
import { Loading } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api, data, type Contact } from '@/lib/api'

export function ContactDialog({
  organizationId,
  place,
  disabled,
  onSaved,
}: {
  organizationId: string
  disabled?: boolean
  place: string | null
  onSaved: (c: Contact) => void
}) {
  const [open, setOpen] = useState(false)
  const [found, setFound] = useState<Contact | null | undefined>(undefined)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const lookup = () => {
    setFound(undefined)
    setError(null)
    data(api.POST('/api/contacts/lookup', { body: { organization_id: organizationId } }))
      .then((c) => {
        setFound(c)
        setEmail(c?.email ?? '')
        setPhone(c?.phone ?? '')
      })
      .catch(() => setError('Vyhledání kontaktu selhalo.'))
  }

  const save = () => {
    setSaving(true)
    setError(null)
    data(
      api.PUT('/api/contacts/{organization_id}', {
        params: { path: { organization_id: organizationId } },
        body: { email: email || null, phone: phone || null },
      }),
    )
      .then((c) => {
        onSaved(c)
        setOpen(false)
      })
      .catch(() => setError('Kontakt se nepodařilo uložit.'))
      .finally(() => setSaving(false))
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) lookup()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          Ověřit kontakt
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kontakt: {place ?? organizationId}</DialogTitle>
        </DialogHeader>
        {found === undefined && !error && <Loading label="Hledám kontakt…" />}
        {found === null && <p className="text-sm">Kontakt nenalezen. Zadejte ho ručně.</p>}
        {found?.source_url && (
          <p className="text-sm">
            Navržený kontakt, zdroj:{' '}
            <a className="underline" href={found.source_url} target="_blank" rel="noreferrer">
              {found.source_url}
            </a>
          </p>
        )}
        <div className="grid gap-1">
          <Label htmlFor="contact-email">E-mail</Label>
          <Input id="contact-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="contact-phone">Telefon</Label>
          <Input id="contact-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button onClick={save} disabled={!email && !phone} loading={saving}>
            Uložit jako ověřený kontakt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
