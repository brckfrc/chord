import { type ReactNode } from "react"
import { GuildSidebar } from "@/components/sidebars/GuildSidebar"
import { FriendsSidebar } from "@/components/sidebars/FriendsSidebar"

interface FriendsLayoutProps {
  children: ReactNode
}

export function FriendsLayout({ children }: FriendsLayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      {/* Guild Sidebar */}
      <GuildSidebar />

      {/* Friends Sidebar */}
      <FriendsSidebar />

      {/* Content Area */}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  )
}

