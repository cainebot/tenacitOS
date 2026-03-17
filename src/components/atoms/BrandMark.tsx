import Link from "next/link";

export function BrandMark() {
  return (
    <Link href="/dashboard" className="flex items-center gap-3 px-3 py-4">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--accent)] text-xs font-semibold text-white">
        <span style={{ fontFamily: 'var(--font-heading)', letterSpacing: '0.2em' }}>DC</span>
      </div>
      <div className="leading-tight">
        <div style={{ fontFamily: 'var(--font-heading)' }} className="text-sm uppercase tracking-[0.26em] text-[var(--text-primary)]">
          THE DIGITAL
        </div>
        <div className="text-[11px] font-medium text-[var(--text-secondary)]">
          Circus
        </div>
      </div>
    </Link>
  );
}
