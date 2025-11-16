import { useEffect, useState, useRef } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { fetchGuilds, setSelectedGuild } from "@/store/slices/guildsSlice"
import { clearChannels } from "@/store/slices/channelsSlice"
import { Button } from "@/components/ui/button"
import { CreateGuildModal } from "@/components/modals/CreateGuildModal"
import { Plus, Home } from "lucide-react"
import { cn } from "@/lib/utils"
import type { GuildDto } from "@/lib/api/guilds"

export function GuildSidebar() {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const location = useLocation()
    const { guilds, selectedGuildId } = useAppSelector(
        (state) => state.guilds
    )
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [hoveredGuild, setHoveredGuild] = useState<GuildDto | null>(null)
    const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })
    const guildButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({})

    const isHomeActive = location.pathname === "/me" || location.pathname.startsWith("/me/dm/")

    useEffect(() => {
        dispatch(fetchGuilds())
    }, [dispatch])

    const handleHomeClick = () => {
        dispatch(setSelectedGuild(null))
        dispatch(clearChannels())
        navigate("/me")
    }

    const handleGuildClick = (guildId: string) => {
        dispatch(setSelectedGuild(guildId))
        // Navigate to guild view, it will handle channel navigation
        navigate(`/guilds/${guildId}`)
    }

    const handleCreateGuild = () => {
        setIsCreateModalOpen(true)
    }

    const handleGuildMouseEnter = (guild: GuildDto, event: React.MouseEvent<HTMLButtonElement>) => {
        setHoveredGuild(guild)
        const rect = event.currentTarget.getBoundingClientRect()
        setTooltipPosition({
            top: rect.top + rect.height / 2,
            left: rect.right + 8,
        })
    }

    const handleGuildMouseLeave = () => {
        setHoveredGuild(null)
    }

    return (
        <div className="w-16 bg-[#1e1f22] flex flex-col items-center py-3 gap-2 h-full">
            {/* Home Button */}
            <Button
                onClick={handleHomeClick}
                variant="ghost"
                size="icon"
                className={cn(
                    "w-12 h-12 rounded-full transition-all hover:rounded-2xl",
                    isHomeActive
                        ? "bg-primary rounded-2xl text-primary-foreground hover:bg-accent"
                        : "bg-muted hover:bg-accent text-foreground"
                )}
                title="Home"
            >
                <Home className="h-6 w-6" />
            </Button>

            <div className="w-8 h-px bg-border" />

            {/* Guild List */}
            <div className="flex flex-col items-center gap-2 overflow-y-auto scrollbar-hide flex-1">
                {guilds.map((guild) => (
                    <button
                        key={guild.id}
                        ref={(el) => {
                            guildButtonRefs.current[guild.id] = el
                        }}
                        onClick={() => handleGuildClick(guild.id)}
                        onMouseEnter={(e) => handleGuildMouseEnter(guild, e)}
                        onMouseLeave={handleGuildMouseLeave}
                        className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg transition-all hover:rounded-2xl cursor-pointer",
                            selectedGuildId === guild.id || location.pathname.includes(guild.id)
                                ? "bg-primary rounded-2xl hover:bg-accent"
                                : "bg-muted hover:bg-accent"
                        )}
                    >
                        {guild.iconUrl ? (
                            <img
                                src={guild.iconUrl}
                                alt={guild.name}
                                className="w-full h-full rounded-full object-cover"
                            />
                        ) : (
                            guild.name.charAt(0).toUpperCase()
                        )}
                    </button>
                ))}

                <div className="w-8 h-px bg-border mx-auto" />

                {/* Create Guild Button - Right after guild list */}
                <Button
                    onClick={handleCreateGuild}
                    variant="ghost"
                    size="icon"
                    className="w-12 h-12 rounded-full bg-primary hover:bg-accent hover:rounded-2xl text-primary-foreground transition-all"
                    title="Create Guild"
                >
                    <Plus className="h-6 w-6" />
                </Button>
            </div>

            <CreateGuildModal
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
            />

            {/* Guild Tooltip */}
            {hoveredGuild && (
                <div
                    className="fixed z-50 bg-[#111214] text-white px-3 py-2 rounded-md shadow-lg pointer-events-none whitespace-nowrap"
                    style={{
                        top: `${tooltipPosition.top}px`,
                        left: `${tooltipPosition.left}px`,
                        transform: "translateY(-50%)",
                    }}
                >
                    <div className="font-semibold text-sm">{hoveredGuild.name}</div>
                </div>
            )}
        </div>
    )
}

