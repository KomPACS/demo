import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Loading } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api, data, type Patient, type TriggerSummary } from '@/lib/api'

type Kind = 'CT' | 'MR' | 'PT' | 'mdt'

export function NewCheckDialog({ onCreated }: { onCreated: (t: TriggerSummary) => void }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [patientId, setPatientId] = useState('')
  const [kind, setKind] = useState<Kind>('CT')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [error, setError] = useState<string | null>(null)
  const [resultsFor, setResultsFor] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (!open) return
    data(api.GET('/api/patients', { params: { query: { q } } }))
      .then(setPatients)
      .catch(() => setError('Pacienty se nepodařilo načíst.'))
      .finally(() => setResultsFor(q))
  }, [open, q])

  const searching = resultsFor !== q

  const start = () => {
    setStarting(true)
    setError(null)
    data(
      api.POST('/api/triggers', {
        body:
          kind === 'mdt'
            ? { patient_id: patientId, kind: 'mdt', modality: null, date }
            : { patient_id: patientId, kind: 'exam', modality: kind, date },
      }),
    )
      .then((t) => {
        onCreated(t)
        setOpen(false)
      })
      .catch(() => setError('Kontrolu se nepodařilo spustit.'))
      .finally(() => setStarting(false))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Plus className="size-5" />
          Spustit kontrolu
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Spustit kontrolu předchozích vyšetření</DialogTitle>
        </DialogHeader>
        <div className="grid gap-1">
          <Label htmlFor="patient-q">Pacient</Label>
          <Input id="patient-q" placeholder="Jméno nebo RČ" value={q} onChange={(e) => setQ(e.target.value)} />
          <ul className="max-h-40 overflow-auto rounded-md border">
            {patients.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setPatientId(p.id)}
                  className={`w-full px-3 py-1.5 text-left text-sm hover:bg-accent ${p.id === patientId ? 'bg-accent font-medium' : ''}`}
                >
                  {p.name ?? p.id}{p.rc && ` · ${p.rc}`} · {p.diagnoses.map((d) => d.code).join(', ')}
                </button>
              </li>
            ))}
            {searching && patients.length === 0 && (
              <li className="px-3 py-1.5">
                <Loading label="Hledám pacienty…" className="text-sm" />
              </li>
            )}
            {!searching && patients.length === 0 && <li className="px-3 py-1.5 text-sm text-muted-foreground">Nic nenalezeno.</li>}
          </ul>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1">
            <Label>Spouštěč</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CT">Plánované CT</SelectItem>
                <SelectItem value="MR">Plánované MR</SelectItem>
                <SelectItem value="PT">Plánované PET</SelectItem>
                <SelectItem value="mdt">MDT, indikační seminář</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="trigger-date">Datum</Label>
            <Input id="trigger-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button onClick={start} disabled={!patientId || !date} loading={starting}>
            {starting ? 'Spouštím kontrolu…' : 'Spustit kontrolu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
