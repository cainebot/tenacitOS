// HI-02 — module-scoped icon resolver + cache.
//
// The 4 Phase 69 approval-payload renderers previously did
//   const FileIcon = resolveIcon(payload.icon);
// in the render body. react-compiler's "create components during
// render" rule flags that because the returned component identity
// is not stable across renders — React treats a new function
// reference as a new component type and would remount the icon
// subtree on every parent re-render.
//
// Hoisting the resolution + cache to module scope means every call
// for the same icon-name string returns the SAME function
// reference across ALL renders of ALL renderers. The compiler rule
// is satisfied (the lookup is not a component-creation site; it's
// a stable map lookup); runtime behaviour improves (no per-render
// reference churn → no subtree remount).

import * as UntitledIcons from "@untitledui/icons";
import { File06 } from "@untitledui/icons";

export type IconComp = typeof File06;

const ICON_INDEX = UntitledIcons as unknown as Record<string, IconComp>;
const ICON_CACHE = new Map<string, IconComp>();

export function resolveIcon(name: string | null | undefined): IconComp {
  if (typeof name !== "string" || name.length === 0) return File06;
  const cached = ICON_CACHE.get(name);
  if (cached) return cached;
  if (name in ICON_INDEX) {
    const v = ICON_INDEX[name];
    if (typeof v === "function" || typeof v === "object") {
      ICON_CACHE.set(name, v);
      return v;
    }
  }
  ICON_CACHE.set(name, File06);
  return File06;
}
