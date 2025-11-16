import { type ReactNode } from "react"
import { GuildSidebar } from "@/components/sidebars/GuildSidebar"
import { ChannelSidebar } from "@/components/sidebars/ChannelSidebar"
import { MemberList } from "@/components/sidebars/MemberList"

interface MainLayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      {/* Guild Sidebar */}
      <GuildSidebar />

      {/* Channel Sidebar */}
      <ChannelSidebar />

      {/* Content Area */}
      <main className="flex-1 overflow-hidden">{children}</main>

      {/* Member List */}
      <MemberList />
    </div>
  )
}

