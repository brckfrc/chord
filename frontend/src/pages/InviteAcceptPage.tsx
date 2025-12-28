import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { invitesApi } from "@/lib/api/invites"
import type { InviteInfoDto } from "@/lib/api/invites.types"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { fetchGuilds } from "@/store/slices/guildsSlice"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle2, XCircle, Users, Clock, Hash, User } from "lucide-react"

export function InviteAcceptPage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { isAuthenticated } = useAppSelector((state) => state.auth)
  const { toast } = useToast()
  const [invite, setInvite] = useState<InviteInfoDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAccepting, setIsAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Redirect to login if not authenticated (preserve invite code)
  useEffect(() => {
    if (!isAuthenticated) {
      navigate(`/login?invite=${code}`, { replace: true })
    }
  }, [isAuthenticated, code, navigate])

  useEffect(() => {
    if (!code) {
      setError("Invalid invite code")
      setIsLoading(false)
      return
    }

    // Only fetch invite info if authenticated
    if (!isAuthenticated) {
      setIsLoading(false)
      return
    }

    const fetchInvite = async () => {
      try {
        const data = await invitesApi.getInviteByCode(code)
        setInvite(data)
      } catch (err) {
        const message = err instanceof Error 
          ? err.message 
          : (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        setError(message || "Invite not found")
      } finally {
        setIsLoading(false)
      }
    }

    fetchInvite()
  }, [code, isAuthenticated])

  const handleAccept = async () => {
    if (!code || !invite) return

    setIsAccepting(true)
    try {
      const guild = await invitesApi.acceptInvite(code)
      
      // Refresh guilds list
      await dispatch(fetchGuilds()).unwrap()

      toast({
        title: "Success",
        description: `You joined ${guild.name}!`,
      })

      // Navigate to the guild
      navigate(`/guilds/${guild.id}`)
    } catch (err) {
      const message = err instanceof Error 
        ? err.message 
        : (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast({
        title: "Error",
        description: message || "Failed to accept invite",
        variant: "destructive",
      })
    } finally {
      setIsAccepting(false)
    }
  }

  // Show loading if not authenticated (will redirect)
  if (!isAuthenticated || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <XCircle className="w-16 h-16 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold">Invalid Invite</h1>
          <p className="text-muted-foreground">{error || "This invite is invalid or has expired"}</p>
          <Button onClick={() => navigate("/")} variant="outline">
            Go Home
          </Button>
        </div>
      </div>
    )
  }

  const isExpired = invite.isExpired
  const isMaxUsesReached = invite.isMaxUsesReached
  const isInvalid = !invite.isActive || isExpired || isMaxUsesReached

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-lg shadow-lg p-8 space-y-6">
        {/* Guild Icon/Name */}
        <div className="text-center space-y-4">
          {invite.guildIconUrl ? (
            <img
              src={invite.guildIconUrl}
              alt={invite.guildName}
              className="w-20 h-20 rounded-full mx-auto"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Hash className="w-10 h-10 text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{invite.guildName}</h1>
            {invite.guildDescription && (
              <p className="text-sm text-muted-foreground mt-2">{invite.guildDescription}</p>
            )}
          </div>
        </div>

        {/* Invite Info */}
        <div className="space-y-3 border-t border-b border-border py-4">
          <div className="flex items-center gap-3 text-sm">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Invited by:</span>
            <span className="font-semibold">{invite.createdByUsername}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Members:</span>
            <span className="font-semibold">{invite.memberCount}</span>
          </div>
          {invite.expiresAt && (
            <div className="flex items-center gap-3 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Expires:</span>
              <span className="font-semibold">
                {new Date(invite.expiresAt).toLocaleDateString()}
              </span>
            </div>
          )}
          {invite.maxUses && (
            <div className="flex items-center gap-3 text-sm">
              <Hash className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Uses:</span>
              <span className="font-semibold">
                {invite.uses} / {invite.maxUses}
              </span>
            </div>
          )}
        </div>

        {/* Status Messages */}
        {isInvalid && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-2">
            {!invite.isActive && (
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="w-4 h-4" />
                <span className="text-sm font-medium">This invite has been revoked</span>
              </div>
            )}
            {isExpired && (
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="w-4 h-4" />
                <span className="text-sm font-medium">This invite has expired</span>
              </div>
            )}
            {isMaxUsesReached && (
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="w-4 h-4" />
                <span className="text-sm font-medium">This invite has reached its maximum uses</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {isInvalid ? (
            <Button onClick={() => navigate("/")} className="w-full" variant="outline">
              Go Home
            </Button>
          ) : (
            <>
              <Button
                onClick={handleAccept}
                disabled={isAccepting}
                className="w-full"
              >
                {isAccepting ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" />
                    Joining...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Accept Invite
                  </>
                )}
              </Button>
              <Button
                onClick={() => navigate("/")}
                variant="outline"
                className="w-full"
              >
                Cancel
              </Button>
            </>
          )}
        </div>

        {/* Invite Code */}
        <div className="text-center pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Invite code: <span className="font-mono font-semibold">#{invite.code}</span>
          </p>
        </div>
      </div>
    </div>
  )
}

