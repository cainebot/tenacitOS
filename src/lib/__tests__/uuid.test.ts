// @vitest-environment node
// Phase 69-03 — assertValidUuid / isValidUuid / assertValidAgentId coverage (SECURITY T13).
import { describe, it, expect } from "vitest";
import { assertValidUuid, isValidUuid, assertValidAgentId, isValidAgentId } from "../uuid";

const VALID_LOWER = "12345678-1234-4234-8234-123456789abc";
const VALID_UPPER = "12345678-1234-4234-8234-123456789ABC";
const VALID_MIXED = "AbCdEf01-1234-4234-8234-123456789abc";

describe("assertValidUuid", () => {
  it("returns null for a canonical v4 UUID", () => {
    expect(assertValidUuid(VALID_LOWER)).toBeNull();
  });

  it("accepts uppercase UUID", () => {
    expect(assertValidUuid(VALID_UPPER)).toBeNull();
  });

  it("accepts mixed-case UUID", () => {
    expect(assertValidUuid(VALID_MIXED)).toBeNull();
  });

  it("returns a 400 NextResponse for an empty string", async () => {
    const res = assertValidUuid("");
    expect(res).not.toBeNull();
    expect(res!.status).toBe(400);
    const body = await res!.json();
    expect(body.error).toBe("INVALID_ID");
  });

  it("returns 400 for a bare integer-like id", async () => {
    const res = assertValidUuid("123");
    expect(res).not.toBeNull();
    expect(res!.status).toBe(400);
  });

  it("returns 400 for a non-uuid garbage string", async () => {
    const res = assertValidUuid("xyz-not-a-uuid");
    expect(res).not.toBeNull();
    expect(res!.status).toBe(400);
  });

  it("returns 400 for undefined", async () => {
    const res = assertValidUuid(undefined);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(400);
  });

  it("returns 400 for null", async () => {
    const res = assertValidUuid(null);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(400);
  });

  it("returns 400 for a UUID missing a segment", async () => {
    const res = assertValidUuid("12345678-1234-4234-8234");
    expect(res).not.toBeNull();
    expect(res!.status).toBe(400);
  });

  it("returns 400 for a UUID with an extra trailing char", async () => {
    const res = assertValidUuid(VALID_LOWER + "0");
    expect(res).not.toBeNull();
    expect(res!.status).toBe(400);
  });
});

describe("isValidUuid", () => {
  it("returns true for canonical UUID", () => {
    expect(isValidUuid(VALID_LOWER)).toBe(true);
  });

  it("returns false for empty string", () => {
    expect(isValidUuid("")).toBe(false);
  });

  it("returns false for non-string inputs", () => {
    expect(isValidUuid(123)).toBe(false);
    expect(isValidUuid(null)).toBe(false);
    expect(isValidUuid(undefined)).toBe(false);
    expect(isValidUuid({})).toBe(false);
  });

  it("returns false for garbage", () => {
    expect(isValidUuid("not-a-uuid")).toBe(false);
  });
});

describe("assertValidAgentId", () => {
  it("accepts kebab-case slug", () => {
    expect(assertValidAgentId("gangle")).toBeNull();
    expect(assertValidAgentId("main-control")).toBeNull();
    expect(assertValidAgentId("agent-01")).toBeNull();
  });

  it("accepts snake_case id", () => {
    expect(assertValidAgentId("seed_agent_07")).toBeNull();
  });

  it("rejects empty", async () => {
    const res = assertValidAgentId("");
    expect(res!.status).toBe(400);
  });

  it("rejects hyphen prefix", async () => {
    const res = assertValidAgentId("-starts-with-hyphen");
    expect(res!.status).toBe(400);
  });

  it("rejects path traversal / SQL fragments", async () => {
    expect(assertValidAgentId("../etc/passwd")!.status).toBe(400);
    expect(assertValidAgentId("a'; DROP TABLE agents; --")!.status).toBe(400);
    expect(assertValidAgentId("slug with spaces")!.status).toBe(400);
  });

  it("rejects > 64 chars", async () => {
    const res = assertValidAgentId("a".repeat(65));
    expect(res!.status).toBe(400);
  });

  it("accepts exactly 64 chars", () => {
    expect(assertValidAgentId("a".repeat(64))).toBeNull();
  });
});

describe("isValidAgentId", () => {
  it("true for kebab / snake", () => {
    expect(isValidAgentId("agent-01")).toBe(true);
    expect(isValidAgentId("seed_agent")).toBe(true);
  });

  it("false for non-string / bad shape", () => {
    expect(isValidAgentId(null)).toBe(false);
    expect(isValidAgentId(123)).toBe(false);
    expect(isValidAgentId("")).toBe(false);
    expect(isValidAgentId("with spaces")).toBe(false);
  });
});
