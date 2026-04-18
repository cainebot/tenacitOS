// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { EventEmitter } from "node:events";
import path from "node:path";

// Hoisted spawn mock — see Plan 03 patterns
const { spawnMock } = vi.hoisted(() => ({ spawnMock: vi.fn() }));

vi.mock("node:child_process", () => ({
  spawn: spawnMock,
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

// Re-import the route per-test so module-level state is fresh.
async function importRoute() {
  vi.resetModules();
  return await import("./route");
}

describe("GET /api/mesh/local-status", () => {
  beforeEach(() => {
    spawnMock.mockReset();
    delete process.env.CIRCOS_BIN;
  });

  afterEach(() => {
    delete process.env.CIRCOS_BIN;
  });

  it("Test 1: happy path — envelope ok=true returns whitelisted fields", async () => {
    const child = makeChild();
    spawnMock.mockReturnValue(child);

    const { GET } = await importRoute();
    const promise = GET();

    queueMicrotask(() => {
      child.stdout.emit(
        "data",
        Buffer.from(
          JSON.stringify({
            ok: true,
            message: "ok",
            data: {
              local: {
                tailscale_daemon_ok: true,
                tailscale_hostname: "macbook-mac",
                tailscale_ip: "100.64.0.1",
              },
            },
          }) + "\n",
        ),
      );
      child.emit("close", 0);
    });

    const res = await promise;
    const body = await res.json();
    expect(body.tailscale_daemon_ok).toBe(true);
    expect(body.tailscale_hostname).toBe("macbook-mac");
    expect(body.tailscale_ip).toBe("100.64.0.1");
    expect(body.timestamp).toBeTypeOf("string");
    expect(body.error_code).toBeUndefined();
  });

  it("Test 2: envelope on nonzero exit — error_code preserved (Codex Plan03-MEDIUM)", async () => {
    const child = makeChild();
    spawnMock.mockReturnValue(child);

    const { GET } = await importRoute();
    const promise = GET();

    queueMicrotask(() => {
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
    });

    const res = await promise;
    const body = await res.json();
    expect(body.tailscale_daemon_ok).toBe(false);
    expect(body.tailscale_hostname).toBeNull();
    expect(body.error_code).toBe("tailscale_not_logged_in");
  });

  it("Test 3: spawn ENOENT / error event — soft fail", async () => {
    const child = makeChild();
    spawnMock.mockReturnValue(child);

    const { GET } = await importRoute();
    const promise = GET();

    queueMicrotask(() => {
      child.emit("error", new Error("spawn ENOENT"));
    });

    const res = await promise;
    const body = await res.json();
    expect(body.tailscale_daemon_ok).toBe(false);
    expect(body.tailscale_hostname).toBeNull();
    expect(body.error).toMatch(/ENOENT|spawn/);
  });

  it("Test 4: timeout — child never exits, kill + soft fail", async () => {
    vi.useFakeTimers();
    const child = makeChild();
    spawnMock.mockReturnValue(child);

    const { GET } = await importRoute();
    const promise = GET();

    // Advance past 10s timeout
    await vi.advanceTimersByTimeAsync(10_500);

    const res = await promise;
    const body = await res.json();
    expect(child.kill).toHaveBeenCalledWith("SIGKILL");
    expect(body.tailscale_daemon_ok).toBe(false);
    expect(body.error).toMatch(/timeout/i);
    vi.useRealTimers();
  });

  it("Test 5: CIRCOS_BIN env override — first arg is that path", async () => {
    process.env.CIRCOS_BIN = "/custom/path/to/circos";
    const child = makeChild();
    spawnMock.mockReturnValue(child);

    const { GET } = await importRoute();
    const promise = GET();
    queueMicrotask(() => {
      child.stdout.emit("data", Buffer.from(JSON.stringify({ ok: true, message: "ok", data: { local: {} } })));
      child.emit("close", 0);
    });
    await promise;

    expect(spawnMock).toHaveBeenCalled();
    expect(spawnMock.mock.calls[0][0]).toBe("/custom/path/to/circos");
  });

  it("Test 6: fallback path — Gemini #2, resolves workspace path not bare circos", async () => {
    delete process.env.CIRCOS_BIN;
    const child = makeChild();
    spawnMock.mockReturnValue(child);

    const { GET } = await importRoute();
    const promise = GET();
    queueMicrotask(() => {
      child.stdout.emit("data", Buffer.from(JSON.stringify({ ok: true, message: "ok", data: { local: {} } })));
      child.emit("close", 0);
    });
    await promise;

    const firstArg = spawnMock.mock.calls[0][0];
    expect(firstArg).toContain(path.join("packages", "cli-connect", "bin", "circos.ts"));
    expect(firstArg).not.toBe("circos");
    expect(path.isAbsolute(firstArg)).toBe(true);
  });

  it("Test 7: spawn argv contract — status --output json", async () => {
    const child = makeChild();
    spawnMock.mockReturnValue(child);

    const { GET } = await importRoute();
    const promise = GET();
    queueMicrotask(() => {
      child.stdout.emit("data", Buffer.from(JSON.stringify({ ok: true, message: "ok", data: { local: {} } })));
      child.emit("close", 0);
    });
    await promise;

    expect(spawnMock.mock.calls[0][1]).toEqual(["status", "--output", "json"]);
  });
});
