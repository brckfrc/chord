import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit"
import { guildsApi, type GuildDto, type CreateGuildDto, type GuildMemberDto } from "@/lib/api/guilds"
import type { AxiosError } from "axios"

interface GuildsState {
  guilds: GuildDto[]
  selectedGuildId: string | null
  isLoading: boolean
  error: string | null
  // Members by guild ID
  membersByGuild: Record<string, GuildMemberDto[]>
  membersLoading: Record<string, boolean>
  membersError: Record<string, string | null>
}

const initialState: GuildsState = {
  guilds: [],
  selectedGuildId: null,
  isLoading: false,
  error: null,
  membersByGuild: {},
  membersLoading: {},
  membersError: {},
}

export const fetchGuilds = createAsyncThunk(
  "guilds/fetchGuilds",
  async (_, { rejectWithValue }) => {
    try {
      return await guildsApi.getGuilds()
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>
      return rejectWithValue(
        axiosError.response?.data?.message || "Failed to fetch guilds"
      )
    }
  }
)

export const createGuild = createAsyncThunk(
  "guilds/createGuild",
  async (data: CreateGuildDto, { rejectWithValue }) => {
    try {
      return await guildsApi.createGuild(data)
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>
      return rejectWithValue(
        axiosError.response?.data?.message || "Failed to create guild"
      )
    }
  }
)

export const fetchGuildMembers = createAsyncThunk(
  "guilds/fetchGuildMembers",
  async (guildId: string, { rejectWithValue }) => {
    try {
      const members = await guildsApi.getGuildMembers(guildId)
      // Sort: Owner first, then Admins, then Members, then by display name
      const sorted = [...members].sort((a, b) => {
        // Role priority: Owner > Admin > Member
        const roleOrder: Record<string, number> = { Owner: 0, Admin: 1, Member: 2 }
        const roleDiff = (roleOrder[a.role] ?? 2) - (roleOrder[b.role] ?? 2)
        if (roleDiff !== 0) return roleDiff

        // Then sort by display name
        const nameA = a.nickname || a.user?.displayName || a.user?.username || ""
        const nameB = b.nickname || b.user?.displayName || b.user?.username || ""
        return nameA.localeCompare(nameB)
      })
      return { guildId, members: sorted }
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>
      return rejectWithValue({
        guildId,
        error: axiosError.response?.data?.message || "Failed to fetch guild members",
      })
    }
  }
)

const guildsSlice = createSlice({
  name: "guilds",
  initialState,
  reducers: {
    setSelectedGuild: (state, action: PayloadAction<string | null>) => {
      state.selectedGuildId = action.payload
    },
    clearError: (state) => {
      state.error = null
    },
    // Update member status (for SignalR events) - works across all guilds
    updateMemberStatus: (
      state,
      action: PayloadAction<{
        guildId?: string // Optional: if not provided, update in all guilds
        userId: string
        status: number
        customStatus?: string
      }>
    ) => {
      const { guildId, userId, status, customStatus } = action.payload
      
      // If guildId is provided, update only that guild
      if (guildId) {
        const members = state.membersByGuild[guildId]
        if (members) {
          const member = members.find((m) => m.userId === userId)
          if (member && member.user) {
            member.user.status = status
            if (customStatus !== undefined) {
              member.user.customStatus = customStatus
            }
          }
        }
      } else {
        // Update in all guilds where this user is a member
        Object.keys(state.membersByGuild).forEach((gId) => {
          const members = state.membersByGuild[gId]
          if (members) {
            const member = members.find((m) => m.userId === userId)
            if (member && member.user) {
              member.user.status = status
              if (customStatus !== undefined) {
                member.user.customStatus = customStatus
              }
            }
          }
        })
      }
    },
    // Clear members for a guild (when leaving)
    clearGuildMembers: (state, action: PayloadAction<string>) => {
      const guildId = action.payload
      delete state.membersByGuild[guildId]
      delete state.membersLoading[guildId]
      delete state.membersError[guildId]
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Guilds
      .addCase(fetchGuilds.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchGuilds.fulfilled, (state, action) => {
        state.isLoading = false
        state.guilds = action.payload
      })
      .addCase(fetchGuilds.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Create Guild
      .addCase(createGuild.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(createGuild.fulfilled, (state, action) => {
        state.isLoading = false
        state.guilds.unshift(action.payload)
      })
      .addCase(createGuild.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Fetch Guild Members
      .addCase(fetchGuildMembers.pending, (state, action) => {
        const guildId = action.meta.arg
        state.membersLoading[guildId] = true
        state.membersError[guildId] = null
      })
      .addCase(fetchGuildMembers.fulfilled, (state, action) => {
        const { guildId, members } = action.payload
        state.membersByGuild[guildId] = members
        state.membersLoading[guildId] = false
        state.membersError[guildId] = null
      })
      .addCase(fetchGuildMembers.rejected, (state, action) => {
        const payload = action.payload as { guildId: string; error: string }
        if (payload) {
          state.membersLoading[payload.guildId] = false
          state.membersError[payload.guildId] = payload.error
        }
      })
  },
})

export const { setSelectedGuild, clearError, updateMemberStatus, clearGuildMembers } =
  guildsSlice.actions
export default guildsSlice.reducer


