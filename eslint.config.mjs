import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// ============================================================
// Phase 69-01 — UUI-discipline rule, scoped to Phase 69 target paths.
// Does NOT widen to control-panel/src/** — that would flag the 39
// pre-existing "Module not found" files the WIP commit left behind
// (see CLAUDE.md §Known Tech Debt). Global cleanup is a post-v1.9 phase.
//
// Scope (2026-04-20, extended per FIGMA-IMPLEMENTATION.md §4.6):
// - app/(dashboard)/agents, /office
// - app/api/{agents, agent-runs, nodes}
// - components/application/{agent-form, agent-detail, agents-table,
//   node-status-strip, run-log-stream}
// - components/approvals
// - hooks/{useRealtimeRuns, useRealtimeRunLogs, useAgentPresence}
// - lib/{csrf, run-status, uuid, agent-validators, office-events}
// - data/phase-69-fixtures.ts
//
// Blocks (inquebrantable per control-panel/CLAUDE.md):
// - lucide-react           → use @untitledui/icons
// - @/components/ui/*      → use @circos/ui
// - clsx / classnames      → use cx() from @circos/ui
// - class-variance-authority
// ============================================================

const PHASE_69_FILES = [
  "src/app/(dashboard)/agents/**/*.{ts,tsx}",
  "src/app/(dashboard)/office/**/*.{ts,tsx}",
  "src/app/api/agents/**/*.ts",
  "src/app/api/agent-runs/**/*.ts",
  "src/app/api/nodes/**/*.ts",
  "src/components/application/agent-form/**/*.{ts,tsx}",
  "src/components/application/agent-detail/**/*.{ts,tsx}",
  "src/components/application/agents-table/**/*.{ts,tsx}",
  "src/components/application/node-status-strip/**/*.{ts,tsx}",
  "src/components/application/run-log-stream/**/*.{ts,tsx}",
  "src/components/approvals/**/*.{ts,tsx}",
  "src/hooks/useRealtimeRuns.ts",
  "src/hooks/useRealtimeRunLogs.ts",
  "src/hooks/useAgentPresence.ts",
  "src/lib/office-events.ts",
  "src/lib/csrf.ts",
  "src/lib/run-status.ts",
  "src/lib/uuid.ts",
  "src/lib/agent-validators.ts",
  "src/data/phase-69-fixtures.ts",
];

const phase69UuiDiscipline = {
  files: PHASE_69_FILES,
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["@/components/ui/*"],
            message: "Use @circos/ui (see CLAUDE.md §UI Coding Standard).",
          },
          {
            group: ["lucide-react"],
            message: "Use @untitledui/icons (see control-panel/CLAUDE.md §Icons).",
          },
        ],
        paths: [
          {
            name: "clsx",
            message: "Use cx() from @circos/ui.",
          },
          {
            name: "classnames",
            message: "Use cx() from @circos/ui.",
          },
          {
            name: "class-variance-authority",
            message: "Not permitted per UUI standard (see CLAUDE.md §Do NOT).",
          },
        ],
      },
    ],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  phase69UuiDiscipline,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
