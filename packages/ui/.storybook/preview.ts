import type { Preview } from "@storybook/react"
import "./storybook.css"

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Theme",
      toolbar: {
        title: "Theme",
        icon: "paintbrush",
        items: [
          { value: "Dark", title: "Dark", icon: "moon" },
          { value: "Light", title: "Light", icon: "sun" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: "Dark",
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme || "Dark"
      document.documentElement.setAttribute(
        "data-theme",
        theme === "Light" ? "light" : "dark",
      )
      return Story()
    },
  ],
  parameters: {
    backgrounds: { disable: true },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
}

export default preview
