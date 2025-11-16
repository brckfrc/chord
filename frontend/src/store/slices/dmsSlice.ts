import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit"
import { dmsApi, type DMDto } from "@/lib/api/dms"

interface DMsState {
  dms: DMDto[]
  selectedDMId: string | null
  isLoading: boolean
  error: string | null
}

const initialState: DMsState = {
  dms: [],
  selectedDMId: null,
  isLoading: false,
  error: null,
}

export const fetchDMs = createAsyncThunk(
  "dms/fetchDMs",
  async (_, { rejectWithValue }) => {
    try {
      return await dmsApi.getDMs()
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch DMs"
      )
    }
  }
)

export const createDM = createAsyncThunk(
  "dms/createDM",
  async (userId: string, { rejectWithValue }) => {
    try {
      return await dmsApi.createDM(userId)
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create DM"
      )
    }
  }
)

const dmsSlice = createSlice({
  name: "dms",
  initialState,
  reducers: {
    setSelectedDM: (state, action: PayloadAction<string | null>) => {
      state.selectedDMId = action.payload
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch DMs
      .addCase(fetchDMs.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchDMs.fulfilled, (state, action) => {
        state.isLoading = false
        state.dms = action.payload
      })
      .addCase(fetchDMs.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Create DM
      .addCase(createDM.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(createDM.fulfilled, (state, action) => {
        state.isLoading = false
        // Check if DM already exists
        const existingIndex = state.dms.findIndex(
          (dm) => dm.otherUserId === action.payload.otherUserId
        )
        if (existingIndex >= 0) {
          state.dms[existingIndex] = action.payload
        } else {
          state.dms.push(action.payload)
        }
        // Sort by last message time
        state.dms.sort((a, b) => {
          const aTime = a.lastMessage?.createdAt || a.createdAt
          const bTime = b.lastMessage?.createdAt || b.createdAt
          return new Date(bTime).getTime() - new Date(aTime).getTime()
        })
      })
      .addCase(createDM.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export const { setSelectedDM, clearError } = dmsSlice.actions
export default dmsSlice.reducer

