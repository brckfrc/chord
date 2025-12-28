import { cn } from "@/lib/utils"
import { Mic, MicOff, Video, VideoOff, User } from "lucide-react"

interface ParticipantTileProps {
  identity: string
  name: string
  isSpeaking: boolean
  isMuted: boolean
  isVideoEnabled: boolean
  isLocal?: boolean
  avatarUrl?: string
}

export function ParticipantTile({
  name,
  isSpeaking,
  isMuted,
  isVideoEnabled,
  isLocal = false,
  avatarUrl,
}: ParticipantTileProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-2 rounded-lg transition-all",
        isSpeaking && "bg-green-500/10 ring-2 ring-green-500/50"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "relative w-10 h-10 rounded-full bg-[#36393f] flex items-center justify-center overflow-hidden",
          isSpeaking && "ring-2 ring-green-500"
        )}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <User className="w-5 h-5 text-muted-foreground" />
        )}

        {/* Speaking indicator animation */}
        {isSpeaking && (
          <div className="absolute inset-0 rounded-full animate-pulse bg-green-500/20" />
        )}
      </div>

      {/* Name and status */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-foreground truncate">
            {name}
            {isLocal && (
              <span className="text-xs text-muted-foreground ml-1">(you)</span>
            )}
          </span>
        </div>
        {isSpeaking && (
          <span className="text-xs text-green-500">Speaking</span>
        )}
      </div>

      {/* Status icons */}
      <div className="flex items-center gap-1">
        {isMuted ? (
          <div className="p-1 rounded bg-red-500/20">
            <MicOff className="w-4 h-4 text-red-500" />
          </div>
        ) : (
          <div className="p-1 rounded bg-[#36393f]">
            <Mic className="w-4 h-4 text-muted-foreground" />
          </div>
        )}

        {isVideoEnabled ? (
          <div className="p-1 rounded bg-[#36393f]">
            <Video className="w-4 h-4 text-muted-foreground" />
          </div>
        ) : (
          <div className="p-1 rounded bg-red-500/20">
            <VideoOff className="w-4 h-4 text-red-500" />
          </div>
        )}
      </div>
    </div>
  )
}


