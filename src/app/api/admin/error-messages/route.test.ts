// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const { upsertMock, deleteMock, eqMock } = vi.hoisted(() => ({
  upsertMock: vi.fn(),
  deleteMock: vi.fn(),
  eqMock: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  createServiceRoleClient: () => ({
    from: () => ({
      upsert: upsertMock,
      delete: () => {
        deleteMock();
        const chain = {
          eq: (..._args: unknown[]) => {
            eqMock(..._args);
            // After two .eq calls return resolved promise
            if (eqMock.mock.calls.length % 2 === 0) {
              return Promise.resolve({ error: null });
            }
            return chain;
          },
        };
        return chain;
      },
    }),
  }),
}));

async function importRoute() {
  vi.resetModules();
  return await import("./route");
}

function jsonReq(method: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://x/api/admin/error-messages", {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  }) as never;
}

function delReq(query: string, headers: Record<string, string> = {}) {
  return new Request(`http://x/api/admin/error-messages?${query}`, {
    method: "DELETE",
    headers,
  }) as never;
}

describe("PUT /api/admin/error-messages", () => {
  beforeEach(() => {
    upsertMock.mockReset();
    deleteMock.mockReset();
    eqMock.mockReset();
    upsertMock.mockResolvedValue({ error: null });
    process.env.ADMIN_EMAILS = "admin@circos.dev,ops@circos.dev";
  });

  afterEach(() => {
    delete process.env.ADMIN_EMAILS;
  });

  it("returns 403 when ADMIN_EMAILS is unset", async () => {
    delete process.env.ADMIN_EMAILS;
    const { PUT } = await importRoute();
    const res = await PUT(
      jsonReq(
        "PUT",
        {
          error_code: "tailscale_not_logged_in",
          lang: "es",
          message: "x",
          remediation: "y",
          doc_link: "z",
          category: "tailscale",
        },
        { "x-user-email": "admin@circos.dev" },
      ),
    );
    expect(res.status).toBe(403);
  });

  it("returns 403 when header missing", async () => {
    const { PUT } = await importRoute();
    const res = await PUT(
      jsonReq("PUT", {
        error_code: "tailscale_not_logged_in",
        lang: "es",
        message: "x",
        remediation: "y",
        doc_link: "z",
        category: "tailscale",
      }),
    );
    expect(res.status).toBe(403);
  });

  it("returns 403 when header email not in ADMIN_EMAILS", async () => {
    const { PUT } = await importRoute();
    const res = await PUT(
      jsonReq(
        "PUT",
        {
          error_code: "tailscale_not_logged_in",
          lang: "es",
          message: "x",
          remediation: "y",
          doc_link: "z",
          category: "tailscale",
        },
        { "x-user-email": "intruder@evil.com" },
      ),
    );
    expect(res.status).toBe(403);
  });

  it("happy: admin email upserts row + 200", async () => {
    const { PUT } = await importRoute();
    const res = await PUT(
      jsonReq(
        "PUT",
        {
          error_code: "tailscale_not_logged_in",
          lang: "es",
          message: "x",
          remediation: "y",
          doc_link: "z",
          category: "tailscale",
        },
        { "x-user-email": "admin@circos.dev" },
      ),
    );
    expect(res.status).toBe(200);
    expect(upsertMock).toHaveBeenCalledTimes(1);
    const upsertedRow = upsertMock.mock.calls[0][0];
    expect(upsertedRow.error_code).toBe("tailscale_not_logged_in");
    expect(upsertedRow.updated_by).toBe("admin@circos.dev");
  });

  it("validation: returns 400 when required field missing", async () => {
    const { PUT } = await importRoute();
    const res = await PUT(
      jsonReq(
        "PUT",
        { error_code: "tailscale_not_logged_in", lang: "es" },
        { "x-user-email": "admin@circos.dev" },
      ),
    );
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/admin/error-messages", () => {
  beforeEach(() => {
    deleteMock.mockReset();
    eqMock.mockReset();
    process.env.ADMIN_EMAILS = "admin@circos.dev";
  });
  afterEach(() => {
    delete process.env.ADMIN_EMAILS;
  });

  it("blocks deletion of live registry code with 400", async () => {
    const { DELETE } = await importRoute();
    const res = await DELETE(
      delReq("error_code=tailscale_not_logged_in&lang=es", {
        "x-user-email": "admin@circos.dev",
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("code_still_active");
    expect(body.message).toMatch(/code still in registry/i);
  });

  it("allows deletion of orphan code", async () => {
    const { DELETE } = await importRoute();
    const res = await DELETE(
      delReq("error_code=legacy_orphan_code&lang=en", {
        "x-user-email": "admin@circos.dev",
      }),
    );
    expect(res.status).toBe(200);
    expect(deleteMock).toHaveBeenCalledTimes(1);
  });

  it("403 when no admin gate", async () => {
    delete process.env.ADMIN_EMAILS;
    const { DELETE } = await importRoute();
    const res = await DELETE(delReq("error_code=foo&lang=es"));
    expect(res.status).toBe(403);
  });
});
