import { useEffect, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { fetchDMs, setSelectedDM } from "@/store/slices/dmsSlice"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { AddFriendModal } from "@/components/modals/AddFriendModal"
import { User, Hash } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DMDto } from "@/lib/api/dms"

// UserStatus enum values
const UserStatus = {
    Online: 0,
    Idle: 1,
    DoNotDisturb: 2,
    Invisible: 3,
    Offline: 4,
} as const

function DMItem({ dm }: { dm: DMDto }) {
    const navigate = useNavigate()
    const location = useLocation()
    const dispatch = useAppDispatch()
    const isActive = location.pathname === `/me/dm/${dm.id}`

    const otherUser = dm.otherUser
    if (!otherUser) return null

    const getStatusColor = (status: number) => {
        switch (status) {
            case UserStatus.Online:
                return "bg-green-500"
            case UserStatus.Idle:
                return "bg-yellow-500"
            case UserStatus.DoNotDisturb:
                return "bg-red-500"
            case UserStatus.Invisible:
            case UserStatus.Offline:
            default:
                return "bg-gray-500"
        }
    }

    const handleClick = () => {
        dispatch(setSelectedDM(dm.id))
        navigate(`/me/dm/${dm.id}`)
    }

    const formatTime = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 1) return "now"
        if (diffMins < 60) return `${diffMins}m`
        if (diffHours < 24) return `${diffHours}h`
        if (diffDays < 7) return `${diffDays}d`
        return date.toLocaleDateString()
    }

    return (
        <button
            onClick={handleClick}
            className={cn(
                "w-full px-3 py-2 rounded flex items-center gap-3 transition-colors group relative cursor-pointer",
                isActive
                    ? "bg-accent"
                    : "hover:!bg-[#3f4147]"
            )}
        >
            <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                    {otherUser.displayName.charAt(0).toUpperCase()}
                </div>
                <div
                    className={cn(
                        "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-secondary",
                        getStatusColor(otherUser.status)
                    )}
                />
            </div>
            <div className="flex-1 text-left min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{otherUser.displayName}</p>
                    {dm.lastMessage && (
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                            {formatTime(dm.lastMessage.createdAt)}
                        </span>
                    )}
                </div>
                <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground truncate">
                        {dm.lastMessage?.content || "No messages yet"}
                    </p>
                    {dm.unreadCount > 0 && (
                        <span className="flex-shrink-0 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                            {dm.unreadCount > 99 ? "99+" : dm.unreadCount}
                        </span>
                    )}
                </div>
            </div>
        </button>
    )
}

export function FriendsSidebar() {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const location = useLocation()
    const { dms, isLoading } = useAppSelector((state) => state.dms)
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)

    const isFriendsActive = location.pathname === "/me"

    useEffect(() => {
        dispatch(fetchDMs())
    }, [dispatch])

    const handleFriendsClick = () => {
        dispatch(setSelectedDM(null))
        navigate("/me")
    }

    return (
        <div className="w-60 bg-secondary flex flex-col h-full">
            {/* FRIENDS Button */}
            <button
                onClick={handleFriendsClick}
                className={cn(
                    "h-12 px-4 flex items-center justify-between border-b border-border shadow-sm transition-colors flex-shrink-0",
                    isFriendsActive
                        ? "bg-accent text-foreground"
                        : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                )}
            >
                <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <h2 className="text-sm font-semibold">FRIENDS</h2>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                        e.stopPropagation()
                        setIsAddModalOpen(true)
                    }}
                    title="Add Friend"
                >
                    <Hash className="h-4 w-4" />
                </Button>
            </button>

            {/* Direct Messages Section */}
            <div className="flex-1 overflow-y-auto min-h-0">
                <div className="px-2 py-2">
                    <div className="px-2 mb-1">
                        <span className="text-xs font-semibold text-muted-foreground uppercase">
                            Direct Messages
                        </span>
                    </div>
                    {isLoading ? (
                        <div className="flex justify-center py-4">
                            <Spinner className="w-6 h-6" />
                        </div>
                    ) : dms.length === 0 ? (
                        <div className="px-2 py-4 text-center">
                            <p className="text-sm text-muted-foreground">No DMs yet</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {dms.map((dm) => (
                                <DMItem key={dm.id} dm={dm} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <AddFriendModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} />
        </div>
    )
}
