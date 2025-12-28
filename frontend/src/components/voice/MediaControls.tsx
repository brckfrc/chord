import { cn } from "@/lib/utils"
import { Mic, MicOff, Video, VideoOff, PhoneOff, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MediaControlsProps {
  isMicrophoneEnabled: boolean
  isCameraEnabled: boolean
  onToggleMicrophone: () => void
  onToggleCamera: () => void
  onDisconnect: () => void
}

export function MediaControls({
  isMicrophoneEnabled,
  isCameraEnabled,
  onToggleMicrophone,
  onToggleCamera,
  onDisconnect,
}: MediaControlsProps) {
  return (
    <div className="flex items-center justify-center gap-2 p-3 bg-[#232428] border-t border-border">
      {/* Microphone toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleMicrophone}
        className={cn(
          "w-10 h-10 rounded-full transition-colors",
          isMicrophoneEnabled
            ? "bg-[#36393f] hover:bg-[#3f4248] text-foreground"
            : "bg-red-500 hover:bg-red-600 text-white"
        )}
        title={isMicrophoneEnabled ? "Mute" : "Unmute"}
      >
        {isMicrophoneEnabled ? (
          <Mic className="w-5 h-5" />
        ) : (
          <MicOff className="w-5 h-5" />
        )}
      </Button>

      {/* Camera toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleCamera}
        className={cn(
          "w-10 h-10 rounded-full transition-colors",
          isCameraEnabled
            ? "bg-[#36393f] hover:bg-[#3f4248] text-foreground"
            : "bg-[#36393f] hover:bg-[#3f4248] text-muted-foreground"
        )}
        title={isCameraEnabled ? "Turn off camera" : "Turn on camera"}
      >
        {isCameraEnabled ? (
          <Video className="w-5 h-5" />
        ) : (
          <VideoOff className="w-5 h-5" />
        )}
      </Button>

      {/* Settings (placeholder) */}
      <Button
        variant="ghost"
        size="icon"
        className="w-10 h-10 rounded-full bg-[#36393f] hover:bg-[#3f4248] text-muted-foreground"
        title="Voice Settings"
      >
        <Settings className="w-5 h-5" />
      </Button>

      {/* Disconnect */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onDisconnect}
        className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 text-white"
        title="Disconnect"
      >
        <PhoneOff className="w-5 h-5" />
      </Button>
    </div>
  )
}



