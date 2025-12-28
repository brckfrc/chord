import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit"
import { dmsApi, type DirectMessageChannelDto, type DirectMessageDto } from "@/lib/api/dms"

interface DMsState {
  dms: DirectMessageChannelDto[]
  selectedDMId: string | null
  messages: Record<string, DirectMessageDto[]> // dmId -> messages[]
  typingUsers: Record<string, { userId: string; username: string }[]> // dmId -> typing users
  isLoading: boolean
  error: string | null
}

const initialState: DMsState = {
  dms: [],
  selectedDMId: null,
  messages: {},
  typingUsers: {},
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

export const fetchDMMessages = createAsyncThunk(
  "dms/fetchDMMessages",
  async ({ dmId, page = 1 }: { dmId: string; page?: number }, { rejectWithValue }) => {
    try {
      const messages = await dmsApi.getDMMessages(dmId, page)
      return { dmId, messages }
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch messages"
      )
    }
  }
)

export const createOrGetDM = createAsyncThunk(
  "dms/createOrGetDM",
  async (userId: string, { rejectWithValue }) => {
    try {
      return await dmsApi.createOrGetDM(userId)
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
    // Add a message to a DM channel (for real-time updates via SignalR)
    addDMMessage: (
      state,
      action: PayloadAction<{ dmId: string; message: DirectMessageDto }>
    ) => {
      const { dmId, message } = action.payload
      if (!state.messages[dmId]) {
        state.messages[dmId] = []
      }
      state.messages[dmId].push(message)
      
      // Update DM's lastMessage
      const dm = state.dms.find((d) => d.id === dmId)
      if (dm) {
        dm.lastMessage = message
        dm.lastMessageAt = message.createdAt
        
        // Move to top of list
        state.dms = [dm, ...state.dms.filter((d) => d.id !== dmId)]
      }
    },
    // Update a message (for edits via SignalR)
    updateDMMessage: (
      state,
      action: PayloadAction<{ dmId: string; message: DirectMessageDto }>
    ) => {
      const { dmId, message } = action.payload
      const messages = state.messages[dmId]
      if (messages) {
        const index = messages.findIndex((m) => m.id === message.id)
        if (index >= 0) {
          messages[index] = message
        }
      }
    },
    // Delete a message (soft delete via SignalR)
    deleteDMMessage: (
      state,
      action: PayloadAction<{ dmId: string; messageId: string }>
    ) => {
      const { dmId, messageId } = action.payload
      const messages = state.messages[dmId]
      if (messages) {
        const index = messages.findIndex((m) => m.id === messageId)
        if (index >= 0) {
          messages[index].isDeleted = true
        }
      }
    },
    // Add typing user
    addDMTypingUser: (
      state,
      action: PayloadAction<{ dmId: string; userId: string; username: string }>
    ) => {
      const { dmId, userId, username } = action.payload
      if (!state.typingUsers[dmId]) {
        state.typingUsers[dmId] = []
      }
      // Don't add duplicate
      if (!state.typingUsers[dmId].find((u) => u.userId === userId)) {
        state.typingUsers[dmId].push({ userId, username })
      }
    },
    // Remove typing user
    removeDMTypingUser: (
      state,
      action: PayloadAction<{ dmId: string; userId: string }>
    ) => {
      const { dmId, userId } = action.payload
      if (state.typingUsers[dmId]) {
        state.typingUsers[dmId] = state.typingUsers[dmId].filter(
          (u) => u.userId !== userId
        )
      }
    },
    // Clear messages for a DM
    clearDMMessages: (state, action: PayloadAction<string>) => {
      delete state.messages[action.payload]
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
      // Fetch DM messages
      .addCase(fetchDMMessages.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchDMMessages.fulfilled, (state, action) => {
        state.isLoading = false
        const { dmId, messages } = action.payload
        state.messages[dmId] = messages
      })
      .addCase(fetchDMMessages.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Create/Get DM
      .addCase(createOrGetDM.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(createOrGetDM.fulfilled, (state, action) => {
        state.isLoading = false
        // Check if DM already exists
        const existingIndex = state.dms.findIndex(
          (dm) => dm.id === action.payload.id
        )
        if (existingIndex >= 0) {
          state.dms[existingIndex] = action.payload
        } else {
          state.dms.unshift(action.payload) // Add to top
        }
      })
      .addCase(createOrGetDM.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export const {
  setSelectedDM,
  clearError,
  addDMMessage,
  updateDMMessage,
  deleteDMMessage,
  addDMTypingUser,
  removeDMTypingUser,
  clearDMMessages,
} = dmsSlice.actions

export default dmsSlice.reducer

