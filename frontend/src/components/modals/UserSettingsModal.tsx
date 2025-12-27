import { useState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate } from "react-router-dom"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { updateStatus, logout } from "@/store/slices/authSlice"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/hooks/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  User,
  Settings,
  Volume2,
  Monitor,
  LogOut,
  Shield,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AvatarUpload } from "@/components/ui/AvatarUpload"
import { uploadApi } from "@/lib/api/upload"
import { setUser } from "@/store/slices/authSlice"

// UserStatus enum values
const UserStatus = {
  Online: 0,
  Idle: 1,
  DoNotDisturb: 2,
  Invisible: 3,
  Offline: 4,
} as const

const updateSettingsSchema = z.object({
  status: z.number().min(0).max(4),
  customStatus: z.string().max(100, "Custom status must be less than 100 characters").optional(),
})

type UpdateSettingsFormData = z.infer<typeof updateSettingsSchema>

type SettingsCategory = "account" | "profile" | "voice" | "app" | "privacy"

interface CategoryItem {
  id: SettingsCategory
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const categories: CategoryItem[] = [
  { id: "account", label: "My Account", icon: User },
  { id: "profile", label: "User Profile", icon: Settings },
  { id: "voice", label: "Voice & Video", icon: Volume2 },
  { id: "app", label: "App Settings", icon: Monitor },
  { id: "privacy", label: "Privacy & Safety", icon: Shield },
]

interface UserSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserSettingsModal({ open, onOpenChange }: UserSettingsModalProps) {
  const { user } = useAppSelector((state) => state.auth)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>("account")
  const modalRef = useRef<HTMLDivElement>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<UpdateSettingsFormData>({
    resolver: zodResolver(updateSettingsSchema),
    defaultValues: {
      status: user?.status ?? UserStatus.Online,
      customStatus: user?.customStatus || "",
    },
  })

  const statusValue = watch("status")

  // Reset form when user changes or modal opens
  useEffect(() => {
    if (open && user) {
      reset({
        status: user.status ?? UserStatus.Online,
        customStatus: user.customStatus || "",
      })
    }
  }, [open, user, reset])

  // Handle ESC key to close modal
  useEffect(() => {
    if (!open) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false)
      }
    }

    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("keydown", handleEscape)
    }
  }, [open, onOpenChange])

  const onSubmit = async (data: UpdateSettingsFormData) => {
    setIsLoading(true)
    try {
      const result = await dispatch(
        updateStatus({
          status: data.status,
          customStatus: data.customStatus || undefined,
        })
      )

      if (updateStatus.fulfilled.match(result)) {
        toast({
          title: "Settings Updated",
          description: "Your settings have been saved successfully.",
        })
      } else {
        toast({
          title: "Error",
          description: result.payload as string || "Failed to update settings",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await dispatch(logout())
      navigate("/")
      onOpenChange(false)
      toast({
        title: "Logged Out",
        description: "You have been logged out successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      })
    }
  }

  const renderContent = () => {
    switch (activeCategory) {
      case "account":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">My Account</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Manage your account settings and information
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={user?.username || ""} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">
                  Your username cannot be changed
                </p>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ""} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">
                  Your email address
                </p>
              </div>
              <div className="pt-4 border-t">
                <Button
                  variant="destructive"
                  onClick={handleLogout}
                  className="w-full sm:w-auto"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log Out
                </Button>
              </div>
            </div>
          </div>
        )

      case "profile":
        return (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">User Profile</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Customize your profile and status
              </p>
            </div>
            <div className="space-y-4">
              {/* Avatar Upload */}
              <div className="space-y-2">
                <Label>Avatar</Label>
                <div className="flex items-center gap-4">
                  <AvatarUpload
                    currentImageUrl={user?.avatarUrl}
                    fallback={user?.displayName || user?.username || "U"}
                    onUpload={async (file) => {
                      const avatarUrl = await uploadApi.uploadAvatar(file)
                      // Update user state with new avatar
                      if (user) {
                        dispatch(setUser({ ...user, avatarUrl }))
                      }
                      toast({
                        title: "Avatar Updated",
                        description: "Your avatar has been updated successfully.",
                      })
                      return avatarUrl
                    }}
                    size="lg"
                  />
                  <div className="text-sm text-muted-foreground">
                    <p>Click to upload a new avatar</p>
                    <p>JPG, PNG, GIF or WebP (max 8MB)</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={statusValue?.toString()}
                  onValueChange={(value) => setValue("status", parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UserStatus.Online.toString()}>Online</SelectItem>
                    <SelectItem value={UserStatus.Idle.toString()}>Idle</SelectItem>
                    <SelectItem value={UserStatus.DoNotDisturb.toString()}>
                      Do Not Disturb
                    </SelectItem>
                    <SelectItem value={UserStatus.Invisible.toString()}>
                      Invisible
                    </SelectItem>
                    {/* Offline kaldırıldı - Invisible zaten diğerlerine offline gibi görünüyor */}
                  </SelectContent>
                </Select>
                {errors.status && (
                  <p className="text-sm text-destructive">
                    {errors.status.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="customStatus">Custom Status</Label>
                <Input
                  id="customStatus"
                  placeholder="e.g., Playing games, Working on project"
                  {...register("customStatus")}
                />
                {errors.customStatus && (
                  <p className="text-sm text-destructive">
                    {errors.customStatus.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Let others know what you're up to
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Spinner className="mr-2" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </div>
          </form>
        )

      case "voice":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Voice & Video</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Configure your voice and video settings
              </p>
            </div>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  Voice and video settings will be available soon.
                </p>
              </div>
            </div>
          </div>
        )

      case "app":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">App Settings</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Customize your app experience
              </p>
            </div>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  App settings will be available soon.
                </p>
              </div>
            </div>
          </div>
        )

      case "privacy":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Privacy & Safety</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Manage your privacy and safety settings
              </p>
            </div>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  Privacy and safety settings will be available soon.
                </p>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={modalRef} className="w-[900px] h-[600px] max-w-none p-0 flex flex-col">
        <DialogHeader className="px-8 pt-6 pb-4 border-b">
          <DialogTitle className="text-2xl">User Settings</DialogTitle>
        </DialogHeader>
        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <div className="w-60 border-r bg-muted/30 flex-shrink-0 overflow-y-auto">
            <div className="p-4 space-y-1">
              {categories.map((category) => {
                const Icon = category.icon
                return (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      activeCategory === category.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {category.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-8 py-6">
            {renderContent()}
          </div>
        </div>
        <DialogClose onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
