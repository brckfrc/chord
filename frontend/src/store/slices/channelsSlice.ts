import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit"
import {
  channelsApi,
  type ChannelDto,
  type CreateChannelDto,
} from "@/lib/api/channels"

// Voice channel user with voice state
export interface VoiceChannelUser {
  userId: string
  username: string
  displayName: string
  status: number
  customStatus?: string
  isMuted: boolean
  isDeafened: boolean
}

interface ChannelsState {
  channels: ChannelDto[]
  channelsByGuild: Record<string, ChannelDto[]> // Cache channels by guild ID
  selectedChannelId: string | null
  activeVoiceChannelId: string | null // Voice channel user is currently in
  voiceChannelUsers: Record<string, VoiceChannelUser[]> // channelId -> users in that voice channel
  isLoading: boolean
  error: string | null
}

const initialState: ChannelsState = {
  channels: [],
  channelsByGuild: {},
  selectedChannelId: null,
  activeVoiceChannelId: null,
  voiceChannelUsers: {}, // channelId -> users array
  isLoading: false,
  error: null,
}

export const fetchChannels = createAsyncThunk(
  "channels/fetchChannels",
  async (guildId: string, { rejectWithValue }) => {
    try {
      const channels = await channelsApi.getGuildChannels(guildId)
      return { guildId, channels }
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } }
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch channels"
      )
    }
  }
)

export const createChannel = createAsyncThunk(
  "channels/createChannel",
  async (
    { guildId, data }: { guildId: string; data: CreateChannelDto },
    { rejectWithValue }
  ) => {
    try {
      return await channelsApi.createChannel(guildId, data)
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } }
      return rejectWithValue(
        err.response?.data?.message || "Failed to create channel"
      )
    }
  }
)

const channelsSlice = createSlice({
  name: "channels",
  initialState,
  reducers: {
    setSelectedChannel: (state, action: PayloadAction<string | null>) => {
      state.selectedChannelId = action.payload
    },
    setActiveVoiceChannel: (state, action: PayloadAction<string | null>) => {
      state.activeVoiceChannelId = action.payload
    },
    setVoiceChannelUsers: (
      state,
      action: PayloadAction<{ channelId: string; users: VoiceChannelUser[] }>
    ) => {
      state.voiceChannelUsers[action.payload.channelId] = action.payload.users
    },
    addVoiceChannelUser: (
      state,
      action: PayloadAction<{ channelId: string; user: VoiceChannelUser }>
    ) => {
      if (!state.voiceChannelUsers[action.payload.channelId]) {
        state.voiceChannelUsers[action.payload.channelId] = []
      }
      // Check if user already exists
      const existingIndex = state.voiceChannelUsers[
        action.payload.channelId
      ].findIndex((u) => u.userId === action.payload.user.userId)
      if (existingIndex >= 0) {
        state.voiceChannelUsers[action.payload.channelId][existingIndex] =
          action.payload.user
      } else {
        state.voiceChannelUsers[action.payload.channelId].push(
          action.payload.user
        )
      }
    },
    removeVoiceChannelUser: (
      state,
      action: PayloadAction<{ channelId: string; userId: string }>
    ) => {
      if (state.voiceChannelUsers[action.payload.channelId]) {
        state.voiceChannelUsers[action.payload.channelId] = state.voiceChannelUsers[
          action.payload.channelId
        ].filter((u) => u.userId !== action.payload.userId)
      }
    },
    clearChannels: (state) => {
      state.channels = []
      state.selectedChannelId = null
      // Don't clear activeVoiceChannelId - user might be in voice channel while viewing DMs
      // Don't clear voiceChannelUsers - these should persist across navigation
    },
    // Set channels for a specific guild (used when switching guilds)
    setGuildChannels: (state, action: PayloadAction<{ guildId: string; channels: ChannelDto[] }>) => {
      const { guildId, channels } = action.payload
      state.channelsByGuild[guildId] = channels
      state.channels = channels
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Channels
      .addCase(fetchChannels.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchChannels.fulfilled, (state, action) => {
        state.isLoading = false
        const { guildId, channels } = action.payload
        state.channelsByGuild[guildId] = channels
        // Update current channels if this is the active guild
        state.channels = channels
      })
      .addCase(fetchChannels.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Create Channel
      .addCase(createChannel.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(createChannel.fulfilled, (state, action) => {
        state.isLoading = false
        const newChannel = action.payload
        state.channels.push(newChannel)
        // Sort by position
        state.channels.sort((a, b) => a.position - b.position)
        // Update cache for the guild
        const guildId = newChannel.guildId
        if (state.channelsByGuild[guildId]) {
          state.channelsByGuild[guildId] = [...state.channelsByGuild[guildId], newChannel]
          state.channelsByGuild[guildId].sort((a, b) => a.position - b.position)
        }
      })
      .addCase(createChannel.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export const {
  setSelectedChannel,
  setActiveVoiceChannel,
  setVoiceChannelUsers,
  addVoiceChannelUser,
  removeVoiceChannelUser,
  clearChannels,
  setGuildChannels,
  clearError,
} = channelsSlice.actions
export default channelsSlice.reducer


