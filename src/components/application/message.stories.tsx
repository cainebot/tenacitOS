import type { Meta, StoryObj } from '@storybook/react'
import { Message } from './message'
import type { ReactionData } from './message'

const meta: Meta<typeof Message> = {
  title: 'Application/Message',
  component: Message,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[400px]">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof Message>

// ── Shared data ─────────────────────────────────────────────────────────────

const sampleReactions: ReactionData[] = [
  { emoji: '❤️' },
  { emoji: '👌', count: 2 },
]

const PLACEHOLDER_IMAGE =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" fill="%23e0d4f7"><rect width="800" height="600"/><text x="400" y="300" text-anchor="middle" fill="%23735CDD" font-size="32" font-family="sans-serif">Image</text></svg>',
  )

const PLACEHOLDER_VIDEO =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="560" height="315" fill="%23f0e6d3"><rect width="560" height="315"/><text x="280" y="160" text-anchor="middle" fill="%23a07850" font-size="28" font-family="sans-serif">Video Thumbnail</text></svg>',
  )

const PLACEHOLDER_OG =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" fill="%23e8dff5"><rect width="1200" height="630"/><text x="600" y="315" text-anchor="middle" fill="%23735CDD" font-size="48" font-family="sans-serif">OG Image</text></svg>',
  )

// ── Text Messages ───────────────────────────────────────────────────────────

export const TextIncoming: Story = {
  name: 'Message — Incoming',
  args: {
    type: 'message',
    sent: false,
    senderName: 'Phoenix Baker',
    senderStatus: 'online',
    timestamp: 'Friday 2:20pm',
    content: 'Hey Olivia, can you please review the latest design?',
    reactions: sampleReactions,
  },
}

export const TextOutgoing: Story = {
  name: 'Message — Outgoing',
  args: {
    type: 'message',
    sent: true,
    senderName: 'Olivia Rhye',
    timestamp: 'Friday 2:20pm',
    status: 'read',
    content: "Sure thing, I'll have a look today.",
    reactions: sampleReactions,
  },
}

export const TextWithActions: Story = {
  name: 'Message — With Actions',
  args: {
    type: 'message',
    sent: false,
    senderName: 'Phoenix Baker',
    senderStatus: 'online',
    timestamp: 'Friday 2:20pm',
    content: 'Hey Olivia, can you please review the latest design?',
    actions: ['ai', 'edit', 'retry', 'copy'],
  },
}

export const TextLong: Story = {
  name: 'Message — Long Text',
  args: {
    type: 'message',
    sent: false,
    senderName: 'Phoenix Baker',
    senderStatus: 'online',
    timestamp: 'Friday 2:20pm',
    content:
      "Hey team! I've just finished the latest round of design iterations. There are some significant changes to the navigation structure and the settings page. I'd love to get everyone's feedback before we finalize and hand off to engineering.\n\nPlease review when you get a chance — no rush, but ideally before EOD Thursday.",
  },
}

// ── Reply Messages ──────────────────────────────────────────────────────────

export const ReplyIncoming: Story = {
  name: 'Reply — Incoming',
  args: {
    type: 'message-reply',
    sent: false,
    senderName: 'Phoenix Baker',
    senderStatus: 'online',
    timestamp: 'Friday 2:20pm',
    replyText: "Sure thing, I'll have a look today.",
    content: 'Awesome, thanks!',
    reactions: sampleReactions,
  },
}

export const ReplyOutgoing: Story = {
  name: 'Reply — Outgoing',
  args: {
    type: 'message-reply',
    sent: true,
    senderName: 'Olivia Rhye',
    timestamp: 'Friday 2:22pm',
    status: 'delivered',
    replyText: 'Hey Olivia, can you please review the latest design?',
    content: "Sure, I'll take a look now!",
  },
}

// ── File Messages ───────────────────────────────────────────────────────────

export const FileIncoming: Story = {
  name: 'File — Incoming',
  args: {
    type: 'file',
    sent: false,
    senderName: 'Phoenix Baker',
    senderStatus: 'online',
    timestamp: 'Friday 2:20pm',
    fileName: 'Latest design screenshot.jpg',
    fileSize: '1.2 MB',
    fileExtension: 'jpg',
    reactions: sampleReactions,
  },
}

export const FileOutgoing: Story = {
  name: 'File — Outgoing',
  args: {
    type: 'file',
    sent: true,
    senderName: 'Olivia Rhye',
    timestamp: 'Friday 2:25pm',
    status: 'read',
    fileName: 'Q4-financial-report.pdf',
    fileSize: '3.8 MB',
    fileExtension: 'pdf',
  },
}

export const FileTypes: Story = {
  name: 'File — Various Types',
  render: () => (
    <div className="flex flex-col gap-4 w-full">
      <Message
        type="file"
        senderName="Phoenix Baker"
        senderStatus="online"
        timestamp="2:20pm"
        fileName="document.pdf"
        fileSize="3.8 MB"
        fileExtension="pdf"
      />
      <Message
        type="file"
        senderName="Phoenix Baker"
        senderStatus="online"
        timestamp="2:21pm"
        fileName="spreadsheet.xlsx"
        fileSize="1.5 MB"
        fileExtension="xlsx"
      />
      <Message
        type="file"
        senderName="Phoenix Baker"
        senderStatus="online"
        timestamp="2:22pm"
        fileName="presentation.pptx"
        fileSize="12 MB"
        fileExtension="pptx"
      />
      <Message
        type="file"
        senderName="Phoenix Baker"
        senderStatus="online"
        timestamp="2:23pm"
        fileName="archive.zip"
        fileSize="45 MB"
        fileExtension="zip"
      />
    </div>
  ),
}

// ── Audio Messages ──────────────────────────────────────────────────────────

export const AudioIncoming: Story = {
  name: 'Audio — Incoming',
  args: {
    type: 'audio',
    sent: false,
    senderName: 'Phoenix Baker',
    senderStatus: 'online',
    timestamp: 'Friday 2:20pm',
    duration: '00:28',
    reactions: sampleReactions,
  },
}

export const AudioOutgoing: Story = {
  name: 'Audio — Outgoing',
  args: {
    type: 'audio',
    sent: true,
    senderName: 'Olivia Rhye',
    timestamp: 'Friday 2:22pm',
    status: 'read',
    duration: '01:45',
  },
}

export const AudioPlaying: Story = {
  name: 'Audio — Playing',
  args: {
    type: 'audio',
    sent: false,
    senderName: 'Phoenix Baker',
    senderStatus: 'online',
    timestamp: 'Friday 2:20pm',
    duration: '00:28',
    isPlaying: true,
  },
}

// ── Video Messages ──────────────────────────────────────────────────────────

export const VideoIncoming: Story = {
  name: 'Video — Incoming',
  args: {
    type: 'video',
    sent: false,
    senderName: 'Phoenix Baker',
    senderStatus: 'online',
    timestamp: 'Friday 2:20pm',
    thumbnailSrc: PLACEHOLDER_VIDEO,
    reactions: sampleReactions,
  },
}

export const VideoOutgoing: Story = {
  name: 'Video — Outgoing',
  args: {
    type: 'video',
    sent: true,
    senderName: 'Olivia Rhye',
    timestamp: 'Friday 2:25pm',
    status: 'read',
    thumbnailSrc: PLACEHOLDER_VIDEO,
  },
}

// ── Image Messages ──────────────────────────────────────────────────────────

export const ImageIncoming: Story = {
  name: 'Image — Incoming',
  args: {
    type: 'image',
    sent: false,
    senderName: 'Phoenix Baker',
    senderStatus: 'online',
    timestamp: 'Friday 2:20pm',
    src: PLACEHOLDER_IMAGE,
    fileName: 'Background image.jpg',
    fileSize: '128 KB',
    reactions: sampleReactions,
  },
}

export const ImageOutgoing: Story = {
  name: 'Image — Outgoing',
  args: {
    type: 'image',
    sent: true,
    senderName: 'Olivia Rhye',
    timestamp: 'Friday 2:25pm',
    status: 'read',
    src: PLACEHOLDER_IMAGE,
    fileName: 'screenshot.png',
    fileSize: '2.1 MB',
  },
}

// ── Link Preview Messages ───────────────────────────────────────────────────

export const LinkPreviewIncoming: Story = {
  name: 'Link Preview — Incoming',
  args: {
    type: 'link-preview',
    sent: false,
    senderName: 'Phoenix Baker',
    senderStatus: 'online',
    timestamp: 'Friday 2:20pm',
    url: 'https://www.untitledui.com',
    imageSrc: PLACEHOLDER_OG,
    reactions: sampleReactions,
  },
}

export const LinkPreviewOutgoing: Story = {
  name: 'Link Preview — Outgoing',
  args: {
    type: 'link-preview',
    sent: true,
    senderName: 'Olivia Rhye',
    timestamp: 'Friday 2:25pm',
    status: 'read',
    url: 'https://www.figma.com/design/example',
    imageSrc: PLACEHOLDER_OG,
  },
}

export const LinkPreviewNoImage: Story = {
  name: 'Link Preview — No Image',
  args: {
    type: 'link-preview',
    sent: false,
    senderName: 'Phoenix Baker',
    senderStatus: 'online',
    timestamp: 'Friday 2:20pm',
    url: 'https://github.com/anthropics/claude-code',
  },
}

// ── Link Minimal Messages ───────────────────────────────────────────────────

export const LinkMinimalIncoming: Story = {
  name: 'Link Minimal — Incoming',
  args: {
    type: 'link-minimal',
    sent: false,
    senderName: 'Phoenix Baker',
    senderStatus: 'online',
    timestamp: 'Friday 2:20pm',
    url: 'https://www.untitledui.com',
    title: 'Untitled UI — Figma UI Kit and Design System',
    description:
      'Untitled UI is the largest UI kit and design system for Figma in the world. Kickstart any project, save thousands of hours, and level up as a designer.',
    reactions: sampleReactions,
  },
}

export const LinkMinimalOutgoing: Story = {
  name: 'Link Minimal — Outgoing',
  args: {
    type: 'link-minimal',
    sent: true,
    senderName: 'Olivia Rhye',
    timestamp: 'Friday 2:25pm',
    status: 'read',
    url: 'https://react-spectrum.adobe.com/react-aria',
    title: 'React Aria — Adobe',
    description: 'A library of React hooks for building accessible, high quality UI components.',
  },
}

// ── Writing / Typing Indicator ──────────────────────────────────────────────

export const Writing: Story = {
  name: 'Writing — Typing Indicator',
  args: {
    type: 'writing',
    senderName: 'Phoenix Baker',
    senderStatus: 'online',
    timestamp: 'Now',
  },
}

// ── Full Conversation ───────────────────────────────────────────────────────

export const Conversation: Story = {
  name: 'Full Conversation',
  render: () => (
    <div className="flex flex-col gap-6 w-full">
      <Message
        type="message"
        senderName="Phoenix Baker"
        senderStatus="online"
        timestamp="Friday 2:20pm"
        content="Hey Olivia, can you please review the latest design?"
      />
      <Message
        type="message"
        sent
        senderName="Olivia Rhye"
        timestamp="Friday 2:21pm"
        status="read"
        content="Sure thing, I'll have a look today."
      />
      <Message
        type="file"
        senderName="Phoenix Baker"
        senderStatus="online"
        timestamp="Friday 2:22pm"
        fileName="Latest design screenshot.jpg"
        fileSize="1.2 MB"
        fileExtension="jpg"
      />
      <Message
        type="message-reply"
        sent
        senderName="Olivia Rhye"
        timestamp="Friday 2:25pm"
        status="read"
        replyText="Hey Olivia, can you please review the latest design?"
        content="Looks great! Just a few minor tweaks needed on the nav."
      />
      <Message
        type="image"
        senderName="Phoenix Baker"
        senderStatus="online"
        timestamp="Friday 2:30pm"
        src={PLACEHOLDER_IMAGE}
        fileName="nav-update-v2.png"
        fileSize="340 KB"
      />
      <Message
        type="link-minimal"
        sent
        senderName="Olivia Rhye"
        timestamp="Friday 2:32pm"
        status="delivered"
        url="https://www.untitledui.com"
        title="Untitled UI — Figma UI Kit"
        description="Check this reference for the nav pattern"
      />
      <Message
        type="writing"
        senderName="Phoenix Baker"
        senderStatus="online"
        timestamp="Now"
      />
    </div>
  ),
}

// ── All Types Gallery ───────────────────────────────────────────────────────

export const AllTypesIncoming: Story = {
  name: 'Gallery — All Incoming',
  render: () => (
    <div className="flex flex-col gap-6 w-full">
      <Message
        type="message"
        senderName="Phoenix Baker"
        senderStatus="online"
        timestamp="2:20pm"
        content="Text message"
      />
      <Message
        type="message-reply"
        senderName="Phoenix Baker"
        senderStatus="online"
        timestamp="2:21pm"
        replyText="Original message being quoted"
        content="Reply message"
      />
      <Message
        type="file"
        senderName="Phoenix Baker"
        senderStatus="online"
        timestamp="2:22pm"
        fileName="document.pdf"
        fileSize="3.8 MB"
        fileExtension="pdf"
      />
      <Message
        type="audio"
        senderName="Phoenix Baker"
        senderStatus="online"
        timestamp="2:23pm"
        duration="00:28"
      />
      <Message
        type="video"
        senderName="Phoenix Baker"
        senderStatus="online"
        timestamp="2:24pm"
        thumbnailSrc={PLACEHOLDER_VIDEO}
      />
      <Message
        type="image"
        senderName="Phoenix Baker"
        senderStatus="online"
        timestamp="2:25pm"
        src={PLACEHOLDER_IMAGE}
        fileName="photo.jpg"
        fileSize="128 KB"
      />
      <Message
        type="link-preview"
        senderName="Phoenix Baker"
        senderStatus="online"
        timestamp="2:26pm"
        url="https://www.untitledui.com"
        imageSrc={PLACEHOLDER_OG}
      />
      <Message
        type="link-minimal"
        senderName="Phoenix Baker"
        senderStatus="online"
        timestamp="2:27pm"
        url="https://www.untitledui.com"
        title="Untitled UI"
        description="The largest UI kit for Figma"
      />
      <Message
        type="writing"
        senderName="Phoenix Baker"
        senderStatus="online"
        timestamp="Now"
      />
    </div>
  ),
}

export const AllTypesOutgoing: Story = {
  name: 'Gallery — All Outgoing',
  render: () => (
    <div className="flex flex-col gap-6 w-full">
      <Message
        type="message"
        sent
        senderName="Olivia Rhye"
        timestamp="2:20pm"
        status="read"
        content="Text message"
      />
      <Message
        type="message-reply"
        sent
        senderName="Olivia Rhye"
        timestamp="2:21pm"
        status="read"
        replyText="Original message"
        content="Reply message"
      />
      <Message
        type="file"
        sent
        senderName="Olivia Rhye"
        timestamp="2:22pm"
        status="read"
        fileName="report.pdf"
        fileSize="3.8 MB"
        fileExtension="pdf"
      />
      <Message
        type="audio"
        sent
        senderName="Olivia Rhye"
        timestamp="2:23pm"
        status="read"
        duration="01:12"
      />
      <Message
        type="video"
        sent
        senderName="Olivia Rhye"
        timestamp="2:24pm"
        status="read"
        thumbnailSrc={PLACEHOLDER_VIDEO}
      />
      <Message
        type="image"
        sent
        senderName="Olivia Rhye"
        timestamp="2:25pm"
        status="read"
        src={PLACEHOLDER_IMAGE}
        fileName="screenshot.png"
        fileSize="2.1 MB"
      />
      <Message
        type="link-preview"
        sent
        senderName="Olivia Rhye"
        timestamp="2:26pm"
        status="delivered"
        url="https://www.figma.com"
        imageSrc={PLACEHOLDER_OG}
      />
      <Message
        type="link-minimal"
        sent
        senderName="Olivia Rhye"
        timestamp="2:27pm"
        status="sent"
        url="https://react-spectrum.adobe.com"
        title="React Aria"
        description="Accessible UI hooks"
      />
    </div>
  ),
}
