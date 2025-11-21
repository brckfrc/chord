import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import {
  mentionsApi,
  type MessageMentionDto,
} from "@/lib/api/mentions";

interface MentionsState {
  mentions: MessageMentionDto[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
}

const initialState: MentionsState = {
  mentions: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
};

// Fetch user mentions
export const fetchMentions = createAsyncThunk(
  "mentions/fetchMentions",
  async (unreadOnly: boolean = false, { rejectWithValue }) => {
    try {
      return await mentionsApi.getUserMentions(unreadOnly);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch mentions"
      );
    }
  }
);

// Fetch unread mention count
export const fetchUnreadMentionCount = createAsyncThunk(
  "mentions/fetchUnreadMentionCount",
  async (_, { rejectWithValue }) => {
    try {
      return await mentionsApi.getUnreadMentionCount();
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch unread mention count"
      );
    }
  }
);

// Mark mention as read
export const markMentionAsRead = createAsyncThunk(
  "mentions/markMentionAsRead",
  async (mentionId: string, { rejectWithValue }) => {
    try {
      await mentionsApi.markMentionAsRead(mentionId);
      return mentionId;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to mark mention as read"
      );
    }
  }
);

const mentionsSlice = createSlice({
  name: "mentions",
  initialState,
  reducers: {
    addMention: (state, action: PayloadAction<MessageMentionDto>) => {
      // Check if mention already exists
      const exists = state.mentions.some((m) => m.id === action.payload.id);
      if (!exists) {
        state.mentions.unshift(action.payload);
        if (!action.payload.isRead) {
          state.unreadCount += 1;
        }
      }
    },
    updateMention: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<MessageMentionDto> }>
    ) => {
      const index = state.mentions.findIndex(
        (m) => m.id === action.payload.id
      );
      if (index !== -1) {
        const wasUnread = !state.mentions[index].isRead;
        state.mentions[index] = {
          ...state.mentions[index],
          ...action.payload.updates,
        };
        const isNowRead = state.mentions[index].isRead;
        
        // Update unread count
        if (wasUnread && isNowRead) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        } else if (!wasUnread && !isNowRead) {
          state.unreadCount += 1;
        }
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Mentions
      .addCase(fetchMentions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMentions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.mentions = action.payload;
      })
      .addCase(fetchMentions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch Unread Count
      .addCase(fetchUnreadMentionCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      })
      // Mark Mention as Read
      .addCase(markMentionAsRead.fulfilled, (state, action) => {
        const index = state.mentions.findIndex(
          (m) => m.id === action.payload
        );
        if (index !== -1 && !state.mentions[index].isRead) {
          state.mentions[index].isRead = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      });
  },
});

export const { addMention, updateMention, clearError } = mentionsSlice.actions;
export default mentionsSlice.reducer;

