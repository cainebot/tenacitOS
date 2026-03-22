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
        <AriaLabel className="text-sm font-medium text-secondary">
          {label}
        </AriaLabel>
      )}
      <div className="flex flex-col gap-2">{children}</div>
      {description && (
        <AriaText slot="description" className="text-xs text-quaternary">
          {description}
        </AriaText>
      )}
      <AriaFieldError className="text-xs text-error-600">
        {errorMessage}
      </AriaFieldError>
    </AriaRadioGroup>
  )
}

export interface RadioProps extends Omit<AriaRadioProps, "className" | "children"> {
  label?: string
  hint?: string
  children?: ReactNode
  className?: string
}

export function Radio({ label, hint, children, className, ...props }: RadioProps) {
  return (
    <AriaRadio
      className={cx(
        "group flex items-center gap-2 text-sm text-primary cursor-pointer",
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
                ? "border-brand-600"
                : "bg-secondary border-secondary group-hover:border-primary",
              isFocusVisible && "ring-2 ring-brand-600 ring-offset-2 ring-offset-gray-50"
            )}
          >
            {isSelected && (
              <div className="w-2 h-2 rounded-full bg-brand-600" />
            )}
          </div>
          {label ? (
            <div className="flex flex-col">
              <span className="text-sm font-medium text-primary">{label}</span>
              {hint && <span className="text-xs text-tertiary">{hint}</span>}
            </div>
          ) : (
            children
          )}
        </>
      )}
    </AriaRadio>
  )
}
