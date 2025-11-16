import { useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { fetchChannels } from "@/store/slices/channelsSlice"
import { Spinner } from "@/components/ui/spinner"
import { ChannelType } from "@/lib/api/channels"

export function GuildView() {
  const { guildId } = useParams<{ guildId: string }>()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { channels, isLoading } = useAppSelector((state) => state.channels)

  useEffect(() => {
    if (guildId) {
      dispatch(fetchChannels(guildId))
    }
  }, [dispatch, guildId])

  useEffect(() => {
    if (!isLoading && guildId && channels.length > 0) {
      // Find first text channel
      const firstTextChannel = channels.find(
        (c) => c.type === ChannelType.Text
      )
      if (firstTextChannel) {
        navigate(`/channels/${guildId}/${firstTextChannel.id}`, { replace: true })
      }
    }
  }, [isLoading, channels, guildId, navigate])

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Guild Header */}
      <div className="h-12 border-b border-border px-4 flex items-center shadow-sm">
        <h2 className="text-base font-semibold">
          {isLoading ? "Loading..." : "Guild"}
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Spinner className="w-8 h-8 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Loading channels...</p>
            </div>
          </div>
        ) : !guildId ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h1 className="text-2xl font-bold">Guild not found</h1>
            </div>
          </div>
        ) : channels.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h1 className="text-2xl font-bold">No channels yet</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Create a channel to get started
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

