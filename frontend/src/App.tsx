import { useEffect, useRef } from "react"
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom"
import { Toaster } from "@/components/ui/toaster"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { MainLayout } from "@/components/layouts/MainLayout"
import { FriendsLayout } from "@/components/layouts/FriendsLayout"
import { UserProfileBar } from "@/components/user/UserProfileBar"
import { VoiceBar } from "@/components/user/VoiceBar"
import { VoiceRoom } from "@/components/voice"
import { useAppSelector, useAppDispatch } from "@/store/hooks"
import { getCurrentUser, updateStatusFromSignalR } from "@/store/slices/authSlice"
import { connectionManager } from "@/hooks/useSignalRConnectionManager"
import { useSignalR } from "@/hooks/useSignalR"
import { Home } from "@/pages/Home"
import { Login } from "@/pages/Login"
import { Register } from "@/pages/Register"
import { FriendsHome } from "@/pages/FriendsHome"
import { DMView } from "@/pages/DMView"
import { GuildView } from "@/pages/GuildView"
import { ChannelView } from "@/pages/ChannelView"
import { InviteAcceptPage } from "@/pages/InviteAcceptPage"

function AppContent() {
  const location = useLocation()
  const dispatch = useAppDispatch()
  const { isAuthenticated, user, isLoading } = useAppSelector((state) => state.auth)
  const { activeVoiceChannelId } = useAppSelector((state) => state.channels)
  const hasInitialized = useRef(false)

  // PresenceHub connection for status updates
  const { on: presenceOn, isConnected: isPresenceConnected } = useSignalR("/hubs/presence")
  const presenceOnRef = useRef<ReturnType<typeof useSignalR>["on"] | null>(null)

  // Store presenceOn in ref to avoid dependency issues
  useEffect(() => {
    presenceOnRef.current = presenceOn
  }, [presenceOn])

  // Load user info on app start if token exists (only once)
  useEffect(() => {
    if (hasInitialized.current) return
    
    const token = localStorage.getItem("accessToken")
    if (token && !user) {
      hasInitialized.current = true
      dispatch(getCurrentUser())
    }
  }, [dispatch, user])

  // Listen for StatusUpdated event from PresenceHub (when our own status changes)
  useEffect(() => {
    if (!isPresenceConnected || !presenceOnRef.current || !user) return

    const handleStatusUpdated = (data: { status: number; customStatus?: string }) => {
      // Update current user's status in Redux
      dispatch(updateStatusFromSignalR({
        status: data.status,
        customStatus: data.customStatus,
      }))
    }

    const cleanup = presenceOnRef.current("StatusUpdated", handleStatusUpdated)
    return cleanup
  }, [isPresenceConnected, user, dispatch])

  // Stop all SignalR connections on logout
  useEffect(() => {
    if (!isAuthenticated) {
      connectionManager.stopAllConnections().catch(console.error)
    }
  }, [isAuthenticated])

  // Show UserProfileBar on protected routes
  const showUserProfileBar =
    isAuthenticated &&
    (location.pathname.startsWith("/me") ||
      location.pathname.startsWith("/guilds") ||
      location.pathname.startsWith("/channels"))

  return (
    <>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/me"
            element={
              <ProtectedRoute>
                <FriendsLayout>
                  <FriendsHome />
                </FriendsLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/me/dm/:channelId"
            element={
              <ProtectedRoute>
                <FriendsLayout>
                  <DMView />
                </FriendsLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/guilds/:guildId"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <GuildView />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/channels/:guildId/:channelId"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ChannelView />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/invite/:code"
            element={<InviteAcceptPage />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

      {/* Voice Bar - Above UserProfileBar when in voice channel */}
      {showUserProfileBar && activeVoiceChannelId && (
        <div key="voice-bar" className="fixed bottom-14 left-0 z-[100] pointer-events-auto">
          {/* VoiceBar - GuildSidebar (w-16) + Sidebar (w-60) = w-[19rem] width */}
          <div className="w-[19rem]">
            <VoiceBar />
          </div>
        </div>
      )}

      {/* User Profile Bar - Above all layouts, at the bottom of the screen - ONLY ONCE */}
      {showUserProfileBar && (
        <div key="user-profile-bar" className="fixed bottom-0 left-0 z-[100] pointer-events-auto">
          {/* UserProfileBar - GuildSidebar (w-16) + Sidebar (w-60) = w-[19rem] width */}
          <div className="w-[19rem]">
            <UserProfileBar />
          </div>
        </div>
      )}

      {/* VoiceRoom - Handles LiveKit connection (renders null when not connected) */}
      <VoiceRoom />
    </>
  )
}

function App() {
  return (
    <>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
      <Toaster />
    </>
  )
}

export default App
