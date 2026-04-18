// CircOS Phase 64.5.2 Plan 03 Task 3 — Admin CRUD for public.error_messages.
//
// GET  /api/admin/error-messages — list all rows (admin-gated)
// PUT  /api/admin/error-messages — upsert (error_code, lang) row
// POST /api/admin/error-messages — alias for PUT (curl-friendly)
// DELETE /api/admin/error-messages?error_code=X&lang=Y — delete one row
//
// Auth gate: ADMIN_EMAILS env (comma-separated) — caller supplies email via
// `x-user-email` header. Returns 403 when:
//   - ADMIN_EMAILS unset or empty
//   - header missing
//   - header value not in the allowlist
//
// This is documented temporary debt (T-64.5.2-03-03) until Supabase Auth
// session lands post-v1.9. Single-operator v1.9 (RESEARCH §R-5).
//
// DELETE blocks live error codes (those still in @circos/cli-connect/shared/
// error-codes registry) — only orphan codes can be removed.
//
// [Rule 1 - Bug fix in 64.5.2-05] Plan 03 schema (message/remediation/category)
// did not match the live error_messages table (title/description/next_step/
// doc_link). Schema realigned + GET added so the admin editor can list rows.
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase";
import { isErrorCode } from "@circos/cli-connect/shared/error-codes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const upsertSchema = z.object({
  error_code: z.string().min(1).max(64),
  lang: z.enum(["es", "en"]),
  title: z.string().min(1),
  description: z.string().min(1),
  next_step: z.string().min(1).nullable(),
  doc_link: z.string().min(1).nullable(),
});

const deleteSchema = z.object({
  error_code: z.string().min(1).max(64),
  lang: z.enum(["es", "en"]),
});

function isAdmin(req: NextRequest): { ok: boolean; email?: string } {
  const adminEmailsRaw = process.env.ADMIN_EMAILS ?? "";
  const allow = adminEmailsRaw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (allow.length === 0) return { ok: false };

  const headerEmail = req.headers.get("x-user-email")?.trim().toLowerCase();
  if (!headerEmail) return { ok: false };
  if (!allow.includes(headerEmail)) return { ok: false, email: headerEmail };
  return { ok: true, email: headerEmail };
}

async function handleUpsert(req: NextRequest): Promise<NextResponse> {
  const gate = isAdmin(req);
  if (!gate.ok) {
    return NextResponse.json(
      { error: "forbidden", message: "admin access required" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "request body must be JSON" },
      { status: 400 },
    );
  }

  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "validation_failed",
        message: parsed.error.issues.map((i) => `${i.path.join(".")}:${i.message}`).join("; "),
      },
      { status: 400 },
    );
  }

  const sb = createServiceRoleClient();
  const { error } = await sb
    .from("error_messages")
    .upsert(
      {
        ...parsed.data,
        updated_by: gate.email ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "error_code,lang" },
    );

  if (error) {
    return NextResponse.json(
      { error: "db_error", message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const gate = isAdmin(req);
  if (!gate.ok) {
    return NextResponse.json(
      { error: "forbidden", message: "admin access required" },
      { status: 403 },
    );
  }
  const sb = createServiceRoleClient();
  const { data, error } = await sb
    .from("error_messages")
    .select("error_code, lang, title, description, next_step, doc_link, updated_at, updated_by")
    .order("error_code", { ascending: true })
    .order("lang", { ascending: true });
  if (error) {
    return NextResponse.json(
      { error: "db_error", message: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ rows: data ?? [] });
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  return handleUpsert(req);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return handleUpsert(req);
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const gate = isAdmin(req);
  if (!gate.ok) {
    return NextResponse.json(
      { error: "forbidden", message: "admin access required" },
      { status: 403 },
    );
  }

  const url = new URL(req.url);
  const parsed = deleteSchema.safeParse({
    error_code: url.searchParams.get("error_code"),
    lang: url.searchParams.get("lang"),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", message: parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }

  // Block deletion of codes still in the live registry (T-64.5.2-03-05).
  if (isErrorCode(parsed.data.error_code)) {
    return NextResponse.json(
      {
        error: "code_still_active",
        message: `code still in registry — cannot delete live error code "${parsed.data.error_code}"`,
      },
      { status: 400 },
    );
  }

  const sb = createServiceRoleClient();
  const { error } = await sb
    .from("error_messages")
    .delete()
    .eq("error_code", parsed.data.error_code)
    .eq("lang", parsed.data.lang);

  if (error) {
    return NextResponse.json(
      { error: "db_error", message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
