import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
    fetchChannels,
    setSelectedChannel,
    setActiveVoiceChannel,
    addVoiceChannelUser,
    removeVoiceChannelUser,
    setGuildChannels,
    setVoiceChannelUsers,
} from "@/store/slices/channelsSlice"
import { joinVoiceChannel, leaveVoiceChannel } from "@/store/slices/voiceSlice"
import { useSignalR } from "@/hooks/useSignalR"
import { usePermission, GuildPermission } from "@/hooks/usePermission"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { CreateChannelModal } from "@/components/modals/CreateChannelModal"
import { InviteModal } from "@/components/modals/InviteModal"
import { GuildSettingsModal } from "@/components/modals/GuildSettingsModal"
import { ChannelType } from "@/lib/api/channels"
import { Hash, Mic, Plus, UserPlus, Megaphone, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { VoiceChannelUsers } from "./VoiceChannelUsers"

export function ChannelSidebar() {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const { guildId, channelId } = useParams<{ guildId?: string; channelId?: string }>()
    const { guilds, selectedGuildId } = useAppSelector((state) => state.guilds)
    const { channels, channelsByGuild, isLoading, activeVoiceChannelId } = useAppSelector(
        (state) => state.channels
    )
    const { user: currentUser } = useAppSelector((state) => state.auth)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
    const [defaultChannelType, setDefaultChannelType] = useState<ChannelType>(ChannelType.Text)

    // SignalR connection for ChatHub
    const { invoke: chatInvoke, isConnected: isChatConnected } = useSignalR("/hubs/chat")

    const activeGuildId = guildId || selectedGuildId
    const activeGuild = guilds.find((g) => g.id === activeGuildId)

    // Permission checks
    const { hasPermission, isOwner } = usePermission(activeGuildId || "")
    const canManageChannels = hasPermission(GuildPermission.ManageChannels)
    const canAccessSettings = isOwner || hasPermission(GuildPermission.ManageGuild) || hasPermission(GuildPermission.ManageRoles)

    useEffect(() => {
        if (activeGuildId) {
            // If channels are cached, use them directly
            if (channelsByGuild[activeGuildId]) {
                dispatch(setGuildChannels({ guildId: activeGuildId, channels: channelsByGuild[activeGuildId] }))
            } else {
                // Only fetch if not already cached
                dispatch(fetchChannels(activeGuildId))
            }
        }
    }, [dispatch, activeGuildId, channelsByGuild])

    // Fetch voice channel users when guild channels are loaded
    useEffect(() => {
        if (!activeGuildId || !isChatConnected || !channels.length) {
            return
        }

        const fetchVoiceChannelUsers = async () => {
            const voiceChannels = channels.filter((c) => c.type === ChannelType.Voice)

            for (const channel of voiceChannels) {
                try {
                    const users = await chatInvoke("GetVoiceChannelUsers", channel.id) as Array<{
                        userId: string
                        username: string
                        displayName: string
                        isMuted: boolean
                        isDeafened: boolean
                        status: number
                    }>

                    if (users && users.length > 0) {
                        dispatch(setVoiceChannelUsers({
                            channelId: channel.id,
                            users: users.map(u => ({
                                userId: u.userId,
                                username: u.username,
                                displayName: u.displayName,
                                isMuted: u.isMuted,
                                isDeafened: u.isDeafened,
                                status: u.status,
                            }))
                        }))
                    }
                } catch (error) {
                    console.error(`Failed to fetch voice channel users for ${channel.id}:`, error)
                }
            }
        }

        fetchVoiceChannelUsers()
    }, [activeGuildId, channels, isChatConnected, chatInvoke, dispatch])

    const handleChannelClick = (channel: { id: string; type: ChannelType }) => {
        if (activeGuildId) {
            if (channel.type === ChannelType.Text || channel.type === ChannelType.Announcement) {
                // Text and Announcement channel: normal navigation
                dispatch(setSelectedChannel(channel.id))
                navigate(`/channels/${activeGuildId}/${channel.id}`)
            } else if (channel.type === ChannelType.Voice) {
                // Voice channel behavior:
                // - First click: Join voice (audio) but keep current text channel in view
                // - Second click (same channel): Navigate to show VoiceRoom UI
                // Leave can only be done via VoiceBar disconnect button
                if (activeVoiceChannelId === channel.id) {
                    // Already in this voice channel - second click, now navigate to show VoiceRoom
                    dispatch(setSelectedChannel(channel.id))
                    navigate(`/channels/${activeGuildId}/${channel.id}`)
                    return
                } else {
                    // First click - join voice but DON'T navigate (keep text channel in view)
                    const previousChannelId = activeVoiceChannelId

                    // Leave previous voice channel if exists
                    if (previousChannelId && currentUser) {
                        // Clear voiceSlice state first
                        dispatch(leaveVoiceChannel())

                        // Call SignalR LeaveVoiceChannel for previous channel
                        if (isChatConnected) {
                            chatInvoke("LeaveVoiceChannel", previousChannelId).catch((error) => {
                                console.error("Failed to leave voice channel via SignalR:", error)
                            })
                        }
                        dispatch(
                            removeVoiceChannelUser({
                                channelId: previousChannelId,
                                userId: currentUser.id,
                            })
                        )
                    }

                    // NOTE: Don't navigate here - first click only joins voice audio
                    // User must click again to see VoiceRoom UI

                    // Join new voice channel
                    dispatch(setActiveVoiceChannel(channel.id))
                    // Add current user to new voice channel users list (optimistic update)
                    if (currentUser) {
                        dispatch(
                            addVoiceChannelUser({
                                channelId: channel.id,
                                user: {
                                    userId: currentUser.id,
                                    username: currentUser.username,
                                    displayName: currentUser.displayName,
                                    status: currentUser.status,
                                    customStatus: currentUser.customStatus,
                                    isMuted: false,
                                    isDeafened: false,
                                },
                            })
                        )
                    }
                    // Call SignalR JoinVoiceChannel and handle response
                    if (isChatConnected) {
                        chatInvoke("JoinVoiceChannel", channel.id)
                            .then(async (response: {
                                success: boolean;
                                liveKitToken?: string;
                                liveKitUrl?: string;
                                roomName?: string;
                            }) => {
                                console.log("JoinVoiceChannel response:", response)
                                if (response.success && response.liveKitToken && response.liveKitUrl) {
                                    dispatch(joinVoiceChannel({
                                        channelId: channel.id,
                                        guildId: activeGuildId!,
                                        liveKitToken: response.liveKitToken,
                                        liveKitUrl: response.liveKitUrl,
                                        roomName: response.roomName || `voice_${channel.id}`,
                                    }))
                                    
                                    // Fetch existing voice channel users after joining
                                    try {
                                        const users = await chatInvoke("GetVoiceChannelUsers", channel.id) as Array<{
                                            userId: string;
                                            username: string;
                                            displayName: string;
                                            isMuted: boolean;
                                            isDeafened: boolean;
                                            status: number;
                                        }>
                                        if (users && users.length > 0) {
                                            dispatch(setVoiceChannelUsers({
                                                channelId: channel.id,
                                                users: users.map(u => ({
                                                    userId: u.userId,
                                                    username: u.username,
                                                    displayName: u.displayName,
                                                    isMuted: u.isMuted,
                                                    isDeafened: u.isDeafened,
                                                    status: u.status,
                                                }))
                                            }))
                                        }
                                    } catch (error) {
                                        console.error("Failed to fetch voice channel users:", error)
                                    }
                                } else {
                                    console.error("Failed to get LiveKit token:", response)
                                }
                            })
                            .catch((error) => {
                                console.error("Failed to join voice channel via SignalR:", error)
                            })
                    }
                }
            }
        }
    }

    const handleCreateTextChannel = () => {
        setDefaultChannelType(ChannelType.Text)
        setIsCreateModalOpen(true)
    }

    const handleCreateVoiceChannel = () => {
        setDefaultChannelType(ChannelType.Voice)
        setIsCreateModalOpen(true)
    }

    const handleCreateAnnouncementChannel = () => {
        setDefaultChannelType(ChannelType.Announcement)
        setIsCreateModalOpen(true)
    }

    if (!activeGuildId) {
        return (
            <div className="w-60 bg-secondary flex flex-col h-full">
                <div className="flex-1 flex items-center justify-center">
                    <p className="text-muted-foreground text-sm">Select a guild</p>
                </div>
            </div>
        )
    }

    const textChannels = channels.filter((c) => c.type === ChannelType.Text)
    const voiceChannels = channels.filter((c) => c.type === ChannelType.Voice)
    const announcementChannels = channels.filter((c) => c.type === ChannelType.Announcement)

    return (
        <div className="w-60 bg-secondary flex flex-col h-full">
            {/* Guild Header */}
            <div className="h-12 px-4 flex items-center justify-between border-b border-border shadow-sm flex-shrink-0 group">
                <h2 className="text-sm font-semibold text-foreground truncate">
                    {activeGuild?.name || "Guild"}
                </h2>
                <div className="flex items-center gap-1">
                    {canAccessSettings && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={() => setIsSettingsModalOpen(true)}
                            title="Server Settings"
                        >
                            <Settings className="h-4 w-4" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                        onClick={() => setIsInviteModalOpen(true)}
                        title="Invite People"
                    >
                        <UserPlus className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Channels List */}
            <div className="flex-1 overflow-y-auto px-2 py-2 min-h-0">
                {/* Announcement Channels */}
                <div className="mb-4">
                    <div className="px-2 mb-2 flex items-center justify-between group">
                        <span className="text-xs font-semibold text-muted-foreground uppercase">
                            Announcement Channels
                        </span>
                        {canManageChannels && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 opacity-0 group-hover:opacity-100"
                                onClick={handleCreateAnnouncementChannel}
                                title="Create Announcement Channel"
                            >
                                <Plus className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                    {announcementChannels.length > 0 && (
                        <div className="space-y-1">
                            {announcementChannels.map((channel) => (
                                <button
                                    key={channel.id}
                                    onClick={() => handleChannelClick(channel)}
                                    className={cn(
                                        "w-full px-2 py-1.5 rounded flex items-center gap-2 text-sm transition-colors group cursor-pointer",
                                        channelId === channel.id
                                            ? "bg-[#1e1f22] text-foreground"
                                            : "hover:!bg-[#3f4147]"
                                    )}
                                >
                                    <Megaphone className="h-4 w-4 text-muted-foreground" />
                                    <span className="flex-1 text-left truncate">{channel.name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Text Channels */}
                <div className="mb-4">
                    <div className="px-2 mb-2 flex items-center justify-between group">
                        <span className="text-xs font-semibold text-muted-foreground uppercase">
                            Text Channels
                        </span>
                        {canManageChannels && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 opacity-0 group-hover:opacity-100"
                                onClick={handleCreateTextChannel}
                                title="Create Text Channel"
                            >
                                <Plus className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                    {textChannels.length > 0 && (
                        <div className="space-y-1">
                            {textChannels.map((channel) => (
                                <button
                                    key={channel.id}
                                    onClick={() => handleChannelClick(channel)}
                                    className={cn(
                                        "w-full px-2 py-1.5 rounded flex items-center gap-2 text-sm transition-colors group cursor-pointer",
                                        channelId === channel.id
                                            ? "bg-[#1e1f22] text-foreground"
                                            : "hover:!bg-[#3f4147]"
                                    )}
                                >
                                    <Hash className="h-4 w-4 text-muted-foreground" />
                                    <span className="flex-1 text-left truncate">{channel.name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Voice Channels */}
                <div className="mb-4">
                    <div className="px-2 mb-1 flex items-center justify-between group">
                        <span className="text-xs font-semibold text-muted-foreground uppercase">
                            Voice Channels
                        </span>
                        {canManageChannels && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 opacity-0 group-hover:opacity-100"
                                onClick={handleCreateVoiceChannel}
                                title="Create Voice Channel"
                            >
                                <Plus className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                    {voiceChannels.length > 0 && (
                        <div className="space-y-1">
                            {voiceChannels.map((channel) => (
                                <div key={channel.id}>
                                    <button
                                        onClick={() => handleChannelClick(channel)}
                                        className={cn(
                                            "w-full px-2 py-1.5 rounded flex items-center gap-2 text-sm transition-colors cursor-pointer",
                                            activeVoiceChannelId === channel.id
                                                ? "text-primary"
                                                : "hover:!bg-[#3f4147] text-muted-foreground"
                                        )}
                                    >
                                        <Mic className={cn(
                                            "h-4 w-4",
                                            activeVoiceChannelId === channel.id
                                                ? "text-primary"
                                                : "text-muted-foreground"
                                        )} />
                                        <span className="flex-1 text-left truncate">{channel.name}</span>
                                    </button>
                                    {/* Show users in voice channel */}
                                    <VoiceChannelUsers channelId={channel.id} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {isLoading && (
                    <div className="flex justify-center py-4">
                        <Spinner className="w-6 h-6" />
                    </div>
                )}

                {!isLoading && channels.length === 0 && (
                    <div className="px-2 py-4 text-center">
                        <p className="text-sm text-muted-foreground">No channels yet</p>
                        {canManageChannels && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="mt-2"
                                onClick={handleCreateTextChannel}
                            >
                                <Plus className="h-4 w-4 mr-1" />
                                Create Channel
                            </Button>
                        )}
                    </div>
                )}
            </div>

            <CreateChannelModal
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
                guildId={activeGuildId}
                defaultChannelType={defaultChannelType}
            />

            {activeGuildId && (
                <InviteModal
                    open={isInviteModalOpen}
                    onOpenChange={setIsInviteModalOpen}
                    guildId={activeGuildId}
                />
            )}

            {activeGuildId && activeGuild && (
                <GuildSettingsModal
                    open={isSettingsModalOpen}
                    onOpenChange={setIsSettingsModalOpen}
                    guildId={activeGuildId}
                    guildName={activeGuild.name}
                />
            )}
        </div>
    )
}

