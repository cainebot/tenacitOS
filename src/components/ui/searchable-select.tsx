"use client";

import DropdownSelect, {
  type DropdownSelectOption,
} from "@/components/ui/dropdown-select";
import { cn } from "@/lib/cn";

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
  "px-4 py-3 text-sm text-[var(--text-primary)] transition-colors data-[selected=true]:bg-[var(--surface-hover)] data-[selected=true]:font-semibold hover:bg-[var(--surface-hover)]";

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
      triggerClassName={cn(baseTriggerClassName, triggerClassName)}
      contentClassName={cn(baseContentClassName, contentClassName)}
      itemClassName={cn(baseItemClassName, itemClassName)}
      searchEnabled={searchEnabled}
      searchPlaceholder={searchPlaceholder}
      emptyMessage={emptyMessage}
    />
  );
}
