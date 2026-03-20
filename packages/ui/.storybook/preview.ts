import type { Preview } from "@storybook/react"
import "../src/styles/theme.css"
import "../src/styles/typography.css"

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: "dark",
      values: [
        { name: "dark", value: "#0C0C0C" },
        { name: "light", value: "#FFFFFF" },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
}

export default preview
