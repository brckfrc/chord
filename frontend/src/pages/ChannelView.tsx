import { useParams } from "react-router-dom"

export function ChannelView() {
  const { guildId, channelId } = useParams<{
    guildId: string
    channelId: string
  }>()

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Channel View</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Guild ID: {guildId}
        </p>
        <p className="mt-2 text-lg text-muted-foreground">
          Channel ID: {channelId}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          This page will be implemented in FAZ 5
        </p>
      </div>
    </div>
  )
}

