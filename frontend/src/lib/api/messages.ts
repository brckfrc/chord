import { api } from "../api"

export interface MessageDto {
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

export interface CreateMessageDto {
  content: string
  attachments?: string
}

export interface UpdateMessageDto {
  content: string
}

export interface PaginatedMessagesDto {
  messages: MessageDto[]
  hasMore: boolean
  nextCursor?: string
}

export const messagesApi = {
  getMessages: async (
    channelId: string,
    limit: number = 50,
    cursor?: string
  ): Promise<PaginatedMessagesDto> => {
    const params = new URLSearchParams({
      limit: limit.toString(),
    })
    if (cursor) {
      params.append("cursor", cursor)
    }
    const response = await api.get<PaginatedMessagesDto>(
      `/channels/${channelId}/messages?${params.toString()}`
    )
    return response.data
  },

  getMessage: async (
    channelId: string,
    messageId: string
  ): Promise<MessageDto> => {
    const response = await api.get<MessageDto>(
      `/channels/${channelId}/messages/${messageId}`
    )
    return response.data
  },

  createMessage: async (
    channelId: string,
    data: CreateMessageDto
  ): Promise<MessageDto> => {
    const response = await api.post<MessageDto>(
      `/channels/${channelId}/messages`,
      data
    )
    return response.data
  },

  updateMessage: async (
    channelId: string,
    messageId: string,
    data: UpdateMessageDto
  ): Promise<MessageDto> => {
    const response = await api.put<MessageDto>(
      `/channels/${channelId}/messages/${messageId}`,
      data
    )
    return response.data
  },

  deleteMessage: async (
    channelId: string,
    messageId: string
  ): Promise<void> => {
    await api.delete(`/channels/${channelId}/messages/${messageId}`)
  },
}

