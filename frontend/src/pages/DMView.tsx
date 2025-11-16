import { useEffect } from "react"
import { useParams } from "react-router-dom"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { fetchDMs, setSelectedDM } from "@/store/slices/dmsSlice"
import { Spinner } from "@/components/ui/spinner"

export function DMView() {
  const { channelId } = useParams<{ channelId: string }>()
  const dispatch = useAppDispatch()
  const { dms, isLoading } = useAppSelector((state) => state.dms)

  useEffect(() => {
    if (channelId) {
      dispatch(setSelectedDM(channelId))
      dispatch(fetchDMs())
    }
  }, [dispatch, channelId])

  const currentDM = dms.find((dm) => dm.id === channelId)
  const otherUser = currentDM?.otherUser

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  if (!currentDM || !otherUser) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold">DM not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This direct message could not be found.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* DM Header */}
      <div className="h-12 border-b border-border px-4 flex items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
            {otherUser.displayName.charAt(0).toUpperCase()}
          </div>
          <h2 className="text-base font-semibold">{otherUser.displayName}</h2>
        </div>
      </div>

      {/* DM Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Direct Message</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Conversation with {otherUser.displayName}
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Messaging UI will be implemented in FAZ 6
          </p>
        </div>
      </div>
    </div>
  )
}

