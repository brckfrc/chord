import { Navigate } from "react-router-dom"
import { useAppSelector } from "@/store/hooks"

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAppSelector((state) => state.auth)
  const token = localStorage.getItem("accessToken")

  // Redirect to login if no token
  if (!token) {
    return <Navigate to="/" replace />
  }

  // Wait while loading OR while user is being fetched (token exists but user not loaded yet)
  if (isLoading || (token && !user)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}


