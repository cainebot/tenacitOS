"use client";

import { GlobalSearch } from "@/components/GlobalSearch";

export default function SearchPage() {
  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1
          className="text-2xl md:text-3xl font-bold mb-1 md:mb-2 text-[var(--text-primary-900)] font-[family-name:var(--font-display)]"
        >
          Global Search
        </h1>
        <p className="text-sm md:text-base text-[var(--text-secondary-700)]">
          Search across activities, tasks, and indexed documents
        </p>
      </div>

      <GlobalSearch fullPage />
    </div>
  );
}
