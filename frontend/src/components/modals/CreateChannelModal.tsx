import { useState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAppDispatch } from "@/store/hooks"
import { createChannel } from "@/store/slices/channelsSlice"
import { ChannelType } from "@/lib/api/channels"
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
import { Hash, Mic, Megaphone } from "lucide-react"

const createChannelSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(100),
  type: z.nativeEnum(ChannelType),
  topic: z.string().max(500).optional(),
})

type CreateChannelFormData = z.infer<typeof createChannelSchema>

interface CreateChannelModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  guildId: string
  defaultChannelType?: ChannelType
}

export function CreateChannelModal({
  open,
  onOpenChange,
  guildId,
  defaultChannelType = ChannelType.Text,
}: CreateChannelModalProps) {
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<CreateChannelFormData>({
    resolver: zodResolver(createChannelSchema),
    defaultValues: {
      type: defaultChannelType,
    },
  })

  // Reset form when modal opens with new channel type
  useEffect(() => {
    if (open) {
      reset({
        type: defaultChannelType,
        name: "",
        topic: "",
      })
      setValue("type", defaultChannelType)
    }
  }, [open, defaultChannelType, reset, setValue])

  const onSubmit = async (data: CreateChannelFormData) => {
    setIsLoading(true)
    try {
      const result = await dispatch(
        createChannel({
          guildId,
          data: {
            name: data.name,
            type: data.type,
            topic: data.topic || undefined,
          },
        })
      )

      if (createChannel.fulfilled.match(result)) {
        toast({
          title: "Success",
          description: "Channel created successfully",
        })
        reset()
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
        description: "Failed to create channel",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={modalRef} className="w-[450px] max-w-none">
        <DialogHeader className="pb-8">
          <DialogTitle className="flex items-center gap-2">
            {defaultChannelType === ChannelType.Text ? (
              <Hash className="h-5 w-5" />
            ) : defaultChannelType === ChannelType.Voice ? (
              <Mic className="h-5 w-5" />
            ) : (
              <Megaphone className="h-5 w-5" />
            )}
            {defaultChannelType === ChannelType.Text
              ? "Create Text Channel"
              : defaultChannelType === ChannelType.Voice
              ? "Create Voice Channel"
              : "Create Announcement Channel"}
          </DialogTitle>
          <DialogDescription>
            Create a new {defaultChannelType === ChannelType.Text
              ? "text"
              : defaultChannelType === ChannelType.Voice
              ? "voice"
              : "announcement"} channel in this guild
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Channel Name *</Label>
            <Input
              id="name"
              placeholder="general"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Channel type is hidden, set by defaultChannelType prop */}
          <input type="hidden" {...register("type", { valueAsNumber: true })} />

          <div className="space-y-2">
            <Label htmlFor="topic">Topic</Label>
            <Input
              id="topic"
              placeholder="What's this channel about?"
              {...register("topic")}
            />
            {errors.topic && (
              <p className="text-sm text-destructive">{errors.topic.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
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
                "Create Channel"
              )}
            </Button>
          </div>
        </form>
        <DialogClose onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

