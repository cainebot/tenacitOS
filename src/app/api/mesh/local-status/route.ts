// CircOS Phase 64.5.2 Plan 03 Task 2 — GET /api/mesh/local-status
//
// Spawns `circos status --output json` and returns whitelisted local
// Tailscale identity. Critical invariants:
//
// 1. Spawn argv (no shell) — eliminates injection vector.
// 2. Explicit binary path resolution (Gemini Concern #2):
//      - CIRCOS_BIN env override OR
//      - path.resolve(cwd, '../packages/cli-connect/bin/circos.ts')
//    Never bare "circos" on PATH (would be hijackable).
// 3. Parse the CLI envelope FIRST — even on non-zero exit (Codex Plan03-MEDIUM).
//    The CLI emits a structured `{ ok: false, error_code }` JSON line on
//    failure; downstream UI humanizes the code via @circos/error-i18n.
//    Dropping straight to the generic error branch on exit !== 0 would
//    discard the error_code.
import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import path from "node:path";

export const runtime = "nodejs";
export const revalidate = 10;

interface LocalStatusResponse {
  tailscale_daemon_ok: boolean;
  tailscale_hostname: string | null;
  tailscale_ip: string | null;
  timestamp: string;
  error_code?: string;
  error?: string;
}

function resolveCircosBin(): string {
  if (process.env.CIRCOS_BIN) return process.env.CIRCOS_BIN;
  // Gemini Concern #2 — explicit workspace path instead of bare PATH lookup.
  // Next.js cwd at runtime is the control-panel/ submodule; go up to repo root,
  // then into packages/cli-connect/bin/circos.ts.
  return path.resolve(process.cwd(), "../packages/cli-connect/bin/circos.ts");
}

function runCircosStatus(
  bin: string,
  timeoutMs = 10_000,
): Promise<{ stdout: string; exitCode: number | null }> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, ["status", "--output", "json"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    const chunks: Buffer[] = [];
    let settled = false;
    const settle = (fn: () => void) => {
      if (!settled) {
        settled = true;
        fn();
      }
    };
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      settle(() => reject(new Error("timeout")));
    }, timeoutMs);
    child.stdout.on("data", (c: Buffer) => chunks.push(c));
    child.on("error", (err) => {
      clearTimeout(timer);
      settle(() => reject(err));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      settle(() =>
        resolve({ stdout: Buffer.concat(chunks).toString("utf8"), exitCode: code }),
      );
    });
  });
}

export async function GET(): Promise<NextResponse<LocalStatusResponse>> {
  const bin = resolveCircosBin();
  try {
    const { stdout } = await runCircosStatus(bin);

    // Codex Plan03-MEDIUM: try to parse the envelope BEFORE checking exit code,
    // because the CLI emits structured `{ ok:false, error_code }` JSON even
    // on non-zero exit. Trim to handle trailing newline.
    let envelope:
      | { ok?: boolean; error_code?: string; data?: { local?: Record<string, unknown> } }
      | null = null;
    try {
      envelope = JSON.parse(stdout.trim());
    } catch {
      envelope = null;
    }

    if (envelope && typeof envelope === "object") {
      const local = envelope.data?.local ?? {};
      return NextResponse.json({
        tailscale_daemon_ok:
          (local["tailscale_daemon_ok"] as boolean | undefined) ?? false,
        tailscale_hostname:
          (local["tailscale_hostname"] as string | null | undefined) ?? null,
        tailscale_ip: (local["tailscale_ip"] as string | null | undefined) ?? null,
        timestamp: new Date().toISOString(),
        ...(envelope.error_code ? { error_code: envelope.error_code } : {}),
      });
    }

    // Genuine non-JSON stdout — unexpected. Soft fail.
    return NextResponse.json({
      tailscale_daemon_ok: false,
      tailscale_hostname: null,
      tailscale_ip: null,
      timestamp: new Date().toISOString(),
      error: "malformed envelope",
    });
  } catch (err) {
    return NextResponse.json({
      tailscale_daemon_ok: false,
      tailscale_hostname: null,
      tailscale_ip: null,
      timestamp: new Date().toISOString(),
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
