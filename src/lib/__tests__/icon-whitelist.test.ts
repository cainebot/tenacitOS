// Phase 69 Plan 10 — icon whitelist unit tests.
//
// Whitelist is auto-generated from `@untitledui/icons` exports by the
// `generate:icon-whitelist` preflight script. These tests assert:
//  - basic membership (happy path)
//  - attacker-supplied strings are rejected
//  - sanity size (UUI exports 1,100+)

import { describe, it, expect } from "vitest";
import { ALLOWED_ICONS } from "../icon-whitelist";

describe("icon-whitelist", () => {
  it("contains the SOUL.md default icon", () => {
    expect(ALLOWED_ICONS.has("FileHeart02")).toBe(true);
  });

  it("contains the user-instruction default icon", () => {
    expect(ALLOWED_ICONS.has("FileCheck02")).toBe(true);
  });

  it("rejects non-existent icons", () => {
    expect(ALLOWED_ICONS.has("NonExistentIconXYZ999")).toBe(false);
  });

  it("rejects prototype-pollution strings", () => {
    expect(ALLOWED_ICONS.has("__proto__")).toBe(false);
    expect(ALLOWED_ICONS.has("constructor")).toBe(false);
    expect(ALLOWED_ICONS.has("prototype")).toBe(false);
  });

  it("has at least 100 entries (sanity — UUI exports 1,100+)", () => {
    expect(ALLOWED_ICONS.size).toBeGreaterThan(100);
  });
});
