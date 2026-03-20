"use client"

import {
  RadioGroup as AriaRadioGroup,
  Radio as AriaRadio,
  Label as AriaLabel,
  Text as AriaText,
  FieldError as AriaFieldError,
  type RadioGroupProps as AriaRadioGroupProps,
  type RadioProps as AriaRadioProps,
} from "react-aria-components"
import { type ReactNode } from "react"
import { cx } from "../../utils/cx"

export interface RadioGroupProps extends Omit<AriaRadioGroupProps, "className" | "children"> {
  label?: string
  description?: string
  errorMessage?: string
  children: ReactNode
  className?: string
}

export function RadioGroup({
  label,
  description,
  errorMessage,
  children,
  className,
  ...props
}: RadioGroupProps) {
  return (
    <AriaRadioGroup
      className={cx("flex flex-col gap-2", className)}
      {...props}
    >
      {label && (
        <AriaLabel className="text-sm font-medium text-neutral-300">
          {label}
        </AriaLabel>
      )}
      <div className="flex flex-col gap-2">{children}</div>
      {description && (
        <AriaText slot="description" className="text-xs text-neutral-500">
          {description}
        </AriaText>
      )}
      <AriaFieldError className="text-xs text-red-400">
        {errorMessage}
      </AriaFieldError>
    </AriaRadioGroup>
  )
}

export interface RadioProps extends Omit<AriaRadioProps, "className" | "children"> {
  children?: ReactNode
  className?: string
}

export function Radio({ children, className, ...props }: RadioProps) {
  return (
    <AriaRadio
      className={cx(
        "group flex items-center gap-2 text-sm text-white cursor-pointer",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    >
      {({ isSelected, isFocusVisible }) => (
        <>
          <div
            className={cx(
              "flex items-center justify-center w-4 h-4 rounded-full border transition-colors duration-150 shrink-0",
              isSelected
                ? "border-[#FF3B30]"
                : "bg-white/5 border-white/20 group-hover:border-white/40",
              isFocusVisible && "ring-2 ring-[#FF3B30] ring-offset-2 ring-offset-neutral-950"
            )}
          >
            {isSelected && (
              <div className="w-2 h-2 rounded-full bg-[#FF3B30]" />
            )}
          </div>
          {children}
        </>
      )}
    </AriaRadio>
  )
}
