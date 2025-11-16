import { Navigate } from "react-router-dom"
import { useAppSelector } from "@/store/hooks"

export function Home() {
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth)

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // Redirect based on authentication status
  if (isAuthenticated) {
    return <Navigate to="/me" replace />
  }

  return <Navigate to="/login" replace />
}
