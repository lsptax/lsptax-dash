import { AlertCircle, CheckCircle2 } from "lucide-react"
import { TOAST_DURATION, useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

function ToastStatusIcon({
  variant,
}: {
  variant?: string | null
}) {
  if (variant === "destructive") {
    return (
      <AlertCircle
        className="mt-0.5 h-[18px] w-[18px] shrink-0 text-red-500"
        aria-hidden
      />
    )
  }

  return (
    <CheckCircle2
      className="mt-0.5 h-[18px] w-[18px] shrink-0 text-emerald-500"
      aria-hidden
    />
  )
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider duration={TOAST_DURATION}>
      {toasts.map(function ({ id, title, description, action, variant, duration, ...props }) {
        return (
          <Toast key={id} variant={variant} duration={duration ?? TOAST_DURATION} {...props}>
            <ToastStatusIcon variant={variant} />
            <div className="grid flex-1 gap-1 pr-2">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
