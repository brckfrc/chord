import { useEffect } from "react"
import { useNavigate, Link, useSearchParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { login, clearError } from "@/store/slices/authSlice"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/hooks/use-toast"

const loginSchema = z.object({
  emailOrUsername: z.string().min(1, "Email or username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

type LoginFormData = z.infer<typeof loginSchema>

export function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteCode = searchParams.get("invite")
  const dispatch = useAppDispatch()
  const { isLoading, error, isAuthenticated } = useAppSelector(
    (state) => state.auth
  )
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  useEffect(() => {
    if (isAuthenticated) {
      // If invite code exists, redirect to invite page, otherwise to /me
      if (inviteCode) {
        navigate(`/invite/${inviteCode}`, { replace: true })
      } else {
        navigate("/me", { replace: true })
      }
    }
  }, [isAuthenticated, navigate, inviteCode])

  useEffect(() => {
    if (error) {
      toast({
        title: "Login failed",
        description: error,
        variant: "destructive",
      })
      dispatch(clearError())
    }
  }, [error, toast, dispatch])

  const onSubmit = async (data: LoginFormData) => {
    const result = await dispatch(login(data))
    if (login.fulfilled.match(result)) {
      toast({
        title: "Success",
        description: "Logged in successfully",
      })
      // Navigation is handled in useEffect
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 rounded-lg border border-border bg-secondary p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="emailOrUsername" className="text-sm font-medium">
              Email or Username
            </label>
            <Input
              id="emailOrUsername"
              type="text"
              placeholder="Email or username"
              {...register("emailOrUsername")}
            />
            {errors.emailOrUsername && (
              <p className="text-sm text-destructive">{errors.emailOrUsername.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Spinner className="mr-2" />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">Don't have an account? </span>
          <Link
            to={inviteCode ? `/register?invite=${inviteCode}` : "/register"}
            className="font-medium text-primary hover:underline"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  )
}

