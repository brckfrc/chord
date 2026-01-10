import { useState, useMemo } from "react"
import { useAppSelector, useAppDispatch } from "@/store/hooks"
import { useParams } from "react-router-dom"
import { removeMessage } from "@/store/slices/messagesSlice"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSignalR } from "@/hooks/useSignalR"
import { usePermission, GuildPermission } from "@/hooks/usePermission"
import { DeleteMessageModal } from "@/components/modals/DeleteMessageModal"
import { ImageAttachment } from "./ImageAttachment"
import { VideoAttachment } from "./VideoAttachment"
import { DocumentAttachment } from "./DocumentAttachment"
import type { MessageDto } from "@/lib/api/messages"
import type { AttachmentDto } from "@/lib/api/upload"

interface MessageItemProps {
    message: MessageDto
    channelId: string
    showAvatar?: boolean
    showAuthor?: boolean
    isGrouped?: boolean
    isFirstInGroup?: boolean // True if this is the first message in a group (has author info, next message is grouped)
}

export function MessageItem({
    message,
    channelId,
    showAvatar = true,
    showAuthor = true,
    isGrouped = false,
    isFirstInGroup = false
}: MessageItemProps) {
    const dispatch = useAppDispatch()
    const { user } = useAppSelector((state) => state.auth)
    const [isEditing, setIsEditing] = useState(false)
    const [editContent, setEditContent] = useState(message.content)
    const [isUpdating, setIsUpdating] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)

    // SignalR connection for editing and deleting messages
    const { invoke: chatInvoke, isConnected: isChatConnected } = useSignalR("/hubs/chat")

    // Get guildId from route params for permission check
    const { guildId } = useParams<{ guildId?: string }>()
    const { hasPermission } = usePermission(guildId)

    const isAuthor = user?.id === message.authorId
    const canManageMessages = hasPermission(GuildPermission.ManageMessages)
    const canDelete = isAuthor || canManageMessages

    // Parse attachments from JSON string
    const parsedAttachments = useMemo<AttachmentDto[]>(() => {
        console.log("[MessageItem] Raw attachments:", message.attachments)
        if (!message.attachments) return []
        try {
            const parsed = JSON.parse(message.attachments)
            console.log("[MessageItem] Parsed attachments:", parsed)
            if (Array.isArray(parsed)) {
                return parsed as AttachmentDto[]
            }
            return []
        } catch (error) {
            console.error(
                "[MessageItem] Failed to parse attachments:",
                error,
                message.attachments
            )
            return []
        }
    }, [message.attachments])

    const handleEdit = async () => {
        if (editContent.trim() === message.content.trim()) {
            setIsEditing(false)
            return
        }

        if (!isChatConnected) {
            console.error("SignalR not connected")
            return
        }

        setIsUpdating(true)
        try {
            // Send via SignalR (will be broadcast via MessageEdited event)
            await chatInvoke("EditMessage", channelId, message.id, {
                content: editContent.trim(),
            })
            setIsEditing(false)
        } catch (error) {
            console.error("Failed to edit message:", error)
        } finally {
            setIsUpdating(false)
        }
    }

    const handleDelete = async () => {
        if (!isChatConnected) {
            console.error("SignalR not connected")
            return
        }

        setIsDeleting(true)
        try {
            // Optimistic update: Remove message from UI immediately
            dispatch(removeMessage({ channelId, messageId: message.id }))
            setShowDeleteModal(false)

            // Send via SignalR (will be broadcast via MessageDeleted event to others)
            await chatInvoke("DeleteMessage", channelId, message.id)
        } catch (error) {
            console.error("Failed to delete message:", error)
            // Revert optimistic update on error (message will be re-added via SignalR if needed)
        } finally {
            setIsDeleting(false)
        }
    }

    // Render message content with mention highlights
    const renderMessageWithMentions = (content: string): React.ReactNode => {
        // Regex pattern: @username (word characters)
        const mentionPattern = /@(\w+)/g
        const parts: React.ReactNode[] = []
        let lastIndex = 0
        let match

        while ((match = mentionPattern.exec(content)) !== null) {
            // Add text before mention
            if (match.index > lastIndex) {
                parts.push(content.substring(lastIndex, match.index))
            }

            // Add highlighted mention
            const username = match[1]
            parts.push(
                <span
                    key={match.index}
                    className="bg-blue-500/20 text-blue-400 rounded px-1 font-medium"
                >
                    @{username}
                </span>
            )

            lastIndex = mentionPattern.lastIndex
        }

        // Add remaining text
        if (lastIndex < content.length) {
            parts.push(content.substring(lastIndex))
        }

        return parts.length > 0 ? <>{parts}</> : content
    }

    const formatTime = (dateString: string) => {
        try {
            const date = new Date(dateString)
            const now = new Date()

            // Check if same day
            const isSameDay =
                date.getDate() === now.getDate() &&
                date.getMonth() === now.getMonth() &&
                date.getFullYear() === now.getFullYear()

            if (isSameDay) {
                // Same day: show only time (HH:MM)
                return date.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false
                })
            } else {
                // Different day: show date and time (DD.MM.YYYY HH:MM)
                const day = String(date.getDate()).padStart(2, "0")
                const month = String(date.getMonth() + 1).padStart(2, "0")
                const year = date.getFullYear()
                const time = date.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false
                })
                return `${day}.${month}.${year} ${time}`
            }
        } catch {
            return dateString
        }
    }

    return (
        <div
            className={cn(
                "group relative px-4 hover:bg-[#2f3136] transition-colors",
                isGrouped ? "pt-1 pb-0" : isFirstInGroup ? "pt-1.5 pb-0.5" : "py-2"
            )}
        >
            <div className="flex items-start gap-3">
                {/* Avatar - only show if showAvatar is true */}
                <div className="flex-shrink-0 w-10">
                    {showAvatar ? (
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                            {message.author.username.charAt(0).toUpperCase()}
                        </div>
                    ) : null}
                </div>

                {/* Message Content */}
                <div className="flex-1 min-w-0">
                    {/* Author name and timestamp - only show if showAuthor is true */}
                    {showAuthor && (
                        <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-sm font-semibold text-foreground">
                                {message.author.username}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {formatTime(message.createdAt)}
                            </span>
                            {message.isEdited && (
                                <span className="text-xs text-muted-foreground italic">(edited)</span>
                            )}
                        </div>
                    )}

                    {isEditing ? (
                        <div className="space-y-2">
                            <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full px-3 py-2 bg-[#383a40] border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                                rows={3}
                                autoFocus
                                disabled={isUpdating}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                        handleEdit()
                                    } else if (e.key === "Escape") {
                                        setIsEditing(false)
                                        setEditContent(message.content)
                                    }
                                }}
                            />
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Press ESC to cancel</span>
                                <span>•</span>
                                <span>Press Cmd/Ctrl + Enter to save</span>
                                {isUpdating && <span className="text-primary">Updating...</span>}
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Only show content if it's not just zero-width space (used for attachment-only messages) */}
                            {message.content && message.content.trim() && message.content !== "\u200B" && (
                                <div className="text-sm text-foreground whitespace-pre-wrap break-words">
                                    {renderMessageWithMentions(message.content)}
                                </div>
                            )}

                            {/* Attachments */}
                            {parsedAttachments.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {parsedAttachments.map((attachment, index) => {
                                        if (attachment.type === "image") {
                                            return (
                                                <ImageAttachment
                                                    key={`${attachment.url}-${index}`}
                                                    attachment={attachment}
                                                />
                                            )
                                        }
                                        if (attachment.type === "video") {
                                            return (
                                                <VideoAttachment
                                                    key={`${attachment.url}-${index}`}
                                                    attachment={attachment}
                                                />
                                            )
                                        }
                                        return (
                                            <DocumentAttachment
                                                key={`${attachment.url}-${index}`}
                                                attachment={attachment}
                                            />
                                        )
                                    })}
                                </div>
                            )}
                        </>
                    )}

                </div>
            </div>

            {/* Floating Actions - Discord style */}
            {isAuthor && !isEditing && (
                <div className="absolute -top-3 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none group-hover:pointer-events-auto">
                    <div className="flex items-center gap-0.5 bg-[#2b2d31] border border-border rounded-md shadow-lg p-0.5">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-[#3f4147]"
                            onClick={() => {
                                setIsEditing(true)
                                setEditContent(message.content)
                            }}
                            disabled={isDeleting}
                            title="Edit"
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                        {canDelete && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-[#3f4147]"
                                onClick={() => setShowDeleteModal(true)}
                                disabled={isDeleting}
                                title="Delete"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <DeleteMessageModal
                open={showDeleteModal}
                onOpenChange={setShowDeleteModal}
                onConfirm={handleDelete}
                isDeleting={isDeleting}
            />
        </div>
    )
}

