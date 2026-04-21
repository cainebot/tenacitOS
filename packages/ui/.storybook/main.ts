import type { StorybookConfig } from "@storybook/react-vite"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))

const config: StorybookConfig = {
  stories: [
    "../src/**/*.stories.@(ts|tsx)",
    "../../../src/components/**/*.stories.@(ts|tsx)",
  ],
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
    // Resolve @circos/ui barrel export (for app-level stories that import from it)
    config.resolve.alias.push({ find: /^@circos\/ui$/, replacement: uiSrc + "/index.ts" })
    config.resolve.alias.push({ find: /^@circos\/ui\//, replacement: uiSrc + "/" })

    // Resolve app-level paths (for app-level stories) — must come before generic @/
    const appSrc = resolve(__dirname, "../../../src")
    config.resolve.alias.push({ find: /^@\/components\//, replacement: appSrc + "/components/" })
    config.resolve.alias.push({ find: /^@\/types\//, replacement: appSrc + "/types/" })
    config.resolve.alias.push({ find: /^@\/lib\//, replacement: appSrc + "/lib/" })
    config.resolve.alias.push({ find: /^@\/hooks\//, replacement: appSrc + "/hooks/" })
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
