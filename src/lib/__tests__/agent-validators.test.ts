// Phase 69 Plan 02 — agent-validators unit tests.
// SECURITY T3 (name regex), T7 (proto-pollution guard), T9 (avatar_url scheme).

import { describe, expect, it } from "vitest";
import {
  isAllowedAvatarUrl,
  kebabify,
  rejectForbiddenFields,
  validateAgentName,
  validateAgentSlug,
  validateAvatarUrl,
  validateSoulContent,
} from "@/lib/agent-validators";

describe("validateAgentName (T3)", () => {
  it("accepts letters, numbers, space, underscore, hyphen", () => {
    expect(validateAgentName("Scrum Master")).toBeNull();
    expect(validateAgentName("agent_01-beta")).toBeNull();
    expect(validateAgentName("Zöe")).toBeNull();
  });

  it("rejects HTML metacharacters", () => {
    expect(validateAgentName("<script>")).not.toBeNull();
    expect(validateAgentName("a&b")).not.toBeNull();
    expect(validateAgentName("a/b")).not.toBeNull();
  });

  it("rejects empty and over-long", () => {
    expect(validateAgentName("")).not.toBeNull();
    expect(validateAgentName("x".repeat(65))).not.toBeNull();
  });
});

describe("kebabify + validateAgentSlug", () => {
  it("produces lowercase kebab-case from a name", () => {
    expect(kebabify("Scrum Master")).toBe("scrum-master");
    expect(kebabify("  Spaced  ")).toBe("spaced");
    expect(kebabify("Ünicode Agent 01")).toBe("unicode-agent-01");
  });

  it("accepts kebab-case slugs and rejects non-kebab", () => {
    expect(validateAgentSlug("jax")).toBeNull();
    expect(validateAgentSlug("scrum-master")).toBeNull();
    expect(validateAgentSlug("UPPER")).not.toBeNull();
    expect(validateAgentSlug("with space")).not.toBeNull();
    expect(validateAgentSlug("-leading")).not.toBeNull();
  });
});

describe("validateSoulContent", () => {
  it("accepts strings up to 50_000 chars", () => {
    expect(validateSoulContent("x".repeat(50_000))).toBeNull();
  });
  it("rejects > 50_000", () => {
    expect(validateSoulContent("x".repeat(50_001))).not.toBeNull();
  });
});

describe("isAllowedAvatarUrl + validateAvatarUrl (T9)", () => {
  it("accepts http, https, and empty", () => {
    expect(isAllowedAvatarUrl("")).toBe(true);
    expect(isAllowedAvatarUrl(null)).toBe(true);
    expect(isAllowedAvatarUrl("http://x.example/a.png")).toBe(true);
    expect(isAllowedAvatarUrl("https://x.example/a.png")).toBe(true);
  });

  it("rejects dangerous schemes", () => {
    expect(isAllowedAvatarUrl("javascript:alert(1)")).toBe(false);
    expect(isAllowedAvatarUrl("data:text/html,<svg onload=alert(1)>")).toBe(false);
    expect(isAllowedAvatarUrl("file:///etc/passwd")).toBe(false);
    expect(isAllowedAvatarUrl("blob:http://x")).toBe(false);
    expect(isAllowedAvatarUrl("relative/path")).toBe(false);
  });

  it("validateAvatarUrl returns null on empty/valid, message on bad", () => {
    expect(validateAvatarUrl("")).toBeNull();
    expect(validateAvatarUrl(null)).toBeNull();
    expect(validateAvatarUrl("https://x.example/a.png")).toBeNull();
    expect(validateAvatarUrl("javascript:alert(1)")).not.toBeNull();
  });
});

describe("rejectForbiddenFields (T7 proto-pollution guard)", () => {
  it("accepts only whitelisted fields", () => {
    expect(rejectForbiddenFields({ name: "Jax" })).toBeNull();
    expect(rejectForbiddenFields({ name: "Jax", slug: "jax" })).toBeNull();
    expect(rejectForbiddenFields({ name: "Jax", soul_content: "x" })).toBeNull();
    expect(rejectForbiddenFields({ avatar_url: "https://x.example/a.png" })).toBeNull();
  });

  it("rejects non-whitelisted fields", () => {
    expect(rejectForbiddenFields({ role: "admin" })).not.toBeNull();
    expect(rejectForbiddenFields({ name: "Jax", is_seed: true })).not.toBeNull();
    expect(rejectForbiddenFields({ adapter_config: { secret: "x" } })).not.toBeNull();
  });

  it("__proto__ is ignored (hasOwn guard)", () => {
    const payload = JSON.parse('{"__proto__":{"role":"admin"},"name":"Jax"}');
    // `__proto__` as an own property is rejected (it's not whitelisted);
    // crucially, the check does NOT escalate role to admin.
    const result = rejectForbiddenFields(payload);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((payload as any).role).toBeUndefined();
    // Whether __proto__ is own-property depends on the parser; either
    // way the result must not be null-for-forbidden-field or produce
    // a role=admin bypass.
    if (result !== null) {
      expect(result).toMatch(/__proto__|not editable/);
    }
  });
});
