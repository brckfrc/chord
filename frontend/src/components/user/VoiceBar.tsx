import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setActiveVoiceChannel, removeVoiceChannelUser } from "@/store/slices/channelsSlice"
import { leaveVoiceChannel } from "@/store/slices/voiceSlice"
import { useSignalR } from "@/hooks/useSignalR"
import { useLiveKit } from "@/hooks/useLiveKit"
import { Button } from "@/components/ui/button"
import { PhoneOff, Signal, Wifi, WifiOff, Mic, MicOff, Video, VideoOff } from "lucide-react"
import { cn } from "@/lib/utils"

export function VoiceBar() {
  const dispatch = useAppDispatch()
  const { activeVoiceChannelId, channels } = useAppSelector((state) => state.channels)
  const { user: currentUser } = useAppSelector((state) => state.auth)
  const { connectionState, speakingParticipants } = useAppSelector((state) => state.voice)

  // SignalR connection for ChatHub
  const { invoke: chatInvoke, isConnected: isChatConnected } = useSignalR("/hubs/chat")
  
  // LiveKit connection
  const { 
    disconnect: liveKitDisconnect, 
    isMicrophoneEnabled, 
    isCameraEnabled,
    toggleMicrophone,
    toggleCamera,
    isSpeaking 
  } = useLiveKit()

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
      // Disconnect from LiveKit
      await liveKitDisconnect()
      
      // Call SignalR LeaveVoiceChannel
      if (isChatConnected) {
        await chatInvoke("LeaveVoiceChannel", activeVoiceChannelId)
      }
    } catch (error) {
      console.error("Failed to leave voice channel:", error)
    } finally {
      // Update Redux state
      dispatch(setActiveVoiceChannel(null))
      dispatch(leaveVoiceChannel())
      dispatch(
        removeVoiceChannelUser({
          channelId: activeVoiceChannelId,
          userId: currentUser.id,
        })
      )
    }
  }

  // Get connection status text
  const getConnectionStatusText = () => {
    switch (connectionState) {
      case "connected":
        return "Voice Connected"
      case "connecting":
        return "Connecting..."
      case "reconnecting":
        return "Reconnecting..."
      default:
        return "Disconnected"
    }
  }

  const getConnectionIcon = () => {
    if (connectionState === "connected") {
      return <Signal className={cn("h-4 w-4", isSpeaking ? "text-green-500 animate-pulse" : "text-green-500")} />
    } else if (connectionState === "connecting" || connectionState === "reconnecting") {
      return <Wifi className="h-4 w-4 text-yellow-500 animate-pulse" />
    } else {
      return <WifiOff className="h-4 w-4 text-red-500" />
    }
  }

  return (
    <div className={cn(
      "bg-[#2f3136] border-t border-border flex items-center justify-between px-3 py-2",
      isSpeaking && "bg-green-500/10"
    )}>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Connection Status Icon */}
        <div className="flex-shrink-0">{getConnectionIcon()}</div>

        {/* Channel Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{activeVoiceChannel.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {getConnectionStatusText()}
          </p>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-1">
        {/* Microphone Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8",
            !isMicrophoneEnabled && "text-destructive hover:text-destructive"
          )}
          onClick={toggleMicrophone}
          title={isMicrophoneEnabled ? "Mute" : "Unmute"}
        >
          {isMicrophoneEnabled ? (
            <Mic className="h-4 w-4" />
          ) : (
            <MicOff className="h-4 w-4" />
          )}
        </Button>

        {/* Camera Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8",
            isCameraEnabled && "text-green-500"
          )}
          onClick={toggleCamera}
          title={isCameraEnabled ? "Turn off camera" : "Turn on camera"}
        >
          {isCameraEnabled ? (
            <Video className="h-4 w-4" />
          ) : (
            <VideoOff className="h-4 w-4" />
          )}
        </Button>

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
    </div>
  )
}

