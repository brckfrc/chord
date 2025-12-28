import { useEffect, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  fetchDMs,
  setSelectedDM,
  fetchDMMessages,
  addDMMessage,
  updateDMMessage,
  deleteDMMessage,
  addDMTypingUser,
  removeDMTypingUser,
  clearDMMessages,
} from "@/store/slices/dmsSlice"
import { useSignalR } from "@/hooks/useSignalR"
import { dmsApi } from "@/lib/api/dms"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from "lucide-react"
import { cn } from "@/lib/utils"

export function DMView() {
  const { channelId } = useParams<{ channelId: string }>()
  const dispatch = useAppDispatch()
  const { dms, messages, typingUsers, isLoading } = useAppSelector((state) => state.dms)
  const { user } = useAppSelector((state) => state.auth)
  const [messageText, setMessageText] = useState("")
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  // SignalR connection for ChatHub
  const { invoke: chatInvoke, on: chatOn, isConnected: isChatConnected } = useSignalR(
    "/hubs/chat"
  )

  // Fetch DMs and messages on mount/channel change
  useEffect(() => {
    if (channelId) {
      dispatch(setSelectedDM(channelId))
      dispatch(fetchDMs())
      dispatch(fetchDMMessages({ dmId: channelId }))
      
      // Join DM SignalR group
      if (isChatConnected) {
        chatInvoke("JoinDM", channelId).catch(console.error)
      }
    }

    return () => {
      if (channelId && isChatConnected) {
        chatInvoke("LeaveDM", channelId).catch(console.error)
        dispatch(clearDMMessages(channelId))
      }
    }
  }, [channelId, dispatch, isChatConnected, chatInvoke])

  // SignalR event listeners for DM events
  useEffect(() => {
    if (!channelId || !isChatConnected) return

    const handleDMReceiveMessage = (message: any) => {
      dispatch(addDMMessage({ dmId: channelId, message }))
    }

    const handleDMMessageEdited = (message: any) => {
      dispatch(updateDMMessage({ dmId: channelId, message }))
    }

    const handleDMMessageDeleted = (data: { messageId: string; channelId: string }) => {
      if (data.channelId === channelId) {
        dispatch(deleteDMMessage({ dmId: channelId, messageId: data.messageId }))
      }
    }

    const handleDMUserTyping = (data: { userId: string; username: string; dmId: string }) => {
      if (data.dmId === channelId && data.userId !== user?.id) {
        dispatch(addDMTypingUser({ dmId: channelId, userId: data.userId, username: data.username }))
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
          dispatch(removeDMTypingUser({ dmId: channelId, userId: data.userId }))
        }, 3000)
      }
    }

    const handleDMUserStoppedTyping = (data: { userId: string; dmId: string }) => {
      if (data.dmId === channelId && data.userId !== user?.id) {
        dispatch(removeDMTypingUser({ dmId: channelId, userId: data.userId }))
      }
    }

    const cleanupReceiveMessage = chatOn("DMReceiveMessage", handleDMReceiveMessage)
    const cleanupMessageEdited = chatOn("DMMessageEdited", handleDMMessageEdited)
    const cleanupMessageDeleted = chatOn("DMMessageDeleted", handleDMMessageDeleted)
    const cleanupUserTyping = chatOn("DMUserTyping", handleDMUserTyping)
    const cleanupUserStoppedTyping = chatOn("DMUserStoppedTyping", handleDMUserStoppedTyping)

    return () => {
      cleanupReceiveMessage()
      cleanupMessageEdited()
      cleanupMessageDeleted()
      cleanupUserTyping()
      cleanupUserStoppedTyping()
    }
  }, [channelId, isChatConnected, chatOn, dispatch, user?.id])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages[channelId || ""]])

  const currentDM = dms.find((dm) => dm.id === channelId)
  const otherUser = currentDM?.otherUser
  const dmMessages = messages[channelId || ""] || []
  const typingUsersList = typingUsers[channelId || ""] || []

  const handleSendMessage = async () => {
    if (!channelId || !messageText.trim() || isSending) return

    setIsSending(true)
    try {
      await dmsApi.sendDMMessage(channelId, messageText.trim())
      setMessageText("")
      
      // Stop typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      chatInvoke("StopTypingInDM", channelId).catch(console.error)
    } catch (error) {
      console.error("Failed to send DM:", error)
    } finally {
      setIsSending(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value)
    
    // Send typing indicator
    if (isChatConnected && channelId) {
      chatInvoke("TypingInDM", channelId).catch(console.error)
      
      // Auto-stop typing after 3 seconds
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      typingTimeoutRef.current = setTimeout(() => {
        chatInvoke("StopTypingInDM", channelId).catch(console.error)
      }, 3000)
    }
  }

  if (isLoading && !currentDM) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  if (!currentDM || !otherUser) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold">DM not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This direct message could not be found.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* DM Header */}
      <div className="h-12 border-b border-border px-4 flex items-center shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
            {otherUser.username?.charAt(0).toUpperCase() || "?"}
          </div>
          <h2 className="text-base font-semibold">{otherUser.username}</h2>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {dmMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          dmMessages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.senderId === user?.id && "flex-row-reverse"
              )}
            >
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold flex-shrink-0">
                {message.sender.username?.charAt(0).toUpperCase() || "?"}
              </div>
              <div
                className={cn(
                  "flex flex-col max-w-[70%]",
                  message.senderId === user?.id && "items-end"
                )}
              >
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm font-semibold">
                    {message.sender.username}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </span>
                  {message.editedAt && (
                    <span className="text-xs text-muted-foreground italic">
                      (edited)
                    </span>
                  )}
                </div>
                <div
                  className={cn(
                    "rounded-lg px-4 py-2",
                    message.senderId === user?.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary",
                    message.isDeleted && "opacity-50 italic"
                  )}
                >
                  {message.isDeleted ? (
                    <span className="text-sm">Message deleted</span>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {typingUsersList.length > 0 && (
        <div className="px-4 py-2 text-xs text-muted-foreground">
          {typingUsersList.map((u) => u.username).join(", ")} {typingUsersList.length === 1 ? "is" : "are"} typing...
        </div>
      )}

      {/* Message input */}
      <div className="border-t border-border p-4 flex-shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSendMessage()
          }}
          className="flex gap-2"
        >
          <Input
            value={messageText}
            onChange={handleInputChange}
            placeholder={`Message ${otherUser.username}`}
            disabled={isSending}
            className="flex-1"
          />
          <Button type="submit" disabled={!messageText.trim() || isSending}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}

