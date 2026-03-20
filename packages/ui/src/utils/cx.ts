import { twMerge } from "tailwind-merge"

type ClassValue = string | number | boolean | undefined | null

export function cx(...inputs: (ClassValue | ClassValue[])[]): string {
  return twMerge(
    inputs
      .flat()
      .filter(Boolean)
      .join(" ")
  )
}
