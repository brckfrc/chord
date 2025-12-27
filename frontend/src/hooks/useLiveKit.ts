import { useState, useEffect, useCallback, useRef } from "react"
import {
  Room,
  RoomEvent,
  ConnectionState,
  LocalParticipant,
  RemoteParticipant,
  Track,
  LocalTrack,
  createLocalAudioTrack,
  createLocalVideoTrack,
} from "livekit-client"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  setConnectionState,
  setParticipants,
  participantStartedSpeaking,
  participantStoppedSpeaking,
  setVoiceError,
  leaveVoiceChannel,
  type LiveKitParticipant,
  type VoiceConnectionState,
} from "@/store/slices/voiceSlice"

interface UseLiveKitReturn {
  room: Room | null
  connectionState: VoiceConnectionState
  localParticipant: LocalParticipant | null
  remoteParticipants: RemoteParticipant[]
  isSpeaking: boolean
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  toggleMicrophone: () => Promise<void>
  toggleCamera: () => Promise<void>
  isMicrophoneEnabled: boolean
  isCameraEnabled: boolean
}

export function useLiveKit(): UseLiveKitReturn {
  const dispatch = useAppDispatch()
  const { liveKitToken, liveKitUrl, connectionState } = useAppSelector((state) => state.voice)

  const [room, setRoom] = useState<Room | null>(null)
  const [localParticipant, setLocalParticipant] = useState<LocalParticipant | null>(null)
  const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([])
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isMicrophoneEnabled, setIsMicrophoneEnabled] = useState(false)
  const [isCameraEnabled, setIsCameraEnabled] = useState(false)

  const roomRef = useRef<Room | null>(null)
  const isConnectedRef = useRef(false)
  const isConnectingRef = useRef(false)

  // Map ConnectionState to our VoiceConnectionState
  const mapConnectionState = (state: ConnectionState): VoiceConnectionState => {
    switch (state) {
      case ConnectionState.Connected:
        return "connected"
      case ConnectionState.Connecting:
        return "connecting"
      case ConnectionState.Reconnecting:
        return "reconnecting"
      default:
        return "disconnected"
    }
  }

  // Update participants list
  const updateParticipants = useCallback(() => {
    if (!roomRef.current) return

    const participants: LiveKitParticipant[] = []
    roomRef.current.remoteParticipants.forEach((participant) => {
      participants.push({
        identity: participant.identity,
        name: participant.name || participant.identity,
        isSpeaking: participant.isSpeaking,
        isMuted: !participant.isMicrophoneEnabled,
        isVideoEnabled: participant.isCameraEnabled,
        connectionQuality:
          participant.connectionQuality === 3
            ? "excellent"
            : participant.connectionQuality === 2
              ? "good"
              : participant.connectionQuality === 1
                ? "poor"
                : "unknown",
      })
    })

    setRemoteParticipants(Array.from(roomRef.current.remoteParticipants.values()))
    dispatch(setParticipants(participants))
  }, [dispatch])

  // Connect to LiveKit room
  const connect = useCallback(async () => {
    if (!liveKitToken || !liveKitUrl) {
      dispatch(setVoiceError("No LiveKit token or URL available"))
      return
    }

    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current) {
      console.log("Already connecting, skipping...")
      return
    }

    try {
      isConnectingRef.current = true
      dispatch(setConnectionState("connecting"))

      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
        // Audio settings for voice chat
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      roomRef.current = newRoom
      setRoom(newRoom)

      // Set up event listeners
      newRoom.on(RoomEvent.ConnectionStateChanged, (state) => {
        dispatch(setConnectionState(mapConnectionState(state)))
      })

      newRoom.on(RoomEvent.ParticipantConnected, () => {
        updateParticipants()
      })

      newRoom.on(RoomEvent.ParticipantDisconnected, () => {
        updateParticipants()
      })

      newRoom.on(RoomEvent.TrackSubscribed, () => {
        updateParticipants()
      })

      newRoom.on(RoomEvent.TrackUnsubscribed, () => {
        updateParticipants()
      })

      newRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        speakers.forEach((speaker) => {
          dispatch(participantStartedSpeaking(speaker.identity))
        })
      })

      newRoom.on(RoomEvent.LocalTrackPublished, () => {
        setIsMicrophoneEnabled(newRoom.localParticipant.isMicrophoneEnabled)
        setIsCameraEnabled(newRoom.localParticipant.isCameraEnabled)
      })

      newRoom.on(RoomEvent.LocalTrackUnpublished, () => {
        setIsMicrophoneEnabled(newRoom.localParticipant.isMicrophoneEnabled)
        setIsCameraEnabled(newRoom.localParticipant.isCameraEnabled)
      })

      newRoom.on(RoomEvent.IsSpeakingChanged, (speaking) => {
        setIsSpeaking(speaking)
      })

      newRoom.on(RoomEvent.Disconnected, () => {
        dispatch(setConnectionState("disconnected"))
      })

      // Connect to the room
      await newRoom.connect(liveKitUrl, liveKitToken)

      isConnectedRef.current = true
      isConnectingRef.current = false
      setLocalParticipant(newRoom.localParticipant)
      dispatch(setConnectionState("connected"))

      // Enable microphone by default
      try {
        const audioTrack = await createLocalAudioTrack()
        await newRoom.localParticipant.publishTrack(audioTrack)
        setIsMicrophoneEnabled(true)
      } catch (err) {
        console.error("Failed to enable microphone:", err)
        dispatch(setVoiceError("Microphone access denied"))
      }

      updateParticipants()
    } catch (error) {
      console.error("Failed to connect to LiveKit:", error)
      isConnectingRef.current = false
      isConnectedRef.current = false
      dispatch(setVoiceError(error instanceof Error ? error.message : "Failed to connect"))
      dispatch(setConnectionState("disconnected"))
    }
  }, [liveKitToken, liveKitUrl, dispatch, updateParticipants])

  // Disconnect from room
  const disconnect = useCallback(async () => {
    isConnectedRef.current = false
    isConnectingRef.current = false
    if (roomRef.current) {
      await roomRef.current.disconnect()
      roomRef.current = null
      setRoom(null)
      setLocalParticipant(null)
      setRemoteParticipants([])
      setIsSpeaking(false)
      setIsMicrophoneEnabled(false)
      setIsCameraEnabled(false)
    }
    dispatch(leaveVoiceChannel())
  }, [dispatch])

  // Toggle microphone
  const toggleMicrophone = useCallback(async () => {
    if (!roomRef.current?.localParticipant) return

    const participant = roomRef.current.localParticipant
    const enabled = participant.isMicrophoneEnabled

    if (enabled) {
      // Disable microphone
      participant.audioTrackPublications.forEach((publication) => {
        if (publication.track) {
          publication.track.stop()
          participant.unpublishTrack(publication.track as LocalTrack)
        }
      })
      setIsMicrophoneEnabled(false)
    } else {
      // Enable microphone
      try {
        const audioTrack = await createLocalAudioTrack()
        await participant.publishTrack(audioTrack)
        setIsMicrophoneEnabled(true)
      } catch (err) {
        console.error("Failed to enable microphone:", err)
        dispatch(setVoiceError("Failed to enable microphone"))
      }
    }
  }, [dispatch])

  // Toggle camera
  const toggleCamera = useCallback(async () => {
    if (!roomRef.current?.localParticipant) return

    const participant = roomRef.current.localParticipant
    const enabled = participant.isCameraEnabled

    if (enabled) {
      // Disable camera
      participant.videoTrackPublications.forEach((publication) => {
        if (publication.track && publication.track.source === Track.Source.Camera) {
          publication.track.stop()
          participant.unpublishTrack(publication.track as LocalTrack)
        }
      })
      setIsCameraEnabled(false)
    } else {
      // Enable camera
      try {
        const videoTrack = await createLocalVideoTrack()
        await participant.publishTrack(videoTrack)
        setIsCameraEnabled(true)
      } catch (err) {
        console.error("Failed to enable camera:", err)
        dispatch(setVoiceError("Failed to enable camera"))
      }
    }
  }, [dispatch])

  // Cleanup on unmount - only disconnect if truly connected
  useEffect(() => {
    return () => {
      if (isConnectedRef.current && roomRef.current) {
        isConnectedRef.current = false
        isConnectingRef.current = false
        roomRef.current.disconnect()
      }
    }
  }, [])

  return {
    room,
    connectionState,
    localParticipant,
    remoteParticipants,
    isSpeaking,
    connect,
    disconnect,
    toggleMicrophone,
    toggleCamera,
    isMicrophoneEnabled,
    isCameraEnabled,
  }
}

