// Phase 69-01 — String constants for the per-type approval payload
// renderers under components/approvals/approval-payload-*.tsx.
// Populated here so Plan 69-06 can wire directly without redefining.

export const APPROVALS_COPY = {
  // Dispatch renderer banners
  unknownType: "Unknown approval type — showing raw JSON.",
  logsSensitiveBanner: "This approval carries sensitive payload — review carefully.",

  // create_agent
  createTitle: "Create agent",
  createFieldSlug: "Slug",
  createFieldName: "Name",
  createFieldAvatar: "Avatar",
  createFieldSoul: "SOUL content",
  createFieldRole: "Role",
  createFieldAdapter: "Adapter",
  createFieldBinding: "Node binding",
  createSoulTruncatedNote: "SOUL preview truncated. Expand to review all characters before approving.",
  createShowFullSoul: "Show full SOUL",
  createHideFullSoul: "Hide full SOUL",
  createNoSoul: "(no SOUL content)",

  // update_agent
  updateTitle: "Update agent",
  updateBeforeLabel: "Before",
  updateAfterLabel: "After",
  updateNoChanges: "(no field changes in payload)",
  updateWhitelistNote: "Only whitelisted fields (name, soul_content, avatar_url) are shown.",

  // delete_agent
  deleteTitle: "Archive agent",
  deleteWarning: "You are about to archive this agent. It will be soft-deleted (deleted_at set) and hidden from runtime.",
  deletePendingRunsLabel: "Pending runs",

  // delete_agents_bulk
  bulkDeleteTitle: "Archive multiple agents",
  bulkDeleteWarning: "Bulk archive is seed-only and irreversible from the runtime's perspective.",
  bulkDeleteCountLabel: (n: number) => `${n} agent${n === 1 ? "" : "s"} to archive`,

  // send_external_message
  messageTitle: "Send external message",
  messageChannelLabel: "Channel",
  messageRecipientLabel: "Recipient",
  messageBodyLabel: "Message body",
  messageMasked: "(masked)",

  // Fallback
  rawPayloadLabel: "Raw payload",
} as const;

export type ApprovalsCopyKey = keyof typeof APPROVALS_COPY;
