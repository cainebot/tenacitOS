// CircOS Phase 64.5.2 Plan 03 Task 3 — POST /api/nodes/[node_id]/reprovision
//
// Streams an NDJSON sequence of stdout/stderr lines from `circos reprovision
// <node_id>`. Critical invariants:
//
// - `node_id` zod-validated against /^circus-\d+$/ (matches provision schema).
// - DB existence check + `deprovisioned_at IS NULL` filter rejects unknown
//   or soft-deleted nodes (T-64.5.2-03-01).
// - spawn argv (no shell) — eliminates injection vector.
// - Binary path resolved via shared resolveCircosBin() (Gemini #2).
// - stdout preserved as-is; consumer interprets error_code from JSON lines
//   even when exitCode !== 0 (Codex Plan03-MEDIUM). We do NOT short-circuit
//   on non-zero exit — every stdout/stderr chunk is forwarded plus the final
//   {"exitCode": N} marker.
import { NextResponse, type NextRequest } from "next/server";
import { spawn } from "node:child_process";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase";
import { resolveCircosBin } from "@/lib/circos-bin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const nodeIdSchema = z.object({
  node_id: z.string().regex(/^circus-\d+$/, "node_id must match ^circus-\\d+$"),
});

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ node_id: string }> },
): Promise<Response> {
  const { node_id } = await ctx.params;

  // 1. Validate format
  const parsed = nodeIdSchema.safeParse({ node_id });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_node_id", message: parsed.error.issues[0]?.message ?? "invalid" },
      { status: 400 },
    );
  }

  // 2. DB existence + not soft-deleted
  const supabase = createServerClient();
  const { data: row, error: dbErr } = await supabase
    .from("nodes")
    .select("node_id")
    .eq("node_id", node_id)
    .is("deprovisioned_at", null)
    .maybeSingle();

  if (dbErr) {
    return NextResponse.json(
      { error: "db_error", message: dbErr.message },
      { status: 500 },
    );
  }
  if (!row) {
    return NextResponse.json(
      { error: "node_not_found", message: `node ${node_id} not found or deprovisioned` },
      { status: 404 },
    );
  }

  // 3. Spawn `circos reprovision <node_id> --output json` and stream NDJSON.
  const bin = resolveCircosBin();
  const child = spawn(bin, ["reprovision", node_id, "--output", "json"], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const safeClose = () => {
        if (!closed) {
          closed = true;
          try {
            controller.close();
          } catch {
            // already closed
          }
        }
      };

      child.stdout.on("data", (chunk: Buffer) => {
        // Preserve stdout as-is (Codex Plan03-MEDIUM): if circos emits a JSON
        // envelope on stdout before exiting non-zero, that envelope reaches
        // the client untouched so the UI can humanize the embedded error_code.
        controller.enqueue(encoder.encode(chunk.toString("utf8")));
      });

      child.stderr.on("data", (chunk: Buffer) => {
        const wrapped = JSON.stringify({ stderr: chunk.toString("utf8") }) + "\n";
        controller.enqueue(encoder.encode(wrapped));
      });

      child.on("error", (err) => {
        const wrapped = JSON.stringify({ error: err.message }) + "\n";
        controller.enqueue(encoder.encode(wrapped));
        safeClose();
      });

      child.on("close", (code) => {
        const marker = JSON.stringify({ exitCode: code }) + "\n";
        controller.enqueue(encoder.encode(marker));
        safeClose();
      });
    },
    cancel() {
      child.kill("SIGTERM");
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store",
    },
  });
}
