"use client"

import type { ReactNode } from "react"
import { ThemeProvider as NextThemeProvider } from "next-themes"

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemeProvider attribute="data-theme" defaultTheme="dark">
      {children}
    </NextThemeProvider>
  )
}
