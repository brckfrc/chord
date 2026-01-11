import { api } from "../api"
import { type UserDto } from "./auth"

export interface DirectMessageChannelDto {
  id: string
  createdAt: string
  lastMessageAt?: string
  otherUser: UserDto
  lastMessage?: DirectMessageDto
  unreadCount: number
}

export interface DirectMessageDto {
  id: string
  channelId: string
  senderId: string
  content: string
  createdAt: string
  editedAt?: string
  isDeleted: boolean
  sender: UserDto
}

export interface SendDirectMessageDto {
  content: string
}

export interface UpdateDirectMessageDto {
  content: string
}

export const dmsApi = {
  /**
   * Get all DM channels for the current user
   */
  getDMs: async (): Promise<DirectMessageChannelDto[]> => {
    const response = await api.get<DirectMessageChannelDto[]>("/dms")
    return response.data
  },

  /**
   * Get a specific DM channel by ID
   */
  getDMById: async (dmId: string): Promise<DirectMessageChannelDto> => {
    const response = await api.get<DirectMessageChannelDto>(`/dms/${dmId}`)
    return response.data
  },

  /**
   * Create or get a DM channel with a specific user
   */
  createOrGetDM: async (userId: string): Promise<DirectMessageChannelDto> => {
    const response = await api.post<DirectMessageChannelDto>(`/dms/users/${userId}`)
    return response.data
  },

  /**
   * Get messages from a DM channel (paginated)
   */
  getDMMessages: async (
    dmId: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<DirectMessageDto[]> => {
    const response = await api.get<DirectMessageDto[]>(`/dms/${dmId}/messages`, {
      params: { page, pageSize },
    })
    return response.data
  },

  /**
   * Send a message in a DM channel
   */
  sendDMMessage: async (
    dmId: string,
    content: string
  ): Promise<DirectMessageDto> => {
    const response = await api.post<DirectMessageDto>(`/dms/${dmId}/messages`, {
      content,
    })
    return response.data
  },

  /**
   * Edit a direct message
   */
  editDMMessage: async (
    dmId: string,
    messageId: string,
    content: string
  ): Promise<DirectMessageDto> => {
    const response = await api.put<DirectMessageDto>(
      `/dms/${dmId}/messages/${messageId}`,
      { content }
    )
    return response.data
  },

  /**
   * Delete a direct message
   */
  deleteDMMessage: async (dmId: string, messageId: string): Promise<void> => {
    await api.delete(`/dms/${dmId}/messages/${messageId}`)
  },

  /**
   * Mark a DM channel as read
   */
  markDMAsRead: async (dmId: string, messageId?: string): Promise<void> => {
    const params = messageId ? { messageId } : {}
    await api.post(`/dms/${dmId}/mark-read`, null, { params })
  },
}

