// @vitest-environment node
// Phase 69 Plan 10 — /api/agents/[id]/instructions/[file_name] PATCH + DELETE.
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

function makeReq(agentId: string, fileName: string, opts: MakeReqOpts = {}): NextRequest {
  const headers: Record<string, string> = {};
  const origin = opts.origin === undefined ? "http://localhost:3000" : opts.origin;
  if (origin) headers["origin"] = origin;
  const ct = opts.contentType === undefined ? "application/json" : opts.contentType;
  if (ct) headers["content-type"] = ct;
  if (opts.cookie) headers["cookie"] = opts.cookie;

  const url = `http://localhost:3000/api/agents/${agentId}/instructions/${fileName}`;
  return new NextRequest(url, {
    method: opts.method ?? "PATCH",
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
}

const cookieHeader = () => `mc_auth=${AUTH}`;
const paramsOf = (id: string, file_name: string) => ({
  params: Promise.resolve({ id, file_name }),
});

// Default wiring: agent exists, file exists.
interface WireDefaults {
  agent?: Record<string, unknown> | null;
  canonicalFile?: Record<string, unknown> | null;
  userFile?: Record<string, unknown> | null;
  updateError?: { message: string } | null;
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
          }),
        }),
        update: () => ({
          eq: () =>
            Promise.resolve({
              data: null,
              error: opts.updateError ?? null,
            }),
        }),
      };
    }
    if (table === "agent_identity_files") {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: opts.canonicalFile ?? null, error: null }),
            }),
          }),
        }),
        update: () => ({
          eq: () => ({
            eq: () =>
              Promise.resolve({
                data: null,
                error: opts.updateError ?? null,
              }),
          }),
        }),
      };
    }
    if (table === "agent_instructions") {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: opts.userFile ?? null, error: null }),
            }),
          }),
        }),
        update: () => ({
          eq: () => ({
            eq: () =>
              Promise.resolve({
                data: null,
                error: opts.updateError ?? null,
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
              Promise.resolve({ data: { id: "appr-filename-1" }, error: null }),
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
  wireSelects({
    agent: { agent_id: "pomni", name: "Pomni", slug: "pomni", avatar_url: null },
  });
});

// ============================================================
// Path validation
// ============================================================

describe("PATCH path validation", () => {
  it("400 INVALID_FILE_NAME on shell filename", async () => {
    const { PATCH } = await importRoute();
    const res = await PATCH(
      makeReq("pomni", "evil.sh", { cookie: cookieHeader(), body: { icon: "FileCheck02" } }),
      paramsOf("pomni", "evil.sh"),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("INVALID_FILE_NAME");
  });

  it("400 INVALID_ID on bad agent id", async () => {
    const { PATCH } = await importRoute();
    const res = await PATCH(
      makeReq("../x", "Tools.md", { cookie: cookieHeader(), body: { icon: "FileCheck02" } }),
      paramsOf("../x", "Tools.md"),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("INVALID_ID");
  });

  it("403 cross-origin CSRF guard", async () => {
    const { PATCH } = await importRoute();
    const res = await PATCH(
      makeReq("pomni", "Tools.md", {
        origin: "https://evil.example",
        cookie: cookieHeader(),
        body: { icon: "FileCheck02" },
      }),
      paramsOf("pomni", "Tools.md"),
    );
    expect(res.status).toBe(403);
  });

  it("401 without mc_auth", async () => {
    const { PATCH } = await importRoute();
    const res = await PATCH(
      makeReq("pomni", "Tools.md", { body: { icon: "FileCheck02" } }),
      paramsOf("pomni", "Tools.md"),
    );
    expect(res.status).toBe(401);
  });
});

// ============================================================
// SOUL.md guards
// ============================================================

describe("PATCH SOUL.md", () => {
  it("400 UNSUPPORTED_PATH on SOUL.md with content", async () => {
    const { PATCH } = await importRoute();
    const res = await PATCH(
      makeReq("pomni", "SOUL.md", {
        cookie: cookieHeader(),
        body: { content: "new soul body" },
      }),
      paramsOf("pomni", "SOUL.md"),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("UNSUPPORTED_PATH");
  });

  it("200 on SOUL.md with icon-only (direct agents.icon UPDATE)", async () => {
    const { PATCH } = await importRoute();
    const res = await PATCH(
      makeReq("pomni", "SOUL.md", {
        cookie: cookieHeader(),
        body: { icon: "FileHeart02" },
      }),
      paramsOf("pomni", "SOUL.md"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("updated");
    expect(body.icon).toBe("FileHeart02");
  });
});

// ============================================================
// Canonical file (Tools.md etc.)
// ============================================================

describe("PATCH canonical files (Tools.md etc.)", () => {
  it("200 icon-only direct update", async () => {
    wireSelects({
      agent: { agent_id: "pomni", name: "Pomni", slug: "pomni", avatar_url: null },
    });
    const { PATCH } = await importRoute();
    const res = await PATCH(
      makeReq("pomni", "Tools.md", {
        cookie: cookieHeader(),
        body: { icon: "FileCheck02" },
      }),
      paramsOf("pomni", "Tools.md"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("updated");
  });

  it("200 content-only → approval row (update_identity_file_content)", async () => {
    wireSelects({
      agent: { agent_id: "pomni", name: "Pomni", slug: "pomni", avatar_url: null },
      canonicalFile: { content: "prior", icon: "FileCheck02" },
    });
    const { PATCH } = await importRoute();
    const res = await PATCH(
      makeReq("pomni", "Tools.md", {
        cookie: cookieHeader(),
        body: { content: "new content" },
      }),
      paramsOf("pomni", "Tools.md"),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).approval_id).toBe("appr-filename-1");
  });

  it("400 INVALID_ICON rejected", async () => {
    const { PATCH } = await importRoute();
    const res = await PATCH(
      makeReq("pomni", "Tools.md", {
        cookie: cookieHeader(),
        body: { icon: "NonExistentIcon99" },
      }),
      paramsOf("pomni", "Tools.md"),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("INVALID_ICON");
  });

  it("400 VALIDATION_ERROR on content > 50 000", async () => {
    const { PATCH } = await importRoute();
    const res = await PATCH(
      makeReq("pomni", "Tools.md", {
        cookie: cookieHeader(),
        body: { content: "a".repeat(50_001) },
      }),
      paramsOf("pomni", "Tools.md"),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("VALIDATION_ERROR");
  });

  it("400 EMPTY_PATCH", async () => {
    const { PATCH } = await importRoute();
    const res = await PATCH(
      makeReq("pomni", "Tools.md", { cookie: cookieHeader(), body: {} }),
      paramsOf("pomni", "Tools.md"),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("EMPTY_PATCH");
  });
});

// ============================================================
// User-created file
// ============================================================

describe("PATCH user-created file", () => {
  it("200 content-only → approval (update_user_instruction_content)", async () => {
    wireSelects({
      agent: { agent_id: "pomni", name: "Pomni", slug: "pomni", avatar_url: null },
      userFile: { content: "prior", content_version: 2, icon: "FileCheck02" },
    });
    const { PATCH } = await importRoute();
    const res = await PATCH(
      makeReq("pomni", "Playbook.md", {
        cookie: cookieHeader(),
        body: { content: "v2 body" },
      }),
      paramsOf("pomni", "Playbook.md"),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).approval_id).toBe("appr-filename-1");
  });

  it("200 both icon + content → icon_updated + content_approval_id", async () => {
    wireSelects({
      agent: { agent_id: "pomni", name: "Pomni", slug: "pomni", avatar_url: null },
      userFile: { content: "prior", content_version: 1, icon: "FileCheck02" },
    });
    const { PATCH } = await importRoute();
    const res = await PATCH(
      makeReq("pomni", "Playbook.md", {
        cookie: cookieHeader(),
        body: { icon: "FileCheck02", content: "new" },
      }),
      paramsOf("pomni", "Playbook.md"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.icon_updated).toBe(true);
    expect(body.content_approval_id).toBe("appr-filename-1");
  });
});

// ============================================================
// DELETE
// ============================================================

describe("DELETE", () => {
  it("400 UNDELETABLE for SOUL.md", async () => {
    const { DELETE } = await importRoute();
    const res = await DELETE(
      makeReq("pomni", "SOUL.md", { method: "DELETE", cookie: cookieHeader() }),
      paramsOf("pomni", "SOUL.md"),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("UNDELETABLE");
  });

  it("400 UNDELETABLE for Tools.md", async () => {
    const { DELETE } = await importRoute();
    const res = await DELETE(
      makeReq("pomni", "Tools.md", { method: "DELETE", cookie: cookieHeader() }),
      paramsOf("pomni", "Tools.md"),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("UNDELETABLE");
  });

  it("400 UNDELETABLE for Memory.md", async () => {
    const { DELETE } = await importRoute();
    const res = await DELETE(
      makeReq("pomni", "Memory.md", { method: "DELETE", cookie: cookieHeader() }),
      paramsOf("pomni", "Memory.md"),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("UNDELETABLE");
  });

  it("200 DELETE user-created file → approval row (delete_user_instruction)", async () => {
    wireSelects({
      agent: { agent_id: "pomni", name: "Pomni", slug: "pomni", avatar_url: null },
      userFile: { content: "abc", icon: "FileCheck02" },
    });
    const { DELETE } = await importRoute();
    const res = await DELETE(
      makeReq("pomni", "Playbook.md", { method: "DELETE", cookie: cookieHeader() }),
      paramsOf("pomni", "Playbook.md"),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).approval_id).toBe("appr-filename-1");
  });

  it("404 FILE_NOT_FOUND for missing user file", async () => {
    wireSelects({
      agent: { agent_id: "pomni", name: "Pomni", slug: "pomni", avatar_url: null },
      userFile: null,
    });
    const { DELETE } = await importRoute();
    const res = await DELETE(
      makeReq("pomni", "Ghost.md", { method: "DELETE", cookie: cookieHeader() }),
      paramsOf("pomni", "Ghost.md"),
    );
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("FILE_NOT_FOUND");
  });
});
