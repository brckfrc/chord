import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit"
import {
  friendsApi,
  type FriendshipResponseDto,
} from "@/lib/api/friends"

interface FriendsState {
  friends: FriendshipResponseDto[]
  onlineFriends: FriendshipResponseDto[]
  pendingRequests: FriendshipResponseDto[]
  isLoading: boolean
  error: string | null
  activeTab: "online" | "all" | "pending"
}

const initialState: FriendsState = {
  friends: [],
  onlineFriends: [],
  pendingRequests: [],
  isLoading: false,
  error: null,
  activeTab: "online",
}

export const fetchFriends = createAsyncThunk(
  "friends/fetchFriends",
  async (_, { rejectWithValue }) => {
    try {
      return await friendsApi.getFriends()
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to fetch friends"
      return rejectWithValue(message)
    }
  }
)

export const fetchOnlineFriends = createAsyncThunk(
  "friends/fetchOnlineFriends",
  async (_, { rejectWithValue }) => {
    try {
      return await friendsApi.getOnlineFriends()
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to fetch online friends"
      return rejectWithValue(message)
    }
  }
)

export const fetchPendingRequests = createAsyncThunk(
  "friends/fetchPendingRequests",
  async (_, { rejectWithValue }) => {
    try {
      return await friendsApi.getPendingRequests()
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to fetch pending requests"
      return rejectWithValue(message)
    }
  }
)

export const sendFriendRequest = createAsyncThunk(
  "friends/sendFriendRequest",
  async (username: string, { rejectWithValue }) => {
    try {
      await friendsApi.sendFriendRequest(username)
      return username
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to send friend request"
      return rejectWithValue(message)
    }
  }
)

export const acceptFriendRequest = createAsyncThunk(
  "friends/acceptFriendRequest",
  async (requestId: string, { rejectWithValue }) => {
    try {
      await friendsApi.acceptFriendRequest(requestId)
      return requestId
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to accept friend request"
      return rejectWithValue(message)
    }
  }
)

export const declineFriendRequest = createAsyncThunk(
  "friends/declineFriendRequest",
  async (requestId: string, { rejectWithValue }) => {
    try {
      await friendsApi.declineFriendRequest(requestId)
      return requestId
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to decline friend request"
      return rejectWithValue(message)
    }
  }
)

const friendsSlice = createSlice({
  name: "friends",
  initialState,
  reducers: {
    setActiveTab: (
      state,
      action: PayloadAction<"online" | "all" | "pending">
    ) => {
      state.activeTab = action.payload
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Friends
      .addCase(fetchFriends.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchFriends.fulfilled, (state, action) => {
        state.isLoading = false
        state.friends = action.payload
      })
      .addCase(fetchFriends.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Fetch Online Friends
      .addCase(fetchOnlineFriends.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchOnlineFriends.fulfilled, (state, action) => {
        state.isLoading = false
        state.onlineFriends = action.payload
      })
      .addCase(fetchOnlineFriends.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Fetch Pending Requests
      .addCase(fetchPendingRequests.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchPendingRequests.fulfilled, (state, action) => {
        state.isLoading = false
        state.pendingRequests = action.payload
      })
      .addCase(fetchPendingRequests.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Send Friend Request
      .addCase(sendFriendRequest.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(sendFriendRequest.fulfilled, (state) => {
        state.isLoading = false
      })
      .addCase(sendFriendRequest.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Accept Friend Request
      .addCase(acceptFriendRequest.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(acceptFriendRequest.fulfilled, (state, action) => {
        state.isLoading = false
        // Remove from pending requests
        state.pendingRequests = state.pendingRequests.filter(
          (req) => req.id !== action.payload
        )
      })
      .addCase(acceptFriendRequest.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Decline Friend Request
      .addCase(declineFriendRequest.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(declineFriendRequest.fulfilled, (state, action) => {
        state.isLoading = false
        // Remove from pending requests
        state.pendingRequests = state.pendingRequests.filter(
          (req) => req.id !== action.payload
        )
      })
      .addCase(declineFriendRequest.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export const { setActiveTab, clearError } = friendsSlice.actions
export default friendsSlice.reducer

