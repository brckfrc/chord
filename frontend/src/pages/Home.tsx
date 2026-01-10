import { Navigate } from "react-router-dom"
import { useAppSelector } from "@/store/hooks"
import { Spinner } from "@/components/ui/spinner"

export function Home() {
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth)

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="w-8 h-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect based on authentication status
  if (isAuthenticated) {
    return <Navigate to="/me" replace />
  }

  return <Navigate to="/login" replace />
}
