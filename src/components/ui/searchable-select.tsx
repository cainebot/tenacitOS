"use client";

import { cx } from "@openclaw/ui";
import DropdownSelect, {
  type DropdownSelectOption,
} from "@/components/ui/dropdown-select";

export type SearchableSelectOption = DropdownSelectOption;

type SearchableSelectProps = {
  value?: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  ariaLabel: string;
  disabled?: boolean;
  triggerClassName?: string;
  contentClassName?: string;
  itemClassName?: string;
  searchEnabled?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
};

const baseTriggerClassName =
  "w-auto h-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)] transition-all hover:border-[var(--border-strong)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]";
const baseContentClassName =
  "rounded-xl border border-[var(--border)] bg-[var(--surface)]";
const baseItemClassName =
  "px-4 py-3 text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)] focused:bg-[var(--surface-hover)] selected:font-semibold";

export default function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder,
  ariaLabel,
  disabled = false,
  triggerClassName,
  contentClassName,
  itemClassName,
  searchEnabled,
  searchPlaceholder,
  emptyMessage,
}: SearchableSelectProps) {
  return (
    <DropdownSelect
      value={value}
      onValueChange={onValueChange}
      options={options}
      placeholder={placeholder}
      ariaLabel={ariaLabel}
      disabled={disabled}
      triggerClassName={cx(baseTriggerClassName, triggerClassName)}
      contentClassName={cx(baseContentClassName, contentClassName)}
      itemClassName={cx(baseItemClassName, itemClassName)}
      searchEnabled={searchEnabled}
      searchPlaceholder={searchPlaceholder}
      emptyMessage={emptyMessage}
    />
  );
}
