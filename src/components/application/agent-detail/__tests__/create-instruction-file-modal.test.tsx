// Phase 69 Plan 10 — CreateInstructionFileModal unit tests.
//
// Covers:
//   - pure validator: empty, canonical-shadow (SOUL/Tools/Memory case-insensitive),
//     invalid characters, duplicate, over-length.
//
// Full React render tests are deferred to Storybook smoke (per plan §7 stories);
// here we exercise the exported __testables.validateFileName pure function so
// tests are deterministic without mounting @circos/ui Modal under jsdom.

import { describe, it, expect } from "vitest";
import { __testables } from "../create-instruction-file-modal";

const { validateFileName, toFinalFileName, CANONICAL_NAMES_LOWER } = __testables;

describe("validateFileName", () => {
  it("rejects empty string", () => {
    expect(validateFileName("", [])).toMatch(/empty/i);
  });

  it("rejects names with spaces", () => {
    expect(validateFileName("my file", [])).toMatch(/letters/i);
  });

  it("rejects canonical names case-insensitively", () => {
    for (const name of ["SOUL", "soul", "Soul", "Tools", "memory", "Memory", "memoy", "Heartbeat"]) {
      expect(validateFileName(name, [])).toMatch(/reserved/i);
    }
  });

  it("rejects shadowing with .md suffix", () => {
    expect(validateFileName("Tools.md", [])).toMatch(/reserved/i);
  });

  it("rejects over-length names", () => {
    const longName = "A".repeat(61);
    expect(validateFileName(longName, [])).toMatch(/characters/i);
  });

  it("rejects duplicates", () => {
    expect(validateFileName("Playbook", ["Playbook.md"])).toMatch(/already exists/i);
  });

  it("accepts valid novel names", () => {
    expect(validateFileName("Playbook", ["SOUL.md"])).toBeNull();
    expect(validateFileName("my-guide", ["SOUL.md"])).toBeNull();
    expect(validateFileName("A_B-C", [])).toBeNull();
  });

  it("rejects path-traversal attempts", () => {
    expect(validateFileName("../etc", [])).toMatch(/letters/i);
    expect(validateFileName("a/b", [])).toMatch(/letters/i);
  });
});

describe("toFinalFileName", () => {
  it("adds .md when missing", () => {
    expect(toFinalFileName("Playbook")).toBe("Playbook.md");
  });

  it("leaves .md intact when present", () => {
    expect(toFinalFileName("Playbook.md")).toBe("Playbook.md");
  });

  it("trims whitespace", () => {
    expect(toFinalFileName("  Playbook  ")).toBe("Playbook.md");
  });
});

describe("CANONICAL_NAMES_LOWER", () => {
  it("contains all 7 canonical types + memoy alias", () => {
    const s = new Set(CANONICAL_NAMES_LOWER);
    for (const n of ["soul", "agents", "user", "identity", "tools", "heartbeat", "memory", "memoy"]) {
      expect(s.has(n)).toBe(true);
    }
  });
});
