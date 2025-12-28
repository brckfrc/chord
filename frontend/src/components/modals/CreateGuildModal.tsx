import { useState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate } from "react-router-dom"
import { useAppDispatch } from "@/store/hooks"
import { createGuild, fetchGuilds } from "@/store/slices/guildsSlice"
import { invitesApi } from "@/lib/api/invites"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/hooks/use-toast"
import { Hash } from "lucide-react"
import { cn } from "@/lib/utils"

const createGuildSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(100),
  description: z.string().max(500).optional(),
  iconUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
})

const joinGuildSchema = z.object({
  inviteCode: z.string().min(1, "Invite code is required"),
})

type CreateGuildFormData = z.infer<typeof createGuildSchema>
type JoinGuildFormData = z.infer<typeof joinGuildSchema>

type TabType = "create" | "join"

interface CreateGuildModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateGuildModal({ open, onOpenChange }: CreateGuildModalProps) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<TabType>("create")
  const [isLoading, setIsLoading] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    formState: { errors: createErrors },
    reset: resetCreate,
  } = useForm<CreateGuildFormData>({
    resolver: zodResolver(createGuildSchema),
  })

  const {
    register: registerJoin,
    handleSubmit: handleSubmitJoin,
    formState: { errors: joinErrors },
    reset: resetJoin,
  } = useForm<JoinGuildFormData>({
    resolver: zodResolver(joinGuildSchema),
  })

  const onSubmitCreate = async (data: CreateGuildFormData) => {
    setIsLoading(true)
    try {
      const result = await dispatch(
        createGuild({
          name: data.name,
          description: data.description || undefined,
          iconUrl: data.iconUrl || undefined,
        })
      )

      if (createGuild.fulfilled.match(result)) {
        toast({
          title: "Success",
          description: "Guild created successfully",
        })
        resetCreate()
        onOpenChange(false)
      } else {
        toast({
          title: "Error",
          description: result.payload as string,
          variant: "destructive",
        })
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to create guild",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmitJoin = async (data: JoinGuildFormData) => {
    setIsJoining(true)
    try {
      // Remove any # prefix if user added it
      const code = data.inviteCode.replace(/^#/, "").trim()

      // Accept the invite
      const guild = await invitesApi.acceptInvite(code)

      // Refresh guilds list
      await dispatch(fetchGuilds())

      toast({
        title: "Success",
        description: `Joined ${guild.name} successfully!`,
      })

      resetJoin()
      onOpenChange(false)

      // Navigate to the guild (channels will be loaded automatically)
      navigate(`/channels/${guild.id}`)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to join guild",
        variant: "destructive",
      })
    } finally {
      setIsJoining(false)
    }
  }

  // Reset forms when modal closes or tab changes
  useEffect(() => {
    if (!open) {
      setActiveTab("create")
      resetCreate()
      resetJoin()
    }
  }, [open, resetCreate, resetJoin])

  // Handle ESC key to close modal
  useEffect(() => {
    if (!open) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false)
      }
    }

    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("keydown", handleEscape)
    }
  }, [open, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={modalRef}
        className={cn(
          "w-[450px] max-w-none p-0 flex flex-col",
          activeTab === "create" ? "h-[550px]" : "h-[400px]"
        )}
      >
        <DialogHeader className="px-8 pt-6 pb-4 border-b">
          <DialogTitle className="text-2xl">Guild</DialogTitle>
          <DialogDescription>
            Create a new guild or join an existing one
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="px-8 pt-4 border-b">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("create")}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors rounded-t-md",
                activeTab === "create"
                  ? "bg-accent text-foreground border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Create Guild
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("join")}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors rounded-t-md",
                activeTab === "join"
                  ? "bg-accent text-foreground border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Join Guild
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          {activeTab === "create" ? (
            <form onSubmit={handleSubmitCreate(onSubmitCreate)} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Guild Name *</Label>
                  <Input
                    id="name"
                    placeholder="My Awesome Guild"
                    {...registerCreate("name")}
                  />
                  {createErrors.name && (
                    <p className="text-sm text-destructive">{createErrors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="A brief description of your guild"
                    {...registerCreate("description")}
                  />
                  {createErrors.description && (
                    <p className="text-sm text-destructive">
                      {createErrors.description.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="iconUrl">Icon URL</Label>
                  <Input
                    id="iconUrl"
                    type="url"
                    placeholder="https://example.com/icon.png"
                    {...registerCreate("iconUrl")}
                  />
                  {createErrors.iconUrl && (
                    <p className="text-sm text-destructive">{createErrors.iconUrl.message}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Spinner className="mr-2" />
                      Creating...
                    </>
                  ) : (
                    "Create Guild"
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmitJoin(onSubmitJoin)} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inviteCode">Invite Code</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="inviteCode"
                      placeholder="Enter invite code"
                      className="pl-9"
                      {...registerJoin("inviteCode")}
                    />
                  </div>
                  {joinErrors.inviteCode && (
                    <p className="text-sm text-destructive">{joinErrors.inviteCode.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Enter the invite code you received (with or without #)
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isJoining}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isJoining}>
                  {isJoining ? (
                    <>
                      <Spinner className="mr-2" />
                      Joining...
                    </>
                  ) : (
                    "Join Guild"
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
        <DialogClose onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

