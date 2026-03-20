"use client"

import {
  ComboBox as AriaComboBox,
  Input,
  Button,
  Popover,
  ListBox,
  ListBoxItem,
  Label,
  type ComboBoxProps as AriaComboBoxProps,
  type Key,
} from "react-aria-components"
import { cx } from "../../utils/cx"

export interface ComboboxItem {
  id: Key
  label: string
}

export interface ComboboxProps
  extends Omit<
    AriaComboBoxProps<ComboboxItem>,
    "children" | "className"
  > {
  label?: string
  items: ComboboxItem[]
  selectedKey?: Key | null
  onSelectionChange?: (key: Key | null) => void
  placeholder?: string
  className?: string
}

export function Combobox({
  label,
  items,
  placeholder,
  className,
  ...props
}: ComboboxProps) {
  return (
    <AriaComboBox
      className={cx("flex flex-col gap-1.5", className)}
      {...props}
    >
      {label && (
        <Label className="text-sm font-medium text-white/70">{label}</Label>
      )}
      <div className="relative">
        <Input
          placeholder={placeholder}
          className={cx(
            "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 pr-8 text-sm text-white",
            "placeholder:text-white/30",
            "focus:border-[#FF3B30] focus:outline-none focus:ring-1 focus:ring-[#FF3B30]",
            "transition-colors"
          )}
        />
        <Button
          className={cx(
            "absolute inset-y-0 right-0 flex w-8 items-center justify-center",
            "text-white/50 hover:text-white"
          )}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </Button>
      </div>
      <Popover
        className={cx(
          "w-[var(--trigger-width)] overflow-auto rounded-lg border border-white/10 bg-[#1C1C1E] shadow-2xl",
          "entering:animate-in entering:fade-in entering:duration-150",
          "exiting:animate-out exiting:fade-out exiting:duration-100"
        )}
      >
        <ListBox
          className="max-h-60 overflow-auto p-1 outline-none"
          items={items}
        >
          {(item) => (
            <ListBoxItem
              id={item.id}
              textValue={item.label}
              className={cx(
                "cursor-pointer rounded-md px-3 py-2 text-sm text-white/70 outline-none transition-colors",
                "hover:bg-white/10 hover:text-white",
                "selected:bg-[#FF3B30]/20 selected:text-white",
                "focused:bg-white/10 focused:text-white"
              )}
            >
              {item.label}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </AriaComboBox>
  )
}
