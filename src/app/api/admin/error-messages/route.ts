// CircOS Phase 64.5.2 Plan 03 Task 3 — Admin CRUD for public.error_messages.
//
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
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase";
import { isErrorCode } from "@circos/cli-connect/shared/error-codes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const upsertSchema = z.object({
  error_code: z.string().min(1).max(64),
  lang: z.enum(["es", "en"]),
  message: z.string().min(1),
  remediation: z.string().min(1),
  doc_link: z.string().min(1),
  category: z.string().min(1),
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
