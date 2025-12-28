import { useState, useEffect } from "react"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { fetchGuildRoles, assignRoleToMember, removeRoleFromMember } from "@/store/slices/rolesSlice"
import { usePermission, GuildPermission } from "@/hooks/usePermission"
import { rolesApi, type RoleDto } from "@/lib/api/roles"
import { guildsApi, type GuildMemberDto } from "@/lib/api/guilds"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Shield, Crown, Users, Plus, X, Search, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface MemberRolesTabProps {
  guildId: string
}

interface MemberWithRoles extends GuildMemberDto {
  roles: RoleDto[]
}

export function MemberRolesTab({ guildId }: MemberRolesTabProps) {
  const dispatch = useAppDispatch()
  const { rolesByGuild } = useAppSelector((state) => state.roles)
  const { hasPermission, canManageRole } = usePermission(guildId)

  const [members, setMembers] = useState<MemberWithRoles[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedMember, setExpandedMember] = useState<string | null>(null)

  const allRoles = rolesByGuild[guildId] || []
  const canManageRoles = hasPermission(GuildPermission.ManageRoles)

  useEffect(() => {
    if (guildId) {
      dispatch(fetchGuildRoles(guildId))
      loadMembers()
    }
  }, [guildId, dispatch])

  const loadMembers = async () => {
    setIsLoading(true)
    try {
      const memberList = await guildsApi.getGuildMembers(guildId)
      
      // Load roles for each member
      const membersWithRoles = await Promise.all(
        memberList.map(async (member) => {
          try {
            const roles = await rolesApi.getMemberRoles(guildId, member.userId)
            return { ...member, roles }
          } catch {
            return { ...member, roles: [] }
          }
        })
      )
      
      setMembers(membersWithRoles)
    } catch (error) {
      console.error("Failed to load members:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAssignRole = async (userId: string, roleId: string) => {
    try {
      await dispatch(assignRoleToMember({ guildId, userId, roleId }))
      // Reload member roles
      const roles = await rolesApi.getMemberRoles(guildId, userId)
      setMembers((prev) =>
        prev.map((m) => (m.userId === userId ? { ...m, roles } : m))
      )
    } catch (error) {
      console.error("Failed to assign role:", error)
    }
  }

  const handleRemoveRole = async (userId: string, roleId: string) => {
    try {
      await dispatch(removeRoleFromMember({ guildId, userId, roleId }))
      // Reload member roles
      const roles = await rolesApi.getMemberRoles(guildId, userId)
      setMembers((prev) =>
        prev.map((m) => (m.userId === userId ? { ...m, roles } : m))
      )
    } catch (error) {
      console.error("Failed to remove role:", error)
    }
  }

  const getRoleIcon = (role: RoleDto) => {
    if (role.name === "owner") return <Crown className="h-3 w-3 text-yellow-500" />
    if (role.name === "general") return <Users className="h-3 w-3 text-gray-500" />
    return <Shield className="h-3 w-3" style={{ color: role.color || "#9E9E9E" }} />
  }

  const filteredMembers = members.filter((member) => {
    const displayName = member.nickname || member.user?.displayName || member.user?.username || ""
    const username = member.user?.username || ""
    const query = searchQuery.toLowerCase()
    return displayName.toLowerCase().includes(query) || username.toLowerCase().includes(query)
  })

  if (!canManageRoles) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        You don't have permission to manage member roles.
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search members..."
          className="pl-9"
        />
      </div>

      {/* Member List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMembers.map((member) => {
            const memberRoleIds = new Set(member.roles.map((r) => r.id))
            const availableRoles = allRoles.filter(
              (r) => !memberRoleIds.has(r.id) && !r.isSystemRole && canManageRole(r.position)
            )
            const isExpanded = expandedMember === member.userId

            return (
              <div
                key={member.userId}
                className="border border-border rounded-lg overflow-hidden"
              >
                {/* Member Header */}
                <div
                  className="p-3 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedMember(isExpanded ? null : member.userId)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                      {(member.nickname || member.user?.displayName || member.user?.username || "?")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">
                        {member.nickname || member.user?.displayName || member.user?.username}
                      </p>
                      {member.nickname && member.user?.username && (
                        <p className="text-xs text-muted-foreground">@{member.user.username}</p>
                      )}
                    </div>
                  </div>

                  {/* Role badges */}
                  <div className="flex items-center gap-1.5">
                    {member.roles.slice(0, 3).map((role) => (
                      <div
                        key={role.id}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted"
                        style={{
                          borderColor: role.color || "#9E9E9E",
                          borderWidth: "1px",
                          borderStyle: "solid",
                        }}
                      >
                        {getRoleIcon(role)}
                        <span style={{ color: role.color || "inherit" }}>{role.name}</span>
                      </div>
                    ))}
                    {member.roles.length > 3 && (
                      <span className="text-xs text-muted-foreground">
                        +{member.roles.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded Role Management */}
                {isExpanded && (
                  <div className="border-t border-border p-4 bg-muted/30 space-y-3">
                    {/* Current Roles */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Current Roles
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {member.roles.map((role) => (
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
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRemoveRole(member.userId, role.id)
                                }}
                                className="ml-1 hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Add Roles */}
                    {availableRoles.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Add Role
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {availableRoles.map((role) => (
                            <Button
                              key={role.id}
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleAssignRole(member.userId, role.id)
                              }}
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
              </div>
            )
          })}

          {filteredMembers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "No members found" : "No members in this server"}
            </div>
          )}
        </div>
      )}
    </div>
  )
}



