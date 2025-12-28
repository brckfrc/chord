import { useState, useRef, useCallback } from "react"
import { Paperclip, X, Upload, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { uploadApi, fileValidation, type UploadResponseDto, type UploadProgress } from "@/lib/api/upload"
import { Button } from "@/components/ui/button"

interface PendingUpload {
    id: string
    file: File
    progress: number
    status: "pending" | "uploading" | "completed" | "error"
    result?: UploadResponseDto
    error?: string
}

interface FileUploadButtonProps {
    onUploadComplete: (attachment: UploadResponseDto) => void
    onUploadRemove: (url: string) => void
    attachments: UploadResponseDto[]
    disabled?: boolean
    className?: string
}

export function FileUploadButton({
    onUploadComplete,
    onUploadRemove,
    attachments,
    disabled = false,
    className,
}: FileUploadButtonProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([])
    const [isDragOver, setIsDragOver] = useState(false)

    const handleFileSelect = useCallback(
        async (files: FileList | null) => {
            if (!files || files.length === 0) return

            const fileArray = Array.from(files)

            for (const file of fileArray) {
                // Validate file
                const error = fileValidation.getErrorMessage(file)
                if (error) {
                    setPendingUploads((prev) => [
                        ...prev,
                        {
                            id: `${Date.now()}-${Math.random()}`,
                            file,
                            progress: 0,
                            status: "error",
                            error,
                        },
                    ])
                    continue
                }

                // Add to pending uploads
                const uploadId = `${Date.now()}-${Math.random()}`
                setPendingUploads((prev) => [
                    ...prev,
                    {
                        id: uploadId,
                        file,
                        progress: 0,
                        status: "uploading",
                    },
                ])

                try {
                    const result = await uploadApi.uploadFile(file, (progress: UploadProgress) => {
                        setPendingUploads((prev) =>
                            prev.map((u) =>
                                u.id === uploadId ? { ...u, progress: progress.percentage } : u
                            )
                        )
                    })

                    // Update status to completed
                    setPendingUploads((prev) =>
                        prev.map((u) =>
                            u.id === uploadId ? { ...u, status: "completed", result } : u
                        )
                    )

                    // Notify parent
                    onUploadComplete(result)

                    // Remove from pending after a short delay
                    setTimeout(() => {
                        setPendingUploads((prev) => prev.filter((u) => u.id !== uploadId))
                    }, 500)
                } catch (err) {
                    const errorMessage = err instanceof Error ? err.message : "Upload failed"
                    setPendingUploads((prev) =>
                        prev.map((u) =>
                            u.id === uploadId ? { ...u, status: "error", error: errorMessage } : u
                        )
                    )
                }
            }
        },
        [onUploadComplete]
    )

    const handleClick = () => {
        fileInputRef.current?.click()
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFileSelect(e.target.files)
        // Reset input so same file can be selected again
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragOver(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragOver(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragOver(false)
        handleFileSelect(e.dataTransfer.files)
    }

    const removePendingUpload = (id: string) => {
        setPendingUploads((prev) => prev.filter((u) => u.id !== id))
    }

    const getPreviewUrl = (file: File): string | null => {
        if (file.type.startsWith("image/")) {
            return URL.createObjectURL(file)
        }
        return null
    }

    return (
        <div className={cn("relative", className)}>
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={[
                    ...fileValidation.ALLOWED_IMAGE_TYPES,
                    ...fileValidation.ALLOWED_VIDEO_TYPES,
                    ...fileValidation.ALLOWED_DOCUMENT_TYPES,
                ].join(",")}
                onChange={handleInputChange}
                className="hidden"
            />

            {/* Upload button */}
            <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleClick}
                disabled={disabled}
                className="h-[36px] w-[36px] text-muted-foreground hover:text-foreground"
            >
                <Paperclip className="h-5 w-5" />
            </Button>

            {/* Drag overlay - rendered outside for better UX */}
            {isDragOver && (
                <div
                    className="fixed inset-0 z-50 bg-primary/10 backdrop-blur-sm flex items-center justify-center"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <div className="bg-[#2b2d31] border-2 border-dashed border-primary rounded-xl p-8 text-center">
                        <Upload className="w-12 h-12 text-primary mx-auto mb-4" />
                        <p className="text-lg font-medium text-foreground">Drop files here to upload</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Max {fileValidation.formatFileSize(fileValidation.MAX_FILE_SIZE)} per file
                        </p>
                    </div>
                </div>
            )}

            {/* Pending uploads preview */}
            {pendingUploads.length > 0 && (
                <div className="absolute bottom-full left-0 mb-2 bg-[#2b2d31] border border-border rounded-lg p-2 min-w-[200px] max-w-[300px] shadow-lg">
                    {pendingUploads.map((upload) => (
                        <div
                            key={upload.id}
                            className="flex items-center gap-2 p-2 rounded hover:bg-[#32353b]"
                        >
                            {/* Preview or icon */}
                            <div className="w-10 h-10 rounded bg-[#1e1f22] flex items-center justify-center overflow-hidden flex-shrink-0">
                                {upload.file.type.startsWith("image/") ? (
                                    <img
                                        src={getPreviewUrl(upload.file) || ""}
                                        alt=""
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <Paperclip className="w-5 h-5 text-muted-foreground" />
                                )}
                            </div>

                            {/* File info and progress */}
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-foreground truncate">{upload.file.name}</p>

                                {upload.status === "uploading" && (
                                    <div className="mt-1 h-1 bg-[#1e1f22] rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all duration-200"
                                            style={{ width: `${upload.progress}%` }}
                                        />
                                    </div>
                                )}

                                {upload.status === "error" && (
                                    <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                                        <AlertCircle className="w-3 h-3" />
                                        {upload.error}
                                    </p>
                                )}

                                {upload.status === "completed" && (
                                    <p className="text-xs text-green-500 mt-1">Uploaded</p>
                                )}
                            </div>

                            {/* Remove button */}
                            {(upload.status === "error" || upload.status === "completed") && (
                                <button
                                    onClick={() => removePendingUpload(upload.id)}
                                    className="p-1 rounded hover:bg-[#3f4147]"
                                >
                                    <X className="w-4 h-4 text-muted-foreground" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Attachments preview */}
            {attachments.length > 0 && (
                <div className="absolute bottom-full left-0 mb-2 bg-[#2b2d31] border border-border rounded-lg p-2 min-w-[200px] max-w-[400px] shadow-lg">
                    <div className="grid grid-cols-2 gap-2">
                        {attachments.map((attachment) => (
                            <div
                                key={attachment.url}
                                className="relative group rounded overflow-hidden"
                            >
                                {attachment.type === "image" ? (
                                    <img
                                        src={attachment.url}
                                        alt={attachment.name}
                                        className="w-full h-20 object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-20 bg-[#1e1f22] flex items-center justify-center">
                                        <Paperclip className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                )}

                                {/* Remove button */}
                                <button
                                    onClick={() => onUploadRemove(attachment.url)}
                                    className="absolute top-1 right-1 p-1 rounded-full bg-black/60 hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="w-4 h-4 text-white" />
                                </button>

                                {/* File name */}
                                <div className="absolute bottom-0 left-0 right-0 p-1 bg-gradient-to-t from-black/80 to-transparent">
                                    <p className="text-[10px] text-white truncate">{attachment.name}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

// Export a wrapper for drag-drop area that can be used on the message area
export function FileDropZone({
    children,
    onFilesDropped,
}: {
    children: React.ReactNode
    onFilesDropped: (files: FileList) => void
}) {
    const [isDragOver, setIsDragOver] = useState(false)

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragOver(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragOver(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragOver(false)
        if (e.dataTransfer.files.length > 0) {
            onFilesDropped(e.dataTransfer.files)
        }
    }

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="relative"
        >
            {children}

            {isDragOver && (
                <div className="absolute inset-0 z-50 bg-primary/10 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                    <div className="bg-[#2b2d31] border-2 border-dashed border-primary rounded-xl p-8 text-center">
                        <Upload className="w-12 h-12 text-primary mx-auto mb-4" />
                        <p className="text-lg font-medium text-foreground">Drop files here to upload</p>
                    </div>
                </div>
            )}
        </div>
    )
}



