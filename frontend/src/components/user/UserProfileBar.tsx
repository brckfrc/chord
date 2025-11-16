import { useState, useRef, useEffect } from "react"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { addVoiceChannelUser } from "@/store/slices/channelsSlice"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Headphones, HeadphoneOff, Settings } from "lucide-react"
import { UserSettingsModal } from "@/components/modals/UserSettingsModal"
import { StatusUpdateModal } from "@/components/modals/StatusUpdateModal"
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

interface UserProfileBarProps {
    compact?: boolean
}

export function UserProfileBar({ compact = false }: UserProfileBarProps) {
    const dispatch = useAppDispatch()
    const { user } = useAppSelector((state) => state.auth)
    const { activeVoiceChannelId, voiceChannelUsers } = useAppSelector((state) => state.channels)
    const [isMicMuted, setIsMicMuted] = useState(false)
    const [isHeadphonesMuted, setIsHeadphonesMuted] = useState(false)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
    const userInfoRef = useRef<HTMLDivElement>(null)

    // Sync mute/deafen state with voice channel user state
    useEffect(() => {
        if (activeVoiceChannelId && user) {
            const voiceUser = voiceChannelUsers[activeVoiceChannelId]?.find(
                (u) => u.userId === user.id
            )
            if (voiceUser) {
                setIsMicMuted(voiceUser.isMuted)
                setIsHeadphonesMuted(voiceUser.isDeafened)
            }
        }
    }, [activeVoiceChannelId, voiceChannelUsers, user])

    if (compact) {
        // Compact version for narrow sidebars (like GuildSidebar)
        return (
            <div className="h-14 bg-[#232428] px-2 py-1.5 flex items-center justify-between border-t border-border flex-shrink-0">
                <div 
                    ref={userInfoRef}
                    className="relative flex-shrink-0 cursor-pointer px-2 py-1.5 rounded-md transition-colors hover:bg-[#2f3136]"
                    onClick={() => setIsStatusModalOpen(true)}
                >
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                        {user?.displayName?.charAt(0).toUpperCase() || "U"}
                    </div>
                    {user?.status !== undefined && (
                        <div
                            className={cn(
                                "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#232428]",
                                getStatusColor(user.status)
                            )}
                        />
                    )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "h-8 w-8",
                            isMicMuted && "text-destructive hover:text-destructive"
                        )}
                        onClick={() => {
                            const newMuted = !isMicMuted
                            setIsMicMuted(newMuted)
                            // Update voice channel state if in voice channel
                            if (activeVoiceChannelId && user) {
                                const voiceUser = voiceChannelUsers[activeVoiceChannelId]?.find(
                                    (u) => u.userId === user.id
                                )
                                if (voiceUser) {
                                    dispatch(
                                        addVoiceChannelUser({
                                            channelId: activeVoiceChannelId,
                                            user: {
                                                ...voiceUser,
                                                isMuted: newMuted,
                                            },
                                        })
                                    )
                                    // TODO: Call SignalR UpdateVoiceState when implemented
                                }
                            }
                        }}
                        title={isMicMuted ? "Unmute" : "Mute"}
                    >
                        {isMicMuted ? (
                            <MicOff className="h-4 w-4" />
                        ) : (
                            <Mic className="h-4 w-4" />
                        )}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "h-8 w-8",
                            isHeadphonesMuted && "text-destructive hover:text-destructive"
                        )}
                        onClick={() => {
                            const newDeafened = !isHeadphonesMuted
                            setIsHeadphonesMuted(newDeafened)
                            // Update voice channel state if in voice channel
                            if (activeVoiceChannelId && user) {
                                const voiceUser = voiceChannelUsers[activeVoiceChannelId]?.find(
                                    (u) => u.userId === user.id
                                )
                                if (voiceUser) {
                                    dispatch(
                                        addVoiceChannelUser({
                                            channelId: activeVoiceChannelId,
                                            user: {
                                                ...voiceUser,
                                                isDeafened: newDeafened,
                                                isMuted: newDeafened ? true : voiceUser.isMuted, // Deafen also mutes
                                            },
                                        })
                                    )
                                    // TODO: Call SignalR UpdateVoiceState when implemented
                                }
                            }
                        }}
                        title={isHeadphonesMuted ? "Deafen" : "Undeafen"}
                    >
                        {isHeadphonesMuted ? (
                            <HeadphoneOff className="h-4 w-4" />
                        ) : (
                            <Headphones className="h-4 w-4" />
                        )}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setIsSettingsOpen(true)}
                        title="User Settings"
                    >
                        <Settings className="h-4 w-4" />
                    </Button>
                </div>

                <UserSettingsModal
                    open={isSettingsOpen}
                    onOpenChange={setIsSettingsOpen}
                />
                <StatusUpdateModal
                    open={isStatusModalOpen}
                    onOpenChange={setIsStatusModalOpen}
                    anchorRef={userInfoRef}
                />
            </div>
        )
    }

    // Full version for wider sidebars (like FriendsSidebar)
    return (
        <div className="h-14 bg-[#232428] pl-2 pr-2 py-1.5 flex items-center justify-between border-t border-border">
            <div 
                ref={userInfoRef}
                className="flex items-center gap-2 flex-1 min-w-0 px-2 py-1.5 rounded-md cursor-pointer transition-colors hover:bg-[#2f3136]"
                onClick={() => setIsStatusModalOpen(true)}
            >
                <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                        {user?.displayName?.charAt(0).toUpperCase() || "U"}
                    </div>
                    {user?.status !== undefined && (
                        <div
                            className={cn(
                                "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#232428]",
                                getStatusColor(user.status)
                            )}
                        />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                        {user?.displayName || "User"}
                    </p>
                    {user?.customStatus ? (
                        <p className="text-xs text-muted-foreground truncate">
                            {user.customStatus}
                        </p>
                    ) : user?.status !== undefined ? (
                        <p className="text-xs text-muted-foreground truncate">
                            {getStatusText(user.status)}
                        </p>
                    ) : null}
                </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "h-8 w-8",
                        isMicMuted && "text-destructive hover:text-destructive"
                    )}
                    onClick={() => {
                            const newMuted = !isMicMuted
                            setIsMicMuted(newMuted)
                            // Update voice channel state if in voice channel
                            if (activeVoiceChannelId && user) {
                                const voiceUser = voiceChannelUsers[activeVoiceChannelId]?.find(
                                    (u) => u.userId === user.id
                                )
                                if (voiceUser) {
                                    dispatch(
                                        addVoiceChannelUser({
                                            channelId: activeVoiceChannelId,
                                            user: {
                                                ...voiceUser,
                                                isMuted: newMuted,
                                            },
                                        })
                                    )
                                    // TODO: Call SignalR UpdateVoiceState when implemented
                                }
                            }
                        }}
                        title={isMicMuted ? "Unmute" : "Mute"}
                    >
                        {isMicMuted ? (
                            <MicOff className="h-4 w-4" />
                        ) : (
                            <Mic className="h-4 w-4" />
                        )}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "h-8 w-8",
                            isHeadphonesMuted && "text-destructive hover:text-destructive"
                        )}
                        onClick={() => {
                            const newDeafened = !isHeadphonesMuted
                            setIsHeadphonesMuted(newDeafened)
                            // Update voice channel state if in voice channel
                            if (activeVoiceChannelId && user) {
                                const voiceUser = voiceChannelUsers[activeVoiceChannelId]?.find(
                                    (u) => u.userId === user.id
                                )
                                if (voiceUser) {
                                    dispatch(
                                        addVoiceChannelUser({
                                            channelId: activeVoiceChannelId,
                                            user: {
                                                ...voiceUser,
                                                isDeafened: newDeafened,
                                                isMuted: newDeafened ? true : voiceUser.isMuted, // Deafen also mutes
                                            },
                                        })
                                    )
                                    // TODO: Call SignalR UpdateVoiceState when implemented
                                }
                            }
                        }}
                        title={isHeadphonesMuted ? "Deafen" : "Undeafen"}
                    >
                    {isHeadphonesMuted ? (
                        <HeadphoneOff className="h-4 w-4" />
                    ) : (
                        <Headphones className="h-4 w-4" />
                    )}
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsSettingsOpen(true)}
                    title="User Settings"
                >
                    <Settings className="h-4 w-4" />
                </Button>
            </div>

            <UserSettingsModal
                open={isSettingsOpen}
                onOpenChange={setIsSettingsOpen}
            />
            <StatusUpdateModal
                open={isStatusModalOpen}
                onOpenChange={setIsStatusModalOpen}
                anchorRef={userInfoRef}
            />
        </div>
    )
}

