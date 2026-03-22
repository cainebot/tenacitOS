import { extendTailwindMerge } from "tailwind-merge"

type ClassValue = string | number | boolean | undefined | null

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["display-xs", "display-sm", "display-md", "display-lg", "display-xl", "display-2xl"] },
      ],
    },
  },
})

export function cx(...inputs: (ClassValue | ClassValue[])[]): string {
  return twMerge(
    inputs
      .flat()
      .filter(Boolean)
      .join(" ")
  )
}

/**
 * Identity function that provides type structure for organizing component styles
 * into common, sizes, and colors groups.
 */
export function sortCx<T extends Record<string, unknown>>(styles: T): T {
  return styles
}
