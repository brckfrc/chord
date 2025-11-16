import { useState } from "react"
import { useAppSelector, useAppDispatch } from "@/store/hooks"
import { removeMessage } from "@/store/slices/messagesSlice"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSignalR } from "@/hooks/useSignalR"
import { DeleteMessageModal } from "@/components/modals/DeleteMessageModal"
import type { MessageDto } from "@/lib/api/messages"

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
    const [showActions, setShowActions] = useState(false)
    const [isUpdating, setIsUpdating] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)

    // SignalR connection for editing and deleting messages
    const { invoke: chatInvoke, isConnected: isChatConnected } = useSignalR("/hubs/chat")

    const isAuthor = user?.id === message.authorId
    const canDelete = isAuthor // TODO: Add guild owner check when permissions are implemented

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
                "group px-4 hover:bg-[#2f3136] transition-colors",
                isGrouped ? "pt-1 pb-0" : isFirstInGroup ? "pt-1.5 pb-0.5" : "py-2"
            )}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            <div className="flex items-start gap-3">
                {/* Avatar - only show if showAvatar is true */}
                <div className="flex-shrink-0 w-10">
                    {showAvatar ? (
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                            {message.author.displayName.charAt(0).toUpperCase()}
                        </div>
                    ) : null}
                </div>

                {/* Message Content */}
                <div className="flex-1 min-w-0">
                    {/* Author name and timestamp - only show if showAuthor is true */}
                    {showAuthor && (
                        <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-sm font-semibold text-foreground">
                                {message.author.displayName}
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
                        <div className="text-sm text-foreground whitespace-pre-wrap break-words">
                            {message.content}
                        </div>
                    )}

                    {/* Actions */}
                    {showActions && isAuthor && !isEditing && (
                        <div className="flex items-center gap-1 mt-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => {
                                    setIsEditing(true)
                                    setEditContent(message.content)
                                }}
                                disabled={isDeleting}
                            >
                                <Pencil className="h-3 w-3 mr-1" />
                                Edit
                            </Button>
                            {canDelete && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => setShowDeleteModal(true)}
                                    disabled={isDeleting}
                                >
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Delete
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>

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

