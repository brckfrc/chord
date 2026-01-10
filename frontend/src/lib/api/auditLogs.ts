import { api } from "../api"

export interface AuditLogDto {
  id: string
  guildId?: string
  userId: string
  username: string
  action: number
  actionName: string
  targetType: string
  targetId?: string
  changes?: string
  ipAddress?: string
  timestamp: string
}

export interface GetAuditLogsParams {
  limit?: number
  page?: number
}

export interface PaginatedAuditLogsDto {
  logs: AuditLogDto[]
  totalCount: number
  pageSize: number
  currentPage: number
  hasMore: boolean
}

export const auditLogsApi = {
  /**
   * Get audit logs for a guild
   */
  getGuildAuditLogs: async (
    guildId: string,
    params?: GetAuditLogsParams
  ): Promise<PaginatedAuditLogsDto> => {
    const queryParams = new URLSearchParams()
    if (params?.limit) {
      queryParams.append("limit", params.limit.toString())
    }
    if (params?.page) {
      queryParams.append("page", params.page.toString())
    }

    const queryString = queryParams.toString()
    const url = `/guilds/${guildId}/audit-logs${queryString ? `?${queryString}` : ""}`

    const response = await api.get<PaginatedAuditLogsDto>(url)
    return response.data
  },
}
