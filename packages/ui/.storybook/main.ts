import type { StorybookConfig } from "@storybook/react-vite"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  staticDirs: ["../public"],
  addons: [
    "@storybook/addon-a11y",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  viteFinal: async (config) => {
    config.resolve ??= {}
    config.resolve.alias ??= {}

    // Resolve @/ alias to packages/ui/src (used by UUI installed components)
    const uiSrc = resolve(__dirname, "../src")
    if (!Array.isArray(config.resolve.alias)) {
      config.resolve.alias = Object.entries(config.resolve.alias as Record<string, string>).map(
        ([find, replacement]) => ({ find, replacement })
      )
    }
    config.resolve.alias.push({ find: /^@\//, replacement: uiSrc + "/" })

    // Ensure Vite resolves node_modules from workspace root (for tailwindcss, etc.)
    const workspaceRoot = resolve(__dirname, "../../..")
    config.resolve.modules = [
      resolve(workspaceRoot, "node_modules"),
      "node_modules",
    ]

    return config
  },
}

export default config
