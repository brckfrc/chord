import { useState } from "react"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { usePermission, GuildPermission } from "@/hooks/usePermission"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save, Loader2 } from "lucide-react"
import { guildsApi } from "@/lib/api/guilds"
import { fetchGuilds } from "@/store/slices/guildsSlice"
import { AvatarUpload } from "@/components/ui/AvatarUpload"
import { uploadApi } from "@/lib/api/upload"
import { useToast } from "@/hooks/use-toast"

interface GuildOverviewSettingsProps {
  guildId: string
  guildName: string
}

export function GuildOverviewSettings({ guildId, guildName }: GuildOverviewSettingsProps) {
  const dispatch = useAppDispatch()
  const { guilds } = useAppSelector((state) => state.guilds)
  const { hasPermission, isOwner } = usePermission(guildId)
  const { toast } = useToast()

  const guild = guilds.find((g) => g.id === guildId)

  const [name, setName] = useState(guild?.name || guildName)
  const [description, setDescription] = useState(guild?.description || "")
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const canManageGuild = hasPermission(GuildPermission.ManageGuild)

  const handleSave = async () => {
    if (!canManageGuild && !isOwner) return

    setIsSaving(true)
    setSaveSuccess(false)

    try {
      await guildsApi.updateGuild(guildId, {
        name,
        description: description || undefined,
        iconUrl: guild?.iconUrl,
      })
      await dispatch(fetchGuilds())
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (error) {
      console.error("Failed to update guild:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const hasChanges = name !== guild?.name || description !== (guild?.description || "")

  if (!canManageGuild && !isOwner) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        You don't have permission to edit server settings.
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Server Icon */}
      <div className="flex items-center gap-6">
        <AvatarUpload
          currentImageUrl={guild?.iconUrl}
          fallback={name}
          onUpload={async (file) => {
            const iconUrl = await uploadApi.uploadGuildIcon(guildId, file)
            await dispatch(fetchGuilds())
            toast({
              title: "Icon Updated",
              description: "Server icon has been updated successfully.",
            })
            return iconUrl
          }}
          size="lg"
        />
        <div className="text-sm text-muted-foreground">
          <p>Click to upload a server icon</p>
          <p>JPG, PNG, GIF or WebP (max 8MB)</p>
        </div>
      </div>

      {/* Server Name */}
      <div className="space-y-2">
        <Label htmlFor="server-name">Server Name</Label>
        <Input
          id="server-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Server name"
          maxLength={100}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell people about your server..."
          className="w-full h-24 px-3 py-2 bg-background border border-input rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground text-right">
          {description.length}/500
        </p>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="min-w-[100px]"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saveSuccess ? (
            "Saved!"
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Danger Zone */}
      {isOwner && (
        <div className="pt-6 border-t border-border">
          <h4 className="text-sm font-semibold text-destructive mb-4">Danger Zone</h4>
          <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Delete Server</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete this server and all its data
                </p>
              </div>
              <Button variant="destructive" size="sm" disabled>
                Delete Server
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

