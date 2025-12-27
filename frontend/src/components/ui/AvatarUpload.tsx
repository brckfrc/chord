import { useState, useRef } from "react"
import { Camera, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface AvatarUploadProps {
  currentImageUrl?: string | null
  fallback: string
  onUpload: (file: File) => Promise<string>
  size?: "sm" | "md" | "lg"
  disabled?: boolean
  className?: string
}

const sizeClasses = {
  sm: "w-12 h-12 text-lg",
  md: "w-20 h-20 text-2xl",
  lg: "w-24 h-24 text-3xl",
}

const iconSizes = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
}

export function AvatarUpload({
  currentImageUrl,
  fallback,
  onUpload,
  size = "lg",
  disabled = false,
  className,
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const displayUrl = previewUrl || currentImageUrl

  const handleClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click()
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file")
      return
    }

    // Validate file size (8MB)
    if (file.size > 8 * 1024 * 1024) {
      setError("Image must be less than 8MB")
      return
    }

    setError(null)

    // Create preview
    const reader = new FileReader()
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Upload
    setIsUploading(true)
    try {
      await onUpload(file)
    } catch (err) {
      setError("Upload failed. Please try again.")
      setPreviewUrl(null)
    } finally {
      setIsUploading(false)
      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const clearError = () => setError(null)

  return (
    <div className={cn("relative inline-block", className)}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isUploading}
        className={cn(
          "relative rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold overflow-hidden group transition-all",
          sizeClasses[size],
          !disabled && !isUploading && "cursor-pointer",
          (disabled || isUploading) && "opacity-70 cursor-not-allowed"
        )}
      >
        {displayUrl ? (
          <img
            src={displayUrl}
            alt="Avatar"
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{fallback.charAt(0).toUpperCase()}</span>
        )}

        {/* Overlay */}
        {!disabled && (
          <div
            className={cn(
              "absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity",
              isUploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
          >
            {isUploading ? (
              <Loader2 className={cn("animate-spin text-white", iconSizes[size])} />
            ) : (
              <Camera className={cn("text-white", iconSizes[size])} />
            )}
          </div>
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Error tooltip */}
      {error && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded flex items-center gap-1">
          {error}
          <button onClick={clearError} className="hover:opacity-70">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}


