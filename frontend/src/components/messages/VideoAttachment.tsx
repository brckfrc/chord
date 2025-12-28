import { useState, useRef } from "react"
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react"
import { cn } from "@/lib/utils"
import { fileValidation } from "@/lib/api/upload"
import type { AttachmentDto } from "@/lib/api/upload"

interface VideoAttachmentProps {
  attachment: AttachmentDto
  className?: string
}

export function VideoAttachment({ attachment, className }: VideoAttachmentProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(attachment.duration || 0)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const togglePlay = () => {
    if (!videoRef.current) return

    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    videoRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
      setIsLoading(false)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen()
      }
    }
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div
      className={cn(
        "relative group rounded-lg overflow-hidden max-w-lg bg-black",
        className
      )}
    >
      {/* Loading skeleton */}
      {isLoading && (
        <div className="absolute inset-0 bg-[#2b2d31] animate-pulse flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-[#3f4147]" />
        </div>
      )}

      {/* Error state */}
      {hasError ? (
        <div className="flex items-center justify-center bg-[#2b2d31] text-muted-foreground p-8 rounded-lg">
          <span className="text-sm">Failed to load video</span>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            src={attachment.url}
            className="max-w-full max-h-80 object-contain"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onError={() => setHasError(true)}
            onClick={togglePlay}
          />

          {/* Play button overlay (when paused) */}
          {!isPlaying && !isLoading && (
            <div
              className="absolute inset-0 flex items-center justify-center cursor-pointer"
              onClick={togglePlay}
            >
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors">
                <Play className="w-8 h-8 text-white ml-1" fill="white" />
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Progress bar */}
            <div className="mb-2">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
              />
            </div>

            {/* Control buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="text-white hover:text-white/80 transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" fill="white" />
                ) : (
                  <Play className="w-5 h-5" fill="white" />
                )}
              </button>

              <button
                onClick={toggleMute}
                className="text-white hover:text-white/80 transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>

              <span className="text-white text-xs">
                {formatDuration(currentTime)} / {formatDuration(duration)}
              </span>

              <div className="flex-1" />

              <button
                onClick={handleFullscreen}
                className="text-white hover:text-white/80 transition-colors"
              >
                <Maximize className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Duration badge (when not playing) */}
          {!isPlaying && duration > 0 && (
            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded text-white text-xs">
              {formatDuration(duration)}
            </div>
          )}

          {/* File size */}
          <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 rounded text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
            {fileValidation.formatFileSize(attachment.size)}
          </div>
        </>
      )}
    </div>
  )
}



