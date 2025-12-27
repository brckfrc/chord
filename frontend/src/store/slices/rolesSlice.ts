import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"
import { rolesApi, type RoleDto, type CreateRoleDto, type UpdateRoleDto } from "@/lib/api/roles"

interface RolesState {
  // Roles by guild ID
  rolesByGuild: Record<string, RoleDto[]>
  // User's combined permissions by guild ID
  userPermissions: Record<string, number>
  // Track which guilds are currently fetching permissions
  fetchingPermissions: Record<string, boolean>
  // Loading states
  isLoading: boolean
  error: string | null
}

const initialState: RolesState = {
  rolesByGuild: {},
  userPermissions: {},
  fetchingPermissions: {},
  isLoading: false,
  error: null,
}

// Async thunks
export const fetchGuildRoles = createAsyncThunk(
  "roles/fetchGuildRoles",
  async (guildId: string, { rejectWithValue }) => {
    try {
      const roles = await rolesApi.getGuildRoles(guildId)
      return { guildId, roles }
    } catch (error) {
      return rejectWithValue((error as Error).message)
    }
  }
)

export const createRole = createAsyncThunk(
  "roles/createRole",
  async ({ guildId, dto }: { guildId: string; dto: CreateRoleDto }, { rejectWithValue }) => {
    try {
      const role = await rolesApi.createRole(guildId, dto)
      return { guildId, role }
    } catch (error) {
      return rejectWithValue((error as Error).message)
    }
  }
)

export const updateRole = createAsyncThunk(
  "roles/updateRole",
  async (
    { guildId, roleId, dto }: { guildId: string; roleId: string; dto: UpdateRoleDto },
    { rejectWithValue }
  ) => {
    try {
      const role = await rolesApi.updateRole(guildId, roleId, dto)
      return { guildId, role }
    } catch (error) {
      return rejectWithValue((error as Error).message)
    }
  }
)

export const deleteRole = createAsyncThunk(
  "roles/deleteRole",
  async ({ guildId, roleId }: { guildId: string; roleId: string }, { rejectWithValue }) => {
    try {
      await rolesApi.deleteRole(guildId, roleId)
      return { guildId, roleId }
    } catch (error) {
      return rejectWithValue((error as Error).message)
    }
  }
)

export const assignRoleToMember = createAsyncThunk(
  "roles/assignRole",
  async (
    { guildId, userId, roleId }: { guildId: string; userId: string; roleId: string },
    { rejectWithValue }
  ) => {
    try {
      await rolesApi.assignRole(guildId, userId, roleId)
      return { guildId, userId, roleId }
    } catch (error) {
      return rejectWithValue((error as Error).message)
    }
  }
)

export const removeRoleFromMember = createAsyncThunk(
  "roles/removeRole",
  async (
    { guildId, userId, roleId }: { guildId: string; userId: string; roleId: string },
    { rejectWithValue }
  ) => {
    try {
      await rolesApi.removeRole(guildId, userId, roleId)
      return { guildId, userId, roleId }
    } catch (error) {
      return rejectWithValue((error as Error).message)
    }
  }
)

export const fetchMemberRoles = createAsyncThunk(
  "roles/fetchMemberRoles",
  async ({ guildId, userId }: { guildId: string; userId: string }, { rejectWithValue }) => {
    try {
      const roles = await rolesApi.getMemberRoles(guildId, userId)
      // Calculate combined permissions
      let combinedPermissions = 0
      for (const role of roles) {
        combinedPermissions |= role.permissions
      }
      return { guildId, userId, roles, combinedPermissions }
    } catch (error) {
      return rejectWithValue((error as Error).message)
    }
  }
)

const rolesSlice = createSlice({
  name: "roles",
  initialState,
  reducers: {
    setUserPermissions: (
      state,
      action: PayloadAction<{ guildId: string; permissions: number }>
    ) => {
      state.userPermissions[action.payload.guildId] = action.payload.permissions
    },
    clearGuildRoles: (state, action: PayloadAction<string>) => {
      delete state.rolesByGuild[action.payload]
      delete state.userPermissions[action.payload]
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch guild roles
      .addCase(fetchGuildRoles.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchGuildRoles.fulfilled, (state, action) => {
        state.isLoading = false
        state.rolesByGuild[action.payload.guildId] = action.payload.roles
      })
      .addCase(fetchGuildRoles.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Create role
      .addCase(createRole.fulfilled, (state, action) => {
        const { guildId, role } = action.payload
        if (!state.rolesByGuild[guildId]) {
          state.rolesByGuild[guildId] = []
        }
        state.rolesByGuild[guildId].push(role)
        // Sort by position
        state.rolesByGuild[guildId].sort((a, b) => a.position - b.position)
      })
      // Update role
      .addCase(updateRole.fulfilled, (state, action) => {
        const { guildId, role } = action.payload
        const roles = state.rolesByGuild[guildId]
        if (roles) {
          const index = roles.findIndex((r) => r.id === role.id)
          if (index !== -1) {
            roles[index] = role
          }
        }
      })
      // Delete role
      .addCase(deleteRole.fulfilled, (state, action) => {
        const { guildId, roleId } = action.payload
        const roles = state.rolesByGuild[guildId]
        if (roles) {
          state.rolesByGuild[guildId] = roles.filter((r) => r.id !== roleId)
        }
      })
      // Fetch member roles
      .addCase(fetchMemberRoles.pending, (state, action) => {
        state.fetchingPermissions[action.meta.arg.guildId] = true
      })
      .addCase(fetchMemberRoles.fulfilled, (state, action) => {
        const { guildId, combinedPermissions } = action.payload
        state.userPermissions[guildId] = combinedPermissions
        state.fetchingPermissions[guildId] = false
      })
      .addCase(fetchMemberRoles.rejected, (state, action) => {
        state.fetchingPermissions[action.meta.arg.guildId] = false
      })
  },
})

export const { setUserPermissions, clearGuildRoles, clearError } = rolesSlice.actions
export default rolesSlice.reducer

