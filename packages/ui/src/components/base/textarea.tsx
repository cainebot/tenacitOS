"use client"

import {
  TextField as AriaTextField,
  TextArea as AriaTextArea,
  Label as AriaLabel,
  Text as AriaText,
  FieldError as AriaFieldError,
  type TextFieldProps as AriaTextFieldProps,
} from "react-aria-components"
import { cx } from "../../utils/cx"

const sizeStyles = {
  sm: "px-3 py-2 text-sm min-h-[80px]",
  md: "px-3.5 py-2.5 text-sm min-h-[120px]",
} as const

export type TextAreaSize = keyof typeof sizeStyles

export interface TextAreaProps extends Omit<AriaTextFieldProps, "className"> {
  label?: string
  description?: string
  errorMessage?: string | ((validation: { isInvalid: boolean; validationErrors: string[] }) => string)
  size?: TextAreaSize
  placeholder?: string
  className?: string
  textAreaClassName?: string
  rows?: number
}

export function TextArea({
  label,
  description,
  errorMessage,
  size = "md",
  placeholder,
  className,
  textAreaClassName,
  rows,
  ...props
}: TextAreaProps) {
  return (
    <AriaTextField
      className={cx("flex flex-col gap-1.5", className)}
      {...props}
    >
      {label && (
        <AriaLabel className="text-sm font-medium text-neutral-300">
          {label}
        </AriaLabel>
      )}
      <AriaTextArea
        placeholder={placeholder}
        rows={rows}
        className={cx(
          "w-full rounded-lg border bg-white/5 text-white placeholder:text-neutral-500",
          "border-white/10 transition-colors duration-150 resize-y",
          "hover:border-white/20",
          "focus:border-[#FF3B30] focus:outline-none focus:ring-1 focus:ring-[#FF3B30]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "invalid:border-red-500 invalid:focus:ring-red-500",
          sizeStyles[size],
          textAreaClassName
        )}
      />
      {description && (
        <AriaText slot="description" className="text-xs text-neutral-500">
          {description}
        </AriaText>
      )}
      <AriaFieldError className="text-xs text-red-400">
        {errorMessage}
      </AriaFieldError>
    </AriaTextField>
  )
}
