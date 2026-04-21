// ============================================================
// Phase 69 Plan 11 — /api/agents/[id]/assign-task
//
// Inserts a `cards` row with assigned_agent_id=params.id.
// NOT approval-gated (Assumption A2 — task assignment to internal agents
// matches existing Kanban UX where humans create cards without approval).
//
// Contract:
//   POST /api/agents/[id]/assign-task
//     body: {
//       title: string,                // required, ≤ 200, regex-safe
//       description?: string,          // ≤ 50_000
//       workflow_id?: string,          // UUID — required to route to a board
//       state_id?: string,             // UUID — required
//       card_type?: 'task'|'story'|... // default 'task'
//       priority?: 'low'|'medium'|'high'|'critical',
//       due_date?: string,
//       labels?: string[]
//     }
//     200 { card_id, assigned_agent_id, state_id, workflow_id }
//     400 INVALID_ID | VALIDATION_ERROR | FORBIDDEN_FIELD | NO_BOARD
//     401 unauthorized
//     403 INVALID_ORIGIN
//     404 AGENT_NOT_FOUND
//     415 UNSUPPORTED_MEDIA_TYPE
//
// Reuses existing `createCard` helper (control-panel/src/lib/cards.ts) for
// compatibility with the Phase 85 Kanban schema (workflow_id + state_id).
// Does NOT create a new `issues` / `backlog` table (Assumption A2).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { requireMcAuth } from "@/lib/auth";
import { assertSameOriginJson } from "@/lib/csrf";
import { assertValidAgentId } from "@/lib/uuid";
import { createServiceRoleClient } from "@/lib/supabase";
import { createCard } from "@/lib/cards";
import type { CardType, Priority } from "@/types/workflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Title regex — letters (any language), numbers, space, and a conservative
// set of punctuation. Rejects `<`, `>`, `&`, `"`, `'`, `/`, `\` to harden
// against XSS in downstream React text renders (defense-in-depth).
const TITLE_REGEX = /^[\p{L}\p{N} ._,:;!?()+\-]+$/u;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_CARD_TYPES: readonly CardType[] = [
  "epic",
  "story",
  "task",
  "subtask",
  "bug",
];
// NOTE: Priority type uses Spanish values per Phase 85 Kanban schema
// (baja/media/alta/critica). We keep these server-side; the client hook
// exposes English aliases for operator ergonomics and maps them here.
const VALID_PRIORITIES: readonly Priority[] = [
  "baja",
  "media",
  "alta",
  "critica",
];
const PRIORITY_ALIAS: Record<string, Priority> = {
  low: "baja",
  medium: "media",
  high: "alta",
  critical: "critica",
  baja: "baja",
  media: "media",
  alta: "alta",
  critica: "critica",
};
const ALLOWED_BODY_KEYS = new Set([
  "title",
  "description",
  "workflow_id",
  "state_id",
  "card_type",
  "priority",
  "due_date",
  "labels",
]);

function assertPlainObject(body: unknown): NextResponse | null {
  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Body must be a JSON object." },
      { status: 400 },
    );
  }
  if (Object.getPrototypeOf(body) !== Object.prototype) {
    return NextResponse.json(
      {
        error: "FORBIDDEN_FIELD",
        message: "Body prototype mismatch.",
        reason: "prototype_pollution_attempt",
      },
      { status: 400 },
    );
  }
  for (const poison of ["__proto__", "constructor", "prototype"] as const) {
    if (Object.hasOwn(body as object, poison)) {
      return NextResponse.json(
        {
          error: "FORBIDDEN_FIELD",
          message: `Forbidden key '${poison}'.`,
          reason: "prototype_pollution_attempt",
        },
        { status: 400 },
      );
    }
  }
  return null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  const idErr = assertValidAgentId(id);
  if (idErr) return idErr;

  const csrfErr = assertSameOriginJson(req);
  if (csrfErr) return csrfErr;

  const auth = requireMcAuth(req);
  if (!auth.ok) return auth.response!;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const protoErr = assertPlainObject(body);
  if (protoErr) return protoErr;

  const payload = body as Record<string, unknown>;

  // Whitelist.
  for (const k of Object.keys(payload)) {
    if (!ALLOWED_BODY_KEYS.has(k)) {
      return NextResponse.json(
        { error: "FORBIDDEN_FIELD", message: `Unknown field '${k}'.` },
        { status: 400 },
      );
    }
  }

  // title — required.
  const rawTitle = payload.title;
  if (typeof rawTitle !== "string") {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        field: "title",
        message: "title is required and must be a string.",
      },
      { status: 400 },
    );
  }
  const title = rawTitle.trim();
  if (title.length === 0 || title.length > 200) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        field: "title",
        message: "title must be 1-200 chars.",
      },
      { status: 400 },
    );
  }
  if (!TITLE_REGEX.test(title)) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        field: "title",
        message:
          "title may only contain letters, numbers, spaces, and conservative punctuation (._,:;!?()+-).",
      },
      { status: 400 },
    );
  }

  // description — optional.
  let description: string | undefined;
  if (payload.description !== undefined) {
    if (typeof payload.description !== "string" || payload.description.length > 50_000) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          field: "description",
          message: "description must be a string ≤ 50 000 chars.",
        },
        { status: 400 },
      );
    }
    description = payload.description;
  }

  // workflow_id / state_id — required to route to a board.
  if (typeof payload.workflow_id !== "string" || !UUID_REGEX.test(payload.workflow_id)) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        field: "workflow_id",
        message: "workflow_id is required and must be a UUID.",
      },
      { status: 400 },
    );
  }
  if (typeof payload.state_id !== "string" || !UUID_REGEX.test(payload.state_id)) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        field: "state_id",
        message: "state_id is required and must be a UUID.",
      },
      { status: 400 },
    );
  }

  // card_type — default 'task'.
  let cardType: CardType = "task";
  if (payload.card_type !== undefined) {
    if (
      typeof payload.card_type !== "string" ||
      !VALID_CARD_TYPES.includes(payload.card_type as CardType)
    ) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          field: "card_type",
          message: `card_type must be one of: ${VALID_CARD_TYPES.join(", ")}.`,
        },
        { status: 400 },
      );
    }
    cardType = payload.card_type as CardType;
  }

  // priority — optional. Accept either the Spanish canonical values
  // (baja/media/alta/critica) or the English aliases (low/medium/high/critical);
  // the map coerces English → Spanish before hitting the DB.
  let priority: Priority | undefined;
  if (payload.priority !== undefined) {
    const raw = typeof payload.priority === "string" ? payload.priority : "";
    const mapped = PRIORITY_ALIAS[raw];
    if (!mapped) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          field: "priority",
          message: `priority must be one of: ${[
            ...VALID_PRIORITIES,
            "low",
            "medium",
            "high",
            "critical",
          ].join(", ")}.`,
        },
        { status: 400 },
      );
    }
    priority = mapped;
  }

  // due_date — optional ISO.
  let dueDate: string | undefined;
  if (payload.due_date !== undefined && payload.due_date !== null) {
    if (typeof payload.due_date !== "string") {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          field: "due_date",
          message: "due_date must be an ISO-8601 string.",
        },
        { status: 400 },
      );
    }
    const parsed = new Date(payload.due_date);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          field: "due_date",
          message: "due_date is not a valid ISO-8601 timestamp.",
        },
        { status: 400 },
      );
    }
    dueDate = payload.due_date;
  }

  // labels — optional string[].
  let labels: string[] | undefined;
  if (payload.labels !== undefined) {
    if (!Array.isArray(payload.labels) || !payload.labels.every((l) => typeof l === "string")) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          field: "labels",
          message: "labels must be an array of strings.",
        },
        { status: 400 },
      );
    }
    labels = payload.labels as string[];
  }

  // Agent existence pre-check — fail fast with 404 before INSERT.
  const supabase = createServiceRoleClient();
  const { data: agent, error: agentErr } = await supabase
    .from("agents")
    .select("agent_id")
    .eq("agent_id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (agentErr) {
    return NextResponse.json(
      { error: "db_error", message: agentErr.message },
      { status: 500 },
    );
  }
  if (!agent) {
    return NextResponse.json(
      { error: "AGENT_NOT_FOUND", message: "Agent not found." },
      { status: 404 },
    );
  }

  // Create the card via the existing helper (keeps Phase 85 schema contract in one place).
  try {
    const card = await createCard({
      title,
      workflow_id: payload.workflow_id,
      state_id: payload.state_id,
      card_type: cardType,
      description,
      assigned_agent_id: id,
      priority,
      labels,
      due_date: dueDate,
    });

    return NextResponse.json(
      {
        card_id: card.card_id,
        assigned_agent_id: id,
        state_id: card.state_id,
        workflow_id: card.workflow_id,
      },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("validate_card_hierarchy")) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", field: "card_type", message },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "db_error", message },
      { status: 500 },
    );
  }
}
