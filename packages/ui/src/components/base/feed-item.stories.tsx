import type { Meta, StoryObj } from "@storybook/react"
import { Badge } from "./badge"
import { FeedItem, FeedItemLink, FeedItemComment, FeedItemText, FeedItemFile } from "./feed-item"

const meta: Meta<typeof FeedItem> = {
  title: "Base/FeedItem",
  component: FeedItem,
  tags: ["autodocs"],
  argTypes: {
    size: { control: "radio", options: ["sm", "md"] },
    connector: { control: "boolean" },
    isNew: { control: "boolean" },
  },
  args: {
    avatarSrc: "/avatars/olivia-rhye.webp",
    avatarAlt: "Olivia Rhye",
    avatarStatus: "online",
    name: "Olivia Rhye",
    timestamp: "2 mins ago",
    size: "md",
    connector: true,
    isNew: true,
  },
}

export default meta
type Story = StoryObj<typeof FeedItem>

// ─── Invite (no supporting item) ────────────────────────────────────

export const Invite: Story = {
  args: {
    action: (
      <>
        Invited <FeedItemLink>Lana Steiner</FeedItemLink> to the team
      </>
    ),
  },
}

// ─── File Attachment ────────────────────────────────────────────────

export const FileAttachment: Story = {
  args: {
    action: (
      <>
        Added a file to <FeedItemLink>Marketing site redesign</FeedItemLink>
      </>
    ),
    children: <FeedItemFile fileName="Tech requirements.pdf" fileSize="720 KB" fileType="PDF" />,
  },
}

// ─── Labels ─────────────────────────────────────────────────────────

export const Labels: Story = {
  args: {
    action: (
      <>
        Added 3 labels to the project <FeedItemLink>Marketing site redesign</FeedItemLink>
      </>
    ),
    children: (
      <div className="flex gap-1">
        <Badge color="brand" size="sm" type="modern">Design</Badge>
        <Badge color="blue" size="sm" type="modern">Product</Badge>
        <Badge color="indigo" size="sm" type="modern">Marketing</Badge>
      </div>
    ),
  },
}

// ─── Comment ────────────────────────────────────────────────────────

export const Comment: Story = {
  args: {
    action: (
      <>
        Commented in <FeedItemLink>Marketing site redesign</FeedItemLink>
      </>
    ),
    children: (
      <FeedItemComment>
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Tincidunt nunc ipsum tempor purus vitae id."
      </FeedItemComment>
    ),
  },
}

// ─── Text Alt (plain text, no bubble, no action) ───────────────────

export const TextAlt: Story = {
  args: {
    connector: false,
    action: undefined,
    children: (
      <FeedItemText>
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Tincidunt nunc ipsum tempor purus vitae id."
      </FeedItemText>
    ),
  },
}

// ─── Small Size ─────────────────────────────────────────────────────

export const Small: Story = {
  args: {
    size: "sm",
    action: (
      <>
        Invited <FeedItemLink>Lana Steiner</FeedItemLink> to the team
      </>
    ),
  },
}

// ─── No Connector (last item) ───────────────────────────────────────

export const LastItem: Story = {
  args: {
    connector: false,
    isNew: false,
    action: (
      <>
        Invited <FeedItemLink>Lana Steiner</FeedItemLink> to the team
      </>
    ),
  },
}

// ─── Full Timeline ──────────────────────────────────────────────────

export const Timeline: Story = {
  render: (args) => (
    <div className="w-[360px]">
      <FeedItem
        {...args}
        connector
        isNew
        action={
          <>
            Invited <FeedItemLink>Lana Steiner</FeedItemLink> to the team
          </>
        }
      />
      <FeedItem
        {...args}
        connector
        isNew
        action={
          <>
            Added a file to <FeedItemLink>Marketing site redesign</FeedItemLink>
          </>
        }
      >
        <FeedItemFile fileName="Tech requirements.pdf" fileSize="720 KB" fileType="PDF" />
      </FeedItem>
      <FeedItem
        {...args}
        connector
        isNew
        action={
          <>
            Added 3 labels to the project <FeedItemLink>Marketing site redesign</FeedItemLink>
          </>
        }
      >
        <div className="flex gap-1">
          <Badge color="brand" size="sm" type="modern">Design</Badge>
          <Badge color="blue" size="sm" type="modern">Product</Badge>
          <Badge color="indigo" size="sm" type="modern">Marketing</Badge>
        </div>
      </FeedItem>
      <FeedItem
        {...args}
        connector={false}
        isNew
        action={
          <>
            Commented in <FeedItemLink>Marketing site redesign</FeedItemLink>
          </>
        }
      >
        <FeedItemComment>
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Tincidunt nunc ipsum tempor purus vitae id."
        </FeedItemComment>
      </FeedItem>
      <FeedItem
        {...args}
        connector={false}
        isNew
      >
        <FeedItemText>
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Tincidunt nunc ipsum tempor purus vitae id."
        </FeedItemText>
      </FeedItem>
    </div>
  ),
}
