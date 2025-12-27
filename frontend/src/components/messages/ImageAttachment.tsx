import { useState } from "react"
import { X, ZoomIn } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AttachmentDto } from "@/lib/api/upload"

interface ImageAttachmentProps {
    attachment: AttachmentDto
    className?: string
}

export function ImageAttachment({ attachment, className }: ImageAttachmentProps) {
    const [isLoading, setIsLoading] = useState(true)
    const [hasError, setHasError] = useState(false)
    const [isLightboxOpen, setIsLightboxOpen] = useState(false)

    const handleLoad = () => {
        setIsLoading(false)
    }

    const handleError = () => {
        setIsLoading(false)
        setHasError(true)
    }

    return (
        <>
            {/* Thumbnail */}
            <div
                className={cn(
                    "relative group cursor-pointer rounded-lg overflow-hidden max-w-md",
                    className
                )}
                onClick={() => setIsLightboxOpen(true)}
            >
                {/* Loading skeleton */}
                {isLoading && (
                    <div className="absolute inset-0 bg-[#2b2d31] animate-pulse" />
                )}

                {/* Error state */}
                {hasError ? (
                    <div className="flex items-center justify-center bg-[#2b2d31] text-muted-foreground p-4 rounded-lg">
                        <span className="text-sm">Failed to load image</span>
                    </div>
                ) : (
                    <>
                        <img
                            src={attachment.url}
                            alt={attachment.name}
                            loading="lazy"
                            onLoad={handleLoad}
                            onError={handleError}
                            className={cn(
                                "max-w-full max-h-80 object-contain rounded-lg transition-opacity",
                                isLoading ? "opacity-0" : "opacity-100"
                            )}
                        />

                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ZoomIn className="w-8 h-8 text-white" />
                        </div>
                    </>
                )}
            </div>

            {/* Lightbox */}
            {isLightboxOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                    onClick={() => setIsLightboxOpen(false)}
                >
                    {/* Close button */}
                    <button
                        onClick={() => setIsLightboxOpen(false)}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    >
                        <X className="w-6 h-6 text-white" />
                    </button>

                    {/* Full size image */}
                    <img
                        src={attachment.url}
                        alt={attachment.name}
                        className="max-w-full max-h-full object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />

                    {/* Image info */}
                    <div className="absolute bottom-4 left-4 text-white text-sm">
                        <p className="font-medium">{attachment.name}</p>
                    </div>
                </div>
            )}
        </>
    )
}

