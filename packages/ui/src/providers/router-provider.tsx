"use client"

import type { ReactNode } from "react"
import { RouterProvider } from "react-aria-components"
import { useRouter } from "next/navigation"

interface UUIRouterProviderProps {
  children: ReactNode
}

export function UUIRouterProvider({ children }: UUIRouterProviderProps) {
  const router = useRouter()

  return (
    <RouterProvider navigate={router.push}>
      {children}
    </RouterProvider>
  )
}
