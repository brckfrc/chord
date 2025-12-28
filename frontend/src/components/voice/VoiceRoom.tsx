import { useEffect, useState, useRef } from "react"
import { useAppSelector, useAppDispatch } from "@/store/hooks"
import { useLiveKit } from "@/hooks/useLiveKit"
import { setVoiceError } from "@/store/slices/voiceSlice"
import { ParticipantTile } from "./ParticipantTile"
import { MediaControls } from "./MediaControls"
import { AudioRenderer } from "./AudioRenderer"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle, Mic, RefreshCw } from "lucide-react"

export function VoiceRoom() {
  const dispatch = useAppDispatch()
  const { currentChannelId, connectionState, liveKitToken, error } = useAppSelector((state) => state.voice)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const maxRetries = 3
  const isMountedRef = useRef(false)
  const hasAttemptedConnectRef = useRef(false)
  
  const {
    connect,
    disconnect,
    localParticipant,
    remoteParticipants,
    isMicrophoneEnabled,
    isCameraEnabled,
    toggleMicrophone,
    toggleCamera,
    isSpeaking,
  } = useLiveKit()

  // Track mount status to handle React Strict Mode double-invoke
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Reset connection attempt state when token changes (new join attempt)
  useEffect(() => {
    if (liveKitToken) {
      hasAttemptedConnectRef.current = false
      setRetryCount(0)
    }
  }, [liveKitToken])

  // Check microphone permission
  useEffect(() => {
    const checkPermission = async () => {
      try {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
        if (result.state === 'denied') {
          setPermissionDenied(true)
          dispatch(setVoiceError('Microphone permission denied'))
        }
        result.onchange = () => {
          setPermissionDenied(result.state === 'denied')
        }
      } catch {
        // Permission API not supported, we'll handle it when trying to connect
      }
    }
    checkPermission()
  }, [dispatch])

  // Auto-connect when token is available
  useEffect(() => {
    if (liveKitToken && connectionState === "connecting" && !permissionDenied && !hasAttemptedConnectRef.current) {
      hasAttemptedConnectRef.current = true
      connect().catch((err) => {
        console.error('Failed to connect:', err)
        if (err.message?.includes('Permission denied') || err.message?.includes('NotAllowedError')) {
          setPermissionDenied(true)
        }
        // Reset so retry can work
        hasAttemptedConnectRef.current = false
      })
    }
  }, [liveKitToken, connectionState, connect, permissionDenied])

  // Auto-retry on disconnect (up to maxRetries)
  useEffect(() => {
    // Only retry if we actually attempted to connect before
    if (connectionState === "disconnected" && liveKitToken && retryCount < maxRetries && !permissionDenied && hasAttemptedConnectRef.current) {
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          setRetryCount((prev) => prev + 1)
          hasAttemptedConnectRef.current = false // Reset so connect can attempt again
          connect()
        }
      }, 2000 * (retryCount + 1)) // Exponential backoff
      return () => clearTimeout(timer)
    }
  }, [connectionState, liveKitToken, retryCount, connect, permissionDenied])

  // Reset retry count on successful connection
  useEffect(() => {
    if (connectionState === "connected") {
      setRetryCount(0)
    }
  }, [connectionState])

  // Note: Cleanup is handled by useLiveKit hook - no need to duplicate here

  // Handle manual retry
  const handleRetry = () => {
    setRetryCount(0)
    setPermissionDenied(false)
    hasAttemptedConnectRef.current = false
    dispatch(setVoiceError(null))
    connect()
  }

  // Request microphone permission
  const handleRequestPermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      setPermissionDenied(false)
      hasAttemptedConnectRef.current = false
      dispatch(setVoiceError(null))
      connect()
    } catch (err) {
      console.error('Failed to get microphone permission:', err)
      setPermissionDenied(true)
    }
  }

  if (!currentChannelId) {
    return null
  }

  // Permission denied state
  if (permissionDenied) {
    return (
      <div className="flex flex-col items-center justify-center p-4 bg-[#2b2d31] rounded-lg space-y-3">
        <div className="p-3 rounded-full bg-red-500/20">
          <Mic className="w-6 h-6 text-red-500" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Microphone Access Required</p>
          <p className="text-xs text-muted-foreground mt-1">
            Please allow microphone access to join voice channels
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRequestPermission}
          className="mt-2"
        >
          <Mic className="w-4 h-4 mr-2" />
          Allow Microphone
        </Button>
      </div>
    )
  }

  // Error state
  if (error && connectionState !== "connecting") {
    return (
      <div className="flex flex-col items-center justify-center p-4 bg-[#2b2d31] rounded-lg space-y-3">
        <div className="p-3 rounded-full bg-red-500/20">
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Connection Error</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRetry}
          className="mt-2"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  if (connectionState === "connecting") {
    return (
      <div className="flex items-center justify-center p-4 bg-[#2b2d31] rounded-lg">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mr-2" />
        <span className="text-sm text-muted-foreground">
          Connecting to voice...
          {retryCount > 0 && ` (retry ${retryCount}/${maxRetries})`}
        </span>
      </div>
    )
  }

  if (connectionState === "reconnecting") {
    return (
      <div className="flex items-center justify-center p-4 bg-[#2b2d31] rounded-lg">
        <Loader2 className="w-5 h-5 animate-spin text-yellow-500 mr-2" />
        <span className="text-sm text-yellow-500">Reconnecting...</span>
      </div>
    )
  }

  if (connectionState !== "connected") {
    return null
  }

  return (
    <div className="flex flex-col bg-[#2b2d31] rounded-lg overflow-hidden">
      {/* Participants Grid */}
      <div className="flex-1 p-3 space-y-2">
        {/* Local Participant */}
        {localParticipant && (
          <ParticipantTile
            identity={localParticipant.identity}
            name={localParticipant.name || "You"}
            isSpeaking={isSpeaking}
            isMuted={!isMicrophoneEnabled}
            isVideoEnabled={isCameraEnabled}
            isLocal
          />
        )}

        {/* Remote Participants */}
        {remoteParticipants.map((participant) => (
          <div key={participant.identity}>
            <ParticipantTile
              identity={participant.identity}
              name={participant.name || participant.identity}
              isSpeaking={participant.isSpeaking}
              isMuted={!participant.isMicrophoneEnabled}
              isVideoEnabled={participant.isCameraEnabled}
            />
            {/* Audio renderer for each remote participant */}
            <AudioRenderer participant={participant} />
          </div>
        ))}

        {remoteParticipants.length === 0 && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Waiting for others to join...
          </div>
        )}
      </div>

      {/* Media Controls */}
      <MediaControls
        isMicrophoneEnabled={isMicrophoneEnabled}
        isCameraEnabled={isCameraEnabled}
        onToggleMicrophone={toggleMicrophone}
        onToggleCamera={toggleCamera}
        onDisconnect={disconnect}
      />
    </div>
  )
}

