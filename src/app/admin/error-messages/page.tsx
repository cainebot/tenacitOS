// Phase 64.5.2-05 Plan Task 1 — Admin route for error_messages editor.
// Server component wrapper. Identity gate is client-side via NEXT_PUBLIC_ADMIN_EMAIL
// (build-inlined) + server-side ADMIN_EMAILS on the API route. Documented debt
// T-64.5.2-05-02 / T-64.5.2-05-06 — replace with Supabase Auth session post-v1.9.

import { ErrorMessagesEditor } from "./error-messages-editor";

export const dynamic = "force-dynamic";

export default function AdminErrorMessagesPage() {
  return (
    <section className="flex flex-col items-start gap-6 self-stretch px-8 py-6">
      <ErrorMessagesEditor />
    </section>
  );
}
