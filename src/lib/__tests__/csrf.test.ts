// Phase 69-01 — Unit tests for lib/csrf.ts.
// Closes SECURITY T4 (prod allow-list guard) and covers the
// same-origin + Content-Type decision table.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// We re-import csrf.ts multiple times with different NODE_ENV / env var
// setups to exercise the module-load guard. Vitest's resetModules + dynamic
// import is the standard way to do this.
const CSRF_PATH = "../csrf";

function makeRequest(
  method: string,
  origin: string | undefined,
  extras: Record<string, string> = {},
): NextRequest {
  const headers = new Headers();
  if (origin !== undefined) headers.set("origin", origin);
  for (const [k, v] of Object.entries(extras)) headers.set(k, v);
  return new NextRequest(new URL("http://localhost:3000/api/agents"), {
    method,
    headers,
  });
}

describe("lib/csrf — default dev allow-list (NODE_ENV=test)", () => {
  const ORIG = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIG };
    process.env.NODE_ENV = "test";
    delete process.env.CIRCOS_ALLOWED_ORIGINS;
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  afterEach(() => {
    process.env = ORIG;
  });

  it("imports cleanly with default dev allow-list", async () => {
    const mod = await import(CSRF_PATH);
    expect(mod.__testables.EFFECTIVE_ALLOW_LIST).toContain("http://localhost:3000");
    expect(mod.__testables.EFFECTIVE_ALLOW_LIST).toContain("http://localhost:3003");
    expect(mod.__testables.EFFECTIVE_ALLOW_LIST).toContain("http://localhost:3007");
  });

  it("accepts POST with allow-listed Origin + JSON Content-Type → null", async () => {
    const { assertSameOriginJson } = await import(CSRF_PATH);
    const res = assertSameOriginJson(
      makeRequest("POST", "http://localhost:3000", {
        "content-type": "application/json",
      }),
    );
    expect(res).toBeNull();
  });

  it("rejects POST with missing Origin → 403 INVALID_ORIGIN", async () => {
    const { assertSameOriginJson } = await import(CSRF_PATH);
    const res = assertSameOriginJson(makeRequest("POST", undefined));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
    const body = await res!.json();
    expect(body.error).toBe("INVALID_ORIGIN");
  });

  it("rejects POST with off-allow-list Origin → 403 INVALID_ORIGIN", async () => {
    const { assertSameOriginJson } = await import(CSRF_PATH);
    const res = assertSameOriginJson(
      makeRequest("POST", "https://evil.example", {
        "content-type": "application/json",
      }),
    );
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });

  it("rejects POST with wrong Content-Type → 415 UNSUPPORTED_MEDIA_TYPE", async () => {
    const { assertSameOriginJson } = await import(CSRF_PATH);
    const res = assertSameOriginJson(
      makeRequest("POST", "http://localhost:3000", {
        "content-type": "text/plain",
      }),
    );
    expect(res).not.toBeNull();
    expect(res!.status).toBe(415);
    const body = await res!.json();
    expect(body.error).toBe("UNSUPPORTED_MEDIA_TYPE");
  });

  it("GET with requireContentType=false passes without Content-Type", async () => {
    const { assertSameOriginJson } = await import(CSRF_PATH);
    const res = assertSameOriginJson(
      makeRequest("GET", "http://localhost:3000"),
      { requireContentType: false },
    );
    expect(res).toBeNull();
  });

  it("falls back to Referer when Origin is missing", async () => {
    const { assertSameOriginJson } = await import(CSRF_PATH);
    const res = assertSameOriginJson(
      makeRequest("GET", undefined, {
        referer: "http://localhost:3000/agents",
      }),
      { requireContentType: false },
    );
    expect(res).toBeNull();
  });
});

describe("lib/csrf — production prod-guard (SECURITY T4)", () => {
  const ORIG = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIG };
  });

  afterEach(() => {
    process.env = ORIG;
  });

  it("throws INSECURE_ORIGIN_ALLOWLIST when NODE_ENV=production and allow-list contains localhost", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.CIRCOS_ALLOWED_ORIGINS;
    delete process.env.NEXT_PUBLIC_SITE_URL;

    await expect(import(CSRF_PATH)).rejects.toThrow(/INSECURE_ORIGIN_ALLOWLIST/);
  });

  it("imports cleanly when NODE_ENV=production and CIRCOS_ALLOWED_ORIGINS is set to non-localhost", async () => {
    process.env.NODE_ENV = "production";
    process.env.CIRCOS_ALLOWED_ORIGINS = "https://circos.example";

    const mod = await import(CSRF_PATH);
    expect(mod.__testables.EFFECTIVE_ALLOW_LIST).toEqual(["https://circos.example"]);
  });

  it("throws when prod allow-list explicitly includes 127.0.0.1", async () => {
    process.env.NODE_ENV = "production";
    process.env.CIRCOS_ALLOWED_ORIGINS = "https://circos.example,http://127.0.0.1:3000";

    await expect(import(CSRF_PATH)).rejects.toThrow(/INSECURE_ORIGIN_ALLOWLIST/);
  });
});
