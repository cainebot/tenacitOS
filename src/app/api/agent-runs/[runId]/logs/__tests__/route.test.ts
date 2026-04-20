// @vitest-environment node
// Phase 69-05 — GET /api/agent-runs/[runId]/logs coverage.
//
// Guards:
//   - Happy path: returns rows + nextCursor.
//   - Empty path: empty array + null cursor.
//   - Pagination: `?after=` gates the query and nextCursor advances.
//   - SECURITY T13: INVALID_ID on malformed runId (before DB contact).
//   - SECURITY T5: 403 INVALID_ORIGIN on cross-origin Origin.
//   - mc_auth: 401 without the cookie.
//   - INVALID_CURSOR: malformed ?after= → 400.
//   - SECURITY T6 DEFERRED: secret-looking substrings (`sk-…`, `ghp_…`,
//     JWT) are returned verbatim. This test pins the current behaviour
//     so any future masking refactor intentionally updates it. The
//     code-comment `// SECURITY T6: DEFERRED` in route.ts pairs with
//     this assertion.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const AUTH = "test-secret-aaaaaaaaaaaaaaaa";
const VALID_RUN = "11111111-2222-3333-4444-555555555555";

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock("@/lib/supabase", () => ({
  createServiceRoleClient: () => ({ from: fromMock }),
}));

async function importRoute() {
  vi.resetModules();
  return await import("../route");
}

interface MakeReqOpts {
  method?: string;
  origin?: string | null;
  cookie?: string;
  query?: string;
}

function makeReq(runId: string, opts: MakeReqOpts = {}): NextRequest {
  const headers: Record<string, string> = {};
  const origin = opts.origin === undefined ? "http://localhost:3000" : opts.origin;
  if (origin) headers["origin"] = origin;
  if (opts.cookie) headers["cookie"] = opts.cookie;

  const qs = opts.query ? `?${opts.query}` : "";
  const url = `http://localhost:3000/api/agent-runs/${runId}/logs${qs}`;
  return new NextRequest(url, {
    method: opts.method ?? "GET",
    headers,
  });
}

const cookieHeader = () => `mc_auth=${AUTH}`;
const paramsOf = (runId: string) => ({ params: Promise.resolve({ runId }) });

interface WireOpts {
  rows?: Array<Record<string, unknown>>;
  error?: { message: string } | null;
}

function wireLogs(opts: WireOpts = {}) {
  let capturedAfter: number | null = null;
  fromMock.mockImplementation((table: string) => {
    if (table !== "agent_run_logs") {
      throw new Error(`Unexpected table: ${table}`);
    }
    return {
      select: () => ({
        eq: () => ({
          gt: (_col: string, after: number) => {
            capturedAfter = after;
            return {
              order: () => ({
                limit: () =>
                  Promise.resolve({
                    data: opts.rows ?? [],
                    error: opts.error ?? null,
                  }),
              }),
            };
          },
        }),
      }),
    };
  });
  return () => capturedAfter;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.AUTH_SECRET = AUTH;
  delete process.env.CIRCOS_ALLOWED_ORIGINS;
  fromMock.mockReset();
  wireLogs();
});

describe("GET /api/agent-runs/[runId]/logs", () => {
  it("returns 400 INVALID_ID on malformed runId (SECURITY T13)", async () => {
    const { GET } = await importRoute();
    const res = await GET(
      makeReq("not-a-uuid", { cookie: cookieHeader() }),
      paramsOf("not-a-uuid"),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("INVALID_ID");
  });

  it("returns 403 on cross-origin Origin (SECURITY T5)", async () => {
    const { GET } = await importRoute();
    const res = await GET(
      makeReq(VALID_RUN, {
        origin: "https://evil.example",
        cookie: cookieHeader(),
      }),
      paramsOf(VALID_RUN),
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("INVALID_ORIGIN");
  });

  it("returns 401 without mc_auth", async () => {
    const { GET } = await importRoute();
    const res = await GET(makeReq(VALID_RUN), paramsOf(VALID_RUN));
    expect(res.status).toBe(401);
  });

  it("returns 400 INVALID_CURSOR on unparseable ?after=", async () => {
    const { GET } = await importRoute();
    const res = await GET(
      makeReq(VALID_RUN, {
        cookie: cookieHeader(),
        query: "after=not-a-number",
      }),
      paramsOf(VALID_RUN),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("INVALID_CURSOR");
  });

  it("returns 400 INVALID_CURSOR on negative ?after=", async () => {
    const { GET } = await importRoute();
    const res = await GET(
      makeReq(VALID_RUN, {
        cookie: cookieHeader(),
        query: "after=-1",
      }),
      paramsOf(VALID_RUN),
    );
    expect(res.status).toBe(400);
  });

  it("returns empty chunks + null cursor when no rows", async () => {
    wireLogs({ rows: [] });
    const { GET } = await importRoute();
    const res = await GET(
      makeReq(VALID_RUN, { cookie: cookieHeader() }),
      paramsOf(VALID_RUN),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.chunks).toEqual([]);
    expect(body.nextCursor).toBeNull();
  });

  it("returns rows + null cursor when page is partial", async () => {
    wireLogs({
      rows: [
        { id: 1, run_id: VALID_RUN, stream: "stdout", chunk: "hello", ts: "2026-04-20T00:00:00Z" },
        { id: 2, run_id: VALID_RUN, stream: "stderr", chunk: "boom", ts: "2026-04-20T00:00:01Z" },
      ],
    });
    const { GET } = await importRoute();
    const res = await GET(
      makeReq(VALID_RUN, { cookie: cookieHeader() }),
      paramsOf(VALID_RUN),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.chunks).toHaveLength(2);
    expect(body.chunks[0].stream).toBe("stdout");
    expect(body.chunks[1].stream).toBe("stderr");
    expect(body.nextCursor).toBeNull();
  });

  it("returns nextCursor when page is exactly 500 rows (full page)", async () => {
    const rows = Array.from({ length: 500 }, (_, i) => ({
      id: i + 1,
      run_id: VALID_RUN,
      stream: "stdout",
      chunk: `chunk-${i}`,
      ts: "2026-04-20T00:00:00Z",
    }));
    wireLogs({ rows });
    const { GET } = await importRoute();
    const res = await GET(
      makeReq(VALID_RUN, { cookie: cookieHeader() }),
      paramsOf(VALID_RUN),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.chunks).toHaveLength(500);
    expect(body.nextCursor).toBe(500);
  });

  it("passes `after` cursor into the DB query", async () => {
    const getAfter = wireLogs({ rows: [] });
    const { GET } = await importRoute();
    await GET(
      makeReq(VALID_RUN, { cookie: cookieHeader(), query: "after=42" }),
      paramsOf(VALID_RUN),
    );
    expect(getAfter()).toBe(42);
  });

  it("defaults `after` to 0 when query param absent", async () => {
    const getAfter = wireLogs({ rows: [] });
    const { GET } = await importRoute();
    await GET(
      makeReq(VALID_RUN, { cookie: cookieHeader() }),
      paramsOf(VALID_RUN),
    );
    expect(getAfter()).toBe(0);
  });

  it("returns db error as 500", async () => {
    wireLogs({ error: { message: "connection refused" } });
    const { GET } = await importRoute();
    const res = await GET(
      makeReq(VALID_RUN, { cookie: cookieHeader() }),
      paramsOf(VALID_RUN),
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("db_error");
  });

  it("SECURITY T6 DEFERRED: returns secret-looking substrings verbatim (regression)", async () => {
    // This test pins the current behaviour. Any future regex-based
    // masking (see FOLLOW-UPS.md §F-69-01) must intentionally update
    // it. If you are here because masking just landed — that's expected.
    const rows = [
      {
        id: 1,
        run_id: VALID_RUN,
        stream: "stderr",
        chunk: "error: OPENAI_API_KEY=sk-ABC123defGHIjklMNOpqrSTUvwxYZ0123456789 was rejected",
        ts: "2026-04-20T00:00:00Z",
      },
      {
        id: 2,
        run_id: VALID_RUN,
        stream: "stdout",
        chunk: "using github token ghp_ABCdefGHIjklMNOpqrSTUvwxYZ0123456789ABCdef",
        ts: "2026-04-20T00:00:01Z",
      },
      {
        id: 3,
        run_id: VALID_RUN,
        stream: "stdout",
        chunk:
          "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
        ts: "2026-04-20T00:00:02Z",
      },
    ];
    wireLogs({ rows });
    const { GET } = await importRoute();
    const res = await GET(
      makeReq(VALID_RUN, { cookie: cookieHeader() }),
      paramsOf(VALID_RUN),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.chunks).toHaveLength(3);
    // Verbatim echo — SECURITY T6 is DEFERRED (see route.ts comment).
    expect(body.chunks[0].chunk).toContain("sk-ABC123defGHIjklMNOpqrSTUvwxYZ0123456789");
    expect(body.chunks[1].chunk).toContain("ghp_ABCdefGHIjklMNOpqrSTUvwxYZ0123456789ABCdef");
    expect(body.chunks[2].chunk).toContain(
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
    );
  });
});
