// @vitest-environment node
// Phase 69 Plan 10 — /api/agents/[id]/instructions GET + POST coverage.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const AUTH = "test-secret-aaaaaaaaaaaaaaaa";

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
  contentType?: string | null;
  cookie?: string;
  body?: unknown;
}

function makeReq(agentId: string, opts: MakeReqOpts = {}): NextRequest {
  const headers: Record<string, string> = {};
  const origin = opts.origin === undefined ? "http://localhost:3000" : opts.origin;
  if (origin) headers["origin"] = origin;
  const ct = opts.contentType === undefined ? "application/json" : opts.contentType;
  if (ct) headers["content-type"] = ct;
  if (opts.cookie) headers["cookie"] = opts.cookie;

  const url = `http://localhost:3000/api/agents/${agentId}/instructions`;
  return new NextRequest(url, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
}

const cookieHeader = () => `mc_auth=${AUTH}`;
const paramsOf = (id: string) => ({ params: Promise.resolve({ id }) });

// ------------------------------------------------------------
// Default wiring: agent exists, no canonical + user rows.
// ------------------------------------------------------------

interface WireDefaults {
  agent?: Record<string, unknown> | null;
  identityRows?: Array<Record<string, unknown>>;
  userRows?: Array<Record<string, unknown>>;
  existingInsertDup?: Record<string, unknown> | null;
}

function wireSelects(opts: WireDefaults = {}) {
  fromMock.mockImplementation((table: string) => {
    if (table === "agents") {
      return {
        select: () => ({
          eq: () => ({
            is: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: opts.agent ?? null, error: null }),
            }),
            maybeSingle: () =>
              Promise.resolve({ data: opts.agent ?? null, error: null }),
          }),
        }),
      };
    }
    if (table === "agent_identity_files") {
      return {
        select: () => ({
          eq: () => ({
            neq: () => ({
              order: () =>
                Promise.resolve({ data: opts.identityRows ?? [], error: null }),
            }),
          }),
        }),
      };
    }
    if (table === "agent_instructions") {
      return {
        select: () => ({
          eq: () => ({
            order: () =>
              Promise.resolve({ data: opts.userRows ?? [], error: null }),
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: opts.existingInsertDup ?? null, error: null }),
            }),
          }),
        }),
      };
    }
    if (table === "approvals") {
      return {
        insert: () => ({
          select: () => ({
            single: () =>
              Promise.resolve({ data: { id: "appr-new-123" }, error: null }),
          }),
        }),
      };
    }
    throw new Error(`Unexpected table: ${table}`);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.AUTH_SECRET = AUTH;
  delete process.env.CIRCOS_ALLOWED_ORIGINS;
  fromMock.mockReset();
  wireSelects();
});

// ============================================================
// GET
// ============================================================

describe("GET /api/agents/[id]/instructions", () => {
  it("400 INVALID_ID on malformed path-id", async () => {
    const { GET } = await importRoute();
    const res = await GET(
      makeReq("../bad", { cookie: cookieHeader() }),
      paramsOf("../bad"),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("INVALID_ID");
  });

  it("403 on cross-origin GET", async () => {
    const { GET } = await importRoute();
    const res = await GET(
      makeReq("pomni", { origin: "https://evil.example", cookie: cookieHeader() }),
      paramsOf("pomni"),
    );
    expect(res.status).toBe(403);
  });

  it("401 without mc_auth", async () => {
    const { GET } = await importRoute();
    const res = await GET(makeReq("pomni"), paramsOf("pomni"));
    expect(res.status).toBe(401);
  });

  it("404 when agent missing", async () => {
    wireSelects({ agent: null });
    const { GET } = await importRoute();
    const res = await GET(
      makeReq("pomni", { cookie: cookieHeader() }),
      paramsOf("pomni"),
    );
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("AGENT_NOT_FOUND");
  });

  it("returns SOUL.md first + canonicals + user files; hides user/identity", async () => {
    wireSelects({
      agent: {
        agent_id: "pomni",
        name: "Pomni",
        slug: "pomni",
        avatar_url: null,
        soul_content: "# Soul body",
        icon: "FileHeart02",
      },
      identityRows: [
        { file_type: "tools", icon: "Hammer01", content: "tools body", updated_at: "t1" },
        { file_type: "user", icon: "User01", content: "hidden", updated_at: "t2" }, // hidden
        { file_type: "identity", icon: "Fingerprint01", content: "hidden", updated_at: "t3" }, // hidden
        { file_type: "agents", icon: "Users01", content: "agents body", updated_at: "t4" },
      ],
      userRows: [
        { file_name: "Playbook.md", icon: "FileCheck02", content: "play", updated_at: "t5" },
      ],
    });
    const { GET } = await importRoute();
    const res = await GET(
      makeReq("pomni", { cookie: cookieHeader() }),
      paramsOf("pomni"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    const names = body.files.map((f: { file_name: string }) => f.file_name);
    expect(names[0]).toBe("SOUL.md");
    expect(names).not.toContain("User.md");
    expect(names).not.toContain("Identity.md");
    expect(names).toContain("Tools.md");
    expect(names).toContain("Agents.md");
    expect(names[names.length - 1]).toBe("Playbook.md");
  });
});

// ============================================================
// POST
// ============================================================

describe("POST /api/agents/[id]/instructions", () => {
  it("400 INVALID_ID on bad agent id", async () => {
    const { POST } = await importRoute();
    const res = await POST(
      makeReq("../x", {
        method: "POST",
        cookie: cookieHeader(),
        body: { file_name: "a.md" },
      }),
      paramsOf("../x"),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("INVALID_ID");
  });

  it("403 on cross-origin POST (CSRF)", async () => {
    const { POST } = await importRoute();
    const res = await POST(
      makeReq("pomni", {
        method: "POST",
        origin: "https://evil.example",
        cookie: cookieHeader(),
        body: { file_name: "a.md" },
      }),
      paramsOf("pomni"),
    );
    expect(res.status).toBe(403);
  });

  it("415 without application/json", async () => {
    const { POST } = await importRoute();
    const res = await POST(
      makeReq("pomni", {
        method: "POST",
        contentType: null,
        cookie: cookieHeader(),
        body: { file_name: "a.md" },
      }),
      paramsOf("pomni"),
    );
    expect(res.status).toBe(415);
  });

  it("400 FORBIDDEN_FIELD on prototype-pollution key", async () => {
    // Craft a raw JSON string because JSON.stringify strips __proto__.
    const url = `http://localhost:3000/api/agents/pomni/instructions`;
    const req = new NextRequest(url, {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "content-type": "application/json",
        cookie: cookieHeader(),
      },
      body: '{"__proto__":{"isAdmin":true},"file_name":"ok.md"}',
    });
    const { POST } = await importRoute();
    const res = await POST(req, paramsOf("pomni"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("FORBIDDEN_FIELD");
    expect(body.reason).toBe("prototype_pollution_attempt");
  });

  it("400 RESERVED_NAME for Tools.md", async () => {
    const { POST } = await importRoute();
    const res = await POST(
      makeReq("pomni", {
        method: "POST",
        cookie: cookieHeader(),
        body: { file_name: "Tools.md" },
      }),
      paramsOf("pomni"),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("RESERVED_NAME");
  });

  it("400 RESERVED_NAME for SOUL.md (case-insensitive)", async () => {
    const { POST } = await importRoute();
    const res = await POST(
      makeReq("pomni", {
        method: "POST",
        cookie: cookieHeader(),
        body: { file_name: "soul.md" },
      }),
      paramsOf("pomni"),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("RESERVED_NAME");
  });

  it("400 RESERVED_NAME for Memoy.md (Figma alias)", async () => {
    const { POST } = await importRoute();
    const res = await POST(
      makeReq("pomni", {
        method: "POST",
        cookie: cookieHeader(),
        body: { file_name: "Memoy.md" },
      }),
      paramsOf("pomni"),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("RESERVED_NAME");
  });

  it("400 VALIDATION_ERROR for path-traversal file_name", async () => {
    const { POST } = await importRoute();
    const res = await POST(
      makeReq("pomni", {
        method: "POST",
        cookie: cookieHeader(),
        body: { file_name: "../etc.md" },
      }),
      paramsOf("pomni"),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("VALIDATION_ERROR");
  });

  it("400 INVALID_ICON for non-whitelisted icon", async () => {
    const { POST } = await importRoute();
    const res = await POST(
      makeReq("pomni", {
        method: "POST",
        cookie: cookieHeader(),
        body: { file_name: "Playbook.md", icon: "NonExistentIcon99" },
      }),
      paramsOf("pomni"),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("INVALID_ICON");
  });

  it("200 happy path → inserts create_user_instruction approval", async () => {
    wireSelects({
      agent: { agent_id: "pomni", name: "Pomni", slug: "pomni", avatar_url: null },
    });
    const { POST } = await importRoute();
    const res = await POST(
      makeReq("pomni", {
        method: "POST",
        cookie: cookieHeader(),
        body: { file_name: "Playbook.md", icon: "FileCheck02", content: "Hello" },
      }),
      paramsOf("pomni"),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).approval_id).toBe("appr-new-123");
  });

  it("404 AGENT_NOT_FOUND when agent missing", async () => {
    wireSelects({ agent: null });
    const { POST } = await importRoute();
    const res = await POST(
      makeReq("ghost", {
        method: "POST",
        cookie: cookieHeader(),
        body: { file_name: "Playbook.md" },
      }),
      paramsOf("ghost"),
    );
    expect(res.status).toBe(404);
  });

  it("400 FORBIDDEN_FIELD on unknown key", async () => {
    const { POST } = await importRoute();
    const res = await POST(
      makeReq("pomni", {
        method: "POST",
        cookie: cookieHeader(),
        body: { file_name: "Playbook.md", evil: "x" },
      }),
      paramsOf("pomni"),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("FORBIDDEN_FIELD");
  });
});
