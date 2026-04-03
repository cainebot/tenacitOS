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
      aria-label={!label ? (props["aria-label"] ?? placeholder) : undefined}
    >
      {label && (
        <Label className="text-sm font-medium text-secondary">{label}</Label>
      )}
      <div className="relative">
        <Input
          placeholder={placeholder}
          className={cx(
            "w-full rounded-md border border-secondary bg-secondary px-3 py-2 pr-8 text-sm text-primary",
            "placeholder:text-quaternary",
            "focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600",
            "transition-colors"
          )}
        />
        <Button
          className={cx(
            "absolute inset-y-0 right-0 flex w-8 items-center justify-center",
            "text-quaternary hover:text-primary"
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
          "w-[var(--trigger-width)] overflow-auto rounded-lg border border-secondary bg-secondary shadow-2xl",
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
                "cursor-pointer rounded-sm px-3 py-2 text-sm text-tertiary outline-none transition-colors",
                "hover:bg-tertiary hover:text-primary",
                "selected:bg-brand-600/20 selected:text-primary",
                "focused:bg-tertiary focused:text-primary"
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
