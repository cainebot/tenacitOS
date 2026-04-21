// Phase 64.5.2 Plan 03 — Shared resolver for the `circos` CLI binary path.
// Gemini Concern #2: never depend on bare PATH lookup; always resolve to an
// explicit absolute path so PATH manipulation cannot hijack the binary.
import path from "node:path";

export function resolveCircosBin(): string {
  if (process.env.CIRCOS_BIN) return process.env.CIRCOS_BIN;
  return path.resolve(process.cwd(), "../packages/cli-connect/bin/circos.ts");
}
