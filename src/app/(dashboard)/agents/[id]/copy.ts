// Phase 69-01 — String constants for the /agents/[id] detail surface.
// See ./copy.ts (list scope) for the sibling constants.

export const AGENT_DETAIL_COPY = {
  // Tabs
  tabOverview: "Overview",
  tabSoul: "SOUL",
  tabInstructions: "Instructions",
  tabRuns: "Runs",
  tabSkills: "Skills",
  tabDanger: "Danger zone",

  // Header
  editButton: "Edit agent",
  pendingApprovalBanner: "Changes pending approval — this agent is locked until the request resolves.",
  archivedBanner: "This agent is archived.",

  // Edit form (reuses AGENTS_COPY field labels; banner is local)
  editTitle: "Edit agent",
  editSubtitle: "Submits an update_agent approval. Whitelisted fields only.",
  submitUpdate: "Request update",
  submitPending: "Requesting…",

  // Runs tab
  runsTitle: "Recent runs",
  runsAdapterLabel: "Adapter",
  runsRefresh: "Refresh",
  runsEmptyTitle: "No runs yet",
  runsEmptyDescription: "This agent has not been woken.",

  // SOUL tab
  soulEmpty: "No SOUL content set.",
  soulCharsLabel: "chars",

  // Skills tab
  skillsEmptyTitle: "No skills wired yet",
  skillsEmptyDescription: (name: string) => `${name} has no skills attached. Wire one to let the agent use tools.`,
  skillsAttachCta: "Add skills",

  // Danger zone tab
  dangerTitle: "Danger zone",
  dangerDeleteTitle: "Archive this agent",
  dangerDeleteBody: "Archiving sends a delete_agent approval. The agent stays in the DB (soft-delete) but is hidden from runtime.",
  dangerDeleteCta: "Archive agent",
  dangerConfirmLabel: (slug: string) => `Type ${slug} to confirm`,
  dangerConfirmCta: "Confirm archive",
  dangerCancel: "Cancel",

  // Run detail (/[id]/runs/[runId])
  runDetailTitle: "Run detail",
  runDetailBack: "Back to runs",
  runDetailStreamingLabel: "Streaming live",
  runDetailTerminalLabel: "Finished",
  runDetailJumpToLive: "Jump to live",
  runDetailLogsWarning: "Logs may contain sensitive data — do not share screenshots externally.",
  runDetailExitCodeLabel: "Exit code",
  runDetailDurationLabel: "Duration",
  runDetailStartedLabel: "Started",
  runDetailFinishedLabel: "Finished",
} as const;

export type AgentDetailCopyKey = keyof typeof AGENT_DETAIL_COPY;
