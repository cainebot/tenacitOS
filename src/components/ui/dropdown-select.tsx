"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cx } from "@openclaw/ui";
import {
  ComboBox,
  Input,
  Button,
  Popover,
  ListBox,
  ListBoxItem,
  type Key,
} from "react-aria-components";

export type DropdownSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: React.ElementType<{ className?: string }>;
  iconClassName?: string;
};

type DropdownSelectProps = {
  value?: string;
  onValueChange: (value: string) => void;
  options: DropdownSelectOption[];
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

const resolvePlaceholder = (ariaLabel: string, placeholder?: string) => {
  if (placeholder) {
    return placeholder;
  }
  const trimmed = ariaLabel.trim();
  if (!trimmed) {
    return "Select an option";
  }
  return trimmed.endsWith("...") ? trimmed : `${trimmed}...`;
};

const resolveSearchPlaceholder = (
  ariaLabel: string,
  searchPlaceholder?: string,
) => {
  if (searchPlaceholder) {
    return searchPlaceholder;
  }
  const cleaned = ariaLabel.replace(/^select\s+/i, "").trim();
  if (!cleaned) {
    return "Search...";
  }
  const value = `Search ${cleaned}`;
  return value.endsWith("...") ? value : `${value}...`;
};

export default function DropdownSelect({
  value,
  onValueChange,
  options,
  placeholder,
  ariaLabel,
  disabled = false,
  triggerClassName,
  contentClassName,
  itemClassName,
  searchEnabled = true,
  searchPlaceholder,
  emptyMessage,
}: DropdownSelectProps) {
  const [inputValue, setInputValue] = React.useState("");
  const selectedOption = options.find((option) => option.value === value);
  const resolvedPlaceholder = resolvePlaceholder(ariaLabel, placeholder);
  const resolvedSearchPlaceholder = searchEnabled
    ? resolveSearchPlaceholder(ariaLabel, searchPlaceholder)
    : resolvedPlaceholder;

  const items = React.useMemo(
    () => options.map((o) => ({ id: o.value, label: o.label })),
    [options],
  );

  const filteredItems = React.useMemo(() => {
    if (!searchEnabled || !inputValue) return items;
    const lower = inputValue.toLowerCase();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(lower) ||
        item.id.toLowerCase().includes(lower),
    );
  }, [items, inputValue, searchEnabled]);

  const handleSelectionChange = (key: Key | null) => {
    if (key != null) {
      const keyStr = String(key);
      if (keyStr !== value) {
        onValueChange(keyStr);
      }
    }
    setInputValue("");
  };

  const handleInputChange = (val: string) => {
    if (searchEnabled) {
      setInputValue(val);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setInputValue("");
    }
  };

  const SelectedIcon = selectedOption?.icon;
  const selectedIconClassName = selectedOption?.iconClassName;

  return (
    <ComboBox
      aria-label={ariaLabel}
      isDisabled={disabled}
      selectedKey={value ?? null}
      onSelectionChange={handleSelectionChange}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      onOpenChange={handleOpenChange}
      items={filteredItems}
      menuTrigger="focus"
      allowsCustomValue={false}
    >
      <div className="relative inline-flex">
        <div
          className={cx(
            "inline-flex h-10 w-auto cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)]",
            disabled && "cursor-not-allowed opacity-50",
            triggerClassName,
          )}
        >
          {SelectedIcon && !inputValue ? (
            <SelectedIcon
              className={cx(
                "h-4 w-4 shrink-0 text-[var(--text-secondary)]",
                selectedIconClassName,
              )}
            />
          ) : null}
          <Input
            className={cx(
              "min-w-0 flex-1 border-none bg-transparent text-sm font-medium text-[var(--text-primary)] outline-none",
              "placeholder:text-[var(--text-muted)]",
              !searchEnabled && "pointer-events-none caret-transparent",
            )}
            placeholder={
              selectedOption
                ? selectedOption.label
                : resolvedSearchPlaceholder
            }
          />
          <Button
            className="flex shrink-0 items-center justify-center outline-none"
          >
            <ChevronDown className="h-4 w-4 text-[var(--text-secondary)] transition-transform" />
          </Button>
        </div>
      </div>
      <Popover
        className={cx(
          "w-[var(--trigger-width)] min-w-[12rem] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl",
          "entering:animate-in entering:fade-in entering:duration-150",
          "exiting:animate-out exiting:fade-out exiting:duration-100",
          contentClassName,
        )}
        offset={6}
      >
        <ListBox
          className="max-h-64 overflow-auto p-1 outline-none"
          renderEmptyState={() => (
            <div className="px-3 py-6 text-center text-sm text-[var(--text-secondary)]">
              {emptyMessage ?? "No results found."}
            </div>
          )}
        >
          {filteredItems.map((item) => {
            const option = options.find((o) => o.value === item.id);
            const isSelected = value === item.id;
            const OptionIcon = option?.icon;
            return (
              <ListBoxItem
                key={item.id}
                id={item.id}
                textValue={item.label}
                className={cx(
                  "flex cursor-pointer items-center justify-between gap-2 rounded-lg px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition-colors",
                  "hover:bg-[var(--surface-hover)]",
                  "focused:bg-[var(--surface-hover)]",
                  "selected:font-semibold",
                  isSelected && "font-semibold",
                  itemClassName,
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {OptionIcon ? (
                    <OptionIcon
                      className={cx(
                        "h-4 w-4",
                        isSelected
                          ? "text-[var(--text-primary)]"
                          : "text-[var(--text-secondary)]",
                        option?.iconClassName,
                      )}
                    />
                  ) : null}
                  <span className="truncate font-medium">{item.label}</span>
                </span>
                {isSelected ? (
                  <Check className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
                ) : null}
              </ListBoxItem>
            );
          })}
        </ListBox>
      </Popover>
    </ComboBox>
  );
}
