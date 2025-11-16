import { useEffect } from "react"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setActiveVoiceChannel, removeVoiceChannelUser } from "@/store/slices/channelsSlice"
import { useSignalR } from "@/hooks/useSignalR"
import { Button } from "@/components/ui/button"
import { PhoneOff, Signal, Wifi, WifiOff } from "lucide-react"
import { cn } from "@/lib/utils"

export function VoiceBar() {
  const dispatch = useAppDispatch()
  const { activeVoiceChannelId, channels } = useAppSelector((state) => state.channels)
  const { user: currentUser } = useAppSelector((state) => state.auth)

  // SignalR connection for ChatHub
  const { invoke: chatInvoke, isConnected: isChatConnected } = useSignalR("/hubs/chat")

  // Don't show if not in a voice channel
  if (!activeVoiceChannelId) {
    return null
  }

  // Find the active voice channel
  const activeVoiceChannel = channels.find(
    (channel) => channel.id === activeVoiceChannelId
  )

  if (!activeVoiceChannel) {
    return null
  }

  const handleDisconnect = async () => {
    if (!currentUser) return

    try {
      // Call SignalR LeaveVoiceChannel
      if (isChatConnected) {
        await chatInvoke("LeaveVoiceChannel", activeVoiceChannelId)
      }
    } catch (error) {
      console.error("Failed to leave voice channel via SignalR:", error)
    } finally {
      // Update Redux state
      dispatch(setActiveVoiceChannel(null))
      dispatch(
        removeVoiceChannelUser({
          channelId: activeVoiceChannelId,
          userId: currentUser.id,
        })
      )
    }
  }

  // Connection status (mock for now, will be real when SignalR is implemented)
  const connectionStatus = "connected" // connected, connecting, disconnected
  const connectionQuality = "good" // good, medium, poor

  const getConnectionIcon = () => {
    if (connectionStatus === "connected") {
      if (connectionQuality === "good") {
        return <Signal className="h-4 w-4 text-green-500" />
      } else if (connectionQuality === "medium") {
        return <Wifi className="h-4 w-4 text-yellow-500" />
      } else {
        return <WifiOff className="h-4 w-4 text-red-500" />
      }
    } else if (connectionStatus === "connecting") {
      return <Wifi className="h-4 w-4 text-yellow-500 animate-pulse" />
    } else {
      return <WifiOff className="h-4 w-4 text-red-500" />
    }
  }

  return (
    <div className="h-12 bg-[#2f3136] border-t border-border flex items-center justify-between px-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Connection Status Icon */}
        <div className="flex-shrink-0">{getConnectionIcon()}</div>

        {/* Channel Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{activeVoiceChannel.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {connectionStatus === "connected"
              ? connectionQuality === "good"
                ? "Connected"
                : connectionQuality === "medium"
                ? "Connecting..."
                : "Poor connection"
              : connectionStatus === "connecting"
              ? "Connecting..."
              : "Disconnected"}
          </p>
        </div>
      </div>

      {/* Disconnect Button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={handleDisconnect}
        title="Disconnect"
      >
        <PhoneOff className="h-4 w-4" />
      </Button>
    </div>
  )
}

