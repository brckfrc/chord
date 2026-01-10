import { useState, useRef, useEffect } from "react"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { createMessage } from "@/store/slices/messagesSlice"
import { fetchGuildMembers } from "@/store/slices/guildsSlice"
import { Button } from "@/components/ui/button"
import { Send } from "lucide-react"
import { useSignalR } from "@/hooks/useSignalR"
import { cn } from "@/lib/utils"
import type { GuildMemberDto } from "@/lib/api/guilds"
import { FileUploadButton } from "./FileUploadButton"
import type { UploadResponseDto, AttachmentDto } from "@/lib/api/upload"
import { useToast } from "@/hooks/use-toast"

// Zero-width space character - invisible but satisfies backend MinimumLength = 1 requirement
// Regular spaces may be trimmed by ASP.NET Core model validation
const ZERO_WIDTH_SPACE = "\u200B"

interface MessageComposerProps {
    channelId: string
}

export function MessageComposer({ channelId }: MessageComposerProps) {
    const dispatch = useAppDispatch()
    const { channels } = useAppSelector((state) => state.channels)
    const { membersByGuild } = useAppSelector((state) => state.guilds)
    const { user } = useAppSelector((state) => state.auth)
    const { toast } = useToast()
    const [content, setContent] = useState("")
    const [isSending, setIsSending] = useState(false)
    const [mentionQuery, setMentionQuery] = useState("")
    const [mentionStartIndex, setMentionStartIndex] = useState<number | null>(null)
    const [selectedMentionIndex, setSelectedMentionIndex] = useState(0)
    const [attachments, setAttachments] = useState<UploadResponseDto[]>([])
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const mentionListRef = useRef<HTMLDivElement>(null)

    // Get current channel and guild
    const currentChannel = channels.find((c) => c.id === channelId)
    const guildId = currentChannel?.guildId
    const guildMembers = guildId ? membersByGuild[guildId] || [] : []

    // SignalR connection for typing indicator
    const { invoke: chatInvoke, isConnected: isChatConnected } = useSignalR("/hubs/chat")

    // Fetch guild members if not already loaded
    useEffect(() => {
        if (guildId && !membersByGuild[guildId]) {
            dispatch(fetchGuildMembers(guildId))
        }
    }, [guildId, dispatch, membersByGuild])

    // Handle @mention detection and autocomplete
    useEffect(() => {
        const textarea = textareaRef.current
        if (!textarea) return

        const cursorPosition = textarea.selectionStart
        const textBeforeCursor = content.substring(0, cursorPosition)

        // Find @ mention pattern
        const mentionMatch = textBeforeCursor.match(/@(\w*)$/)

        if (mentionMatch) {
            const matchIndex = textBeforeCursor.lastIndexOf("@")
            setMentionStartIndex(matchIndex)
            setMentionQuery(mentionMatch[1])
            setSelectedMentionIndex(0)
        } else {
            setMentionStartIndex(null)
            setMentionQuery("")
        }
    }, [content])

    // Filter members for autocomplete (exclude current user)
    const filteredMembers = (mentionQuery
        ? guildMembers.filter((member) => {
            // Kendi kendini mention edemez
            if (member.userId === user?.id) {
                return false
            }
            const username = member.user?.username?.toLowerCase() || ""
            const displayName = member.user?.displayName?.toLowerCase() || ""
            const query = mentionQuery.toLowerCase()
            return username.startsWith(query) || displayName.startsWith(query)
        })
        : guildMembers.filter((member) => {
            // Kendi kendini mention edemez
            return member.userId !== user?.id
        }))

    // Limit to 10 results
    const mentionSuggestions = filteredMembers.slice(0, 10)

    // Handle attachment upload complete
    const handleUploadComplete = (attachment: UploadResponseDto) => {
        setAttachments((prev) => [...prev, attachment])
    }

    // Handle attachment removal
    const handleUploadRemove = (url: string) => {
        setAttachments((prev) => prev.filter((a) => a.url !== url))
    }

    // Convert UploadResponseDto to AttachmentDto for message
    const attachmentsToJson = (): string | null => {
        if (attachments.length === 0) return null
        try {
            const dtos: AttachmentDto[] = attachments.map((a) => ({
                url: a.url,
                type: a.type,
                size: a.size,
                name: a.name,
                duration: a.duration,
            }))
            const jsonString = JSON.stringify(dtos)
            // Validate JSON is not empty
            if (!jsonString || jsonString === "[]") return null
            return jsonString
        } catch (error) {
            console.error("Failed to serialize attachments:", error)
            return null
        }
    }

    // Handle mention selection
    const insertMention = (member: GuildMemberDto) => {
        if (mentionStartIndex === null || !textareaRef.current) return

        const username = member.user?.username || ""
        const beforeMention = content.substring(0, mentionStartIndex)
        const afterMention = content.substring(textareaRef.current.selectionStart)
        const newContent = `${beforeMention}@${username} ${afterMention}`

        setContent(newContent)
        setMentionStartIndex(null)
        setMentionQuery("")

        // Set cursor position after mention
        setTimeout(() => {
            if (textareaRef.current) {
                const cursorPos = beforeMention.length + username.length + 2 // +2 for @ and space
                textareaRef.current.setSelectionRange(cursorPos, cursorPos)
                textareaRef.current.focus()
            }
        }, 0)
    }

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto"
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
        }
    }, [content])

    // Typing indicator
    useEffect(() => {
        if (!isChatConnected) {
            return
        }

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current)
        }

        // If content is empty, send StopTyping
        if (!content.trim()) {
            const stopTyping = async () => {
                try {
                    await chatInvoke("StopTyping", channelId)
                } catch (error) {
                    console.error("Failed to send stop typing indicator:", error)
                }
            }
            stopTyping()
            return
        }

        // Send typing event (throttled - max once per second)
        const sendTyping = async () => {
            try {
                await chatInvoke("Typing", channelId)
            } catch (error) {
                console.error("Failed to send typing indicator:", error)
            }
        }

        // Send typing immediately
        sendTyping()

        // Set timeout to send again after 3 seconds if still typing
        typingTimeoutRef.current = setTimeout(() => {
            if (content.trim()) {
                sendTyping()
            }
        }, 3000)

        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current)
            }
        }
    }, [content, channelId, chatInvoke, isChatConnected])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Allow sending if there's content OR attachments
        if ((!content.trim() && attachments.length === 0) || isSending) {
            return
        }

        setIsSending(true)
        try {
            // Prepare content: use zero-width space if empty but attachments exist
            // This satisfies backend MinimumLength = 1 requirement
            const trimmedContent = content.trim()
            const finalContent = trimmedContent || (attachments.length > 0 ? ZERO_WIDTH_SPACE : "")
            
            // Send via SignalR (will be broadcast via ReceiveMessage event)
            await chatInvoke("SendMessage", channelId, {
                content: finalContent,
                attachments: attachmentsToJson(),
            })

            // Stop typing indicator after sending message
            try {
                await chatInvoke("StopTyping", channelId)
            } catch (error) {
                console.error("Failed to send stop typing indicator:", error)
            }

            // Clear input and attachments
            setContent("")
            setAttachments([])
            if (textareaRef.current) {
                textareaRef.current.style.height = "auto"
            }
        } catch (error) {
            console.error("Failed to send message:", error)
            
            // Show user-friendly error message
            const errorMessage = error instanceof Error 
                ? error.message 
                : "Failed to send message. Please try again."
            
            toast({
                title: "Failed to send message",
                description: errorMessage,
                variant: "destructive",
            })
            
            // Fallback to REST API if SignalR fails
            try {
                // Prepare content: use zero-width space if empty but attachments exist
                const trimmedContent = content.trim()
                const finalContent = trimmedContent || (attachments.length > 0 ? ZERO_WIDTH_SPACE : "")
                
                await dispatch(
                    createMessage({
                        channelId,
                        data: {
                            content: finalContent,
                            attachments: attachmentsToJson() || undefined
                        },
                    })
                ).unwrap()
                setContent("")
                setAttachments([])
                if (textareaRef.current) {
                    textareaRef.current.style.height = "auto"
                }
            } catch (restError) {
                console.error("Failed to send message via REST:", restError)
                const restErrorMessage = restError instanceof Error 
                    ? restError.message 
                    : "Failed to send message via REST API. Please try again."
                
                toast({
                    title: "Failed to send message",
                    description: restErrorMessage,
                    variant: "destructive",
                })
            }
        } finally {
            setIsSending(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Handle mention autocomplete navigation
        if (mentionStartIndex !== null && mentionSuggestions.length > 0) {
            if (e.key === "ArrowDown") {
                e.preventDefault()
                setSelectedMentionIndex((prev) =>
                    prev < mentionSuggestions.length - 1 ? prev + 1 : prev
                )
                return
            }
            if (e.key === "ArrowUp") {
                e.preventDefault()
                setSelectedMentionIndex((prev) => (prev > 0 ? prev - 1 : 0))
                return
            }
            if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault()
                insertMention(mentionSuggestions[selectedMentionIndex])
                return
            }
            if (e.key === "Escape") {
                e.preventDefault()
                setMentionStartIndex(null)
                setMentionQuery("")
                return
            }
        }

        // Normal Enter to send
        if (e.key === "Enter" && !e.shiftKey && mentionStartIndex === null) {
            e.preventDefault()
            handleSubmit(e)
        }
    }

    return (
        <div className="px-4 py-4 border-t border-border">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
                {/* File Upload Button */}
                <FileUploadButton
                    onUploadComplete={handleUploadComplete}
                    onUploadRemove={handleUploadRemove}
                    attachments={attachments}
                    disabled={isSending}
                />

                <div className="flex-1 relative flex items-center">
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={currentChannel ? `Message #${currentChannel.name}` : `Message #${channelId.substring(0, 8)}...`}
                        className="w-full px-4 py-2 bg-[#383a40] border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none max-h-32 overflow-hidden min-h-[36px] leading-[20px]"
                        rows={1}
                        disabled={isSending}
                    />

                    {/* Mention Autocomplete */}
                    {mentionStartIndex !== null && mentionSuggestions.length > 0 && (
                        <div
                            ref={mentionListRef}
                            className="absolute bottom-full left-0 mb-2 w-64 bg-[#2f3136] border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto z-50"
                        >
                            {mentionSuggestions.map((member, index) => {
                                const username = member.user?.username || ""
                                const displayName = member.user?.displayName || username
                                return (
                                    <button
                                        key={member.userId}
                                        type="button"
                                        onClick={() => insertMention(member)}
                                        className={cn(
                                            "w-full px-3 py-2 text-left text-sm hover:bg-[#3f4147] transition-colors flex items-center gap-2",
                                            index === selectedMentionIndex && "bg-[#3f4147]"
                                        )}
                                    >
                                        <div className="flex-1">
                                            <div className="font-medium text-foreground">
                                                {displayName}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                @{username}
                                            </div>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>
                <Button
                    type="submit"
                    size="icon"
                    disabled={(!content.trim() && attachments.length === 0) || isSending}
                    className="flex-shrink-0 h-[36px] w-[36px]"
                >
                    <Send className="h-4 w-4" />
                </Button>
            </form>
        </div>
    )
}

