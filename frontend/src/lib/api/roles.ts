import { api } from "../api"

// GuildPermission flags - must match backend GuildPermission enum
export const GuildPermission = {
  None: 0n,
  Administrator: 1n << 0n, // Full access, bypasses all checks
  ManageGuild: 1n << 1n, // Edit guild settings
  ManageChannels: 1n << 2n, // Create, edit, delete channels
  ManageRoles: 1n << 3n, // Create, edit, delete roles
  ManageMessages: 1n << 4n, // Delete any message, pin/unpin

  KickMembers: 1n << 5n,
  BanMembers: 1n << 6n,

  SendMessages: 1n << 7n,
  ReadMessages: 1n << 8n,
  MentionEveryone: 1n << 9n,
  AddReactions: 1n << 10n,

  Connect: 1n << 11n, // Join voice
  Speak: 1n << 12n,
  MuteMembers: 1n << 13n,
  DeafenMembers: 1n << 14n,
  MoveMembers: 1n << 15n,

  CreateInvite: 1n << 16n,
} as const

export type GuildPermissionFlag = (typeof GuildPermission)[keyof typeof GuildPermission]

export interface RoleDto {
  id: string
  guildId: string
  name: string
  color?: string
  position: number
  permissions: number // Will be BigInt in JS but comes as number from API
  isSystemRole: boolean
  memberCount: number
  createdAt: string
}

export interface CreateRoleDto {
  name: string
  color?: string
  permissions: number
}

export interface UpdateRoleDto {
  name?: string
  color?: string
  permissions?: number
}

export interface ReorderRolesDto {
  roleIds: string[]
}

export const rolesApi = {
  // Get all roles for a guild
  getGuildRoles: async (guildId: string): Promise<RoleDto[]> => {
    const response = await api.get<RoleDto[]>(`/guilds/${guildId}/roles`)
    return response.data
  },

  // Get a specific role
  getRole: async (guildId: string, roleId: string): Promise<RoleDto> => {
    const response = await api.get<RoleDto>(`/guilds/${guildId}/roles/${roleId}`)
    return response.data
  },

  // Create a new role
  createRole: async (guildId: string, dto: CreateRoleDto): Promise<RoleDto> => {
    const response = await api.post<RoleDto>(`/guilds/${guildId}/roles`, dto)
    return response.data
  },

  // Update a role
  updateRole: async (guildId: string, roleId: string, dto: UpdateRoleDto): Promise<RoleDto> => {
    const response = await api.put<RoleDto>(`/guilds/${guildId}/roles/${roleId}`, dto)
    return response.data
  },

  // Delete a role
  deleteRole: async (guildId: string, roleId: string): Promise<void> => {
    await api.delete(`/guilds/${guildId}/roles/${roleId}`)
  },

  // Reorder roles
  reorderRoles: async (guildId: string, roleIds: string[]): Promise<void> => {
    await api.put(`/guilds/${guildId}/roles/reorder`, { roleIds })
  },

  // Assign a role to a member
  assignRole: async (guildId: string, userId: string, roleId: string): Promise<void> => {
    await api.post(`/guilds/${guildId}/members/${userId}/roles/${roleId}`)
  },

  // Remove a role from a member
  removeRole: async (guildId: string, userId: string, roleId: string): Promise<void> => {
    await api.delete(`/guilds/${guildId}/members/${userId}/roles/${roleId}`)
  },

  // Get all roles for a member
  getMemberRoles: async (guildId: string, userId: string): Promise<RoleDto[]> => {
    const response = await api.get<RoleDto[]>(`/guilds/${guildId}/members/${userId}/roles`)
    return response.data
  },
}

// Helper function to check if a permission set includes a specific permission
export function hasPermission(permissions: number | bigint, permission: bigint): boolean {
  const permBigInt = typeof permissions === "number" ? BigInt(permissions) : permissions

  // Administrator has all permissions
  if ((permBigInt & GuildPermission.Administrator) !== 0n) {
    return true
  }

  return (permBigInt & permission) !== 0n
}

// Get all set permissions as an array
export function getPermissionFlags(permissions: number | bigint): bigint[] {
  const permBigInt = typeof permissions === "number" ? BigInt(permissions) : permissions
  const flags: bigint[] = []

  for (const [, value] of Object.entries(GuildPermission)) {
    if (typeof value === "bigint" && value !== 0n && (permBigInt & value) !== 0n) {
      flags.push(value)
    }
  }

  return flags
}

// Combine multiple permission flags
export function combinePermissions(...permissions: bigint[]): bigint {
  return permissions.reduce((acc, p) => acc | p, 0n)
}

// Permission display names for UI
export const PermissionLabels: Record<string, string> = {
  Administrator: "Administrator",
  ManageGuild: "Manage Server",
  ManageChannels: "Manage Channels",
  ManageRoles: "Manage Roles",
  ManageMessages: "Manage Messages",
  KickMembers: "Kick Members",
  BanMembers: "Ban Members",
  SendMessages: "Send Messages",
  ReadMessages: "Read Messages",
  MentionEveryone: "Mention @everyone",
  AddReactions: "Add Reactions",
  Connect: "Connect to Voice",
  Speak: "Speak in Voice",
  MuteMembers: "Mute Members",
  DeafenMembers: "Deafen Members",
  MoveMembers: "Move Members",
  CreateInvite: "Create Invites",
}



