import { useState, useCallback } from "react"

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

let toastCount = 0

function genId() {
  toastCount = (toastCount + 1) % Number.MAX_VALUE
  return toastCount.toString()
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((toastId?: string) => {
    setToasts((prev) =>
      prev.filter((t) => t.id !== toastId)
    )
  }, [])

  const toast = useCallback(
    ({ ...props }: Omit<Toast, "id">) => {
      const id = genId()
      const newToast = {
        id,
        ...props,
      }

      setToasts((prev) => [...prev, newToast])

      return {
        id,
        dismiss: () => dismiss(id),
      }
    },
    [dismiss]
  )

  return {
    toast,
    dismiss,
    toasts,
  }
}


