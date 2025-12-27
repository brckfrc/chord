import { useState } from "react"
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Home, Shield, Users, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { RoleManagement } from "@/components/settings/RoleManagement"
import { GuildOverviewSettings } from "@/components/settings/GuildOverviewSettings"
import { MemberRolesTab } from "@/components/settings/MemberRolesTab"

interface GuildSettingsModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    guildId: string
    guildName: string
}

type SettingsTab = "overview" | "roles" | "members"

interface TabItem {
    id: SettingsTab
    label: string
    icon: React.ReactNode
}

const tabs: TabItem[] = [
    { id: "overview", label: "Overview", icon: <Home className="h-4 w-4" /> },
    { id: "roles", label: "Roles", icon: <Shield className="h-4 w-4" /> },
    { id: "members", label: "Members", icon: <Users className="h-4 w-4" /> },
]

export function GuildSettingsModal({
    open,
    onOpenChange,
    guildId,
    guildName,
}: GuildSettingsModalProps) {
    const [activeTab, setActiveTab] = useState<SettingsTab>("overview")

    const renderTabContent = () => {
        switch (activeTab) {
            case "overview":
                return <GuildOverviewSettings guildId={guildId} guildName={guildName} />
            case "roles":
                return <RoleManagement guildId={guildId} />
            case "members":
                return <MemberRolesTab guildId={guildId} />
            default:
                return null
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[900px] max-w-[90vw] h-[80vh] p-0 gap-0 overflow-hidden">
                <div className="flex h-full">
                    {/* Sidebar */}
                    <div className="w-48 bg-[#2b2d31] border-r border-border flex flex-col">
                        {/* Header */}
                        <div className="p-4 border-b border-border">
                            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                {guildName}
                            </h2>
                            <p className="text-xs text-muted-foreground mt-1">Server Settings</p>
                        </div>

                        {/* Navigation */}
                        <nav className="flex-1 p-2 space-y-1">
                            {tabs.map((tab) => (
                                <Button
                                    key={tab.id}
                                    variant="ghost"
                                    className={cn(
                                        "w-full justify-start gap-2 h-9",
                                        activeTab === tab.id
                                            ? "bg-[#404249] text-white"
                                            : "text-muted-foreground hover:text-foreground hover:bg-[#35373c]"
                                    )}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    {tab.icon}
                                    {tab.label}
                                </Button>
                            ))}
                        </nav>
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col min-w-0">
                        {/* Content Header */}
                        <div className="h-14 px-4 flex items-center justify-between border-b border-border bg-background">
                            <h3 className="text-lg font-semibold">
                                {tabs.find((t) => t.id === activeTab)?.label}
                            </h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => onOpenChange(false)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto">
                            {renderTabContent()}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

