import { useState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAppDispatch } from "@/store/hooks"
import { createGuild } from "@/store/slices/guildsSlice"
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

const createGuildSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(100),
  description: z.string().max(500).optional(),
  iconUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
})

type CreateGuildFormData = z.infer<typeof createGuildSchema>

interface CreateGuildModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateGuildModal({ open, onOpenChange }: CreateGuildModalProps) {
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateGuildFormData>({
    resolver: zodResolver(createGuildSchema),
  })

  const onSubmit = async (data: CreateGuildFormData) => {
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
        reset()
        onOpenChange(false)
      } else {
        toast({
          title: "Error",
          description: result.payload as string,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create guild",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

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
      <DialogContent ref={modalRef} className="w-[450px] h-[500px] max-w-none p-0 flex flex-col">
        <DialogHeader className="px-8 pt-6 pb-4 border-b">
          <DialogTitle className="text-2xl">Create Guild</DialogTitle>
          <DialogDescription>
            Create a new guild to start chatting with your friends
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Guild Name *</Label>
                <Input
                  id="name"
                  placeholder="My Awesome Guild"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="A brief description of your guild"
                  {...register("description")}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">
                    {errors.description.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="iconUrl">Icon URL</Label>
                <Input
                  id="iconUrl"
                  type="url"
                  placeholder="https://example.com/icon.png"
                  {...register("iconUrl")}
                />
                {errors.iconUrl && (
                  <p className="text-sm text-destructive">{errors.iconUrl.message}</p>
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
        </div>
        <DialogClose onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

