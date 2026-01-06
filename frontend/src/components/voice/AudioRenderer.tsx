import { useEffect, useRef } from "react"
import { RemoteParticipant, Track, RemoteTrackPublication } from "livekit-client"

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
    if (!audioElement) {
      console.warn("[AudioRenderer] Audio element not found!")
      return
    }

    // Map to store cleanup handlers for publication event listeners
    const publicationCleanupHandlers = new Map<
      RemoteTrackPublication,
      { handleSubscribed: () => void; handleUnsubscribed: () => void }
    >()

    // Helper function to attach audio track
    const attachAudioTrack = (publication: RemoteTrackPublication) => {
      if (!publication.track || publication.track.kind !== Track.Kind.Audio) {
        console.warn("[AudioRenderer] Invalid publication:", {
          hasTrack: !!publication.track,
          kind: publication.track?.kind,
          trackSid: publication.trackSid
        })
        return
      }

      // Check if track is actually subscribed
      if (!publication.isSubscribed) {
        console.warn("[AudioRenderer] Track not subscribed yet:", {
          trackSid: publication.trackSid,
          participantIdentity: participant.identity,
          isSubscribed: publication.isSubscribed
        })
        return
      }

      try {
        const mediaStream = new MediaStream([publication.track.mediaStreamTrack])
        audioElement.srcObject = mediaStream
        audioElement.play().catch((err) => {
          // AbortError is normal when a new track loads - don't log it
          if (err.name !== "AbortError") {
            console.error("[AudioRenderer] Failed to play audio:", err, {
              trackSid: publication.trackSid,
              participantIdentity: participant.identity,
              errorName: err.name,
              errorMessage: err.message
            })
          }
        })
      } catch (err) {
        console.error("[AudioRenderer] Failed to attach audio track:", err, {
          trackSid: publication.trackSid,
          participantIdentity: participant.identity
        })
      }
    }

    // Check for existing audio track on mount - check ALL publications
    participant.audioTrackPublications.forEach((pub) => {
      if (pub.track && pub.track.kind === Track.Kind.Audio && pub.isSubscribed) {
        attachAudioTrack(pub)
      }
    })

    // Subscribe to track changes
    const handleTrackSubscribed = (_track: Track, publication: RemoteTrackPublication) => {
      if (publication.kind === Track.Kind.Audio && publication.isSubscribed) {
        attachAudioTrack(publication)
      }
    }

    const handleTrackUnsubscribed = (_track: Track) => {
      if (audioElement) {
        audioElement.srcObject = null
      }
    }

    // Also listen for track published event (when remote participant publishes a track)
    const handleTrackPublished = (publication: RemoteTrackPublication) => {
      // Track might be auto-subscribed, check immediately
      if (publication.kind === Track.Kind.Audio && publication.track && publication.isSubscribed) {
        attachAudioTrack(publication)
      }
      // Listen for subscription changes on the publication itself
      if (publication.kind === Track.Kind.Audio) {
        const handleSubscribed = () => {
          if (publication.track) {
            attachAudioTrack(publication)
          }
        }
        const handleUnsubscribed = () => {
          if (audioElement) {
            audioElement.srcObject = null
          }
        }
        publication.on("subscribed", handleSubscribed)
        publication.on("unsubscribed", handleUnsubscribed)
        // Store cleanup handlers
        publicationCleanupHandlers.set(publication, { handleSubscribed, handleUnsubscribed })
      }
    }

    participant.on("trackSubscribed", handleTrackSubscribed)
    participant.on("trackUnsubscribed", handleTrackUnsubscribed)
    participant.on("trackPublished", handleTrackPublished)

    return () => {
      participant.off("trackSubscribed", handleTrackSubscribed)
      participant.off("trackUnsubscribed", handleTrackUnsubscribed)
      participant.off("trackPublished", handleTrackPublished)
      // Clean up publication event listeners
      publicationCleanupHandlers.forEach((handlers, pub) => {
        pub.off("subscribed", handlers.handleSubscribed)
        pub.off("unsubscribed", handlers.handleUnsubscribed)
      })
      publicationCleanupHandlers.clear()
      if (audioElement) {
        audioElement.srcObject = null
      }
    }
  }, [participant])

  return <audio ref={audioRef} autoPlay playsInline className="hidden" />
}



