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

  // Wait while loading
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // Redirect to login if token exists but user is missing or not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}


