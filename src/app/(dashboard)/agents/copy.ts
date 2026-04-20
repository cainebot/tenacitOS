// Phase 69-01 — String constants for the /agents list + create pages.
// Module-scoped to keep Phase 69 i18n-ready. A future locale phase can
// swap the source for a catalog loader without editing consumers.

export const AGENTS_COPY = {
  // List page
  listTitle: "Agents",
  listSubtitle: "Autonomous workers bound to the mesh.",
  newButton: "New agent",
  includeArchivedToggle: "Include archived",
  emptyTitle: "No agents yet",
  emptyDescription: "Create the first agent to populate your mesh.",
  emptyCta: "Create agent",
  loadingLabel: "Loading agents…",

  // Table columns
  colName: "Name",
  colStatus: "Status",
  colAdapter: "Adapter",
  colNode: "Node",
  colLastRun: "Last run",
  colActions: "Actions",

  // Create form
  newTitle: "New agent",
  newSubtitle: "Only whitelisted fields are editable. Admin fields stay read-only.",
  fieldName: "Name",
  fieldNamePlaceholder: "e.g. Scrum master",
  fieldSlug: "Slug",
  fieldSlugHint: "Auto-derived from the name. Lowercase kebab-case.",
  fieldSoul: "SOUL",
  fieldSoulHint: "Identity contract — markdown, up to 50 KB.",
  fieldSoulPlaceholder: "# Who am I\n\n…",
  fieldAvatar: "Avatar URL",
  fieldAvatarHint: "Optional. http:// or https:// only.",
  fieldAvatarPlaceholder: "https://…",
  readonlyAdapter: "Adapter",
  readonlyRole: "Role",
  readonlyNodeBinding: "Node binding",
  readonlyTooltip: "Managed by ops — contact admin to change.",
  submitCreate: "Request creation",
  submitPending: "Requesting…",
  cancel: "Cancel",

  // Toasts
  toastCreateRequested: "Agent creation requested — pending approval",
  toastCreateFailed: "Failed to request agent creation",
  toastDeleteRequested: "Agent deletion requested — pending approval",
  toastDeleteFailed: "Failed to request agent deletion",
} as const;

export type AgentsCopyKey = keyof typeof AGENTS_COPY;
