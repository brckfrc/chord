import { useEffect, useRef, useState } from "react"
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
import { fetchUnreadMentionCount } from "@/store/slices/mentionsSlice"
import { MessageList } from "@/components/messages/MessageList"
import { MessageComposer } from "@/components/messages/MessageComposer"
import { TypingIndicator } from "@/components/messages/TypingIndicator"
import { MentionsPanel } from "@/components/messages/MentionsPanel"
import { Hash, Mic, Megaphone, Bell } from "lucide-react"
import { ChannelType } from "@/lib/api/channels"
import { Button } from "@/components/ui/button"
// TODO: Re-enable VoiceRoom after fixing bugs
// import { VoiceRoom } from "@/components/voice"

export function ChannelView() {
  const { channelId } = useParams<{
    guildId: string
    channelId: string
  }>()
  const dispatch = useAppDispatch()
  const { channels } = useAppSelector((state) => state.channels)
  const { user } = useAppSelector((state) => state.auth)
  const { unreadCount } = useAppSelector((state) => state.mentions)
  const previousChannelIdRef = useRef<string | undefined>(undefined)
  const previousChannelWasTextRef = useRef<boolean>(false)
  const chatInvokeRef = useRef<typeof chatInvoke | null>(null)
  const [showMentionsPanel, setShowMentionsPanel] = useState(false)

  // Get current channel info
  const currentChannel = channels.find((c) => c.id === channelId)
  const isTextChannel = currentChannel?.type === ChannelType.Text || currentChannel?.type === ChannelType.Announcement

  // Fetch unread mention count on mount
  useEffect(() => {
    dispatch(fetchUnreadMentionCount())
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      dispatch(fetchUnreadMentionCount())
    }, 30000)
    return () => clearInterval(interval)
  }, [dispatch])

  // Request browser notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(console.error)
    }
  }, [])

  // SignalR connection for ChatHub
  const { invoke: chatInvoke, on: chatOn, isConnected: isChatConnected } = useSignalR(
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
  // This ensures users are added to the guild SignalR group for voice events
  useEffect(() => {
    if (!channelId || !isChatConnected || !chatInvokeRef.current) {
      return
    }

    // Skip if we're already joined to this channel
    if (previousChannelIdRef.current === channelId) {
      return
    }

    const joinChannel = async () => {
      try {
        // Leave previous channel
        if (previousChannelIdRef.current && chatInvokeRef.current) {
          await chatInvokeRef.current("LeaveChannel", previousChannelIdRef.current)
          // Only clear messages if previous channel was a text channel
          if (previousChannelWasTextRef.current) {
            dispatch(clearMessages(previousChannelIdRef.current))
            dispatch(clearTypingUsers(previousChannelIdRef.current))
          }
        }

        // Join new channel (also adds user to guild group for voice events)
        if (chatInvokeRef.current) {
          await chatInvokeRef.current("JoinChannel", channelId)
          previousChannelIdRef.current = channelId
          // Store whether this channel is a text channel for future cleanup
          const channel = channels.find((c) => c.id === channelId)
          previousChannelWasTextRef.current = channel?.type === ChannelType.Text || channel?.type === ChannelType.Announcement
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
  }, [channelId, isChatConnected, channels, dispatch])

  // SignalR event listeners
  useEffect(() => {
    if (!channelId || !isChatConnected) {
      return
    }

    // ReceiveMessage event
    const handleReceiveMessage = (message: any) => {
      // SignalR group ensures we only receive messages for channels we've joined
      dispatch(addMessage({ channelId, message }))
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
        // Remove typing indicator after 3 seconds (fallback if StopTyping is not called)
        setTimeout(() => {
          dispatch(removeTypingUser({ channelId, userId: data.userId }))
        }, 3000)
      }
    }

    // UserStoppedTyping event
    const handleUserStoppedTyping = (data: { userId: string; channelId: string }) => {
      if (data.channelId === channelId) {
        // Don't process for current user
        if (user?.id === data.userId) {
          return
        }
        dispatch(removeTypingUser({ channelId, userId: data.userId }))
      }
    }

    // UserMentioned event
    const handleUserMentioned = async (data: {
      mentionId: string
      messageId: string
      channelId: string
      authorId: string
      content: string
    }) => {
      // Refresh unread count
      dispatch(fetchUnreadMentionCount())

      // Optionally: Show browser notification
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("You were mentioned", {
          body: data.content.substring(0, 100),
          icon: "/favicon.ico",
        })
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
    const cleanupUserStoppedTyping = chatOn("UserStoppedTyping", handleUserStoppedTyping)
    const cleanupUserMentioned = chatOn("UserMentioned", handleUserMentioned)
    const cleanupError = chatOn("Error", handleError)

    // Cleanup
    return () => {
      cleanupReceiveMessage()
      cleanupMessageEdited()
      cleanupMessageDeleted()
      cleanupUserTyping()
      cleanupUserStoppedTyping()
      cleanupUserMentioned()
      cleanupError()
    }
  }, [channelId, isChatConnected, chatOn, dispatch])

  // Show VoiceRoom for voice channels
  // TODO: VoiceRoom UI is temporarily disabled due to bugs
  // Re-enable after fixing LiveKit connection issues
  if (!isTextChannel) {
    return (
      <div className="flex h-full flex-col bg-background">
        {/* Channel Header */}
        <div className="h-12 border-b border-border px-4 flex items-center shadow-sm flex-shrink-0">
          <Mic className="h-5 w-5 text-muted-foreground mr-2 flex-shrink-0" />
          <h2 className="text-base font-semibold text-foreground truncate">
            {currentChannel?.name || "Voice Channel"}
          </h2>
        </div>
        
        {/* VoiceRoom temporarily disabled - placeholder */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-muted-foreground">
          <Mic className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">Voice Room</p>
          <p className="text-sm mt-1">Connected via VoiceBar below</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Channel Header */}
      <div className="h-12 border-b border-border px-4 flex items-center justify-between shadow-sm flex-shrink-0">
        <div className="flex items-center flex-1 min-w-0">
          {currentChannel?.type === ChannelType.Announcement ? (
            <Megaphone className="h-5 w-5 text-muted-foreground mr-2 flex-shrink-0" />
          ) : (
            <Hash className="h-5 w-5 text-muted-foreground mr-2 flex-shrink-0" />
          )}
          <h2 className="text-base font-semibold text-foreground truncate">
            {currentChannel?.name || `Channel ${channelId?.substring(0, 8)}...`}
          </h2>
          {currentChannel?.topic && (
            <span className="ml-2 text-xs text-muted-foreground truncate hidden md:inline">
              {currentChannel.topic}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowMentionsPanel(true)}
          className="h-8 w-8 relative flex-shrink-0"
          title="Mentions"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </div>

      {/* Message List */}
      <MessageList channelId={channelId!} />

      {/* Typing Indicator */}
      <TypingIndicator channelId={channelId!} />

      {/* Message Composer */}
      <MessageComposer channelId={channelId!} />

      {/* Mentions Panel */}
      <MentionsPanel
        open={showMentionsPanel}
        onClose={() => setShowMentionsPanel(false)}
      />
    </div>
  )
}

