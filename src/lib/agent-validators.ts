// Phase 69 Plan 02/03 — shared client-side + server-side validators for
// agent CRUD inputs. Plan 02 consumes the client-side predicates from
// AgentForm / DeleteAgentModal; Plan 03 wraps the same predicates at the
// API boundary (POST / PATCH /api/agents).
//
// All predicates are pure functions — no React, no Supabase, no Next.js.
// Keep this file runnable under vitest jsdom AND under Node (route.ts).
//
// SECURITY threats mitigated (mirrors SECURITY.md §T2, §T3, §T7, §T9):
// - T3: agent.name regex whitelist rejects HTML metacharacters.
// - T7: validateAgentUpdatePayload rejects whitelisted-only keys,
//       using Object.hasOwn to block prototype-pollution paths.
// - T9: isAllowedAvatarUrl rejects javascript: / data: / file: / blob:
//       schemes. Only http: / https: / empty are accepted.

/**
 * Whitelist of fields the UI is allowed to edit via create/update.
 * Everything else is ADMIN-only and handled via back-office migration.
 */
export const EDITABLE_AGENT_FIELDS = [
  "name",
  "slug",
  "soul_content",
  "avatar_url",
] as const;

export type EditableAgentField = (typeof EDITABLE_AGENT_FIELDS)[number];

/**
 * Hard caps aligned with `docs/RESEARCH-PAPERCLIP-CLI-CONNECT-v3.md` §3.6
 * and Plan 03's server validator. Kept in a single constant so client
 * and server paths can never drift.
 */
export const AGENT_VALIDATION = {
  NAME_MIN: 1,
  NAME_MAX: 64,
  // Letters (any language), numbers, space, underscore, hyphen.
  // Rejects `<`, `>`, `&`, `"`, `'`, `/`, `\`, and other HTML metacharacters.
  NAME_REGEX: /^[\p{L}\p{N} _-]+$/u,
  SLUG_MIN: 1,
  SLUG_MAX: 64,
  SLUG_REGEX: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  SOUL_MAX: 50_000,
  AVATAR_URL_MAX: 2048,
} as const;

/**
 * Client-side name validator. Returns null on pass or a human-readable
 * error string on fail (used as `<Input hint>`).
 */
export function validateAgentName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < AGENT_VALIDATION.NAME_MIN) return "Name is required";
  if (trimmed.length > AGENT_VALIDATION.NAME_MAX) {
    return `Name must be ≤ ${AGENT_VALIDATION.NAME_MAX} characters`;
  }
  if (!AGENT_VALIDATION.NAME_REGEX.test(trimmed)) {
    return "Name may only contain letters, numbers, spaces, underscores, and hyphens";
  }
  return null;
}

/**
 * Kebab-case a string — used by AgentForm's auto-slug derivation as the
 * user types in the name field. Slicing to NAME_MAX so long inputs
 * don't produce a slug that fails the length check.
 */
export function kebabify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, AGENT_VALIDATION.SLUG_MAX);
}

/**
 * Slug validator — enforces kebab-case + length cap.
 */
export function validateAgentSlug(slug: string): string | null {
  if (slug.length < AGENT_VALIDATION.SLUG_MIN) return "Slug is required";
  if (slug.length > AGENT_VALIDATION.SLUG_MAX) {
    return `Slug must be ≤ ${AGENT_VALIDATION.SLUG_MAX} characters`;
  }
  if (!AGENT_VALIDATION.SLUG_REGEX.test(slug)) {
    return "Slug must be lowercase kebab-case (a–z, 0–9, hyphens)";
  }
  return null;
}

/**
 * SOUL.md body validator — only a hard length cap. Content is rendered
 * as React text children inside `<pre>`, so HTML metacharacters are
 * auto-escaped (SECURITY T3).
 */
export function validateSoulContent(soul: string): string | null {
  if (soul.length > AGENT_VALIDATION.SOUL_MAX) {
    return `SOUL body must be ≤ ${AGENT_VALIDATION.SOUL_MAX.toLocaleString()} characters`;
  }
  return null;
}

/**
 * SECURITY T9 mitigation — `avatar_url` must be empty or an absolute
 * http(s) URL. Anything else (javascript:, data:, file:, blob:,
 * vbscript:, relative paths) is rejected at the UI boundary so the
 * submit button can disable before round-tripping the server.
 *
 * The server (Plan 03) re-applies the same check; this is the UI half.
 */
export function isAllowedAvatarUrl(avatarUrl: string | null | undefined): boolean {
  if (avatarUrl == null) return true;
  const trimmed = avatarUrl.trim();
  if (trimmed.length === 0) return true;
  if (trimmed.length > AGENT_VALIDATION.AVATAR_URL_MAX) return false;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:";
}

/**
 * Human-readable form of `isAllowedAvatarUrl` — returns `null` when
 * allowed or an error message otherwise.
 */
export function validateAvatarUrl(avatarUrl: string | null | undefined): string | null {
  if (avatarUrl == null || avatarUrl.trim().length === 0) return null;
  if (!isAllowedAvatarUrl(avatarUrl)) {
    return "Avatar URL must be http:// or https://";
  }
  return null;
}

/**
 * Server half (Plan 03) re-uses this to reject writes that target
 * non-whitelisted fields. Uses `Object.hasOwn` (not `in`) so a
 * prototype-pollution payload `{ "__proto__": { "role": "admin" } }`
 * is a no-op rather than a bypass. SECURITY T7 hardening.
 */
export function rejectForbiddenFields(body: Record<string, unknown>): string | null {
  for (const key of Object.keys(body)) {
    if (!Object.hasOwn(body, key)) continue;
    if (!(EDITABLE_AGENT_FIELDS as readonly string[]).includes(key)) {
      return `Field '${key}' is not editable via this endpoint`;
    }
  }
  return null;
}
