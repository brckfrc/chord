import { useState, useRef, useEffect } from "react"
import { useAppSelector } from "@/store/hooks"
import type { VoiceChannelUser } from "@/store/slices/channelsSlice"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Headphones, HeadphoneOff, User, Volume2, VolumeX } from "lucide-react"
import { cn } from "@/lib/utils"

// UserStatus enum values
const UserStatus = {
  Online: 0,
  Idle: 1,
  DoNotDisturb: 2,
  Invisible: 3,
  Offline: 4,
} as const

const getStatusColor = (status: number) => {
  switch (status) {
    case UserStatus.Online:
      return "bg-green-500"
    case UserStatus.Idle:
      return "bg-yellow-500"
    case UserStatus.DoNotDisturb:
      return "bg-red-500"
    case UserStatus.Invisible:
    case UserStatus.Offline:
    default:
      return "bg-gray-500"
  }
}

const getStatusText = (status: number) => {
  switch (status) {
    case UserStatus.Online:
      return "Online"
    case UserStatus.Idle:
      return "Idle"
    case UserStatus.DoNotDisturb:
      return "Do Not Disturb"
    case UserStatus.Invisible:
      return "Invisible"
    case UserStatus.Offline:
      return "Offline"
    default:
      return "Offline"
  }
}

interface UserVoiceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: VoiceChannelUser | null
  anchorRef?: React.RefObject<HTMLElement>
}

export function UserVoiceModal({
  open,
  onOpenChange,
  user,
  anchorRef,
}: UserVoiceModalProps) {
  const { user: currentUser } = useAppSelector((state) => state.auth)
  const modalRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  // Position modal above anchor element
  useEffect(() => {
    if (open && anchorRef?.current) {
      const anchorRect = anchorRef.current.getBoundingClientRect()
      const modalHeight = 280 // Approximate modal height
      const modalWidth = 240 // Approximate modal width
      
      // Position to the right of the anchor, above it
      let top = anchorRect.top - modalHeight - 8 // 8px gap above
      let left = anchorRect.right + 8 // 8px gap to the right
      
      // If modal would go off screen, adjust position
      if (top < 0) {
        top = anchorRect.bottom + 8 // Show below instead
      }
      if (left + modalWidth > window.innerWidth) {
        left = anchorRect.left - modalWidth - 8 // Show to the left instead
      }
      
      setPosition({
        top: Math.max(8, top), // At least 8px from top
        left: Math.max(8, left), // At least 8px from left
      })
    }
  }, [open, anchorRef])

  // Handle ESC key and click outside to close modal
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

  if (!user) return null

  const isCurrentUser = user.userId === currentUser?.id

  // TODO: SignalR Integration
  // When SignalR ChatHub is implemented, add these actions:
  // 1. Mute User - Call SignalR MuteUser method
  //    - Event: MuteUser(userId, channelId)
  // 2. Deafen User - Call SignalR DeafenUser method
  //    - Event: DeafenUser(userId, channelId)
  // 3. Move User - Call SignalR MoveUser method
  //    - Event: MoveUser(userId, fromChannelId, toChannelId)
  // 4. Kick User - Call SignalR KickUser method
  //    - Event: KickUser(userId, channelId)
  // 5. Ban User - Call SignalR BanUser method
  //    - Event: BanUser(userId, guildId)

  const handleMuteUser = () => {
    // TODO: Call SignalR MuteUser when implemented
    // SignalR will broadcast UpdateVoiceState event to all users
    console.log("Mute user:", user.userId)
  }

  const handleDeafenUser = () => {
    // TODO: Call SignalR DeafenUser when implemented
    // SignalR will broadcast UpdateVoiceState event to all users
    console.log("Deafen user:", user.userId)
  }

  const handleMoveUser = () => {
    // TODO: Call SignalR MoveUser when implemented
    // SignalR will broadcast UserMovedVoiceChannel event to all users
    console.log("Move user:", user.userId)
  }

  const handleKickUser = () => {
    // TODO: Call SignalR KickUser when implemented
    // SignalR will broadcast UserLeftVoiceChannel event to all users
    console.log("Kick user:", user.userId)
  }

  const handleBanUser = () => {
    // TODO: Call SignalR BanUser when implemented
    // SignalR will broadcast UserBanned event to all users
    console.log("Ban user:", user.userId)
  }

  if (!open) return null

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
        className="fixed z-50 w-60 bg-[#2b2d31] rounded-lg shadow-xl border border-border overflow-hidden"
        style={{
          top: position.top > 0 ? `${position.top}px` : "auto",
          left: position.left > 0 ? `${position.left}px` : "auto",
        }}
      >
        <div className="flex flex-col">
          {/* User Header */}
          <div className="px-4 py-3 bg-[#2f3136] border-b border-border">
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-base">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
                <div
                  className={cn(
                    "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#2f3136]",
                    getStatusColor(user.status)
                  )}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{user.displayName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.customStatus || getStatusText(user.status)}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="py-2">
            {/* Voice Actions */}
            <div className="px-2 space-y-0.5">
              <Button
                variant="ghost"
                className="w-full justify-start text-sm h-9 px-3"
                onClick={handleMuteUser}
                disabled={isCurrentUser}
              >
                {user.isMuted ? (
                  <>
                    <Volume2 className="h-4 w-4 mr-2" />
                    Unmute
                  </>
                ) : (
                  <>
                    <VolumeX className="h-4 w-4 mr-2" />
                    Mute
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-sm h-9 px-3"
                onClick={handleDeafenUser}
                disabled={isCurrentUser}
              >
                {user.isDeafened ? (
                  <>
                    <Headphones className="h-4 w-4 mr-2" />
                    Undeafen
                  </>
                ) : (
                  <>
                    <HeadphoneOff className="h-4 w-4 mr-2" />
                    Deafen
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-sm h-9 px-3"
                onClick={handleMoveUser}
                disabled={isCurrentUser}
              >
                <User className="h-4 w-4 mr-2" />
                Move to Channel
              </Button>
            </div>

            {/* Divider */}
            <div className="h-px bg-border mx-2 my-2" />

            {/* Moderation Actions */}
            <div className="px-2 space-y-0.5">
              <Button
                variant="ghost"
                className="w-full justify-start text-sm h-9 px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleKickUser}
                disabled={isCurrentUser}
              >
                <User className="h-4 w-4 mr-2" />
                Kick from Voice
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-sm h-9 px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleBanUser}
                disabled={isCurrentUser}
              >
                <User className="h-4 w-4 mr-2" />
                Ban User
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

