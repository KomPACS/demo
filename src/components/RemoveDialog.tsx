import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export function RemoveDialog({
  onRemove,
  disabled,
  loading,
}: {
  onRemove: (reason: string | null) => void
  disabled?: boolean
  loading?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="text-muted-foreground" disabled={disabled} loading={loading}>
          Vyřadit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vyřadit předchozí vyšetření</DialogTitle>
        </DialogHeader>
        <Label htmlFor="reason">Důvod (nepovinné)</Label>
        <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        <DialogFooter>
          <Button
            onClick={() => {
              onRemove(reason.trim() || null)
              setOpen(false)
              setReason('')
            }}
          >
            Vyřadit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
