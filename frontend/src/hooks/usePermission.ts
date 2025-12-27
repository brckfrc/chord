import { useEffect, useMemo } from "react"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { fetchMemberRoles } from "@/store/slices/rolesSlice"
import { GuildPermission, hasPermission as checkHasPermission } from "@/lib/api/roles"

interface UsePermissionResult {
  // Check if user has a specific permission
  hasPermission: (permission: bigint) => boolean
  // Check if user is the guild owner
  isOwner: boolean
  // User's combined permissions (as number for easy comparison)
  permissions: number
  // Check if user can manage a role at a given position
  canManageRole: (rolePosition: number) => boolean
  // User's highest role position (lowest number = highest rank)
  highestRolePosition: number
  // Is loading permissions
  isLoading: boolean
}

export function usePermission(guildId: string | undefined): UsePermissionResult {
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((state) => state.auth)
  const { guilds } = useAppSelector((state) => state.guilds)
  const { userPermissions, rolesByGuild, isLoading, fetchingPermissions } = useAppSelector((state) => state.roles)

  // Find the guild to check ownership
  const guild = useMemo(() => {
    if (!guildId) return null
    return guilds.find((g) => g.id === guildId) || null
  }, [guilds, guildId])

  const isOwner = useMemo(() => {
    if (!guild || !user) return false
    return guild.ownerId === user.id
  }, [guild, user])

  const permissions = useMemo(() => {
    if (!guildId) return 0
    // Owners have all permissions
    if (isOwner) return Number(GuildPermission.Administrator)
    return userPermissions[guildId] || 0
  }, [guildId, isOwner, userPermissions])

  // Calculate highest role position for hierarchy checks
  const highestRolePosition = useMemo(() => {
    if (!guildId || !user) return 999 // Default to lowest
    if (isOwner) return 0 // Owner is always highest

    const guildRoles = rolesByGuild[guildId]
    if (!guildRoles) return 999

    // This would need member roles data - for now, use permissions
    // A user with Administrator permission effectively has position 0
    if (checkHasPermission(permissions, GuildPermission.Administrator)) {
      return 0
    }

    // Default to general role position
    return 999
  }, [guildId, user, isOwner, rolesByGuild, permissions])

  // Fetch user's roles when guildId changes
  useEffect(() => {
    // Only fetch if not already cached and not currently fetching
    const alreadyCached = guildId && userPermissions[guildId] !== undefined
    const isFetching = guildId && fetchingPermissions[guildId]
    
    if (guildId && user && !isOwner && !alreadyCached && !isFetching) {
      dispatch(fetchMemberRoles({ guildId, userId: user.id }))
    }
  }, [dispatch, guildId, user, isOwner, userPermissions, fetchingPermissions])

  const hasPermission = useMemo(() => {
    return (permission: bigint): boolean => {
      // Owners have all permissions
      if (isOwner) return true
      return checkHasPermission(permissions, permission)
    }
  }, [isOwner, permissions])

  const canManageRole = useMemo(() => {
    return (rolePosition: number): boolean => {
      // Owners can manage all roles
      if (isOwner) return true

      // Check ManageRoles permission
      if (!checkHasPermission(permissions, GuildPermission.ManageRoles)) {
        return false
      }

      // Can only manage roles below own highest role
      return rolePosition > highestRolePosition
    }
  }, [isOwner, permissions, highestRolePosition])

  return {
    hasPermission,
    isOwner,
    permissions,
    canManageRole,
    highestRolePosition,
    isLoading,
  }
}

// Re-export GuildPermission for easy access
export { GuildPermission }

