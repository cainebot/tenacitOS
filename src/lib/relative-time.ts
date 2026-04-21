// Phase 69 Plan 02 — shared time helpers for agent surfaces.
//
// Replaces the old fixtures-co-located helpers (`phase-69-fixtures.ts`)
// that BLOCKING-1 forbade from app code. Pure functions, no external deps.

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "never";
  const ms = Date.now() - Date.parse(iso);
  if (Number.isNaN(ms)) return "never";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec} s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return min === 1 ? "1 m ago" : `${min} m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr === 1 ? "1 h ago" : `${hr} h ago`;
  const day = Math.floor(hr / 24);
  return day === 1 ? "1 d ago" : `${day} d ago`;
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms} ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s} s`;
  const min = Math.floor(s / 60);
  const rem = s % 60;
  return rem === 0 ? `${min} m` : `${min} m ${rem} s`;
}

export function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
