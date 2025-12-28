import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { fetchMentions, markMentionAsRead, markAllMentionsAsRead } from "@/store/slices/mentionsSlice"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { X, Hash, CheckCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MessageMentionDto } from "@/lib/api/mentions"
import { fetchChannels } from "@/store/slices/channelsSlice"

interface MentionsPanelProps {
  open: boolean
  onClose: () => void
}

export function MentionsPanel({ open, onClose }: MentionsPanelProps) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { guildId } = useParams<{ guildId?: string }>()
  const { selectedGuildId } = useAppSelector((state) => state.guilds)
  const { mentions, isLoading } = useAppSelector(
    (state) => state.mentions
  )
  const { channels } = useAppSelector((state) => state.channels)
  const [isMarkingAll, setIsMarkingAll] = useState(false)

  // Get active guild ID (from route or selected guild)
  const activeGuildId = guildId || selectedGuildId

  // Filter mentions by active guild
  const filteredMentions = activeGuildId
    ? mentions.filter((mention) => {
        const channel = channels.find((c) => c.id === mention.message.channelId)
        return channel?.guildId === activeGuildId
      })
    : mentions // If no active guild (e.g., in /me), show all mentions

  // Fetch mentions only when panel opens
  useEffect(() => {
    if (open) {
      dispatch(fetchMentions(false))
    }
  }, [open, dispatch])

  // Fetch channels for mentioned channels AFTER mentions are loaded
  useEffect(() => {
    if (open && !isLoading && mentions.length > 0) {
      const channelIds = new Set(mentions.map((m) => m.message.channelId))
      const guildIdsToFetch = new Set<string>()
      
      channelIds.forEach((channelId) => {
        const channel = channels.find((c) => c.id === channelId)
        if (channel?.guildId) {
          guildIdsToFetch.add(channel.guildId)
        }
      })

      // Only fetch if we don't have the channels cached
      guildIdsToFetch.forEach((guildId) => {
        const hasChannels = channels.some((c) => c.guildId === guildId)
        if (!hasChannels) {
          dispatch(fetchChannels(guildId))
        }
      })
    }
  }, [open, isLoading, mentions.length, channels, dispatch])

  const handleMentionClick = async (mention: MessageMentionDto) => {
    // Mark as read
    if (!mention.isRead) {
      await dispatch(markMentionAsRead(mention.id))
    }

    // Find channel to get guildId
    const channel = channels.find((c) => c.id === mention.message.channelId)
    
    if (!channel?.guildId) {
      console.error("Channel not found or missing guildId")
      return
    }

    // Navigate to the message with correct route structure
    navigate(
      `/channels/${channel.guildId}/${mention.message.channelId}?message=${mention.messageId}`
    )
    onClose()
  }

  const handleMarkAllAsRead = async () => {
    const unreadMentions = filteredMentions.filter((m) => !m.isRead)
    if (unreadMentions.length === 0) return

    setIsMarkingAll(true)
    try {
      await dispatch(markAllMentionsAsRead(activeGuildId || undefined))
    } catch (error) {
      console.error("Failed to mark all mentions as read:", error)
    } finally {
      setIsMarkingAll(false)
    }
  }

  const unreadMentions = filteredMentions.filter((m) => !m.isRead)
  const readMentions = filteredMentions.filter((m) => m.isRead)

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-[#2f3136] rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Mentions</h2>
          <div className="flex items-center gap-2">
            {unreadMentions.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAll}
                className="text-xs"
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                {isMarkingAll ? "Marking..." : "Mark all as read"}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="w-6 h-6" />
            </div>
          ) : filteredMentions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No mentions yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Unread Mentions */}
              {unreadMentions.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                    Unread ({unreadMentions.length})
                  </h3>
                  <div className="space-y-1">
                    {unreadMentions.map((mention) => {
                      const channel = channels.find((c) => c.id === mention.message.channelId)
                      return (
                        <MentionItem
                          key={mention.id}
                          mention={mention}
                          channelName={channel?.name}
                          onClick={() => handleMentionClick(mention)}
                        />
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Read Mentions */}
              {readMentions.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                    Read ({readMentions.length})
                  </h3>
                  <div className="space-y-1">
                    {readMentions.map((mention) => {
                      const channel = channels.find((c) => c.id === mention.message.channelId)
                      return (
                        <MentionItem
                          key={mention.id}
                          mention={mention}
                          channelName={channel?.name}
                          onClick={() => handleMentionClick(mention)}
                        />
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface MentionItemProps {
  mention: MessageMentionDto
  channelName?: string
  onClick: () => void
}

function MentionItem({ mention, channelName, onClick }: MentionItemProps) {
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const isSameDay =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()

      if (isSameDay) {
        return date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      } else {
        const day = String(date.getDate()).padStart(2, "0")
        const month = String(date.getMonth() + 1).padStart(2, "0")
        const year = date.getFullYear()
        return `${day}.${month}.${year}`
      }
    } catch {
      return dateString
    }
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full px-3 py-2 rounded hover:bg-[#3f4147] transition-colors text-left",
        !mention.isRead && "bg-blue-500/10"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-xs">
          {mention.message.author.displayName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-sm font-semibold text-foreground">
              {mention.message.author.displayName}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatTime(mention.message.createdAt)}
            </span>
            {!mention.isRead && (
              <span className="text-xs text-blue-400 font-medium">New</span>
            )}
          </div>
          <div className="text-sm text-muted-foreground mb-1">
            in <Hash className="inline h-3 w-3" /> {channelName || mention.message.channelId.substring(0, 8)}...
          </div>
          <div className="text-sm text-foreground line-clamp-2">
            {mention.message.content}
          </div>
        </div>
      </div>
    </button>
  )
}

