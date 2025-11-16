import { useEffect, useState } from "react"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  fetchFriends,
  fetchOnlineFriends,
  fetchPendingRequests,
  setActiveTab,
} from "@/store/slices/friendsSlice"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Plus, User } from "lucide-react"
import { AddFriendModal } from "@/components/modals/AddFriendModal"
import { cn } from "@/lib/utils"
import type { FriendDto, FriendRequestDto } from "@/lib/api/friends"

// UserStatus enum values
const UserStatus = {
  Online: 0,
  Idle: 1,
  DoNotDisturb: 2,
  Invisible: 3,
  Offline: 4,
} as const

function FriendItem({ friend }: { friend: FriendDto }) {
  const getStatusColor = (status: number) => {
    switch (status) {
      case UserStatus.Online:
        return "bg-green-500"
      case UserStatus.Idle:
        return "bg-yellow-500"
      case UserStatus.DoNotDisturb:
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <button
      className="w-full px-4 py-2 flex items-center gap-3 hover:bg-accent transition-colors rounded group"
      onClick={() => {
        // TODO: Navigate to DM when backend is ready
        console.log("Open DM with", friend.id)
      }}
    >
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
          {friend.displayName.charAt(0).toUpperCase()}
        </div>
        <div
          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-secondary ${getStatusColor(
            friend.status
          )}`}
        />
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className="text-sm font-medium truncate">{friend.displayName}</p>
        <p className="text-xs text-muted-foreground truncate">
          {friend.customStatus || friend.username}
        </p>
      </div>
    </button>
  )
}

function PendingRequestItem({ request }: { request: FriendRequestDto }) {
  const requester = request.requester
  const displayName = requester?.displayName || "Unknown User"

  const handleAccept = () => {
    // TODO: Implement when backend is ready
    console.log("Accept request", request.id)
  }

  const handleDecline = () => {
    // TODO: Implement when backend is ready
    console.log("Decline request", request.id)
  }

  return (
    <div className="w-full px-4 py-2 flex items-center gap-3 hover:bg-accent transition-colors rounded group">
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
          {displayName.charAt(0).toUpperCase()}
        </div>
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className="text-sm font-medium truncate">{displayName}</p>
        <p className="text-xs text-muted-foreground">Pending request</p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            handleAccept()
          }}
          className="text-green-600 hover:text-green-700 h-7 px-3 text-xs"
        >
          Accept
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            handleDecline()
          }}
          className="text-red-600 hover:text-red-700 h-7 px-3 text-xs"
        >
          Decline
        </Button>
      </div>
    </div>
  )
}

export function FriendsHome() {
  const dispatch = useAppDispatch()
  const { friends, onlineFriends, pendingRequests, activeTab, isLoading } =
    useAppSelector((state) => state.friends)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  useEffect(() => {
    dispatch(fetchFriends())
    dispatch(fetchOnlineFriends())
    dispatch(fetchPendingRequests())
  }, [dispatch])

  const tabs = [
    { id: "online" as const, label: "Online", count: onlineFriends.length },
    { id: "all" as const, label: "All", count: friends.length },
    {
      id: "pending" as const,
      label: "Pending",
      count: pendingRequests.length,
    },
  ]

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-full">
          <Spinner className="w-8 h-8" />
        </div>
      )
    }

    switch (activeTab) {
      case "online":
        if (onlineFriends.length === 0) {
          return (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center mb-4">
                <User className="w-16 h-16 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-bold mb-2">No online friends</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                Your friends will appear here when they're online.
              </p>
            </div>
          )
        }
        return (
          <div className="space-y-1">
            <div className="px-4 py-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                Online — {onlineFriends.length}
              </h3>
            </div>
            {onlineFriends.map((friend) => (
              <FriendItem key={friend.id} friend={friend} />
            ))}
          </div>
        )

      case "all":
        if (friends.length === 0) {
          return (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center mb-4">
                <User className="w-16 h-16 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-bold mb-2">No friends yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                Add friends to start chatting! You can add friends by their
                username.
              </p>
              <Button onClick={() => setIsAddModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Friend
              </Button>
            </div>
          )
        }
        return (
          <div className="space-y-1">
            <div className="px-4 py-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                All Friends — {friends.length}
              </h3>
            </div>
            {friends.map((friend) => (
              <FriendItem key={friend.id} friend={friend} />
            ))}
          </div>
        )

      case "pending":
        if (pendingRequests.length === 0) {
          return (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center mb-4">
                <User className="w-16 h-16 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-bold mb-2">No pending requests</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                Friend requests will appear here.
              </p>
            </div>
          )
        }
        return (
          <div className="space-y-1">
            <div className="px-4 py-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                Pending Requests — {pendingRequests.length}
              </h3>
            </div>
            {pendingRequests.map((request) => (
              <PendingRequestItem key={request.id} request={request} />
            ))}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header with Tabs */}
      <div className="border-b border-border">
        <div className="h-12 px-4 flex items-center shadow-sm">
          <h2 className="text-base font-semibold">Friends</h2>
        </div>
        <div className="px-4 pb-2">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => dispatch(setActiveTab(tab.id))}
                className={cn(
                  "px-4 py-1.5 rounded text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-1 text-muted-foreground">
                    ({tab.count})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">{renderContent()}</div>

      <AddFriendModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} />
    </div>
  )
}

