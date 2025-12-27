import { useEffect, useRef } from "react"
import { RemoteParticipant, Track } from "livekit-client"

interface AudioRendererProps {
  participant: RemoteParticipant
}

/**
 * Invisible component that renders audio from a remote participant
 */
export function AudioRenderer({ participant }: AudioRendererProps) {
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const audioElement = audioRef.current
    if (!audioElement) return

    // Find audio track
    const audioPublication = Array.from(participant.audioTrackPublications.values()).find(
      (pub) => pub.track && pub.track.kind === Track.Kind.Audio
    )

    if (audioPublication?.track) {
      const mediaStream = new MediaStream([audioPublication.track.mediaStreamTrack])
      audioElement.srcObject = mediaStream
      audioElement.play().catch(console.error)
    }

    // Subscribe to track changes
    const handleTrackSubscribed = () => {
      const pub = Array.from(participant.audioTrackPublications.values()).find(
        (pub) => pub.track && pub.track.kind === Track.Kind.Audio
      )
      if (pub?.track && audioElement) {
        const mediaStream = new MediaStream([pub.track.mediaStreamTrack])
        audioElement.srcObject = mediaStream
        audioElement.play().catch(console.error)
      }
    }

    const handleTrackUnsubscribed = () => {
      if (audioElement) {
        audioElement.srcObject = null
      }
    }

    participant.on("trackSubscribed", handleTrackSubscribed)
    participant.on("trackUnsubscribed", handleTrackUnsubscribed)

    return () => {
      participant.off("trackSubscribed", handleTrackSubscribed)
      participant.off("trackUnsubscribed", handleTrackUnsubscribed)
      if (audioElement) {
        audioElement.srcObject = null
      }
    }
  }, [participant])

  return <audio ref={audioRef} autoPlay playsInline className="hidden" />
}

