import type { Meta, StoryObj } from "@storybook/react"
import { DatePicker } from "./date-picker"
import { DateRangePicker } from "./date-range-picker"
import { Calendar } from "./calendar"
import { RangeCalendar } from "./range-calendar"

const meta: Meta = { title: "Application/DatePicker", parameters: { layout: "centered" } }
export default meta
type Story = StoryObj

export const Default: Story = {
  render: () => (
    <div className="w-80">
      <DatePicker />
    </div>
  ),
}

export const RangePicker: Story = {
  render: () => (
    <div className="w-96">
      <DateRangePicker />
    </div>
  ),
}

export const CalendarStandalone: Story = {
  render: () => <Calendar />,
}

export const RangeCalendarStandalone: Story = {
  render: () => <RangeCalendar />,
}
