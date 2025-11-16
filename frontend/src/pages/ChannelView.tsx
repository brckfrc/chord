import { useEffect, useRef } from "react"
import { useParams } from "react-router-dom"
import { useAppSelector, useAppDispatch } from "@/store/hooks"
import { useSignalR } from "@/hooks/useSignalR"
import {
  addMessage,
  updateMessageState,
  removeMessage,
  addTypingUser,
  removeTypingUser,
  clearMessages,
  clearTypingUsers,
} from "@/store/slices/messagesSlice"
import { MessageList } from "@/components/messages/MessageList"
import { MessageComposer } from "@/components/messages/MessageComposer"
import { TypingIndicator } from "@/components/messages/TypingIndicator"
import { Hash, Mic } from "lucide-react"
import { ChannelType } from "@/lib/api/channels"

export function ChannelView() {
  const { guildId, channelId } = useParams<{
    guildId: string
    channelId: string
  }>()
  const dispatch = useAppDispatch()
  const { channels } = useAppSelector((state) => state.channels)
  const { user } = useAppSelector((state) => state.auth)
  const previousChannelIdRef = useRef<string | undefined>()
  const chatInvokeRef = useRef<typeof chatInvoke | null>(null)

  // Get current channel info
  const currentChannel = channels.find((c) => c.id === channelId)
  const isTextChannel = currentChannel?.type === ChannelType.Text

  // SignalR connection for ChatHub
  const { invoke: chatInvoke, on: chatOn, off: chatOff, isConnected: isChatConnected } = useSignalR(
    "/hubs/chat",
    {
      onConnected: () => {
        console.log("Connected to ChatHub")
      },
      onDisconnected: () => {
        console.log("Disconnected from ChatHub")
      },
    }
  )

  // Store chatInvoke in ref to avoid dependency issues
  useEffect(() => {
    chatInvokeRef.current = chatInvoke
  }, [chatInvoke])

  // Join/Leave channel on route change
  useEffect(() => {
    if (!channelId || !isChatConnected || !isTextChannel || !chatInvokeRef.current) {
      return
    }

    const joinChannel = async () => {
      try {
        // Leave previous channel
        if (previousChannelIdRef.current && chatInvokeRef.current) {
          await chatInvokeRef.current("LeaveChannel", previousChannelIdRef.current)
          dispatch(clearMessages(previousChannelIdRef.current))
          dispatch(clearTypingUsers(previousChannelIdRef.current))
        }

        // Join new channel
        if (chatInvokeRef.current) {
          await chatInvokeRef.current("JoinChannel", channelId)
          previousChannelIdRef.current = channelId
        }
      } catch (error) {
        console.error("Failed to join channel:", error)
      }
    }

    joinChannel()

    // Cleanup: Leave channel on unmount or channel change
    return () => {
      if (channelId && isChatConnected && chatInvokeRef.current) {
        chatInvokeRef.current("LeaveChannel", channelId).catch(console.error)
      }
    }
  }, [channelId, isChatConnected, isTextChannel, dispatch]) // Removed chatInvoke from dependencies

  // SignalR event listeners
  useEffect(() => {
    if (!channelId || !isChatConnected) {
      return
    }

    // ReceiveMessage event
    const handleReceiveMessage = (message: any) => {
      if (message.channelId === channelId) {
        dispatch(addMessage({ channelId, message }))
      }
    }

    // MessageEdited event
    const handleMessageEdited = (message: any) => {
      if (message.channelId === channelId) {
        dispatch(
          updateMessageState({
            channelId,
            messageId: message.id,
            updates: message,
          })
        )
      }
    }

    // MessageDeleted event
    const handleMessageDeleted = (messageId: string) => {
      dispatch(removeMessage({ channelId, messageId }))
    }

    // UserTyping event
    const handleUserTyping = (data: { userId: string; username: string; channelId: string }) => {
      if (data.channelId === channelId) {
        // Don't show typing indicator for current user
        if (user?.id === data.userId) {
          return
        }
        dispatch(addTypingUser({ channelId, userId: data.userId, username: data.username }))
        // Remove typing indicator after 3 seconds
        setTimeout(() => {
          dispatch(removeTypingUser({ channelId, userId: data.userId }))
        }, 3000)
      }
    }

    // Error event
    const handleError = (message: string) => {
      console.error("ChatHub error:", message)
    }

    // Register event listeners
    const cleanupReceiveMessage = chatOn("ReceiveMessage", handleReceiveMessage)
    const cleanupMessageEdited = chatOn("MessageEdited", handleMessageEdited)
    const cleanupMessageDeleted = chatOn("MessageDeleted", handleMessageDeleted)
    const cleanupUserTyping = chatOn("UserTyping", handleUserTyping)
    const cleanupError = chatOn("Error", handleError)

    // Cleanup
    return () => {
      cleanupReceiveMessage()
      cleanupMessageEdited()
      cleanupMessageDeleted()
      cleanupUserTyping()
      cleanupError()
    }
  }, [channelId, isChatConnected, chatOn, dispatch])

  // Don't show messaging UI for voice channels
  if (!isTextChannel) {
    return (
      <div className="flex h-full flex-col bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Mic className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">Voice Channel</p>
            <p className="text-muted-foreground text-xs mt-1">
              Click to join voice channel
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Channel Header */}
      <div className="h-12 border-b border-border px-4 flex items-center shadow-sm flex-shrink-0">
        <Hash className="h-5 w-5 text-muted-foreground mr-2" />
        <h2 className="text-base font-semibold text-foreground">
          {currentChannel?.name || `Channel ${channelId?.substring(0, 8)}...`}
        </h2>
        {currentChannel?.topic && (
          <span className="ml-2 text-xs text-muted-foreground truncate">
            {currentChannel.topic}
          </span>
        )}
      </div>

      {/* Message List */}
      <MessageList channelId={channelId!} />

      {/* Typing Indicator */}
      <TypingIndicator channelId={channelId!} />

      {/* Message Composer */}
      <MessageComposer channelId={channelId!} />
    </div>
  )
}

