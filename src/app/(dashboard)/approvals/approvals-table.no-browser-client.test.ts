// @vitest-environment node
// Phase 68 Plan 08 — invariant guard.
//
// Closes GAP-68-01 by construction: asserts the /approvals client
// bundle never re-imports `createBrowserClient` (direct browser
// Supabase SELECT is blocked by RLS vs anon). If a future refactor
// accidentally re-introduces the dependency, this test fails loud.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Strip `//` line comments and `/* ... */` block comments before
// scanning. Historical comments documenting the pre-Plan-08 browser
// client path are intentionally preserved in source files.
function stripComments(src: string): string {
  // Remove /* ... */ (non-greedy, multiline).
  const noBlock = src.replace(/\/\*[\s\S]*?\*\//g, "");
  // Remove single-line `//` comments (anything after `//` to EOL).
  return noBlock
    .split("\n")
    .map((line) => {
      const idx = line.indexOf("//");
      // Naive but sufficient for these source files: they do not embed
      // `://` inside real code tokens at positions that would collide.
      if (idx === -1) return line;
      return line.slice(0, idx);
    })
    .join("\n");
}

function hasBrowserClient(src: string): boolean {
  const code = stripComments(src);
  return (
    /from\s+["']@\/lib\/supabase["']/.test(code) ||
    /\bcreateBrowserClient\s*\(/.test(code)
  );
}

describe("approvals UI — no browser Supabase client", () => {
  const tableSrc = readFileSync(
    join(__dirname, "approvals-table.tsx"),
    "utf8",
  );
  const countSrc = readFileSync(
    join(__dirname, "..", "..", "..", "hooks", "useApprovalsCount.ts"),
    "utf8",
  );
  const listSrc = readFileSync(
    join(__dirname, "..", "..", "..", "hooks", "useApprovalsList.ts"),
    "utf8",
  );

  it("approvals-table.tsx does not import createBrowserClient", () => {
    expect(hasBrowserClient(tableSrc)).toBe(false);
  });

  it("useApprovalsCount does not import the browser Supabase client", () => {
    expect(hasBrowserClient(countSrc)).toBe(false);
  });

  it("useApprovalsList does not import the browser Supabase client", () => {
    expect(hasBrowserClient(listSrc)).toBe(false);
  });
});
