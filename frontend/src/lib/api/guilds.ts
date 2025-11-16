import { api } from "../api"

export interface CreateGuildDto {
  name: string
  description?: string
  iconUrl?: string
}

export interface UpdateGuildDto {
  name: string
  description?: string
  iconUrl?: string
}

export interface GuildDto {
  id: string
  name: string
  description?: string
  iconUrl?: string
  ownerId: string
  createdAt: string
  updatedAt: string
  owner?: {
    id: string
    username: string
    displayName: string
  }
  memberCount: number
  channelCount: number
}

export interface GuildMemberDto {
  guildId: string
  userId: string
  joinedAt: string
  nickname?: string
  role: string // Owner, Admin, Member
  user?: {
    id: string
    username: string
    displayName: string
    status?: number // UserStatus enum
    customStatus?: string
  }
}

export const guildsApi = {
  getGuilds: async (): Promise<GuildDto[]> => {
    const response = await api.get<GuildDto[]>("/guilds")
    return response.data
  },

  getGuildById: async (id: string): Promise<GuildDto> => {
    const response = await api.get<GuildDto>(`/guilds/${id}`)
    return response.data
  },

  createGuild: async (data: CreateGuildDto): Promise<GuildDto> => {
    const response = await api.post<GuildDto>("/guilds", data)
    return response.data
  },

  updateGuild: async (id: string, data: UpdateGuildDto): Promise<GuildDto> => {
    const response = await api.put<GuildDto>(`/guilds/${id}`, data)
    return response.data
  },

  deleteGuild: async (id: string): Promise<void> => {
    await api.delete(`/guilds/${id}`)
  },

  getGuildMembers: async (guildId: string): Promise<GuildMemberDto[]> => {
    const response = await api.get<GuildMemberDto[]>(`/guilds/${guildId}/members`)
    return response.data
  },
}

