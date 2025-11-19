import { useState, useRef, useEffect } from "react"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { createMessage } from "@/store/slices/messagesSlice"
import { Button } from "@/components/ui/button"
import { Send } from "lucide-react"
import { useSignalR } from "@/hooks/useSignalR"

interface MessageComposerProps {
    channelId: string
}

export function MessageComposer({ channelId }: MessageComposerProps) {
    const dispatch = useAppDispatch()
    const { user } = useAppSelector((state) => state.auth)
    const [content, setContent] = useState("")
    const [isSending, setIsSending] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // SignalR connection for typing indicator
    const { invoke: chatInvoke, isConnected: isChatConnected } = useSignalR("/hubs/chat")

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

        if (!content.trim() || isSending) {
            return
        }

        setIsSending(true)
        try {
            // Send via SignalR (will be broadcast via ReceiveMessage event)
            await chatInvoke("SendMessage", channelId, {
                content: content.trim(),
                attachments: null,
            })

            // Stop typing indicator after sending message
            try {
                await chatInvoke("StopTyping", channelId)
            } catch (error) {
                console.error("Failed to send stop typing indicator:", error)
            }

            // Clear input
            setContent("")
            if (textareaRef.current) {
                textareaRef.current.style.height = "auto"
            }
        } catch (error) {
            console.error("Failed to send message:", error)
            // Fallback to REST API if SignalR fails
            try {
                await dispatch(
                    createMessage({
                        channelId,
                        data: { content: content.trim() },
                    })
                ).unwrap()
                setContent("")
                if (textareaRef.current) {
                    textareaRef.current.style.height = "auto"
                }
            } catch (restError) {
                console.error("Failed to send message via REST:", restError)
            }
        } finally {
            setIsSending(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSubmit(e)
        }
    }

    return (
        <div className="px-4 py-4 border-t border-border">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <div className="flex-1 relative flex items-center">
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`Message #${channelId.substring(0, 8)}...`}
                        className="w-full px-4 py-2 bg-[#383a40] border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none max-h-32 overflow-hidden min-h-[36px] leading-[20px]"
                        rows={1}
                        disabled={isSending}
                    />
                </div>
                <Button
                    type="submit"
                    size="icon"
                    disabled={!content.trim() || isSending}
                    className="flex-shrink-0 h-[36px] w-[36px]"
                >
                    <Send className="h-4 w-4" />
                </Button>
            </form>
        </div>
    )
}

