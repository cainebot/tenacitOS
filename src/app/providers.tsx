"use client"
import type { ReactNode } from "react"
import { ThemeProvider, UUIRouterProvider } from "@openclaw/ui"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <UUIRouterProvider>
        {children}
      </UUIRouterProvider>
    </ThemeProvider>
  )
}
