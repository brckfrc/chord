import { api } from "../api"

export const ChannelType = {
  Text: 0,
  Voice: 1,
  Announcement: 2,
} as const

export type ChannelType = (typeof ChannelType)[keyof typeof ChannelType]

export interface CreateChannelDto {
  name: string
  type: ChannelType
  topic?: string
}

export interface UpdateChannelDto {
  name: string
  topic?: string
}

export interface ChannelDto {
  id: string
  guildId: string
  name: string
  type: ChannelType
  topic?: string
  position: number
  createdAt: string
}

export const channelsApi = {
  getGuildChannels: async (guildId: string): Promise<ChannelDto[]> => {
    const response = await api.get<ChannelDto[]>(`/guilds/${guildId}/channels`)
    return response.data
  },

  getChannelById: async (
    guildId: string,
    channelId: string
  ): Promise<ChannelDto> => {
    const response = await api.get<ChannelDto>(
      `/guilds/${guildId}/channels/${channelId}`
    )
    return response.data
  },

  createChannel: async (
    guildId: string,
    data: CreateChannelDto
  ): Promise<ChannelDto> => {
    const response = await api.post<ChannelDto>(
      `/guilds/${guildId}/channels`,
      data
    )
    return response.data
  },

  updateChannel: async (
    guildId: string,
    channelId: string,
    data: UpdateChannelDto
  ): Promise<ChannelDto> => {
    const response = await api.put<ChannelDto>(
      `/guilds/${guildId}/channels/${channelId}`,
      data
    )
    return response.data
  },

  deleteChannel: async (guildId: string, channelId: string): Promise<void> => {
    await api.delete(`/guilds/${guildId}/channels/${channelId}`)
  },
}

