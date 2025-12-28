import { useState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { invitesApi } from "@/lib/api/invites"
import type { CreateInviteDto } from "@/lib/api/invites.types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/hooks/use-toast"

const createInviteSchema = z.object({
  expiresAt: z.string().optional(),
  maxUses: z.number().min(1).max(100).optional().or(z.literal("")),
})

type CreateInviteFormData = z.infer<typeof createInviteSchema>

interface InviteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  guildId: string
  onInviteCreated?: (inviteCode: string) => void
}

export function InviteModal({ open, onOpenChange, guildId, onInviteCreated }: InviteModalProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [createdInviteCode, setCreatedInviteCode] = useState<string | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateInviteFormData>({
    resolver: zodResolver(createInviteSchema),
  })

  useEffect(() => {
    if (open) {
      reset()
      setCreatedInviteCode(null)
    }
  }, [open, reset])

  // ESC key handler
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, onOpenChange])

  const onSubmit = async (data: CreateInviteFormData) => {
    setIsLoading(true)
    try {
      const dto: CreateInviteDto = {}

      if (data.expiresAt) {
        dto.expiresAt = new Date(data.expiresAt).toISOString()
      }

      if (data.maxUses && String(data.maxUses) !== "") {
        dto.maxUses = Number(data.maxUses)
      }

      const invite = await invitesApi.createInvite(guildId, dto)

      setCreatedInviteCode(invite.code)

      toast({
        title: "Success",
        description: "Invite created successfully",
      })

      if (onInviteCreated) {
        onInviteCreated(invite.code)
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to create invite",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyInviteLink = async () => {
    if (!createdInviteCode) return

    const inviteLink = `${window.location.origin}/invite/${createdInviteCode}`

    try {
      await navigator.clipboard.writeText(inviteLink)
      toast({
        title: "Copied!",
        description: "Invite link copied to clipboard",
      })
    } catch {
      toast({
        title: "Error",
        description: "Failed to copy invite link",
        variant: "destructive",
      })
    }
  }

  const copyInviteCode = async () => {
    if (!createdInviteCode) return

    try {
      await navigator.clipboard.writeText(createdInviteCode)
      toast({
        title: "Copied!",
        description: "Invite code copied to clipboard",
      })
    } catch {
      toast({
        title: "Error",
        description: "Failed to copy invite code",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={modalRef} className="w-[450px] max-w-none p-0 flex flex-col">
        <DialogHeader className="px-8 pt-6 pb-4 border-b">
          <DialogTitle>Create Invite</DialogTitle>
          <DialogDescription>
            Create an invite link or code for this guild
          </DialogDescription>
        </DialogHeader>

        {createdInviteCode ? (
          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
            <div className="space-y-2">
              <Label>Invite Link</Label>
              <div className="flex gap-2">
                <Input
                  value={`${window.location.origin}/invite/${createdInviteCode}`}
                  readOnly
                  className="flex-1"
                />
                <Button onClick={copyInviteLink} variant="outline">
                  Copy Link
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Invite Code</Label>
              <div className="flex gap-2">
                <Input
                  value={createdInviteCode}
                  readOnly
                  className="flex-1 font-mono"
                />
                <Button onClick={copyInviteCode} variant="outline">
                  Copy Code
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this code with others: <span className="font-mono font-semibold">#{createdInviteCode}</span>
              </p>
            </div>

            <div className="pt-4 border-t">
              <Button
                onClick={() => {
                  setCreatedInviteCode(null)
                  reset()
                }}
                variant="outline"
                className="w-full"
              >
                Create Another Invite
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expires At (Optional)</Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                {...register("expiresAt")}
              />
              {errors.expiresAt && (
                <p className="text-sm text-destructive">{errors.expiresAt.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Leave empty for no expiration
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxUses">Max Uses (Optional)</Label>
              <Input
                id="maxUses"
                type="number"
                min="1"
                max="100"
                placeholder="Unlimited"
                {...register("maxUses", {
                  setValueAs: (v) => v === "" ? "" : Number(v),
                })}
              />
              {errors.maxUses && (
                <p className="text-sm text-destructive">{errors.maxUses.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Leave empty for unlimited uses
              </p>
            </div>

            <div className="pt-4 border-t flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? <Spinner className="w-4 h-4" /> : "Create Invite"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

