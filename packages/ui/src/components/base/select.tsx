"use client"

import {
  Select as AriaSelect,
  SelectValue as AriaSelectValue,
  Label as AriaLabel,
  Button as AriaButton,
  Popover as AriaPopover,
  ListBox as AriaListBox,
  ListBoxItem as AriaListBoxItem,
  Text as AriaText,
  FieldError as AriaFieldError,
  type SelectProps as AriaSelectProps,
  type ListBoxItemProps as AriaListBoxItemProps,
} from "react-aria-components"
import { type ReactNode } from "react"
import { cx } from "../../utils/cx"

export interface SelectItem {
  id: string | number
  label: string
}

export interface SelectProps<T extends object> extends Omit<AriaSelectProps<T>, "className" | "children"> {
  label?: string
  description?: string
  errorMessage?: string
  items?: Iterable<T>
  children?: ReactNode | ((item: T) => ReactNode)
  placeholder?: string
  className?: string
}

export function Select<T extends object>({
  label,
  description,
  errorMessage,
  items,
  children,
  placeholder = "Select an option",
  className,
  ...props
}: SelectProps<T>) {
  return (
    <AriaSelect
      className={cx("flex flex-col gap-1.5", className)}
      {...props}
    >
      {label && (
        <AriaLabel className="text-sm font-medium text-neutral-300">
          {label}
        </AriaLabel>
      )}
      <AriaButton
        className={cx(
          "flex items-center justify-between w-full rounded-lg border bg-white/5 text-white",
          "border-white/10 h-10 px-3.5 text-sm transition-colors duration-150",
          "hover:border-white/20",
          "focus:border-[#FF3B30] focus:outline-none focus:ring-1 focus:ring-[#FF3B30]",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        <AriaSelectValue className="truncate placeholder-shown:text-neutral-500">
          {({ defaultChildren, isPlaceholder }) =>
            isPlaceholder ? (
              <span className="text-neutral-500">{placeholder}</span>
            ) : (
              defaultChildren
            )
          }
        </AriaSelectValue>
        <svg
          className="w-4 h-4 text-neutral-400 shrink-0 ml-2"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </AriaButton>
      {description && (
        <AriaText slot="description" className="text-xs text-neutral-500">
          {description}
        </AriaText>
      )}
      <AriaFieldError className="text-xs text-red-400">
        {errorMessage}
      </AriaFieldError>
      <AriaPopover
        className={cx(
          "w-[var(--trigger-width)] rounded-lg border border-white/10 bg-neutral-900 shadow-xl overflow-hidden",
          "entering:animate-in entering:fade-in entering:zoom-in-95",
          "exiting:animate-out exiting:fade-out exiting:zoom-out-95"
        )}
      >
        <AriaListBox
          items={items}
          className="p-1 outline-none max-h-60 overflow-auto"
        >
          {children}
        </AriaListBox>
      </AriaPopover>
    </AriaSelect>
  )
}

export interface SelectItemProps extends Omit<AriaListBoxItemProps, "className"> {
  className?: string
}

export function SelectItem({ className, ...props }: SelectItemProps) {
  return (
    <AriaListBoxItem
      className={cx(
        "flex items-center rounded-md px-3 py-2 text-sm text-white cursor-pointer outline-none",
        "hover:bg-white/10 focus:bg-white/10",
        "selected:bg-[#FF3B30]/15 selected:text-[#FF8A84]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
  )
}
