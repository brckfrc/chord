import { createSlice } from "@reduxjs/toolkit"

interface MessagesState {
  messagesByChannel: Record<string, any[]>
}

const initialState: MessagesState = {
  messagesByChannel: {},
}

const messagesSlice = createSlice({
  name: "messages",
  initialState,
  reducers: {
    setMessages: (state, action) => {
      const { channelId, messages } = action.payload
      state.messagesByChannel[channelId] = messages
    },
    addMessage: (state, action) => {
      const { channelId, message } = action.payload
      if (!state.messagesByChannel[channelId]) {
        state.messagesByChannel[channelId] = []
      }
      state.messagesByChannel[channelId].push(message)
    },
    updateMessage: (state, action) => {
      const { channelId, messageId, updates } = action.payload
      const messages = state.messagesByChannel[channelId]
      if (messages) {
        const index = messages.findIndex((m) => m.id === messageId)
        if (index !== -1) {
          messages[index] = { ...messages[index], ...updates }
        }
      }
    },
    removeMessage: (state, action) => {
      const { channelId, messageId } = action.payload
      const messages = state.messagesByChannel[channelId]
      if (messages) {
        state.messagesByChannel[channelId] = messages.filter(
          (m) => m.id !== messageId
        )
      }
    },
  },
})

export const { setMessages, addMessage, updateMessage, removeMessage } =
  messagesSlice.actions
export default messagesSlice.reducer


