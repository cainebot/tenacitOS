// @vitest-environment node
// Phase 68 Plan 08 + Phase 68.1 Item 2 — invariant guard.
//
// Closes GAP-68-01 by construction: asserts the /approvals client
// bundle never calls the browser Supabase client for a DATA SELECT
// (the anon session cannot satisfy approvals_human_read RLS).
//
// Phase 68.1 Item 2 RELAXED the invariant: approvals-table.tsx may now
// import `createBrowserClient` for the Realtime subscription +
// `setAuth()` imperatively (the minted JWT carries role='authenticated'
// and does satisfy RLS). But it STILL may never call
// `.from('approvals').select(...)` on a browser client — the server
// proxy (/api/approvals) remains the sole data path.
//
// useApprovalsCount + useApprovalsList stay fully browser-client-free.

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

// Phase 68.1 Item 2 — approvals-table.tsx is allowed to use the browser
// client for Realtime (channel + setAuth) but never for a DATA SELECT.
// This stricter regex catches `.from("approvals").select(...)` calls.
function hasBrowserApprovalsSelect(src: string): boolean {
  const code = stripComments(src);
  return /\.from\s*\(\s*["']approvals["']\s*\)[\s\S]*?\.select\s*\(/.test(code);
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

  // Phase 68.1 Item 2 — Realtime subscription re-introduces createBrowserClient
  // but NOT for data SELECT. The stricter check runs instead.
  it("approvals-table.tsx does not perform a browser-client .from('approvals').select(...) call", () => {
    expect(hasBrowserApprovalsSelect(tableSrc)).toBe(false);
  });

  it("useApprovalsCount does not import the browser Supabase client", () => {
    expect(hasBrowserClient(countSrc)).toBe(false);
  });

  it("useApprovalsList does not import the browser Supabase client", () => {
    expect(hasBrowserClient(listSrc)).toBe(false);
  });
});
