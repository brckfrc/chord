import { useState, useEffect } from "react"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { fetchGuildRoles, createRole, updateRole, deleteRole } from "@/store/slices/rolesSlice"
import { usePermission, GuildPermission } from "@/hooks/usePermission"
import { type RoleDto, type CreateRoleDto, type UpdateRoleDto, PermissionLabels } from "@/lib/api/roles"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Plus, Pencil, Trash2, Shield, Crown, Users } from "lucide-react"
import { cn } from "@/lib/utils"

interface RoleManagementProps {
    guildId: string
}

export function RoleManagement({ guildId }: RoleManagementProps) {
    const dispatch = useAppDispatch()
    const { rolesByGuild, isLoading } = useAppSelector((state) => state.roles)
    const { hasPermission, isOwner, canManageRole } = usePermission(guildId)

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [editingRole, setEditingRole] = useState<RoleDto | null>(null)
    const [deleteConfirmRole, setDeleteConfirmRole] = useState<RoleDto | null>(null)

    const roles = rolesByGuild[guildId] || []
    const canManageRoles = hasPermission(GuildPermission.ManageRoles)

    useEffect(() => {
        if (guildId) {
            dispatch(fetchGuildRoles(guildId))
        }
    }, [dispatch, guildId])

    const handleCreateRole = async (data: CreateRoleDto) => {
        await dispatch(createRole({ guildId, dto: data }))
        setIsCreateModalOpen(false)
    }

    const handleUpdateRole = async (roleId: string, data: UpdateRoleDto) => {
        await dispatch(updateRole({ guildId, roleId, dto: data }))
        setEditingRole(null)
    }

    const handleDeleteRole = async (roleId: string) => {
        await dispatch(deleteRole({ guildId, roleId }))
        setDeleteConfirmRole(null)
    }

    const getRoleIcon = (role: RoleDto) => {
        if (role.name === "owner") return <Crown className="h-4 w-4 text-yellow-500" />
        if (role.name === "general") return <Users className="h-4 w-4 text-gray-500" />
        return <Shield className="h-4 w-4" style={{ color: role.color || "#9E9E9E" }} />
    }

    if (!canManageRoles && !isOwner) {
        return (
            <div className="p-4 text-center text-muted-foreground">
                You don't have permission to manage roles.
            </div>
        )
    }

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Roles</h2>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCreateModalOpen(true)}
                    disabled={!canManageRoles}
                >
                    <Plus className="h-4 w-4 mr-1" />
                    Create Role
                </Button>
            </div>

            {isLoading ? (
                <div className="text-center py-4 text-muted-foreground">Loading roles...</div>
            ) : (
                <div className="space-y-2">
                    {roles.map((role) => (
                        <div
                            key={role.id}
                            className={cn(
                                "flex items-center justify-between p-3 rounded-lg border",
                                role.isSystemRole ? "bg-muted/50" : "bg-background"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                {getRoleIcon(role)}
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="font-medium"
                                            style={{ color: role.color || "inherit" }}
                                        >
                                            {role.name}
                                        </span>
                                        {role.isSystemRole && (
                                            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                System
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {role.memberCount} {role.memberCount === 1 ? "member" : "members"}
                                    </div>
                                </div>
                            </div>

                            {!role.isSystemRole && canManageRole(role.position) && (
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setEditingRole(role)}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                        onClick={() => setDeleteConfirmRole(role)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Create Role Modal */}
            <RoleModal
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
                title="Create Role"
                onSubmit={(data) => handleCreateRole(data as CreateRoleDto)}
            />

            {/* Edit Role Modal */}
            {editingRole && (
                <RoleModal
                    open={!!editingRole}
                    onOpenChange={(open) => !open && setEditingRole(null)}
                    title="Edit Role"
                    role={editingRole}
                    onSubmit={(data) => handleUpdateRole(editingRole.id, data as UpdateRoleDto)}
                />
            )}

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteConfirmRole} onOpenChange={(open) => !open && setDeleteConfirmRole(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Role</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete the role "{deleteConfirmRole?.name}"?
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => setDeleteConfirmRole(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => deleteConfirmRole && handleDeleteRole(deleteConfirmRole.id)}
                        >
                            Delete
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// Role Create/Edit Modal
interface RoleModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    role?: RoleDto
    onSubmit: (data: CreateRoleDto | UpdateRoleDto) => void
}

function RoleModal({ open, onOpenChange, title, role, onSubmit }: RoleModalProps) {
    const [name, setName] = useState(role?.name || "")
    const [color, setColor] = useState(role?.color || "#9E9E9E")
    const [permissions, setPermissions] = useState<bigint>(BigInt(role?.permissions || 0))

    useEffect(() => {
        if (role) {
            setName(role.name)
            setColor(role.color || "#9E9E9E")
            setPermissions(BigInt(role.permissions))
        } else {
            setName("")
            setColor("#9E9E9E")
            setPermissions(0n)
        }
    }, [role, open])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSubmit({
            name: name || undefined,
            color: color || undefined,
            permissions: Number(permissions),
        })
    }

    const togglePermission = (perm: bigint) => {
        if ((permissions & perm) !== 0n) {
            setPermissions(permissions & ~perm)
        } else {
            setPermissions(permissions | perm)
        }
    }

    const permissionEntries = Object.entries(GuildPermission).filter(
        ([key, value]) => typeof value === "bigint" && value !== 0n && key !== "All" && key !== "AllText" && key !== "AllVoice" && key !== "AllBasic"
    )

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Role Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Role name"
                            required={!role}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="color">Color</Label>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                id="color"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="w-10 h-10 rounded cursor-pointer"
                            />
                            <Input
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                placeholder="#RRGGBB"
                                className="flex-1"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Permissions</Label>
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                            {permissionEntries.map(([key, value]) => (
                                <label
                                    key={key}
                                    className={cn(
                                        "flex items-center gap-2 p-2 rounded cursor-pointer text-sm",
                                        (permissions & (value as bigint)) !== 0n
                                            ? "bg-primary/20 border border-primary"
                                            : "bg-muted hover:bg-muted/80"
                                    )}
                                >
                                    <input
                                        type="checkbox"
                                        checked={(permissions & (value as bigint)) !== 0n}
                                        onChange={() => togglePermission(value as bigint)}
                                        className="sr-only"
                                    />
                                    <span>{PermissionLabels[key] || key}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            {role ? "Save Changes" : "Create Role"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}

