// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { requireMcAuth } from "./auth";

function makeReq(cookieValue?: string) {
  const headers: Record<string, string> = {};
  if (cookieValue !== undefined) headers["cookie"] = `mc_auth=${cookieValue}`;
  const { NextRequest } = require("next/server");
  return new NextRequest("http://localhost:3005/api/approvals", { headers });
}

describe("requireMcAuth", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "test-secret-aaaaaaaaaaaaaaaa";
  });

  it("passes when cookie matches AUTH_SECRET", () => {
    const result = requireMcAuth(makeReq("test-secret-aaaaaaaaaaaaaaaa"));
    expect(result.ok).toBe(true);
    expect(result.response).toBeUndefined();
  });

  it("rejects when cookie missing", () => {
    const result = requireMcAuth(makeReq());
    expect(result.ok).toBe(false);
    expect(result.response?.status).toBe(401);
  });

  it("rejects when cookie mismatches", () => {
    const result = requireMcAuth(makeReq("nope"));
    expect(result.ok).toBe(false);
    expect(result.response?.status).toBe(401);
  });

  it("returns 500 when AUTH_SECRET is too short (misconfigured)", () => {
    process.env.AUTH_SECRET = "short";
    const result = requireMcAuth(makeReq("short"));
    expect(result.ok).toBe(false);
    expect(result.response?.status).toBe(500);
  });

  it("returns 500 when AUTH_SECRET is unset", () => {
    delete process.env.AUTH_SECRET;
    const result = requireMcAuth(makeReq("anything"));
    expect(result.ok).toBe(false);
    expect(result.response?.status).toBe(500);
  });
});
