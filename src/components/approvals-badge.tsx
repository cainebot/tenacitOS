"use client";

// Phase 68 Plan 06 Task 6 — Sidebar badge for pending approvals count.
//
// Renders a UUI Badge when there are active approvals in the queue.
// Mounted inside the sidebar nav config (see (dashboard)/layout.tsx).

import { Badge } from "@circos/ui";
import { useApprovalsCount } from "@/hooks/useApprovalsCount";

export function ApprovalsBadge() {
  const { count } = useApprovalsCount();
  if (count === 0) return null;
  return (
    <Badge color="warning" type="pill-color" size="sm">
      {count > 99 ? "99+" : String(count)}
    </Badge>
  );
}
