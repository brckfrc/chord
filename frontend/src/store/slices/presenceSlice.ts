import { createSlice } from "@reduxjs/toolkit"

interface PresenceState {
  onlineUsers: string[]
  typingUsers: Record<string, string[]> // channelId -> userId[]
}

const initialState: PresenceState = {
  onlineUsers: [],
  typingUsers: {},
}

const presenceSlice = createSlice({
  name: "presence",
  initialState,
  reducers: {
    setOnlineUsers: (state, action) => {
      state.onlineUsers = action.payload
    },
    addOnlineUser: (state, action) => {
      if (!state.onlineUsers.includes(action.payload)) {
        state.onlineUsers.push(action.payload)
      }
    },
    removeOnlineUser: (state, action) => {
      state.onlineUsers = state.onlineUsers.filter(
        (id) => id !== action.payload
      )
    },
    setTypingUsers: (state, action) => {
      const { channelId, userIds } = action.payload
      state.typingUsers[channelId] = userIds
    },
    addTypingUser: (state, action) => {
      const { channelId, userId } = action.payload
      if (!state.typingUsers[channelId]) {
        state.typingUsers[channelId] = []
      }
      if (!state.typingUsers[channelId].includes(userId)) {
        state.typingUsers[channelId].push(userId)
      }
    },
    removeTypingUser: (state, action) => {
      const { channelId, userId } = action.payload
      if (state.typingUsers[channelId]) {
        state.typingUsers[channelId] = state.typingUsers[channelId].filter(
          (id) => id !== userId
        )
      }
    },
  },
})

export const {
  setOnlineUsers,
  addOnlineUser,
  removeOnlineUser,
  setTypingUsers,
  addTypingUser,
  removeTypingUser,
} = presenceSlice.actions
export default presenceSlice.reducer


