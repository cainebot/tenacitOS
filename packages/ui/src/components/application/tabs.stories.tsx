import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react"
import { Tabs, TabList, Tab, TabPanel } from "./tabs"

const meta = {
  title: "Application/Tabs",
  component: Tabs,
  tags: ["autodocs"],
} satisfies Meta<typeof Tabs>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { children: null as never },
  render: () => (
    <Tabs>
      <TabList>
        <Tab id="overview">Overview</Tab>
        <Tab id="features">Features</Tab>
        <Tab id="settings">Settings</Tab>
      </TabList>
      <TabPanel id="overview">
        <p>This is the overview panel. It contains general information about the item.</p>
      </TabPanel>
      <TabPanel id="features">
        <p>This panel lists features and capabilities available to users.</p>
      </TabPanel>
      <TabPanel id="settings">
        <p>Configure settings and preferences in this panel.</p>
      </TabPanel>
    </Tabs>
  ),
}

function ControlledTabs() {
  const [selectedKey, setSelectedKey] = useState<string | number>("tab1")

  return (
    <div>
      <p style={{ marginBottom: "12px", fontSize: "14px", color: "rgba(255,255,255,0.5)" }}>
        Selected tab: <strong style={{ color: "white" }}>{String(selectedKey)}</strong>
      </p>
      <Tabs selectedKey={selectedKey} onSelectionChange={setSelectedKey}>
        <TabList>
          <Tab id="tab1">First Tab</Tab>
          <Tab id="tab2">Second Tab</Tab>
          <Tab id="tab3">Third Tab</Tab>
          <Tab id="disabled" isDisabled>
            Disabled
          </Tab>
        </TabList>
        <TabPanel id="tab1">
          <p>Content for the first tab. Selection is controlled via React state.</p>
        </TabPanel>
        <TabPanel id="tab2">
          <p>Content for the second tab. Notice the selected tab indicator above.</p>
        </TabPanel>
        <TabPanel id="tab3">
          <p>Content for the third tab.</p>
        </TabPanel>
        <TabPanel id="disabled">
          <p>This tab is disabled and cannot be selected.</p>
        </TabPanel>
      </Tabs>
    </div>
  )
}

export const Controlled: Story = {
  args: { children: null as never },
  render: () => <ControlledTabs />,
}

export const ButtonMinimal: Story = {
  args: { children: null as never },
  render: () => (
    <Tabs defaultSelectedKey="login">
      <TabList type="button-minimal" fullWidth>
        <Tab id="signup">Sign up</Tab>
        <Tab id="login">Log in</Tab>
      </TabList>
      <TabPanel id="signup">
        <p>Sign up form content goes here.</p>
      </TabPanel>
      <TabPanel id="login">
        <p>Log in form content goes here.</p>
      </TabPanel>
    </Tabs>
  ),
}

export const ButtonMinimalThreeTabs: Story = {
  args: { children: null as never },
  render: () => (
    <Tabs defaultSelectedKey="overview">
      <TabList type="button-minimal" fullWidth>
        <Tab id="overview">Overview</Tab>
        <Tab id="features">Features</Tab>
        <Tab id="settings">Settings</Tab>
      </TabList>
      <TabPanel id="overview">
        <p>Overview content.</p>
      </TabPanel>
      <TabPanel id="features">
        <p>Features content.</p>
      </TabPanel>
      <TabPanel id="settings">
        <p>Settings content.</p>
      </TabPanel>
    </Tabs>
  ),
}

function ControlledButtonMinimalTabs() {
  const [selectedKey, setSelectedKey] = useState<string | number>("tab1")

  return (
    <div>
      <p style={{ marginBottom: "12px", fontSize: "14px", color: "rgba(255,255,255,0.5)" }}>
        Selected tab: <strong style={{ color: "white" }}>{String(selectedKey)}</strong>
      </p>
      <Tabs selectedKey={selectedKey} onSelectionChange={setSelectedKey}>
        <TabList type="button-minimal" fullWidth>
          <Tab id="tab1">First</Tab>
          <Tab id="tab2">Second</Tab>
          <Tab id="tab3">Third</Tab>
        </TabList>
        <TabPanel id="tab1">
          <p>First tab content. Sliding indicator animates between tabs.</p>
        </TabPanel>
        <TabPanel id="tab2">
          <p>Second tab content.</p>
        </TabPanel>
        <TabPanel id="tab3">
          <p>Third tab content.</p>
        </TabPanel>
      </Tabs>
    </div>
  )
}

export const ButtonMinimalControlled: Story = {
  args: { children: null as never },
  render: () => <ControlledButtonMinimalTabs />,
}
