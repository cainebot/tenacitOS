import type { Meta, StoryObj } from "@storybook/react"
import { Copy01, Edit05, Trash01, Settings01, UserPlus01, Mail01 } from "@untitledui/icons"
import { Button } from "../buttons/button"
import { Dropdown } from "./dropdown"
import { DropdownAccountBreadcrumb } from "./dropdown-account-breadcrumb"
import { DropdownAccountButton } from "./dropdown-account-button"
import { DropdownAccountCardMD } from "./dropdown-account-card-md"
import { DropdownAccountCardSM } from "./dropdown-account-card-sm"
import { DropdownAccountCardXS } from "./dropdown-account-card-xs"
import { DropdownAvatar } from "./dropdown-avatar"
import { DropdownButtonAdvanced } from "./dropdown-button-advanced"
import { DropdownButtonLink } from "./dropdown-button-link"
import { DropdownButtonSimple } from "./dropdown-button-simple"
import { DropdownIconAdvanced } from "./dropdown-icon-advanced"
import { DropdownIconSimple } from "./dropdown-icon-simple"
import { DropdownIntegration } from "./dropdown-integration"
import { DropdownSearchAdvanced } from "./dropdown-search-advanced"
import { DropdownSearchSimple } from "./dropdown-search-simple"

const meta: Meta = {
  title: "Base/Dropdown",
  parameters: { layout: "centered" },
}

export default meta
type Story = StoryObj

export const Default: Story = {
  render: () => (
    <Dropdown.Root>
      <Button>Open menu</Button>
      <Dropdown.Popover>
        <Dropdown.Menu>
          <Dropdown.Item id="edit" label="Edit" icon={Edit05} addon="⌘E" />
          <Dropdown.Item id="duplicate" label="Duplicate" icon={Copy01} addon="⌘D" />
          <Dropdown.Separator />
          <Dropdown.Item id="delete" label="Delete" icon={Trash01} addon="⌫" />
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown.Root>
  ),
}

export const WithSelectionCheckmark: Story = {
  render: () => (
    <Dropdown.Root>
      <Button>Select option</Button>
      <Dropdown.Popover>
        <Dropdown.Menu selectionMode="single" defaultSelectedKeys={["draft"]}>
          <Dropdown.Item id="draft" label="Draft" />
          <Dropdown.Item id="in-review" label="In review" />
          <Dropdown.Item id="published" label="Published" />
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown.Root>
  ),
}

export const WithCheckboxSelection: Story = {
  render: () => (
    <Dropdown.Root>
      <Button>Filters</Button>
      <Dropdown.Popover>
        <Dropdown.Menu selectionMode="multiple">
          <Dropdown.Item id="emails" label="Emails" icon={Mail01} selectionIndicator="checkbox" />
          <Dropdown.Item id="users" label="Users" icon={UserPlus01} selectionIndicator="checkbox" />
          <Dropdown.Item id="settings" label="Settings" icon={Settings01} selectionIndicator="checkbox" />
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown.Root>
  ),
}

export const DotsTrigger: Story = {
  render: () => (
    <Dropdown.Root>
      <Dropdown.DotsButton />
      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu>
          <Dropdown.Item id="edit" label="Edit" icon={Edit05} />
          <Dropdown.Item id="delete" label="Delete" icon={Trash01} />
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown.Root>
  ),
}

export const AccountBreadcrumb: Story = { render: () => <DropdownAccountBreadcrumb /> }
export const AccountButton: Story = { render: () => <DropdownAccountButton /> }
export const AccountCardMD: Story = { render: () => <DropdownAccountCardMD /> }
export const AccountCardSM: Story = { render: () => <DropdownAccountCardSM /> }
export const AccountCardXS: Story = { render: () => <DropdownAccountCardXS /> }
export const AvatarDropdown: Story = { render: () => <DropdownAvatar /> }
export const ButtonAdvanced: Story = { render: () => <DropdownButtonAdvanced /> }
export const ButtonLink: Story = { render: () => <DropdownButtonLink /> }
export const ButtonSimple: Story = { render: () => <DropdownButtonSimple /> }
export const IconAdvanced: Story = { render: () => <DropdownIconAdvanced /> }
export const IconSimple: Story = { render: () => <DropdownIconSimple /> }
export const Integration: Story = { render: () => <DropdownIntegration /> }
export const SearchAdvanced: Story = { render: () => <DropdownSearchAdvanced /> }
export const SearchSimple: Story = { render: () => <DropdownSearchSimple /> }
