import { api } from "../api"

export interface MessageMentionDto {
  id: string
  messageId: string
  mentionedUserId: string
  isRead: boolean
  createdAt: string
  message: {
    id: string
    channelId: string
    authorId: string
    content: string
    attachments?: string
    createdAt: string
    updatedAt?: string
    isEdited: boolean
    isPinned: boolean
    pinnedAt?: string
    pinnedByUserId?: string
    author: {
      id: string
      username: string
      displayName: string
      avatarUrl?: string
    }
  }
  mentionedUser: {
    id: string
    username: string
    displayName: string
    avatarUrl?: string
  }
}

export interface UnreadMentionCountDto {
  count: number
}

export const mentionsApi = {
  getUserMentions: async (unreadOnly: boolean = false): Promise<MessageMentionDto[]> => {
    const params = new URLSearchParams()
    if (unreadOnly) {
      params.append("unreadOnly", "true")
    }
    const response = await api.get<MessageMentionDto[]>(`/mentions?${params.toString()}`)
    return response.data
  },

  getUnreadMentionCount: async (): Promise<number> => {
    const response = await api.get<UnreadMentionCountDto>("/mentions/unread-count")
    return response.data.count
  },

  markMentionAsRead: async (mentionId: string): Promise<void> => {
    await api.patch(`/mentions/${mentionId}/mark-read`)
  },

  markAllAsRead: async (guildId?: string): Promise<number> => {
    const params = new URLSearchParams()
    if (guildId) {
      params.append("guildId", guildId)
    }
    const response = await api.patch<{ count: number }>(`/mentions/mark-all-read?${params.toString()}`)
    return response.data.count
  },
}

