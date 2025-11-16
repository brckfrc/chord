import { api } from "../api"
import type { CreateInviteDto, InviteResponseDto, InviteInfoDto } from "./invites.types"

export type { CreateInviteDto, InviteResponseDto, InviteInfoDto }

export const invitesApi = {
  createInvite: async (guildId: string, data: CreateInviteDto): Promise<InviteResponseDto> => {
    const response = await api.post<InviteResponseDto>(`/invites/guilds/${guildId}`, data)
    return response.data
  },

  getInviteByCode: async (code: string): Promise<InviteInfoDto> => {
    const response = await api.get<InviteInfoDto>(`/invites/${code}`)
    return response.data
  },

  acceptInvite: async (code: string): Promise<any> => {
    const response = await api.post<any>(`/invites/${code}/accept`)
    return response.data
  },

  getGuildInvites: async (guildId: string): Promise<InviteResponseDto[]> => {
    const response = await api.get<InviteResponseDto[]>(`/invites/guilds/${guildId}`)
    return response.data
  },

  revokeInvite: async (inviteId: string): Promise<void> => {
    await api.delete(`/invites/${inviteId}`)
  },
}
