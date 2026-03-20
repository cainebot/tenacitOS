import Link from "next/link";

export function BrandMark() {
  return (
    <Link href="/dashboard" className="flex items-center gap-3 px-3 py-4">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-600 text-xs font-semibold text-white">
        <span className="font-display tracking-[0.2em]">DC</span>
      </div>
      <div className="leading-tight">
        <div className="font-display text-sm uppercase tracking-[0.26em] text-primary">
          THE DIGITAL
        </div>
        <div className="text-[11px] font-medium text-secondary">
          Circus
        </div>
      </div>
    </Link>
  );
}
