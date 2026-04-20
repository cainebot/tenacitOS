"use client";

// Phase 69 — IconPicker (popover with @untitledui/icons grid + search).
// Used inside Instructions tab — utility-button trigger opens grid.

import { useDeferredValue, useMemo, useState, type ComponentType, type SVGProps } from "react";
import { ButtonUtility, Input, Popover, cx } from "@circos/ui";
import * as UntitledIcons from "@untitledui/icons";
import { SearchMd } from "@untitledui/icons";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

const ICON_ENTRIES: Array<[string, IconType]> = Object.entries(UntitledIcons)
  .filter(([_, value]) => typeof value === "function" || typeof value === "object")
  .map(([name, value]) => [name, value as IconType]);

const MAX_RESULTS = 144;

export interface IconPickerProps {
  value: IconType;
  onChange: (icon: IconType, name: string) => void;
  tooltip?: string;
}

export function IconPicker({ value, onChange, tooltip = "Change icon" }: IconPickerProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const TriggerIcon = value;

  const results = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    const filtered = q
      ? ICON_ENTRIES.filter(([name]) => name.toLowerCase().includes(q))
      : ICON_ENTRIES;
    return filtered.slice(0, MAX_RESULTS);
  }, [deferredQuery]);

  return (
    <Popover
      placement="bottom start"
      trigger={
        <ButtonUtility
          size="xs"
          color="tertiary"
          icon={<TriggerIcon data-icon className="size-4" />}
          tooltip={tooltip}
        />
      }
      className="w-[360px] p-0"
    >
      <div className="flex flex-col gap-3">
        <Input
          icon={SearchMd}
          placeholder="Search icons…"
          value={query}
          onChange={(v) => setQuery(typeof v === "string" ? v : "")}
          aria-label="Search icons"
        />
        <div
          className="grid max-h-[260px] grid-cols-8 gap-1 overflow-auto pr-1"
          role="listbox"
          aria-label="Icon results"
        >
          {results.map(([name, Icon]) => {
            const isSelected = Icon === value;
            return (
              <button
                key={name}
                type="button"
                onClick={() => onChange(Icon, name)}
                className={cx(
                  "flex aspect-square items-center justify-center rounded-md transition-colors",
                  isSelected
                    ? "bg-active text-fg-brand-primary"
                    : "text-fg-quaternary hover:bg-primary_hover hover:text-fg-secondary",
                )}
                title={name}
                aria-label={name}
                aria-selected={isSelected}
                role="option"
              >
                <Icon className="size-5" aria-hidden />
              </button>
            );
          })}
        </div>
        <p className="text-xs text-tertiary">
          {results.length === MAX_RESULTS
            ? `${MAX_RESULTS}+ results · refine search to see more`
            : `${results.length} ${results.length === 1 ? "icon" : "icons"}`}
        </p>
      </div>
    </Popover>
  );
}
