// Phase 68.1 Item 2 — POST /api/auth/realtime-token.
//
// SECURITY NOTE (Codex HIGH scope language): The JWT issued here is signed
// with SUPABASE_JWT_SECRET and carries role='authenticated'. It is NOT
// cryptographically scoped to /approvals — it is usage-scoped. Any Realtime
// subscription / RLS-gated table that accepts role='authenticated' is
// reachable with this token. Blast radius of a leaked token = everything
// role='authenticated' can read/write per RLS during TTL=5min.
//
// Mitigations:
//   - TTL=5min (short attack window).
//   - mc_auth gate on the mint endpoint (attacker needs mc_auth to refresh).
//   - RLS is the actual authorisation boundary.
//   - Token stays in-memory only (hook never persists to localStorage).
//
// Contract:
//   POST /api/auth/realtime-token
//   → 200 { ok: true, token: 'eyJ...', expires_in: 300 }
//   → 401 { ok: false, error: 'unauthorized' }
//   → 500 { ok: false, error: 'auth_misconfigured' }

import { NextResponse, type NextRequest } from "next/server";
import { SignJWT } from "jose";
import { requireMcAuth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TTL_SECONDS = 300;
const SECRET_MIN_CHARS = 32;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = requireMcAuth(req);
  if (!auth.ok) return auth.response!;

  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret || secret.length < SECRET_MIN_CHARS) {
    // NOTE: never echo the secret back. The body carries only an opaque
    // `auth_misconfigured` code so operators diagnose via server logs, not
    // by reading the response.
    return NextResponse.json(
      {
        ok: false,
        error: "auth_misconfigured",
        message: "SUPABASE_JWT_SECRET absent or too short",
      },
      { status: 500 },
    );
  }

  const deployment = process.env.CIRCOS_DEPLOYMENT_ID ?? "unknown";
  const now = Math.floor(Date.now() / 1000);
  try {
    const token = await new SignJWT({
      sub: `system:${deployment}`,
      aud: "authenticated",
      role: "authenticated",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(now)
      .setExpirationTime(now + TTL_SECONDS)
      .sign(new TextEncoder().encode(secret));

    return NextResponse.json(
      { ok: true, token, expires_in: TTL_SECONDS },
      { status: 200 },
    );
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: "mint_failed",
        message: (e as Error).message ?? "unknown",
      },
      { status: 500 },
    );
  }
}
