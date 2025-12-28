import { useEffect, useRef } from "react"
import { useParams } from "react-router-dom"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { fetchGuildMembers, updateMemberStatus } from "@/store/slices/guildsSlice"
import { useSignalR } from "@/hooks/useSignalR"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import type { GuildMemberDto } from "@/lib/api/guilds"

// UserStatus enum values
const UserStatus = {
  Online: 0,
  Idle: 1,
  DoNotDisturb: 2,
  Invisible: 3,
  Offline: 4,
} as const

function getStatusColor(status?: number) {
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

function getStatusText(status?: number, isCurrentUser: boolean = false) {
  switch (status) {
    case UserStatus.Online:
      return "Online"
    case UserStatus.Idle:
      return "Idle"
    case UserStatus.DoNotDisturb:
      return "Do Not Disturb"
    case UserStatus.Invisible:
      // Only show "Invisible" for current user, others see "Offline"
      return isCurrentUser ? "Invisible" : "Offline"
    case UserStatus.Offline:
    default:
      return "Offline"
  }
}

interface MemberItemProps {
  member: GuildMemberDto
  isCurrentUser: boolean
}

function MemberItem({ member, isCurrentUser }: MemberItemProps) {
  if (!member.user) return null

  const displayName = member.nickname || member.user.username
  const status = member.user.status ?? UserStatus.Offline
  
  // For display purposes: if status is Invisible and not current user, show as Offline
  const displayStatus = status === UserStatus.Invisible && !isCurrentUser 
    ? UserStatus.Offline 
    : status

  return (
    <div
      className={cn(
        "px-2 py-1.5 flex items-center gap-2 group hover:bg-[#3f4147] rounded transition-colors",
        isCurrentUser && "bg-[#3f4147]"
      )}
    >
      <div className="relative flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-xs">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div
          className={cn(
            "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-secondary",
            getStatusColor(displayStatus)
          )}
        />
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className="text-sm font-medium truncate text-foreground">{displayName}</p>
        <p className="text-xs text-muted-foreground truncate">{getStatusText(displayStatus, isCurrentUser)}</p>
      </div>
    </div>
  )
}

export function MemberList() {
  const { guildId } = useParams<{ guildId?: string }>()
  const dispatch = useAppDispatch()
  const { user: currentUser } = useAppSelector((state) => state.auth)
  const { membersByGuild, membersLoading } = useAppSelector((state) => state.guilds)
  const presenceOnRef = useRef<ReturnType<typeof useSignalR>["on"] | null>(null)

  // SignalR connection for PresenceHub
  const { on: presenceOn, isConnected: isPresenceConnected } = useSignalR("/hubs/presence")

  // Store presenceOn in ref to avoid dependency issues
  useEffect(() => {
    presenceOnRef.current = presenceOn
  }, [presenceOn])

  // Track which guilds we've fetched to prevent duplicate requests
  const fetchedGuildsRef = useRef<Set<string>>(new Set())
  const previousGuildIdRef = useRef<string | undefined>(undefined)

  // Fetch members when guildId changes
  useEffect(() => {
    if (!guildId) {
      previousGuildIdRef.current = undefined
      return
    }

    // Reset fetched set when guildId changes
    if (previousGuildIdRef.current !== guildId) {
      fetchedGuildsRef.current.clear()
      previousGuildIdRef.current = guildId
    }

    // Only fetch if we haven't fetched for this guild yet
    if (!fetchedGuildsRef.current.has(guildId)) {
      const hasMembers = !!membersByGuild[guildId]
      const isLoading = membersLoading[guildId] || false

      if (!hasMembers && !isLoading) {
        fetchedGuildsRef.current.add(guildId)
        dispatch(fetchGuildMembers(guildId))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guildId, dispatch])

  // PresenceHub event listeners for online/offline status
  useEffect(() => {
    if (!isPresenceConnected || !guildId || !presenceOnRef.current) {
      return
    }

    // UserOnline event - update in all guilds
    const handleUserOnline = (userId: string) => {
      dispatch(
        updateMemberStatus({
          // guildId omitted - will update in all guilds
          userId,
          status: UserStatus.Online,
        })
      )
    }

    // UserOffline event - update in all guilds
    const handleUserOffline = (userId: string) => {
      dispatch(
        updateMemberStatus({
          // guildId omitted - will update in all guilds
          userId,
          status: UserStatus.Offline,
        })
      )
    }

    // UserStatusChanged event - update in all guilds
    const handleUserStatusChanged = (data: {
      userId: string
      status: number
      customStatus?: string
    }) => {
      dispatch(
        updateMemberStatus({
          // guildId omitted - will update in all guilds
          userId: data.userId,
          status: data.status,
          customStatus: data.customStatus,
        })
      )
    }

    // Register event listeners
    const cleanupUserOnline = presenceOnRef.current("UserOnline", handleUserOnline)
    const cleanupUserOffline = presenceOnRef.current("UserOffline", handleUserOffline)
    const cleanupUserStatusChanged = presenceOnRef.current(
      "UserStatusChanged",
      handleUserStatusChanged
    )

    // Cleanup
    return () => {
      cleanupUserOnline()
      cleanupUserOffline()
      cleanupUserStatusChanged()
    }
  }, [guildId, isPresenceConnected, dispatch])

  if (!guildId) {
    return null
  }

  const members = membersByGuild[guildId] || []
  const isLoading = membersLoading[guildId] || false

  // Group members by status (Online, Offline)
  // Online members: Online, Idle, or Do Not Disturb
  const onlineMembers = members.filter(
    (m) => {
      const status = m.user?.status
      return (
        status === UserStatus.Online ||
        status === UserStatus.Idle ||
        status === UserStatus.DoNotDisturb
      )
    }
  )
  
  // Offline members: everything else (Offline, Invisible, or undefined/null)
  const offlineMembers = members.filter(
    (m) => {
      const status = m.user?.status
      // Exclude online members
      if (
        status === UserStatus.Online ||
        status === UserStatus.Idle ||
        status === UserStatus.DoNotDisturb
      ) {
        return false
      }
      // Include Offline, Invisible, or undefined/null
      return (
        status === undefined ||
        status === null ||
        status === UserStatus.Offline ||
        status === UserStatus.Invisible
      )
    }
  )

  return (
    <div className="w-60 bg-secondary flex flex-col h-full border-l border-border">
      {/* Header */}
      <div className="h-12 px-4 flex items-center border-b border-border shadow-sm flex-shrink-0">
        <h2 className="text-sm font-semibold text-foreground">Members — {members.length}</h2>
      </div>

      {/* Members List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 min-h-0">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner className="w-6 h-6" />
          </div>
        ) : (
          <>
            {/* Online Members (includes Online, Idle, Do Not Disturb) */}
            {onlineMembers.length > 0 && (
              <div className="mb-4">
                <div className="px-2 mb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                    Online — {onlineMembers.length}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {onlineMembers.map((member) => (
                    <MemberItem
                      key={member.userId}
                      member={member}
                      isCurrentUser={member.userId === currentUser?.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Offline Members */}
            {offlineMembers.length > 0 && (
              <div>
                <div className="px-2 mb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                    Offline — {offlineMembers.length}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {offlineMembers.map((member) => (
                    <MemberItem
                      key={member.userId}
                      member={member}
                      isCurrentUser={member.userId === currentUser?.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {members.length === 0 && !isLoading && (
              <div className="px-2 py-4 text-center">
                <p className="text-sm text-muted-foreground">No members</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

