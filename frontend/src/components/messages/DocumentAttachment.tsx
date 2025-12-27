import { FileText, FileSpreadsheet, FileImage, FileArchive, Download } from "lucide-react"
import { cn } from "@/lib/utils"
import { fileValidation } from "@/lib/api/upload"
import type { AttachmentDto } from "@/lib/api/upload"

interface DocumentAttachmentProps {
    attachment: AttachmentDto
    className?: string
}

// Get icon based on file extension
function getFileIcon(name: string) {
    const extension = name.split(".").pop()?.toLowerCase() || ""

    switch (extension) {
        case "pdf":
            return <FileText className="w-8 h-8 text-red-400" />
        case "doc":
        case "docx":
            return <FileText className="w-8 h-8 text-blue-400" />
        case "xls":
        case "xlsx":
        case "csv":
            return <FileSpreadsheet className="w-8 h-8 text-green-400" />
        case "jpg":
        case "jpeg":
        case "png":
        case "gif":
        case "webp":
            return <FileImage className="w-8 h-8 text-purple-400" />
        case "zip":
        case "rar":
        case "7z":
            return <FileArchive className="w-8 h-8 text-yellow-400" />
        default:
            return <FileText className="w-8 h-8 text-muted-foreground" />
    }
}

// Get file type label
function getFileTypeLabel(name: string): string {
    const extension = name.split(".").pop()?.toUpperCase() || "FILE"
    return extension
}

export function DocumentAttachment({ attachment, className }: DocumentAttachmentProps) {
    // Open in new tab when clicking on file card
    const handleOpenInNewTab = () => {
        window.open(attachment.url, "_blank")
    }

    // Download directly when clicking download button (no navigation)
    const handleDownload = async (e: React.MouseEvent) => {
        e.stopPropagation()

        try {
            const response = await fetch(attachment.url)
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)

            const link = document.createElement("a")
            link.href = url
            link.download = attachment.name
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            window.URL.revokeObjectURL(url)
        } catch (error) {
            // Fallback: open in new tab
            console.error("Download failed, opening in new tab:", error)
            window.open(attachment.url, "_blank")
        }
    }

    return (
        <div
            className={cn(
                "flex items-center gap-3 p-3 bg-[#2b2d31] rounded-lg max-w-sm border border-border hover:bg-[#32353b] transition-colors cursor-pointer group",
                className
            )}
            onClick={handleOpenInNewTab}
        >
            {/* File icon */}
            <div className="flex-shrink-0">{getFileIcon(attachment.name)}</div>

            {/* File info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate" title={attachment.name}>
                    {attachment.name}
                </p>
                <p className="text-xs text-muted-foreground">
                    {getFileTypeLabel(attachment.name)} • {fileValidation.formatFileSize(attachment.size)}
                </p>
            </div>

            {/* Download button */}
            <button
                onClick={handleDownload}
                className="flex-shrink-0 p-2 rounded-md bg-[#3f4147] hover:bg-[#4f5157] transition-colors opacity-0 group-hover:opacity-100"
            >
                <Download className="w-4 h-4 text-foreground" />
            </button>
        </div>
    )
}

