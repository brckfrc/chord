import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import { auditLogsApi, type AuditLogDto, type PaginatedAuditLogsDto } from "@/lib/api/auditLogs"

interface PaginationInfo {
  totalCount: number
  pageSize: number
  currentPage: number
  hasMore: boolean
}

interface AuditLogsState {
  logsByGuild: Record<string, AuditLogDto[]>
  paginationByGuild: Record<string, PaginationInfo>
  isLoading: boolean
  error: string | null
}

const initialState: AuditLogsState = {
  logsByGuild: {},
  paginationByGuild: {},
  isLoading: false,
  error: null,
}

// Fetch audit logs for a guild
export const fetchAuditLogs = createAsyncThunk(
  "auditLogs/fetchAuditLogs",
  async (
    {
      guildId,
      limit = 50,
      page = 1,
    }: { guildId: string; limit?: number; page?: number },
    { rejectWithValue }
  ) => {
    try {
      const result = await auditLogsApi.getGuildAuditLogs(guildId, { limit, page })
      return { guildId, result }
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch audit logs"
      )
    }
  }
)

const auditLogsSlice = createSlice({
  name: "auditLogs",
  initialState,
  reducers: {
    clearAuditLogs: (state, action: { payload: string }) => {
      delete state.logsByGuild[action.payload]
      delete state.paginationByGuild[action.payload]
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAuditLogs.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchAuditLogs.fulfilled, (state, action) => {
        state.isLoading = false
        if (action.payload && !("error" in action.payload)) {
          const { guildId, result } = action.payload
          state.logsByGuild[guildId] = result.logs
          state.paginationByGuild[guildId] = {
            totalCount: result.totalCount,
            pageSize: result.pageSize,
            currentPage: result.currentPage,
            hasMore: result.hasMore,
          }
        }
      })
      .addCase(fetchAuditLogs.rejected, (state, action) => {
        state.isLoading = false
        state.error = (action.payload as string) || "Failed to fetch audit logs"
      })
  },
})

export const { clearAuditLogs } = auditLogsSlice.actions
export default auditLogsSlice.reducer
