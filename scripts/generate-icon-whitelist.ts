// Phase 69 Plan 10 — icon whitelist generator.
//
// Reads exports from @untitledui/icons at build-time and emits two static
// TypeScript files containing a `ReadonlySet<string>` of allowed component
// names:
//   - control-panel/src/lib/icon-whitelist.ts         (consumed by routes + client validation)
//   - packages/cli-connect/src/shared/icon-whitelist.ts (consumed by MCP tool Zod refinements)
//
// Wired as `prebuild` script in control-panel/package.json so every build
// regenerates from the live package version.

import * as UntitledIcons from "@untitledui/icons";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const ICON_NAMES: string[] = Object.entries(UntitledIcons)
  .filter(([_name, value]) => typeof value === "function" || typeof value === "object")
  .map(([name]) => name)
  .sort((a, b) => a.localeCompare(b));

if (ICON_NAMES.length === 0) {
  console.error("[generate-icon-whitelist] FATAL: @untitledui/icons exported 0 icons. Aborting.");
  process.exit(1);
}

const HEADER = [
  "// AUTO-GENERATED — do not edit by hand.",
  "// Source: @untitledui/icons exports.",
  "// Regenerate via: npm run generate:icon-whitelist (also runs as prebuild).",
  "",
  "export const ALLOWED_ICONS: ReadonlySet<string> = new Set([",
].join("\n");

const BODY = ICON_NAMES.map((name) => `  ${JSON.stringify(name)},`).join("\n");

const FOOTER = "\n]);\n";

const content = `${HEADER}\n${BODY}${FOOTER}`;

const targets = [
  resolve(__dirname, "..", "src", "lib", "icon-whitelist.ts"),
  resolve(__dirname, "..", "..", "packages", "cli-connect", "src", "shared", "icon-whitelist.ts"),
];

for (const target of targets) {
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, "utf8");
  console.log(`[generate-icon-whitelist] wrote ${ICON_NAMES.length} icons -> ${target}`);
}
