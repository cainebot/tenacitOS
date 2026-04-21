// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import { EventEmitter } from "node:events";

const { spawnMock, supabaseMock } = vi.hoisted(() => ({
  spawnMock: vi.fn(),
  supabaseMock: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  spawn: spawnMock,
}));

vi.mock("@/lib/supabase", () => ({
  createServerClient: () => ({
    from: supabaseMock,
  }),
}));

interface FakeChild extends EventEmitter {
  stdout: EventEmitter;
  stderr: EventEmitter;
  kill: (sig?: string) => void;
}

function makeChild(): FakeChild {
  const child = new EventEmitter() as FakeChild;
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = vi.fn();
  return child;
}

function nodeFound(node_id: string) {
  // chain: from('nodes').select(...).eq(...).is(...).maybeSingle()
  const chain = {
    select: () => chain,
    eq: () => chain,
    is: () => chain,
    maybeSingle: async () => ({ data: { node_id }, error: null }),
  };
  return chain;
}

function nodeMissing() {
  const chain = {
    select: () => chain,
    eq: () => chain,
    is: () => chain,
    maybeSingle: async () => ({ data: null, error: null }),
  };
  return chain;
}

async function importRoute() {
  vi.resetModules();
  return await import("./route");
}

async function readAll(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const dec = new TextDecoder();
  let out = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    out += dec.decode(value);
  }
  return out;
}

function ctx(node_id: string) {
  return { params: Promise.resolve({ node_id }) };
}

describe("POST /api/nodes/[node_id]/reprovision", () => {
  beforeEach(() => {
    spawnMock.mockReset();
    supabaseMock.mockReset();
  });

  it("rejects invalid node_id with 400", async () => {
    const { POST } = await importRoute();
    const req = new Request("http://x/api/nodes/bad-id/reprovision", { method: "POST" });
    const res = await POST(req as never, ctx("bad-id"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_node_id");
  });

  it("returns 404 for unknown / deprovisioned node", async () => {
    supabaseMock.mockReturnValue(nodeMissing());
    const { POST } = await importRoute();
    const req = new Request("http://x/api/nodes/circus-99/reprovision", { method: "POST" });
    const res = await POST(req as never, ctx("circus-99"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("node_not_found");
  });

  it("happy path — streams NDJSON with stdout chunks + exitCode 0", async () => {
    supabaseMock.mockReturnValue(nodeFound("circus-1"));
    const child = makeChild();
    spawnMock.mockReturnValue(child);

    const { POST } = await importRoute();
    const req = new Request("http://x/api/nodes/circus-1/reprovision", { method: "POST" });
    const res = await POST(req as never, ctx("circus-1"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/x-ndjson");

    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let body = "";

    // Trigger start() by initiating a read, then emit child events.
    const readerPromise = (async () => {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        body += dec.decode(value);
      }
    })();

    // Allow start() to run + listeners to attach.
    await new Promise((r) => setImmediate(r));

    child.stdout.emit("data", Buffer.from(JSON.stringify({ ok: true, message: "started" }) + "\n"));
    child.stdout.emit("data", Buffer.from(JSON.stringify({ ok: true, message: "complete" }) + "\n"));
    child.emit("close", 0);

    await readerPromise;
    expect(body).toContain('"message":"started"');
    expect(body).toContain('"message":"complete"');
    expect(body).toContain('"exitCode":0');
  });

  it("wraps stderr chunks as JSON lines", async () => {
    supabaseMock.mockReturnValue(nodeFound("circus-1"));
    const child = makeChild();
    spawnMock.mockReturnValue(child);

    const { POST } = await importRoute();
    const req = new Request("http://x/api/nodes/circus-1/reprovision", { method: "POST" });
    const res = await POST(req as never, ctx("circus-1"));
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let body = "";
    const readerPromise = (async () => {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        body += dec.decode(value);
      }
    })();
    await new Promise((r) => setImmediate(r));
    child.stderr.emit("data", Buffer.from("ssh: connection refused\n"));
    child.emit("close", 1);
    await readerPromise;
    expect(body).toContain('"stderr":"ssh: connection refused\\n"');
    expect(body).toContain('"exitCode":1');
  });

  it("Codex Plan03-MEDIUM: envelope on nonzero exit preserved on stdout + exitCode marker follows", async () => {
    supabaseMock.mockReturnValue(nodeFound("circus-1"));
    const child = makeChild();
    spawnMock.mockReturnValue(child);

    const { POST } = await importRoute();
    const req = new Request("http://x/api/nodes/circus-1/reprovision", { method: "POST" });
    const res = await POST(req as never, ctx("circus-1"));
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let body = "";
    const readerPromise = (async () => {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        body += dec.decode(value);
      }
    })();
    await new Promise((r) => setImmediate(r));
    child.stdout.emit(
      "data",
      Buffer.from(
        JSON.stringify({
          ok: false,
          error_code: "tailscale_not_logged_in",
          message: "Tailscale daemon is not logged in.",
        }) + "\n",
      ),
    );
    child.emit("close", 1);
    await readerPromise;
    expect(body).toContain('"error_code":"tailscale_not_logged_in"');
    const idxEnvelope = body.indexOf("error_code");
    const idxExit = body.indexOf("exitCode");
    expect(idxEnvelope).toBeGreaterThanOrEqual(0);
    expect(idxExit).toBeGreaterThan(idxEnvelope);
  });
});
