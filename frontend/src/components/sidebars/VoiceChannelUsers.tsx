import { useState, useRef } from "react"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { addVoiceChannelUser } from "@/store/slices/channelsSlice"
import type { VoiceChannelUser } from "@/store/slices/channelsSlice"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Headphones, HeadphoneOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { UserVoiceModal } from "@/components/modals/UserVoiceModal"

// UserStatus enum values
const UserStatus = {
  Online: 0,
  Idle: 1,
  DoNotDisturb: 2,
  Invisible: 3,
  Offline: 4,
} as const

interface VoiceUserItemProps {
  user: VoiceChannelUser
  channelId: string
  isCurrentUser: boolean
}

function VoiceUserItem({ user, channelId, isCurrentUser }: VoiceUserItemProps) {
  const dispatch = useAppDispatch()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const userItemRef = useRef<HTMLDivElement>(null)

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

  const handleToggleMute = () => {
    if (!isCurrentUser) return

    // Update mute state
    dispatch(
      addVoiceChannelUser({
        channelId,
        user: {
          ...user,
          isMuted: !user.isMuted,
        },
      })
    )
    // TODO: Call SignalR UpdateVoiceState when implemented
    // SignalR will broadcast UpdateVoiceState event to all users
  }

  const handleToggleDeafen = () => {
    if (!isCurrentUser) return

    // Update deafen state (deafen also mutes)
    dispatch(
      addVoiceChannelUser({
        channelId,
        user: {
          ...user,
          isDeafened: !user.isDeafened,
          isMuted: !user.isDeafened ? true : user.isMuted, // Deafen also mutes
        },
      })
    )
    // TODO: Call SignalR UpdateVoiceState when implemented
    // SignalR will broadcast UpdateVoiceState event to all users
  }

  const handleUserClick = (e: React.MouseEvent) => {
    // Don't open modal if clicking on mute/deafen buttons
    if ((e.target as HTMLElement).closest("button")) {
      return
    }
    if (!isCurrentUser) {
      setIsModalOpen(true)
    }
  }

  return (
    <>
      <div
        ref={userItemRef}
        className={cn(
          "px-2 py-1 flex items-center gap-1.5 group hover:bg-[#3f4147] rounded transition-colors",
          !isCurrentUser && "cursor-pointer"
        )}
        onClick={handleUserClick}
      >
      <div className="relative flex-shrink-0">
        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-xs">
          {user.displayName.charAt(0).toUpperCase()}
        </div>
        <div
          className={cn(
            "absolute bottom-0 right-0 w-2 h-2 rounded-full border-2 border-secondary",
            getStatusColor(user.status)
          )}
        />
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className="text-xs font-medium truncate">{user.displayName}</p>
        {user.isMuted && !user.isDeafened && (
          <p className="text-[10px] text-muted-foreground truncate">Muted</p>
        )}
        {user.isDeafened && (
          <p className="text-[10px] text-muted-foreground truncate">Deafened</p>
        )}
      </div>
      {/* Mute/Deafen buttons - only for current user, or show status for others */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        {isCurrentUser ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity",
                user.isMuted && "text-destructive hover:text-destructive opacity-100"
              )}
              onClick={handleToggleMute}
              title={user.isMuted ? "Unmute" : "Mute"}
            >
              {user.isMuted ? (
                <MicOff className="h-3.5 w-3.5" />
              ) : (
                <Mic className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity",
                user.isDeafened && "text-destructive hover:text-destructive opacity-100"
              )}
              onClick={handleToggleDeafen}
              title={user.isDeafened ? "Undeafen" : "Deafen"}
            >
              {user.isDeafened ? (
                <HeadphoneOff className="h-3.5 w-3.5" />
              ) : (
                <Headphones className="h-3.5 w-3.5" />
              )}
            </Button>
          </>
        ) : (
          <>
            {/* Show status icons for other users */}
            {user.isMuted && (
              <MicOff className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            {user.isDeafened && (
              <HeadphoneOff className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </>
        )}
      </div>
      </div>
      <UserVoiceModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        user={user}
        anchorRef={userItemRef}
      />
    </>
  )
}

interface VoiceChannelUsersProps {
  channelId: string
}

export function VoiceChannelUsers({ channelId }: VoiceChannelUsersProps) {
  const { voiceChannelUsers } = useAppSelector((state) => state.channels)
  const { user: currentUser } = useAppSelector((state) => state.auth)

  const users = voiceChannelUsers[channelId] || []

  // TODO: SignalR Integration
  // When SignalR ChatHub is implemented, listen to these events:
  // 1. UserJoinedVoiceChannel - Add user to list
  //    - Dispatch addVoiceChannelUser action
  //    - Event payload: { userId, username, displayName, channelId, isMuted, isDeafened }
  // 2. UserLeftVoiceChannel - Remove user from list
  //    - Dispatch removeVoiceChannelUser action
  //    - Event payload: { userId, channelId }
  // 3. UpdateVoiceState - Update user's mute/deafen status
  //    - Dispatch addVoiceChannelUser action with updated state
  //    - Event payload: { userId, channelId, isMuted, isDeafened }
  //
  // Example SignalR event handlers:
  // chatHub.on("UserJoinedVoiceChannel", (data) => {
  //   dispatch(addVoiceChannelUser({ channelId: data.channelId, user: { ...data } }))
  // })
  // chatHub.on("UserLeftVoiceChannel", (data) => {
  //   dispatch(removeVoiceChannelUser({ channelId: data.channelId, userId: data.userId }))
  // })
  // chatHub.on("UpdateVoiceState", (data) => {
  //   dispatch(addVoiceChannelUser({ channelId: data.channelId, user: { ...existingUser, ...data } }))
  // })

  if (users.length === 0) {
    return null
  }

  return (
    <div className="ml-4 mt-1 space-y-0.5">
      {users.map((user) => (
        <VoiceUserItem
          key={user.userId}
          user={user}
          channelId={channelId}
          isCurrentUser={user.userId === currentUser?.id}
        />
      ))}
    </div>
  )
}

