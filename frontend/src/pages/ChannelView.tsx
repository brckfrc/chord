import { useParams } from "react-router-dom"

export function ChannelView() {
  const { guildId, channelId } = useParams<{
    guildId: string
    channelId: string
  }>()

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Channel Header */}
      <div className="h-12 border-b border-border px-4 flex items-center shadow-sm">
        <h2 className="text-base font-semibold">
          Channel: {channelId?.substring(0, 8)}...
        </h2>
      </div>

      {/* Channel Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Channel View</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Guild ID: {guildId}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Channel ID: {channelId}
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Messaging UI will be implemented in FAZ 6
          </p>
        </div>
      </div>
    </div>
  )
}

