import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import {
  messagesApi,
  type MessageDto,
  type CreateMessageDto,
  type UpdateMessageDto,
} from "@/lib/api/messages";

interface TypingUser {
  userId: string;
  username: string;
}

interface MessagesState {
  messagesByChannel: Record<string, MessageDto[]>;
  hasMoreByChannel: Record<string, boolean>;
  nextCursorByChannel: Record<string, string | undefined>;
  typingUsers: Record<string, TypingUser[]>; // channelId -> typing users array
  isLoading: boolean;
  error: string | null;
}

const initialState: MessagesState = {
  messagesByChannel: {},
  hasMoreByChannel: {},
  nextCursorByChannel: {},
  typingUsers: {},
  isLoading: false,
  error: null,
};

// Fetch messages for a channel
export const fetchMessages = createAsyncThunk(
  "messages/fetchMessages",
  async (
    {
      channelId,
      limit = 50,
      cursor,
    }: { channelId: string; limit?: number; cursor?: string },
    { rejectWithValue }
  ) => {
    try {
      const result = await messagesApi.getMessages(channelId, limit, cursor);
      return {
        channelId,
        messages: result.messages,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch messages"
      );
    }
  }
);

// Create message
export const createMessage = createAsyncThunk(
  "messages/createMessage",
  async (
    { channelId, data }: { channelId: string; data: CreateMessageDto },
    { rejectWithValue }
  ) => {
    try {
      return await messagesApi.createMessage(channelId, data);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create message"
      );
    }
  }
);

// Update message
export const updateMessage = createAsyncThunk(
  "messages/updateMessage",
  async (
    {
      channelId,
      messageId,
      data,
    }: { channelId: string; messageId: string; data: UpdateMessageDto },
    { rejectWithValue }
  ) => {
    try {
      return await messagesApi.updateMessage(channelId, messageId, data);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update message"
      );
    }
  }
);

// Delete message
export const deleteMessage = createAsyncThunk(
  "messages/deleteMessage",
  async (
    { channelId, messageId }: { channelId: string; messageId: string },
    { rejectWithValue }
  ) => {
    try {
      await messagesApi.deleteMessage(channelId, messageId);
      return { channelId, messageId };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete message"
      );
    }
  }
);

const messagesSlice = createSlice({
  name: "messages",
  initialState,
  reducers: {
    // Set messages (replace all)
    setMessages: (
      state,
      action: PayloadAction<{ channelId: string; messages: MessageDto[] }>
    ) => {
      const { channelId, messages } = action.payload;
      state.messagesByChannel[channelId] = messages;
    },
    // Add messages (append, for pagination)
    addMessages: (
      state,
      action: PayloadAction<{
        channelId: string;
        messages: MessageDto[];
        hasMore: boolean;
        nextCursor?: string;
      }>
    ) => {
      const { channelId, messages, hasMore, nextCursor } = action.payload;
      if (!state.messagesByChannel[channelId]) {
        state.messagesByChannel[channelId] = [];
      }
      // Backend returns older messages in descending order (newest first)
      // Reverse to get ascending order, then prepend to beginning
      // This maintains: oldest at top, newest at bottom
      const reversedMessages = [...messages].reverse();
      state.messagesByChannel[channelId].unshift(...reversedMessages);
      state.hasMoreByChannel[channelId] = hasMore;
      state.nextCursorByChannel[channelId] = nextCursor;
    },
    // Add single message (from SignalR)
    addMessage: (
      state,
      action: PayloadAction<{ channelId: string; message: MessageDto }>
    ) => {
      const { channelId, message } = action.payload;
      if (!state.messagesByChannel[channelId]) {
        state.messagesByChannel[channelId] = [];
      }
      // Check if message already exists (avoid duplicates)
      const exists = state.messagesByChannel[channelId].some(
        (m) => m.id === message.id
      );
      if (!exists) {
        state.messagesByChannel[channelId].push(message);
      }
    },
    // Update message (from SignalR or edit)
    updateMessageState: (
      state,
      action: PayloadAction<{
        channelId: string;
        messageId: string;
        updates: Partial<MessageDto>;
      }>
    ) => {
      const { channelId, messageId, updates } = action.payload;
      const messages = state.messagesByChannel[channelId];
      if (messages) {
        const index = messages.findIndex((m) => m.id === messageId);
        if (index !== -1) {
          messages[index] = { ...messages[index], ...updates };
        }
      }
    },
    // Remove message (from SignalR or delete)
    removeMessage: (
      state,
      action: PayloadAction<{ channelId: string; messageId: string }>
    ) => {
      const { channelId, messageId } = action.payload;
      const messages = state.messagesByChannel[channelId];
      if (messages) {
        state.messagesByChannel[channelId] = messages.filter(
          (m) => m.id !== messageId
        );
      }
    },
    // Clear messages for a channel
    clearMessages: (state, action: PayloadAction<string>) => {
      const channelId = action.payload;
      delete state.messagesByChannel[channelId];
      delete state.hasMoreByChannel[channelId];
      delete state.nextCursorByChannel[channelId];
      delete state.typingUsers[channelId];
    },
    // Typing indicator
    addTypingUser: (
      state,
      action: PayloadAction<{ channelId: string; userId: string; username: string }>
    ) => {
      const { channelId, userId, username } = action.payload;
      if (!state.typingUsers[channelId]) {
        state.typingUsers[channelId] = [];
      }
      // Check if user is already in the list
      const existingIndex = state.typingUsers[channelId].findIndex(
        (u) => u.userId === userId
      );
      if (existingIndex === -1) {
        state.typingUsers[channelId].push({ userId, username });
      } else {
        // Update username if it changed
        state.typingUsers[channelId][existingIndex].username = username;
      }
    },
    removeTypingUser: (
      state,
      action: PayloadAction<{ channelId: string; userId: string }>
    ) => {
      const { channelId, userId } = action.payload;
      if (state.typingUsers[channelId]) {
        state.typingUsers[channelId] = state.typingUsers[channelId].filter(
          (u) => u.userId !== userId
        );
      }
    },
    clearTypingUsers: (state, action: PayloadAction<string>) => {
      const channelId = action.payload;
      delete state.typingUsers[channelId];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Messages
      .addCase(fetchMessages.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.isLoading = false;
        const { channelId, messages, hasMore, nextCursor } = action.payload;
        if (!state.messagesByChannel[channelId]) {
          state.messagesByChannel[channelId] = [];
        }
        // Backend returns messages in descending order (newest first)
        // Reverse to get ascending order (oldest first, newest last)
        state.messagesByChannel[channelId] = [...messages].reverse();
        state.hasMoreByChannel[channelId] = hasMore;
        state.nextCursorByChannel[channelId] = nextCursor;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create Message
      .addCase(createMessage.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createMessage.fulfilled, (state, action) => {
        state.isLoading = false;
        const message = action.payload;
        if (!state.messagesByChannel[message.channelId]) {
          state.messagesByChannel[message.channelId] = [];
        }
        // Message will be added via SignalR ReceiveMessage event
        // This is just for optimistic update if needed
      })
      .addCase(createMessage.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update Message
      .addCase(updateMessage.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateMessage.fulfilled, (state) => {
        state.isLoading = false;
        // Message will be updated via SignalR MessageEdited event
      })
      .addCase(updateMessage.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Delete Message
      .addCase(deleteMessage.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteMessage.fulfilled, (state) => {
        state.isLoading = false;
        // Message will be removed via SignalR MessageDeleted event
      })
      .addCase(deleteMessage.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setMessages,
  addMessages,
  addMessage,
  updateMessageState,
  removeMessage,
  clearMessages,
  addTypingUser,
  removeTypingUser,
  clearTypingUsers,
  clearError,
} = messagesSlice.actions;
export default messagesSlice.reducer;
