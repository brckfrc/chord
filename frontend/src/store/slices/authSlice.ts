import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import {
  authApi,
  type UserDto,
  type RegisterDto,
  type LoginDto,
  type UpdateStatusDto,
} from "@/lib/api/auth";

interface AuthState {
  user: UserDto | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isUpdatingStatus: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isUpdatingStatus: false,
  error: null,
};

// Check if user is already logged in
const token = localStorage.getItem("accessToken");
if (token) {
  initialState.isAuthenticated = true;
}

export const register = createAsyncThunk(
  "auth/register",
  async (data: RegisterDto, { rejectWithValue }) => {
    try {
      const response = await authApi.register(data);
      localStorage.setItem("accessToken", response.accessToken);
      localStorage.setItem("refreshToken", response.refreshToken);
      const user = await authApi.getCurrentUser();
      return user;
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } }
      return rejectWithValue(
        err.response?.data?.message || "Registration failed"
      );
    }
  }
);

export const login = createAsyncThunk(
  "auth/login",
  async (data: LoginDto, { rejectWithValue }) => {
    try {
      const response = await authApi.login(data);
      localStorage.setItem("accessToken", response.accessToken);
      localStorage.setItem("refreshToken", response.refreshToken);
      const user = await authApi.getCurrentUser();
      return user;
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } }
      return rejectWithValue(err.response?.data?.message || "Login failed");
    }
  }
);

export const getCurrentUser = createAsyncThunk(
  "auth/getCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      const user = await authApi.getCurrentUser();
      return user;
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } }
      return rejectWithValue(
        err.response?.data?.message || "Failed to get user"
      );
    }
  }
);

export const logout = createAsyncThunk("auth/logout", async () => {
  try {
    await authApi.logout();
  } catch (_error) {
    // Ignore logout errors
  } finally {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  }
});

export const updateStatus = createAsyncThunk(
  "auth/updateStatus",
  async (data: UpdateStatusDto, { rejectWithValue }) => {
    try {
      const user = await authApi.updateStatus(data);
      return user;
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } }
      return rejectWithValue(
        err.response?.data?.message || "Failed to update status"
      );
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    // Set user data directly (e.g., after avatar upload)
    setUser: (state, action: PayloadAction<UserDto>) => {
      state.user = action.payload;
    },
    // Update user status from SignalR StatusUpdated event
    updateStatusFromSignalR: (state, action: PayloadAction<{ status: number; customStatus?: string }>) => {
      if (state.user) {
        state.user.status = action.payload.status;
        if (action.payload.customStatus !== undefined) {
          state.user.customStatus = action.payload.customStatus;
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Register
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Get Current User
      .addCase(getCurrentUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.isLoading = false;
        // Clear state if token is invalid or unauthorized error occurs
        const error = action.payload as string;
        if (
          error?.includes("401") ||
          error?.includes("unauthorized") ||
          error?.includes("Invalid token")
        ) {
          state.isAuthenticated = false;
          state.user = null;
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
        }
        // Clear state for other errors (token might be invalid)
        // But preserve state for network/CORS errors
        if (
          error &&
          !error.includes("network") &&
          !error.includes("CORS") &&
          !error.includes("Failed to fetch")
        ) {
          // Token appears to be invalid, clear state
          const token = localStorage.getItem("accessToken");
          if (!token) {
            state.isAuthenticated = false;
            state.user = null;
          }
        }
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
      })
      // Update Status
      .addCase(updateStatus.pending, (state) => {
        state.isUpdatingStatus = true;
        state.error = null;
      })
      .addCase(updateStatus.fulfilled, (state, action) => {
        state.isUpdatingStatus = false;
        // Only update status and customStatus to avoid unnecessary re-renders
        if (state.user) {
          state.user.status = action.payload.status;
          state.user.customStatus = action.payload.customStatus;
        } else {
          state.user = action.payload;
        }
      })
      .addCase(updateStatus.rejected, (state, action) => {
        state.isUpdatingStatus = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setUser, updateStatusFromSignalR } = authSlice.actions;
export default authSlice.reducer;
