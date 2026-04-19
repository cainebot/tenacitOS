// @vitest-environment node
// Phase 68.1 Item 2 — POST /api/auth/realtime-token route tests.
import { describe, it, expect, beforeEach } from "vitest";
import { decodeJwt, jwtVerify } from "jose";

async function importRoute() {
  const mod = await import("./route");
  return mod;
}

function makeReq(opts: { cookie?: string } = {}) {
  const headers: Record<string, string> = {};
  if (opts.cookie) headers["cookie"] = opts.cookie;
  const { NextRequest } = require("next/server");
  return new NextRequest("http://localhost:3005/api/auth/realtime-token", {
    method: "POST",
    headers,
  });
}

const AUTH_SECRET = "test-secret-aaaaaaaaaaaaaaaa";
const GOOD_JWT_SECRET = "test-jwt-secret-min-32-chars-0000000";

describe("POST /api/auth/realtime-token", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = AUTH_SECRET;
    process.env.SUPABASE_JWT_SECRET = GOOD_JWT_SECRET;
    process.env.CIRCOS_DEPLOYMENT_ID = "test-deployment";
  });

  it("1. returns 401 when mc_auth cookie is missing", async () => {
    const { POST } = await importRoute();
    const res = await POST(makeReq());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toMatchObject({ ok: false, error: "unauthorized" });
  });

  it("2. returns 401 when mc_auth cookie is invalid", async () => {
    const { POST } = await importRoute();
    const res = await POST(makeReq({ cookie: "mc_auth=WRONG" }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it("3. returns 500 when SUPABASE_JWT_SECRET is absent", async () => {
    delete process.env.SUPABASE_JWT_SECRET;
    const { POST } = await importRoute();
    const res = await POST(makeReq({ cookie: `mc_auth=${AUTH_SECRET}` }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toMatchObject({ ok: false, error: "auth_misconfigured" });
    // Body MUST NOT echo the secret value anywhere.
    const bodyText = JSON.stringify(body);
    expect(bodyText).not.toContain(GOOD_JWT_SECRET);
  });

  it("4. returns 500 when SUPABASE_JWT_SECRET is under 32 chars", async () => {
    const tooShortValue = "xyzzyPlugh42";
    process.env.SUPABASE_JWT_SECRET = tooShortValue;
    const { POST } = await importRoute();
    const res = await POST(makeReq({ cookie: `mc_auth=${AUTH_SECRET}` }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toMatchObject({ ok: false, error: "auth_misconfigured" });
    // value not echoed — body must not contain the actual secret string.
    expect(JSON.stringify(body)).not.toContain(tooShortValue);
  });

  it("5. returns 200 + 3-segment JWT with correct claims on happy path", async () => {
    const { POST } = await importRoute();
    const res = await POST(makeReq({ cookie: `mc_auth=${AUTH_SECRET}` }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.expires_in).toBe(300);
    expect(typeof body.token).toBe("string");
    expect(body.token.split(".").length).toBe(3);

    const claims = decodeJwt(body.token);
    expect(claims.aud).toBe("authenticated");
    expect((claims as { role?: string }).role).toBe("authenticated");
    expect(claims.sub).toBe("system:test-deployment");
    expect(typeof claims.iat).toBe("number");
    expect(typeof claims.exp).toBe("number");
    expect((claims.exp as number) - (claims.iat as number)).toBe(300);
  });

  it("6. token signature is verifiable with SUPABASE_JWT_SECRET", async () => {
    const { POST } = await importRoute();
    const res = await POST(makeReq({ cookie: `mc_auth=${AUTH_SECRET}` }));
    const body = await res.json();
    const secretBytes = new TextEncoder().encode(GOOD_JWT_SECRET);
    const verified = await jwtVerify(body.token, secretBytes, {
      audience: "authenticated",
    });
    expect(verified.payload.aud).toBe("authenticated");
    expect((verified.payload as { role?: string }).role).toBe("authenticated");
  });
});
