// ============================================================
// Phase 69 Plan 10 — instruction-file name validation + canonical-resolution helpers.
//
// Shared between:
//   - /api/agents/[id]/instructions/route.ts          (GET + POST)
//   - /api/agents/[id]/instructions/[file_name]/route.ts (PATCH + DELETE)
//   - useInstructionFiles() hook (display mapping)
//   - CreateInstructionFileModal (client-side validation)
//
// SECURITY T13 + T3 + canonical-shadow defense-in-depth:
// - FILE_NAME_REGEX rejects path-traversal attempts (slashes, `..`, null bytes).
// - CANONICAL_NAMES_LOWER mirrors the MCP tool constant + DB CHECK constraint
//   so the reserved-name branch has 4 independent layers of defense.
// ============================================================

import { NextResponse } from "next/server";

export const FILE_NAME_REGEX = /^[A-Za-z0-9_-]+\.md$/;

// Canonical names (lower-cased, without `.md`) that user-created files may not
// shadow. `memoy` is the Figma display-alias for `memory`; we block both.
export const CANONICAL_NAMES_LOWER = [
  "soul",
  "agents",
  "user",
  "identity",
  "tools",
  "heartbeat",
  "memory",
  "memoy",
] as const;

// File name → DB handle mapping.
//
// The UI shows a human-friendly filename (`SOUL.md`, `Tools.md`, `Memoy.md`,
// `Playbook.md`). The DB stores either:
//   - SOUL.md         → agents table (agents.soul_content + agents.icon)
//   - canonical 6     → agent_identity_files with file_type ∈ {agents, user,
//                        identity, tools, heartbeat, memory}
//   - user-created    → agent_instructions with matching file_name
//
// resolveFileHandle maps filename to the concrete handle the route must use.
export type FileHandle =
  | { kind: "soul" }
  | { kind: "canonical"; fileType: "agents" | "user" | "identity" | "tools" | "heartbeat" | "memory" }
  | { kind: "user"; fileName: string };

// Display → canonical file_type map. Case-insensitive.
// "memoy" is the Figma display spelling; it maps to the real "memory" row.
const CANONICAL_DISPLAY_TO_TYPE: Record<string, FileHandle["kind"] extends "canonical" ? ("agents" | "user" | "identity" | "tools" | "heartbeat" | "memory") : never> = {
  agents: "agents",
  user: "user",
  identity: "identity",
  tools: "tools",
  heartbeat: "heartbeat",
  memory: "memory",
  memoy: "memory",
};

export function resolveFileHandle(fileName: string): FileHandle | null {
  if (!isValidFileName(fileName)) return null;
  const stem = fileName.toLowerCase().replace(/\.md$/, "");
  if (stem === "soul") return { kind: "soul" };
  const mapped = CANONICAL_DISPLAY_TO_TYPE[stem];
  if (mapped) return { kind: "canonical", fileType: mapped };
  return { kind: "user", fileName };
}

export function isReservedName(fileName: string): boolean {
  const stem = fileName.toLowerCase().replace(/\.md$/, "");
  return (CANONICAL_NAMES_LOWER as readonly string[]).includes(stem);
}

export function isValidFileName(fileName: string): boolean {
  if (typeof fileName !== "string") return false;
  if (fileName.length === 0 || fileName.length > 64) return false;
  return FILE_NAME_REGEX.test(fileName);
}

/**
 * Returns a 400 `INVALID_FILE_NAME` NextResponse if the file_name does not
 * match `^[A-Za-z0-9_-]+\\.md$` (length ≤ 64) OR equals `SOUL.md` (which
 * passes because SOUL alphanumeric + `.md` also matches the regex). Returns
 * `null` on success.
 */
export function assertValidFileName(
  fileName: string | undefined | null,
): NextResponse | null {
  if (!isValidFileName(fileName ?? "")) {
    return NextResponse.json(
      {
        error: "INVALID_FILE_NAME",
        message:
          "file_name must match ^[A-Za-z0-9_-]+\\.md$ and be at most 64 characters.",
      },
      { status: 400 },
    );
  }
  return null;
}

// Canonical display names (used by GET to build merged response + by [file_name]
// route to reject DELETE on canonical files).
export const CANONICAL_DISPLAY_NAMES = [
  "SOUL.md",
  "Agents.md",
  "User.md",
  "Identity.md",
  "Tools.md",
  "Heartbeat.md",
  "Memoy.md",
] as const;

// Set used by DELETE route to reject canonical deletions with 400 UNDELETABLE.
const CANONICAL_DISPLAY_NAMES_LOWER = new Set(
  CANONICAL_DISPLAY_NAMES.map((n) => n.toLowerCase()),
);

export function isCanonicalDisplayName(fileName: string): boolean {
  return CANONICAL_DISPLAY_NAMES_LOWER.has(fileName.toLowerCase());
}

// Map file_type → display name (used by GET merge).
export function canonicalTypeToDisplayName(fileType: string): string {
  switch (fileType) {
    case "agents":
      return "Agents.md";
    case "user":
      return "User.md";
    case "identity":
      return "Identity.md";
    case "tools":
      return "Tools.md";
    case "heartbeat":
      return "Heartbeat.md";
    case "memory":
      return "Memoy.md";
    default:
      return fileType;
  }
}

export const __testables = {
  FILE_NAME_REGEX,
  CANONICAL_NAMES_LOWER,
  CANONICAL_DISPLAY_NAMES,
} as const;
