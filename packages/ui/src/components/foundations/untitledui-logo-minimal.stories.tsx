import type { Meta, StoryObj } from "@storybook/react"
import { UntitledLogoMinimal } from "./logo/untitledui-logo-minimal"

const sizeMap: Record<string, string> = {
  xs: "size-6",
  sm: "size-8",
  md: "size-10",
  lg: "size-12",
  xl: "size-16",
}

const meta: Meta<typeof UntitledLogoMinimal> = {
  title: "Foundations/UntitledLogoMinimal",
  component: UntitledLogoMinimal,
  tags: ["autodocs"],
  argTypes: {
    className: {
      control: "select",
      options: Object.keys(sizeMap),
      mapping: sizeMap,
      description: "Logo size (maps to Tailwind size-* classes)",
      table: { defaultValue: { summary: "md" } },
    },
  },
}

export default meta
type Story = StoryObj<typeof UntitledLogoMinimal>

export const Default: Story = {
  args: {
    className: sizeMap.lg,
  },
}

export const Small: Story = {
  args: {
    className: sizeMap.sm,
  },
}

export const Large: Story = {
  args: {
    className: sizeMap.xl,
  },
}

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-6">
      {Object.entries(sizeMap).map(([label, cls]) => (
        <div key={label} className="flex flex-col items-center gap-2">
          <UntitledLogoMinimal className={cls} />
          <span className="text-xs text-tertiary">{label}</span>
        </div>
      ))}
    </div>
  ),
}
