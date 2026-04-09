import type { Meta, StoryObj } from '@storybook/react'
import { StateCreateInline } from './state-create-inline'

const meta = {
  title: 'Phase85/StateCreateInline',
  component: StateCreateInline,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[360px] p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StateCreateInline>

export default meta
type Story = StoryObj<typeof meta>

export const Collapsed: Story = {
  name: 'Collapsed (+ New state)',
  args: {
    onCreateState: async (data) => {
      console.log('onCreateState', data)
      await new Promise((r) => setTimeout(r, 500))
    },
  },
}

export const ErrorOnCreate: Story = {
  name: 'Error on create',
  args: {
    onCreateState: async () => {
      await new Promise((r) => setTimeout(r, 300))
      throw new Error('409 Duplicate name')
    },
  },
}
