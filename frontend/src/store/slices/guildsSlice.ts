import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit"
import { guildsApi, type GuildDto, type CreateGuildDto } from "@/lib/api/guilds"

interface GuildsState {
  guilds: GuildDto[]
  selectedGuildId: string | null
  isLoading: boolean
  error: string | null
}

const initialState: GuildsState = {
  guilds: [],
  selectedGuildId: null,
  isLoading: false,
  error: null,
}

export const fetchGuilds = createAsyncThunk(
  "guilds/fetchGuilds",
  async (_, { rejectWithValue }) => {
    try {
      return await guildsApi.getGuilds()
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch guilds"
      )
    }
  }
)

export const createGuild = createAsyncThunk(
  "guilds/createGuild",
  async (data: CreateGuildDto, { rejectWithValue }) => {
    try {
      return await guildsApi.createGuild(data)
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create guild"
      )
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
        state.guilds.push(action.payload)
      })
      .addCase(createGuild.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export const { setSelectedGuild, clearError } = guildsSlice.actions
export default guildsSlice.reducer


