import { useState, useEffect, useRef } from "react"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { updateStatus } from "@/store/slices/authSlice"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

// UserStatus enum values
const UserStatus = {
  Online: 0,
  Idle: 1,
  DoNotDisturb: 2,
  Invisible: 3,
  Offline: 4,
} as const

const statusOptions = [
  { value: UserStatus.Online, label: "Online", color: "bg-green-500" },
  { value: UserStatus.Idle, label: "Idle", color: "bg-yellow-500" },
  { value: UserStatus.DoNotDisturb, label: "Do Not Disturb", color: "bg-red-500" },
  { value: UserStatus.Invisible, label: "Invisible", color: "bg-gray-500" },
  { value: UserStatus.Offline, label: "Offline", color: "bg-gray-500" },
]

interface StatusUpdateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  anchorRef?: React.RefObject<HTMLElement>
}

export function StatusUpdateModal({ open, onOpenChange, anchorRef }: StatusUpdateModalProps) {
  const { user } = useAppSelector((state) => state.auth)
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState(user?.status ?? UserStatus.Online)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && user) {
      setSelectedStatus(user.status ?? UserStatus.Online)
    }
  }, [open, user])

  useEffect(() => {
    if (!open) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node) &&
        anchorRef?.current &&
        !anchorRef.current.contains(event.target as Node)
      ) {
        onOpenChange(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [open, onOpenChange, anchorRef])

  const handleStatusChange = async (status: number) => {
    if (status === user?.status) {
      onOpenChange(false)
      return
    }

    setIsLoading(true)
    try {
      const result = await dispatch(updateStatus({ status }))

      if (updateStatus.fulfilled.match(result)) {
        toast({
          title: "Status Updated",
          description: "Your status has been updated successfully.",
        })
        onOpenChange(false)
      } else {
        toast({
          title: "Error",
          description: result.payload as string || "Failed to update status",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!open) return null

  // Calculate position - above the anchor element
  const getPosition = () => {
    if (!anchorRef?.current) {
      return { bottom: "60px", left: "12px" }
    }

    const rect = anchorRef.current.getBoundingClientRect()
    return {
      bottom: `${window.innerHeight - rect.top + 8}px`,
      left: `${rect.left}px`,
    }
  }

  const position = getPosition()

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-transparent"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Modal */}
      <div
        ref={modalRef}
        className="fixed z-50 w-56 bg-[#2b2d31] rounded-lg shadow-xl border border-border p-2"
        style={position}
      >
        <div className="space-y-1">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleStatusChange(option.value)}
              disabled={isLoading}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors text-left",
                selectedStatus === option.value
                  ? "bg-primary/20 text-primary-foreground"
                  : "text-foreground hover:bg-muted",
                isLoading && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className={cn("w-3 h-3 rounded-full flex-shrink-0", option.color)} />
              <span>{option.label}</span>
              {selectedStatus === option.value && (
                <Check className="ml-auto h-4 w-4" />
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

