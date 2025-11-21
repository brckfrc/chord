import { useEffect, useRef } from "react"
import { useSearchParams } from "react-router-dom"
import { useAppSelector, useAppDispatch } from "@/store/hooks"
import { fetchMessages } from "@/store/slices/messagesSlice"
import { MessageItem } from "./MessageItem"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"

interface MessageListProps {
  channelId: string
}

export function MessageList({ channelId }: MessageListProps) {
  const dispatch = useAppDispatch()
  const [searchParams, setSearchParams] = useSearchParams()
  const { messagesByChannel, hasMoreByChannel, nextCursorByChannel, isLoading } =
    useAppSelector((state) => state.messages)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const isLoadingMoreRef = useRef(false)

  const messages = messagesByChannel[channelId] || []
  const hasMore = hasMoreByChannel[channelId] ?? false
  const nextCursor = nextCursorByChannel[channelId]
  const hasFetchedRef = useRef<string | null>(null)

  // Fetch initial messages - ONLY ONCE per channel
  useEffect(() => {
    if (channelId && hasFetchedRef.current !== channelId && !messagesByChannel[channelId]) {
      hasFetchedRef.current = channelId
      dispatch(fetchMessages({ channelId, limit: 50 }))
    }
  }, [channelId, dispatch]) // Removed messagesByChannel from dependencies

  // Reset fetch flag when channel changes
  useEffect(() => {
    if (channelId !== hasFetchedRef.current) {
      hasFetchedRef.current = null
    }
  }, [channelId])

  // Scroll to specific message if URL has message parameter
  useEffect(() => {
    const messageId = searchParams.get("message")
    if (messageId && messages.length > 0) {
      // Wait a bit for messages to render
      setTimeout(() => {
        const messageElement = document.getElementById(`message-${messageId}`)
        if (messageElement) {
          messageElement.scrollIntoView({ behavior: "smooth", block: "center" })
          messageElement.classList.add("ring-2", "ring-blue-500", "ring-opacity-50")
          setTimeout(() => {
            messageElement.classList.remove("ring-2", "ring-blue-500", "ring-opacity-50")
          }, 2000)
          // Remove message param from URL
          searchParams.delete("message")
          setSearchParams(searchParams, { replace: true })
        }
      }, 100)
    }
  }, [messages, searchParams, setSearchParams])

  // Auto-scroll to bottom on new messages (only if no message param)
  useEffect(() => {
    const messageId = searchParams.get("message")
    if (!messageId && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages.length, searchParams])

  // Load more messages (scroll to top)
  const handleLoadMore = async () => {
    if (isLoadingMoreRef.current || !hasMore || !nextCursor) return

    isLoadingMoreRef.current = true
    try {
      await dispatch(
        fetchMessages({ channelId, limit: 50, cursor: nextCursor })
      ).unwrap()

      // Scroll to maintain position
      if (messagesContainerRef.current) {
        const scrollHeight = messagesContainerRef.current.scrollHeight
        const scrollTop = messagesContainerRef.current.scrollTop

        // After messages are added, restore scroll position
        setTimeout(() => {
          if (messagesContainerRef.current) {
            const newScrollHeight = messagesContainerRef.current.scrollHeight
            messagesContainerRef.current.scrollTop =
              scrollTop + (newScrollHeight - scrollHeight)
          }
        }, 0)
      }
    } catch (error) {
      console.error("Failed to load more messages:", error)
    } finally {
      isLoadingMoreRef.current = false
    }
  }

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">No messages yet</p>
          <p className="text-muted-foreground text-xs mt-1">
            Be the first to send a message!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto min-h-0"
      onScroll={(e) => {
        // Load more when scrolled to top
        const target = e.currentTarget
        if (target.scrollTop === 0 && hasMore && !isLoadingMoreRef.current) {
          handleLoadMore()
        }
      }}
    >
      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLoadMore}
            disabled={isLoadingMoreRef.current}
            className="text-xs"
          >
            {isLoadingMoreRef.current ? (
              <>
                <Spinner className="w-3 h-3 mr-2" />
                Loading...
              </>
            ) : (
              "Load older messages"
            )}
          </Button>
        </div>
      )}

      {/* Messages */}
      <div className="py-4">
        {messages.map((message, index) => {
          const previousMessage = index > 0 ? messages[index - 1] : null
          const nextMessage = index < messages.length - 1 ? messages[index + 1] : null
          
          // Check if this message should be grouped with the previous one
          // Group if: same author AND within 5 minutes
          const shouldGroup = previousMessage && 
            previousMessage.authorId === message.authorId &&
            (() => {
              const prevTime = new Date(previousMessage.createdAt).getTime()
              const currentTime = new Date(message.createdAt).getTime()
              const diffMinutes = (currentTime - prevTime) / (1000 * 60)
              return diffMinutes < 5
            })()

          // Check if the next message is grouped with this one
          const isFirstInGroup = !shouldGroup && !!nextMessage && 
            message.authorId === nextMessage.authorId &&
            (() => {
              const currentTime = new Date(message.createdAt).getTime()
              const nextTime = new Date(nextMessage.createdAt).getTime()
              const diffMinutes = (nextTime - currentTime) / (1000 * 60)
              return diffMinutes < 5
            })() || false

          const showAvatar = !shouldGroup
          const showAuthor = !shouldGroup
          const isGrouped = !!shouldGroup

          return (
            <div id={`message-${message.id}`} key={message.id}>
              <MessageItem
                message={message}
                channelId={channelId}
                showAvatar={showAvatar}
                showAuthor={showAuthor}
                isGrouped={isGrouped}
                isFirstInGroup={isFirstInGroup}
              />
            </div>
          )
        })}
      </div>

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  )
}

