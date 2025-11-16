import { useAppSelector } from "@/store/hooks"
import { useMemo } from "react"

interface TypingIndicatorProps {
  channelId: string
}

export function TypingIndicator({ channelId }: TypingIndicatorProps) {
  // Get typing users for this channel - memoize to prevent unnecessary rerenders
  const typingUsersByChannel = useAppSelector((state) => state.messages.typingUsers)
  
  const typingUsers = useMemo(() => {
    return typingUsersByChannel[channelId] || []
  }, [typingUsersByChannel, channelId])

  if (typingUsers.length === 0) {
    return null
  }

  // Format typing message based on number of users
  const getTypingMessage = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].username} is typing...`
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].username} and ${typingUsers[1].username} are typing...`
    } else {
      return `${typingUsers[0].username} and ${typingUsers.length - 1} others are typing...`
    }
  }

  return (
    <div className="px-4 py-1 text-xs text-muted-foreground italic">
      {getTypingMessage()}
    </div>
  )
}

