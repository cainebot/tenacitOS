"use client"

import { useState, useEffect } from "react"

type Breakpoint = "sm" | "md" | "lg" | "xl" | "2xl"

const breakpoints: Record<Breakpoint, number> = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
}

function getBreakpoint(width: number): Breakpoint {
  if (width >= breakpoints["2xl"]) return "2xl"
  if (width >= breakpoints.xl) return "xl"
  if (width >= breakpoints.lg) return "lg"
  if (width >= breakpoints.md) return "md"
  return "sm"
}

/**
 * Returns the current responsive breakpoint based on window width.
 *
 * Breakpoints:
 * - sm:  < 768px
 * - md:  768px – 1023px
 * - lg:  1024px – 1279px
 * - xl:  1280px – 1535px
 * - 2xl: >= 1536px
 */
export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>("md")

  useEffect(() => {
    function handleResize() {
      setBreakpoint(getBreakpoint(window.innerWidth))
    }

    // Set initial value
    handleResize()

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return breakpoint
}

export type { Breakpoint }
