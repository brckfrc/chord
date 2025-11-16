import { Toast } from "./toast"
import { useToast } from "@/hooks/use-toast"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="fixed bottom-0 z-[100] flex w-full flex-col-reverse p-4 sm:flex-col md:max-w-[420px] md:bottom-0 md:right-0 md:top-auto md:flex-col md:p-6">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={() => dismiss(toast.id)}
        />
      ))}
    </div>
  )
}


