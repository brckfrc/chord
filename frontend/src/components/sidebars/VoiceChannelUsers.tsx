import { useState, useRef, useEffect, useCallback } from "react"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { addVoiceChannelUser, removeVoiceChannelUser } from "@/store/slices/channelsSlice"
import type { VoiceChannelUser } from "@/store/slices/channelsSlice"
import { useSignalR } from "@/hooks/useSignalR"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Headphones, HeadphoneOff, Volume2 } from "lucide-react"
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
  isSpeaking?: boolean
}

function VoiceUserItem({ user, channelId, isCurrentUser, isSpeaking = false }: VoiceUserItemProps) {
  const dispatch = useAppDispatch()
  const { invoke: chatInvoke, isConnected: isChatConnected } = useSignalR("/hubs/chat")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const userItemRef = useRef<HTMLDivElement>(null)

  // For display purposes: if status is Invisible and not current user, show as Offline
  const displayStatus = user.status === UserStatus.Invisible && !isCurrentUser 
    ? UserStatus.Offline 
    : user.status

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

  const handleToggleMute = async () => {
    if (!isCurrentUser) return

    const newMuted = !user.isMuted

    // Optimistic update
    dispatch(
      addVoiceChannelUser({
        channelId,
        user: {
          ...user,
          isMuted: newMuted,
        },
      })
    )

    // Call SignalR UpdateVoiceState
    if (isChatConnected) {
      try {
        await chatInvoke("UpdateVoiceState", channelId, newMuted, user.isDeafened)
      } catch (error) {
        console.error("Failed to update voice state via SignalR:", error)
        // Revert optimistic update on error
        dispatch(
          addVoiceChannelUser({
            channelId,
            user: {
              ...user,
              isMuted: user.isMuted,
            },
          })
        )
      }
    }
  }

  const handleToggleDeafen = async () => {
    if (!isCurrentUser) return

    const newDeafened = !user.isDeafened
    const newMuted = newDeafened ? true : user.isMuted // Deafen also mutes

    // Optimistic update
    dispatch(
      addVoiceChannelUser({
        channelId,
        user: {
          ...user,
          isDeafened: newDeafened,
          isMuted: newMuted,
        },
      })
    )

    // Call SignalR UpdateVoiceState
    if (isChatConnected) {
      try {
        await chatInvoke("UpdateVoiceState", channelId, newMuted, newDeafened)
      } catch (error) {
        console.error("Failed to update voice state via SignalR:", error)
        // Revert optimistic update on error
        dispatch(
          addVoiceChannelUser({
            channelId,
            user: {
              ...user,
              isDeafened: user.isDeafened,
              isMuted: user.isMuted,
            },
          })
        )
      }
    }
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
          !isCurrentUser && "cursor-pointer",
          isSpeaking && "bg-green-500/10"
        )}
        onClick={handleUserClick}
      >
      <div className="relative flex-shrink-0">
        <div className={cn(
          "w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-xs transition-all",
          isSpeaking && "ring-2 ring-green-500 ring-offset-1 ring-offset-background"
        )}>
          {user.displayName.charAt(0).toUpperCase()}
        </div>
        <div
          className={cn(
            "absolute bottom-0 right-0 w-2 h-2 rounded-full border-2 border-secondary",
            getStatusColor(displayStatus)
          )}
        />
        {/* Speaking indicator animation */}
        {isSpeaking && (
          <div className="absolute -top-0.5 -right-0.5">
            <Volume2 className="h-3 w-3 text-green-500 animate-pulse" />
          </div>
        )}
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className={cn(
          "text-xs font-medium truncate",
          isSpeaking && "text-green-400"
        )}>{user.displayName}</p>
        {isSpeaking && (
          <p className="text-[10px] text-green-500 truncate">Speaking</p>
        )}
        {!isSpeaking && user.isMuted && !user.isDeafened && (
          <p className="text-[10px] text-muted-foreground truncate">Muted</p>
        )}
        {!isSpeaking && user.isDeafened && (
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
  const dispatch = useAppDispatch()
  const { voiceChannelUsers } = useAppSelector((state) => state.channels)
  const { user: currentUser } = useAppSelector((state) => state.auth)
  const { speakingParticipants, currentChannelId: voiceChannelId } = useAppSelector((state) => state.voice)

  // SignalR connection for ChatHub
  const { on: chatOn, isConnected: isChatConnected } = useSignalR("/hubs/chat")

  const users = voiceChannelUsers[channelId] || []
  
  // Use ref to access latest voiceChannelUsers in event handlers without causing re-renders
  const voiceChannelUsersRef = useRef(voiceChannelUsers)
  useEffect(() => {
    voiceChannelUsersRef.current = voiceChannelUsers
  }, [voiceChannelUsers])
  
  // Check if a user is currently speaking
  const isUserSpeaking = (userId: string) => {
    return channelId === voiceChannelId && speakingParticipants.includes(userId)
  }

  // Memoized event handlers to prevent re-registering on every render
  const handleUserJoined = useCallback((data: {
    userId: string
    username: string
    displayName: string
    channelId: string
    isMuted: boolean
    isDeafened: boolean
    status: number
  }) => {
    if (data.channelId === channelId) {
      dispatch(
        addVoiceChannelUser({
          channelId: data.channelId,
          user: {
            userId: data.userId,
            username: data.username,
            displayName: data.displayName,
            isMuted: data.isMuted,
            isDeafened: data.isDeafened,
            status: data.status,
          },
        })
      )
    }
  }, [channelId, dispatch])

  const handleUserLeft = useCallback((data: { userId: string; channelId: string }) => {
    if (data.channelId === channelId) {
      dispatch(removeVoiceChannelUser({ channelId: data.channelId, userId: data.userId }))
    }
  }, [channelId, dispatch])

  const handleVoiceStateChanged = useCallback((data: {
    userId: string
    channelId: string
    isMuted: boolean
    isDeafened: boolean
  }) => {
    if (data.channelId === channelId) {
      // Use ref to get the latest users without adding to dependency array
      const currentUsers = voiceChannelUsersRef.current[channelId] || []
      const existingUser = currentUsers.find((u) => u.userId === data.userId)
      if (existingUser) {
        dispatch(
          addVoiceChannelUser({
            channelId: data.channelId,
            user: {
              ...existingUser,
              isMuted: data.isMuted,
              isDeafened: data.isDeafened,
            },
          })
        )
      }
    }
  }, [channelId, dispatch])

  // SignalR event listeners for voice channel events
  useEffect(() => {
    if (!isChatConnected) {
      return
    }

    // Register event listeners
    const cleanupUserJoined = chatOn("UserJoinedVoiceChannel", handleUserJoined)
    const cleanupUserLeft = chatOn("UserLeftVoiceChannel", handleUserLeft)
    const cleanupVoiceStateChanged = chatOn("UserVoiceStateChanged", handleVoiceStateChanged)

    // Cleanup
    return () => {
      cleanupUserJoined()
      cleanupUserLeft()
      cleanupVoiceStateChanged()
    }
  }, [isChatConnected, chatOn, handleUserJoined, handleUserLeft, handleVoiceStateChanged])

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
          isSpeaking={isUserSpeaking(user.userId)}
        />
      ))}
    </div>
  )
}

