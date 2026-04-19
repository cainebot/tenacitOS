// Phase 68 Plan 06 Task 2 — /approvals page (server component stub).
//
// The initial row set is fetched client-side inside <ApprovalsTable /> so
// the page can benefit from the same authenticated browser Supabase client
// that owns the Realtime subscription. Keeping the server component thin
// avoids double-fetching (server then client) and sidesteps SSR/cookie
// plumbing for a surface that is already gated by the middleware mc_auth
// cookie.

import { ApprovalsTable } from "./approvals-table";

export const dynamic = "force-dynamic";

export default function ApprovalsPage() {
  return (
    <section className="flex flex-col gap-6 self-stretch px-8 pb-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-primary">Aprobaciones</h1>
        <p className="text-sm text-tertiary">
          Acciones pendientes de revisión humana. Los cambios llegan en tiempo
          real desde Supabase.
        </p>
      </header>
      <ApprovalsTable />
    </section>
  );
}
