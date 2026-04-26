"use client"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"

export function Toaster() {
  const { toast } = useToast()

  return (
    <ToastProvider>
      {/* 
         Note: This is a simplified version because I'm manually bridging to sonner or providing minimal implementation.
         User's App.tsx can keep the Toaster tag.
      */}
      <ToastViewport />
    </ToastProvider>
  )
}
