import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
    fetchChannels,
    setSelectedChannel,
    setActiveVoiceChannel,
    addVoiceChannelUser,
    removeVoiceChannelUser,
} from "@/store/slices/channelsSlice"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { CreateChannelModal } from "@/components/modals/CreateChannelModal"
import { ChannelType } from "@/lib/api/channels"
import { Hash, Mic, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { VoiceChannelUsers } from "./VoiceChannelUsers"

export function ChannelSidebar() {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const { guildId, channelId } = useParams<{ guildId?: string; channelId?: string }>()
    const { guilds, selectedGuildId } = useAppSelector((state) => state.guilds)
    const { channels, isLoading, activeVoiceChannelId } = useAppSelector((state) => state.channels)
    const { user: currentUser } = useAppSelector((state) => state.auth)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [defaultChannelType, setDefaultChannelType] = useState<ChannelType>(ChannelType.Text)

    const activeGuildId = guildId || selectedGuildId
    const activeGuild = guilds.find((g) => g.id === activeGuildId)

    useEffect(() => {
        if (activeGuildId) {
            dispatch(fetchChannels(activeGuildId))
        }
    }, [dispatch, activeGuildId])

    const handleChannelClick = (channel: { id: string; type: ChannelType }) => {
        if (activeGuildId) {
            if (channel.type === ChannelType.Text) {
                // Text channel: normal navigation
                dispatch(setSelectedChannel(channel.id))
                navigate(`/channels/${activeGuildId}/${channel.id}`)
            } else if (channel.type === ChannelType.Voice) {
                // Voice channel: join only (no leave on click)
                // Leave can only be done via VoiceBar disconnect button
                // Only one voice channel can be active at a time
                if (activeVoiceChannelId === channel.id) {
                    // Already in this voice channel - do nothing
                    return
                } else {
                    // Join new voice channel (leave previous one if exists)
                    const previousChannelId = activeVoiceChannelId

                    // Leave previous voice channel if exists
                    if (previousChannelId && currentUser) {
                        dispatch(
                            removeVoiceChannelUser({
                                channelId: previousChannelId,
                                userId: currentUser.id,
                            })
                        )
                        // TODO: Call SignalR LeaveVoiceChannel for previous channel when implemented
                    }

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
                    // TODO: Call SignalR JoinVoiceChannel when implemented
                    // SignalR will broadcast UserJoinedVoiceChannel event to all users
                    // The event will update the user list for all clients viewing this channel
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

    return (
        <div className="w-60 bg-secondary flex flex-col h-full">
            {/* Guild Header */}
            <div className="h-12 px-4 flex items-center border-b border-border shadow-sm flex-shrink-0">
                <h2 className="text-sm font-semibold text-foreground truncate">
                    {activeGuild?.name || "Guild"}
                </h2>
            </div>

            {/* Channels List */}
            <div className="flex-1 overflow-y-auto px-2 py-2 min-h-0">
                {/* Text Channels */}
                <div className="mb-4">
                    <div className="px-2 mb-2 flex items-center justify-between group">
                        <span className="text-xs font-semibold text-muted-foreground uppercase">
                            Text Channels
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 opacity-0 group-hover:opacity-100"
                            onClick={handleCreateTextChannel}
                            title="Create Text Channel"
                        >
                            <Plus className="h-3 w-3" />
                        </Button>
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
                <div>
                    <div className="px-2 mb-1 flex items-center justify-between group">
                        <span className="text-xs font-semibold text-muted-foreground uppercase">
                            Voice Channels
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 opacity-0 group-hover:opacity-100"
                            onClick={handleCreateVoiceChannel}
                            title="Create Voice Channel"
                        >
                            <Plus className="h-3 w-3" />
                        </Button>
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
                                                ? "bg-[#1e1f22] text-foreground"
                                                : "hover:!bg-[#3f4147]"
                                        )}
                                    >
                                        <Mic className="h-4 w-4 text-muted-foreground" />
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
                        <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2"
                            onClick={handleCreateTextChannel}
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Create Channel
                        </Button>
                    </div>
                )}
            </div>

            <CreateChannelModal
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
                guildId={activeGuildId}
                defaultChannelType={defaultChannelType}
            />
        </div>
    )
}

