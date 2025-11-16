import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit"
import {
  channelsApi,
  type ChannelDto,
  type CreateChannelDto,
} from "@/lib/api/channels"
import type { UserDto } from "@/lib/api/auth"

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
  selectedChannelId: string | null
  activeVoiceChannelId: string | null // Voice channel user is currently in
  voiceChannelUsers: Record<string, VoiceChannelUser[]> // channelId -> users in that voice channel
  isLoading: boolean
  error: string | null
}

const initialState: ChannelsState = {
  channels: [],
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
      return await channelsApi.getGuildChannels(guildId)
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch channels"
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
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create channel"
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
      state.activeVoiceChannelId = null
      state.voiceChannelUsers = {}
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
        state.channels = action.payload
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
        state.channels.push(action.payload)
        // Sort by position
        state.channels.sort((a, b) => a.position - b.position)
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
  clearError,
} = channelsSlice.actions
export default channelsSlice.reducer


