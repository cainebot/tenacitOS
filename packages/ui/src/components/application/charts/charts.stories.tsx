import type { Meta, StoryObj } from "@storybook/react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ChartLegendContent, ChartTooltipContent } from "./charts-base"

const data = [
  { month: "Jan", series1: 400, series2: 240 },
  { month: "Feb", series1: 300, series2: 139 },
  { month: "Mar", series1: 520, series2: 380 },
  { month: "Apr", series1: 278, series2: 190 },
  { month: "May", series1: 189, series2: 480 },
  { month: "Jun", series1: 239, series2: 380 },
]

const meta: Meta = { title: "Application/Charts", parameters: { layout: "centered" } }
export default meta
type Story = StoryObj

export const BarChartStory: Story = {
  render: () => (
    <div className="h-80 w-[600px]">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip content={<ChartTooltipContent />} />
          <Legend content={<ChartLegendContent />} />
          <Bar dataKey="series1" fill="#444CE7" />
          <Bar dataKey="series2" fill="#17B26A" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  ),
}

export const LineChartStory: Story = {
  render: () => (
    <div className="h-80 w-[600px]">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip content={<ChartTooltipContent />} />
          <Legend content={<ChartLegendContent />} />
          <Line type="monotone" dataKey="series1" stroke="#444CE7" />
          <Line type="monotone" dataKey="series2" stroke="#17B26A" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  ),
}

export const AreaChartStory: Story = {
  render: () => (
    <div className="h-80 w-[600px]">
      <ResponsiveContainer>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip content={<ChartTooltipContent />} />
          <Legend content={<ChartLegendContent />} />
          <Area type="monotone" dataKey="series1" stroke="#444CE7" fill="#444CE7" fillOpacity={0.2} />
          <Area type="monotone" dataKey="series2" stroke="#17B26A" fill="#17B26A" fillOpacity={0.2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  ),
}
