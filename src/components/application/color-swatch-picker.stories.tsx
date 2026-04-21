import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { ColorSwatchPicker } from './color-swatch-picker'

const meta = {
  title: 'Phase85/ColorSwatchPicker',
  component: ColorSwatchPicker,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="relative p-6" style={{ minHeight: 200 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ColorSwatchPicker>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => {
    const [color, setColor] = useState('#444CE7')
    const [isOpen, setIsOpen] = useState(true)
    return (
      <div className="relative">
        <button
          type="button"
          className="size-6 rounded-full border border-secondary"
          style={{ backgroundColor: color }}
          onClick={() => setIsOpen(true)}
        />
        <ColorSwatchPicker
          currentColor={color}
          onColorSelect={setColor}
          isOpen={isOpen}
          onOpenChange={setIsOpen}
        />
      </div>
    )
  },
}
