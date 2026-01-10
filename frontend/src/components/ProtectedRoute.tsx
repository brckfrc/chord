import { Navigate } from "react-router-dom"
import { useAppSelector } from "@/store/hooks"
import { Spinner } from "@/components/ui/spinner"

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
      <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="w-8 h-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}


