import { useEffect, useRef } from "react"
import { RemoteParticipant, LocalParticipant, Track } from "livekit-client"
import { cn } from "@/lib/utils"

interface VideoRendererProps {
  participant: RemoteParticipant | LocalParticipant
  className?: string
}

/**
 * Component that renders video from a participant
 */
export function VideoRenderer({ participant, className }: VideoRendererProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement) return

    // Find video track
    const videoPublication = Array.from(participant.videoTrackPublications.values()).find(
      (pub) => pub.track && pub.track.source === Track.Source.Camera
    )

    if (videoPublication?.track) {
      const mediaStream = new MediaStream([videoPublication.track.mediaStreamTrack])
      videoElement.srcObject = mediaStream
      videoElement.play().catch(console.error)
    }

    // Subscribe to track changes
    const handleTrackSubscribed = () => {
      const pub = Array.from(participant.videoTrackPublications.values()).find(
        (pub) => pub.track && pub.track.source === Track.Source.Camera
      )
      if (pub?.track && videoElement) {
        const mediaStream = new MediaStream([pub.track.mediaStreamTrack])
        videoElement.srcObject = mediaStream
        videoElement.play().catch(console.error)
      }
    }

    const handleTrackUnsubscribed = () => {
      if (videoElement) {
        videoElement.srcObject = null
      }
    }

    participant.on("trackSubscribed", handleTrackSubscribed)
    participant.on("trackUnsubscribed", handleTrackUnsubscribed)

    return () => {
      participant.off("trackSubscribed", handleTrackSubscribed)
      participant.off("trackUnsubscribed", handleTrackUnsubscribed)
      if (videoElement) {
        videoElement.srcObject = null
      }
    }
  }, [participant])

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={participant instanceof LocalParticipant} // Mute local video to prevent echo
      className={cn("w-full h-full object-cover rounded-lg bg-black", className)}
    />
  )
}

