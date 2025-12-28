import { useState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAppDispatch } from "@/store/hooks"
import { sendFriendRequest } from "@/store/slices/friendsSlice"
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

const addFriendSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
})

type AddFriendFormData = z.infer<typeof addFriendSchema>

interface AddFriendModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddFriendModal({ open, onOpenChange }: AddFriendModalProps) {
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AddFriendFormData>({
    resolver: zodResolver(addFriendSchema),
  })

  const onSubmit = async (data: AddFriendFormData) => {
    setIsLoading(true)
    try {
      const result = await dispatch(sendFriendRequest(data.username))

      if (sendFriendRequest.fulfilled.match(result)) {
        toast({
          title: "Success",
          description: `Friend request sent to ${data.username}`,
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
        description: "Failed to send friend request",
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
      <DialogContent ref={modalRef} className="max-w-md">
        <DialogHeader className="pb-4">
          <DialogTitle>Add Friend</DialogTitle>
          <DialogDescription>
            Send a friend request by entering their username
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              placeholder="username#1234"
              {...register("username")}
            />
            {errors.username && (
              <p className="text-sm text-destructive">
                {errors.username.message}
              </p>
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
                  Sending...
                </>
              ) : (
                "Send Request"
              )}
            </Button>
          </div>
        </form>
        <DialogClose onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

