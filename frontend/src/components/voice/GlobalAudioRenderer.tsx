import { useAppSelector } from "@/store/hooks"
import { useLiveKit } from "@/hooks/useLiveKit"
import { AudioRenderer } from "./AudioRenderer"

/**
 * Global audio renderer component that renders audio for all remote participants
 * when user is connected to a voice channel. This component is mounted at App.tsx
 * level so audio continues to work even when viewing text channels (Discord-style).
 */
export function GlobalAudioRenderer() {
  const { activeVoiceChannelId } = useAppSelector((state) => state.channels)
  const { connectionState, remoteParticipants } = useLiveKit()

  // Only render when connected to a voice channel
  if (!activeVoiceChannelId || connectionState !== "connected") {
    return null
  }

  // Render AudioRenderer for each remote participant
  return (
    <>
      {remoteParticipants.map((participant) => (
        <AudioRenderer key={participant.identity} participant={participant} />
      ))}
    </>
  )
}
