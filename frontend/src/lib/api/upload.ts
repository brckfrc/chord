import { api } from "../api";

export interface UploadResponseDto {
  url: string;
  type: "image" | "video" | "document";
  size: number;
  name: string;
  duration?: number;
  mimeType: string;
}

export interface AttachmentDto {
  url: string;
  type: "image" | "video" | "document";
  size: number;
  name: string;
  duration?: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export const uploadApi = {
  /**
   * Upload a file with progress tracking
   */
  uploadFile: async (
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResponseDto> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post<UploadResponseDto>("/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const loaded = progressEvent.loaded;
          const total = progressEvent.total;
          const percentage = Math.round((loaded * 100) / total);
          onProgress({ loaded, total, percentage });
        }
      },
    });

    return response.data;
  },

  /**
   * Delete an uploaded file
   */
  deleteFile: async (fileUrl: string): Promise<void> => {
    await api.delete("/upload", {
      params: { fileUrl },
    });
  },
};

/**
 * File validation utilities
 */
export const fileValidation = {
  MAX_FILE_SIZE: 25 * 1024 * 1024, // 25MB
  MAX_VIDEO_DURATION: 120, // 2 minutes in seconds

  ALLOWED_IMAGE_TYPES: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ],
  ALLOWED_VIDEO_TYPES: ["video/mp4", "video/webm", "video/quicktime"],
  ALLOWED_DOCUMENT_TYPES: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
    "application/zip",
    "application/x-rar-compressed",
  ],

  isValidType(file: File): boolean {
    const type = file.type.toLowerCase();
    return (
      this.ALLOWED_IMAGE_TYPES.includes(type) ||
      this.ALLOWED_VIDEO_TYPES.includes(type) ||
      this.ALLOWED_DOCUMENT_TYPES.includes(type)
    );
  },

  isValidSize(file: File): boolean {
    return file.size <= this.MAX_FILE_SIZE;
  },

  getFileType(file: File): "image" | "video" | "document" | null {
    const type = file.type.toLowerCase();
    if (this.ALLOWED_IMAGE_TYPES.includes(type)) return "image";
    if (this.ALLOWED_VIDEO_TYPES.includes(type)) return "video";
    if (this.ALLOWED_DOCUMENT_TYPES.includes(type)) return "document";
    return null;
  },

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  },

  getErrorMessage(file: File): string | null {
    if (!this.isValidSize(file)) {
      return `File size exceeds maximum limit of ${this.formatFileSize(
        this.MAX_FILE_SIZE
      )}`;
    }
    if (!this.isValidType(file)) {
      return `File type "${file.type}" is not supported`;
    }
    return null;
  },
};
