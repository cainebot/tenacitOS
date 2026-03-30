import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react"
import { TaskDetailPanel } from "./task-detail-panel"
import type {
  TaskStatus,
  Priority,
  TaskUser,
  TaskTag,
  Subtask,
  TaskComment,
  TaskAttachment,
  BreadcrumbItem,
} from "./task-detail-panel"
import type { DateValue } from "react-aria-components"

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockUsers: TaskUser[] = [
  { id: "1", name: "Jose Miguel Ojeda", role: "Project Lead" },
  { id: "2", name: "Joan Marcel", role: "Developer" },
  { id: "3", name: "Ivana Rodriguez", role: "Designer" },
  { id: "4", name: "Carlos Mendez", role: "QA Engineer" },
]

const mockAvailableTags: TaskTag[] = [
  { label: "Frontend", color: "purple" },
  { label: "Urgent", color: "error" },
  { label: "Design", color: "blue" },
  { label: "Backend", color: "success" },
  { label: "Documentation", color: "warning" },
  { label: "Refactor", color: "orange" },
]

const mockBreadcrumbs: BreadcrumbItem[] = [
  { code: "KAN-5", taskType: "epic" },
  { code: "KAN-1", taskType: "story" },
]

const mockSubtasks: Subtask[] = [
  {
    id: "s1",
    code: "KAN-4",
    title: "Setup project structure",
    taskType: "subtask",
    priority: "medium",
    assignee: null,
    status: "done",
  },
  {
    id: "s2",
    code: "KAN-6",
    title: "Design landing page mockups",
    taskType: "subtask",
    priority: "high",
    assignee: mockUsers[2],
    status: "in_progress",
  },
  {
    id: "s3",
    code: "KAN-7",
    title: "Implement authentication flow",
    taskType: "subtask",
    priority: "critical",
    assignee: mockUsers[1],
    status: "todo",
  },
]

const mockComments: TaskComment[] = [
  {
    id: "c1",
    author: mockUsers[0],
    content: "Created this task",
    createdAt: "Jul 13, 2022",
    isSystemEvent: true,
  },
  {
    id: "c2",
    author: mockUsers[0],
    content: "Assigned to Joan Marcel",
    createdAt: "Jul 13, 2022",
    isSystemEvent: true,
  },
  {
    id: "c3",
    author: mockUsers[1],
    content:
      "I have delegated this task to Ivana, she will assist me with this since I cannot do the assignment. Could you also add the images you had sent me to Drive? I can't see them in Slack, thanks.",
    createdAt: "Jul 18, 2022",
  },
  {
    id: "c4",
    author: mockUsers[0],
    content:
      "In DRIVE Unow > Portfolio you can find the project listing: https://docs.google.com/spreadsheets/d/1oavv...",
    createdAt: "Jul 21, 2022",
  },
]

const mockAttachments: TaskAttachment[] = [
  { id: "a1", name: "wireframe-v2.fig", size: "4.2 MB", createdAt: "Jul 15, 2022" },
  { id: "a2", name: "requirements.pdf", size: "1.8 MB", createdAt: "Jul 16, 2022" },
]

const mockBodyContent = `
<p>We need the Unow Work Portfolio to include in:</p>
<ul>
  <li>New Unow website</li>
  <li>Unow sales dossier</li>
  <li>Sortlist</li>
  <li>Malt?</li>
</ul>
<p>Each work item should contain:</p>
<ul>
  <li>Photos (screenshots) or videos</li>
  <li>Title</li>
  <li>Client</li>
  <li>Text: Challenges, Solution, Impact</li>
</ul>
<p>In <a href="#">DRIVE</a></p>
`

// ---------------------------------------------------------------------------
// Interactive wrapper (stateful)
// ---------------------------------------------------------------------------

function TaskDetailPanelInteractive() {
  const [title, setTitle] = useState("Task 1")
  const [status, setStatus] = useState<TaskStatus>("in_progress")
  const [isCompleted, setIsCompleted] = useState(false)
  const [assignee, setAssignee] = useState<TaskUser | null>(mockUsers[1])
  const [dueDate, setDueDate] = useState<DateValue | null>(null)
  const [tags, setTags] = useState<TaskTag[]>([
    { label: "Frontend", color: "purple" },
    { label: "Urgent", color: "error" },
    { label: "Design", color: "blue" },
    { label: "Backend", color: "success" },
  ])
  const [priority, setPriority] = useState<Priority | null>("high")
  const [comments, setComments] = useState(mockComments)
  const [attachments, setAttachments] = useState(mockAttachments)
  const [description, setDescription] = useState("Short description for this task goes here.")

  const handleAddComment = (content: string) => {
    setComments((prev) => [
      ...prev,
      {
        id: `c${Date.now()}`,
        author: { id: "current", name: "You" },
        content,
        createdAt: "Just now",
      },
    ])
  }

  const handleDeleteAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <TaskDetailPanel
      breadcrumbs={mockBreadcrumbs}
      isCompleted={isCompleted}
      onToggleComplete={() => setIsCompleted(!isCompleted)}
      onCopyLink={() => {}}
      onExpand={() => {}}
      onClose={() => {}}
      title={title}
      onTitleChange={setTitle}
      taskType="task"
      status={status}
      onStatusChange={setStatus}
      description={description}
      onDescriptionChange={setDescription}
      assignee={assignee}
      onAssigneeChange={setAssignee}
      users={mockUsers}
      dueDate={dueDate}
      onDueDateChange={setDueDate}
      tags={tags}
      availableTags={mockAvailableTags}
      onTagsChange={setTags}
      priority={priority}
      onPriorityChange={setPriority}
      subtasks={mockSubtasks}
      onAddSubtask={() => {}}
      onSubtaskClick={(sub) => console.log("subtask clicked", sub)}
      bodyContent={mockBodyContent}
      attachments={attachments}
      onDeleteAttachment={handleDeleteAttachment}
      onUploadAttachment={() => {}}
      comments={comments}
      onAddComment={handleAddComment}
      className="h-[900px] w-[520px] border border-secondary"
    />
  )
}

// ---------------------------------------------------------------------------
// Storybook config
// ---------------------------------------------------------------------------

const meta: Meta<typeof TaskDetailPanel> = {
  title: "Application/TaskDetailPanel",
  component: TaskDetailPanel,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
}

export default meta

type Story = StoryObj<typeof TaskDetailPanel>

export const Default: Story = {
  render: () => <TaskDetailPanelInteractive />,
}
