import { useState, useEffect } from "react"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { fetchGuildRoles, assignRoleToMember, removeRoleFromMember } from "@/store/slices/rolesSlice"
import { usePermission, GuildPermission } from "@/hooks/usePermission"
import { rolesApi, type RoleDto } from "@/lib/api/roles"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Shield, Plus, X, Crown, Users } from "lucide-react"
import { cn } from "@/lib/utils"

interface MemberRoleManagerProps {
  guildId: string
  userId: string
  username: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MemberRoleManager({
  guildId,
  userId,
  username,
  open,
  onOpenChange,
}: MemberRoleManagerProps) {
  const dispatch = useAppDispatch()
  const { rolesByGuild } = useAppSelector((state) => state.roles)
  const { hasPermission, canManageRole } = usePermission(guildId)

  const [memberRoles, setMemberRoles] = useState<RoleDto[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const allRoles = rolesByGuild[guildId] || []
  const canManageRoles = hasPermission(GuildPermission.ManageRoles)

  useEffect(() => {
    if (open && guildId) {
      dispatch(fetchGuildRoles(guildId))
      loadMemberRoles()
    }
  }, [open, guildId, dispatch])

  const loadMemberRoles = async () => {
    setIsLoading(true)
    try {
      const roles = await rolesApi.getMemberRoles(guildId, userId)
      setMemberRoles(roles)
    } catch (error) {
      console.error("Failed to load member roles:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAssignRole = async (roleId: string) => {
    try {
      await dispatch(assignRoleToMember({ guildId, userId, roleId }))
      await loadMemberRoles()
    } catch (error) {
      console.error("Failed to assign role:", error)
    }
  }

  const handleRemoveRole = async (roleId: string) => {
    try {
      await dispatch(removeRoleFromMember({ guildId, userId, roleId }))
      await loadMemberRoles()
    } catch (error) {
      console.error("Failed to remove role:", error)
    }
  }

  const memberRoleIds = new Set(memberRoles.map((r) => r.id))
  const availableRoles = allRoles.filter(
    (r) => !memberRoleIds.has(r.id) && !r.isSystemRole && canManageRole(r.position)
  )

  const getRoleIcon = (role: RoleDto) => {
    if (role.name === "owner") return <Crown className="h-3 w-3 text-yellow-500" />
    if (role.name === "general") return <Users className="h-3 w-3 text-gray-500" />
    return <Shield className="h-3 w-3" style={{ color: role.color || "#9E9E9E" }} />
  }

  if (!canManageRoles) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Manage Roles for {username}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-4">
            {/* Current Roles */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Current Roles</div>
              <div className="flex flex-wrap gap-2">
                {memberRoles.map((role) => (
                  <div
                    key={role.id}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs",
                      role.isSystemRole ? "bg-muted" : "bg-primary/20"
                    )}
                    style={{
                      borderColor: role.color || "#9E9E9E",
                      borderWidth: "1px",
                      borderStyle: "solid",
                    }}
                  >
                    {getRoleIcon(role)}
                    <span style={{ color: role.color || "inherit" }}>{role.name}</span>
                    {!role.isSystemRole && canManageRole(role.position) && (
                      <button
                        onClick={() => handleRemoveRole(role.id)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
                {memberRoles.length === 0 && (
                  <span className="text-sm text-muted-foreground">No roles</span>
                )}
              </div>
            </div>

            {/* Available Roles */}
            {availableRoles.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Add Role</div>
                <div className="flex flex-wrap gap-2">
                  {availableRoles.map((role) => (
                    <Button
                      key={role.id}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleAssignRole(role.id)}
                      style={{
                        borderColor: role.color || "#9E9E9E",
                        color: role.color || "inherit",
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {role.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}


