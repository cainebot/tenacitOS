"use client";

// Phase 64.5.2-04 — UX-MESH-04 humanized error copy resolver.
// Fetches all error_messages rows for the requested lang once on mount, caches
// in-memory; lookup(code) returns the cached row or LOOKUP_FALLBACK[code][lang]
// when the DB row is missing. Never throws — every consumer always receives a
// fully-populated ErrorMessage.

import { useEffect, useMemo, useRef, useState } from "react";
import { LOOKUP_FALLBACK, type ErrorMessage } from "@circos/error-i18n";
import type { ErrorCode } from "@circos/cli-connect/shared/error-codes";
import { createBrowserClient } from "@/lib/supabase";

export interface UseErrorMessagesResult {
  loading: boolean;
  error: string | null;
  lookup: (code: ErrorCode) => ErrorMessage;
}

export function useErrorMessages(lang: "es" | "en"): UseErrorMessagesResult {
  const [cache, setCache] = useState<Record<string, ErrorMessage>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sb = useMemo(() => createBrowserClient(), []);
  const cacheRef = useRef(cache);
  cacheRef.current = cache;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error: fetchErr } = await sb
          .from("error_messages")
          .select("error_code, lang, title, description, next_step, doc_link")
          .eq("lang", lang);
        if (cancelled) return;
        if (fetchErr) {
          setError(fetchErr.message);
          setLoading(false);
          return;
        }
        const next: Record<string, ErrorMessage> = {};
        for (const row of (data ?? []) as Array<{
          error_code: string;
          title: string;
          description: string;
          next_step: string;
          doc_link: string;
        }>) {
          next[row.error_code] = {
            title: row.title,
            description: row.description,
            next_step: row.next_step,
            doc_link: row.doc_link,
          };
        }
        setCache(next);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load error messages");
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sb, lang]);

  const lookup = useMemo(
    () => (code: ErrorCode): ErrorMessage => {
      const cached = cacheRef.current[code];
      if (cached) return cached;
      return LOOKUP_FALLBACK[code][lang];
    },
    [lang],
  );

  return { loading, error, lookup };
}
