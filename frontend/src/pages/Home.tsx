import { useEffect } from "react"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { getCurrentUser } from "@/store/slices/authSlice"

export function Home() {
  const dispatch = useAppDispatch()
  const { user, isLoading } = useAppSelector((state) => state.auth)

  useEffect(() => {
    // Only fetch user if not already loaded and not currently loading
    if (!user && !isLoading) {
      dispatch(getCurrentUser())
    }
  }, [dispatch, user, isLoading])

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Welcome to Chord</h1>
        {user && (
          <p className="mt-4 text-lg text-muted-foreground">
            Hello, {user.displayName}!
          </p>
        )}
      </div>
    </div>
  )
}


