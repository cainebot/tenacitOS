import type { Meta, StoryObj } from "@storybook/react"
import { FeedItem, FeedItemFileCard, FeedItemComment } from "./FeedItem"
import { Badge } from "../base/badge"

const meta: Meta<typeof FeedItem> = {
  title: "Patterns/FeedItem",
  component: FeedItem,
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "radio",
      options: ["sm", "md"],
      description: "Avatar size — sm (32px) or md (48px)",
    },
    connector: {
      control: "boolean",
      description: "Show vertical connector line below avatar",
    },
    newDot: {
      control: "boolean",
      description: "Show green notification dot (top-right)",
    },
    avatarStatus: {
      control: "radio",
      options: ["online", "offline", undefined],
      description: "Avatar online/offline status indicator",
    },
  },
}

export default meta
type Story = StoryObj<typeof FeedItem>

// ─── Individual Variants ────────────────────────────────────────────

export const Default: Story = {
  args: {
    name: "Olivia Rhye",
    timestamp: "2 mins ago",
    action: (
      <>
        Invited <a href="#">Lana Steiner</a> to the team
      </>
    ),
    size: "md",
    connector: true,
    newDot: true,
    avatarStatus: "online",
  },
}

export const WithFile: Story = {
  args: {
    name: "Olivia Rhye",
    timestamp: "2 mins ago",
    action: (
      <>
        Added a file to <a href="#">Marketing site redesign</a>
      </>
    ),
    size: "md",
    connector: true,
    avatarStatus: "online",
    supportingContent: (
      <FeedItemFileCard
        fileName="Tech requirements.pdf"
        fileSize="720 KB"
        fileType="PDF"
      />
    ),
  },
}

export const WithLabels: Story = {
  args: {
    name: "Olivia Rhye",
    timestamp: "2 mins ago",
    action: (
      <>
        Added 3 labels to the project <a href="#">Marketing site redesign</a>
      </>
    ),
    size: "md",
    connector: true,
    avatarStatus: "online",
    supportingContent: (
      <div className="flex gap-1">
        <Badge type="pill-color" color="brand" size="sm">
          Design
        </Badge>
        <Badge type="pill-color" color="blue" size="sm">
          Product
        </Badge>
        <Badge type="pill-color" color="indigo" size="sm">
          Marketing
        </Badge>
      </div>
    ),
  },
}

export const WithComment: Story = {
  args: {
    name: "Olivia Rhye",
    timestamp: "2 mins ago",
    action: (
      <>
        Commented in <a href="#">Marketing site redesign</a>
      </>
    ),
    size: "md",
    avatarStatus: "online",
    supportingContent: (
      <FeedItemComment>
        &ldquo;Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        Tincidunt nunc ipsum tempor purus vitae id.&rdquo;
      </FeedItemComment>
    ),
  },
}

// ─── Size Variants ──────────────────────────────────────────────────

export const SmallSize: Story = {
  args: {
    name: "Olivia Rhye",
    timestamp: "2 mins ago",
    action: (
      <>
        Invited <a href="#">Lana Steiner</a> to the team
      </>
    ),
    size: "sm",
    connector: true,
    newDot: true,
    avatarStatus: "online",
  },
}

// ─── Without Connector ──────────────────────────────────────────────

export const NoConnector: Story = {
  args: {
    name: "Olivia Rhye",
    timestamp: "2 mins ago",
    action: (
      <>
        Invited <a href="#">Lana Steiner</a> to the team
      </>
    ),
    size: "md",
    connector: false,
    avatarStatus: "online",
  },
}

// ─── Complete Activity Feed ─────────────────────────────────────────

export const ActivityFeed: Story = {
  render: () => (
    <div className="w-[400px]">
      <FeedItem
        name="Olivia Rhye"
        timestamp="2 mins ago"
        action={
          <>
            Invited <a href="#">Lana Steiner</a> to the team
          </>
        }
        size="md"
        connector
        newDot
        avatarStatus="online"
      />
      <FeedItem
        name="Olivia Rhye"
        timestamp="5 mins ago"
        action={
          <>
            Added a file to <a href="#">Marketing site redesign</a>
          </>
        }
        size="md"
        connector
        avatarStatus="online"
        supportingContent={
          <FeedItemFileCard
            fileName="Tech requirements.pdf"
            fileSize="720 KB"
            fileType="PDF"
          />
        }
      />
      <FeedItem
        name="Olivia Rhye"
        timestamp="10 mins ago"
        action={
          <>
            Added 3 labels to the project{" "}
            <a href="#">Marketing site redesign</a>
          </>
        }
        size="md"
        connector
        avatarStatus="online"
        supportingContent={
          <div className="flex gap-1">
            <Badge type="pill-color" color="brand" size="sm">
              Design
            </Badge>
            <Badge type="pill-color" color="blue" size="sm">
              Product
            </Badge>
            <Badge type="pill-color" color="indigo" size="sm">
              Marketing
            </Badge>
          </div>
        }
      />
      <FeedItem
        name="Olivia Rhye"
        timestamp="15 mins ago"
        action={
          <>
            Commented in <a href="#">Marketing site redesign</a>
          </>
        }
        size="md"
        avatarStatus="online"
        supportingContent={
          <FeedItemComment>
            &ldquo;Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            Tincidunt nunc ipsum tempor purus vitae id.&rdquo;
          </FeedItemComment>
        }
      />
    </div>
  ),
}

export const ActivityFeedSmall: Story = {
  render: () => (
    <div className="w-[360px]">
      <FeedItem
        name="Olivia Rhye"
        timestamp="2 mins ago"
        action={
          <>
            Invited <a href="#">Lana Steiner</a> to the team
          </>
        }
        size="sm"
        connector
        newDot
        avatarStatus="online"
      />
      <FeedItem
        name="Olivia Rhye"
        timestamp="5 mins ago"
        action={
          <>
            Added a file to <a href="#">Marketing site redesign</a>
          </>
        }
        size="sm"
        connector
        avatarStatus="online"
        supportingContent={
          <FeedItemFileCard
            fileName="Tech requirements.pdf"
            fileSize="720 KB"
            fileType="PDF"
          />
        }
      />
      <FeedItem
        name="Olivia Rhye"
        timestamp="10 mins ago"
        action={
          <>
            Added 3 labels to the project{" "}
            <a href="#">Marketing site redesign</a>
          </>
        }
        size="sm"
        connector
        avatarStatus="online"
        supportingContent={
          <div className="flex gap-1">
            <Badge type="pill-color" color="brand" size="sm">
              Design
            </Badge>
            <Badge type="pill-color" color="blue" size="sm">
              Product
            </Badge>
            <Badge type="pill-color" color="indigo" size="sm">
              Marketing
            </Badge>
          </div>
        }
      />
      <FeedItem
        name="Olivia Rhye"
        timestamp="15 mins ago"
        action={
          <>
            Commented in <a href="#">Marketing site redesign</a>
          </>
        }
        size="sm"
        avatarStatus="online"
        supportingContent={
          <FeedItemComment>
            &ldquo;Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            Tincidunt nunc ipsum tempor purus vitae id.&rdquo;
          </FeedItemComment>
        }
      />
    </div>
  ),
}
