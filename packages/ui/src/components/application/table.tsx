"use client"

import { type ReactNode, type HTMLAttributes, forwardRef } from "react"
import { cx } from "../../utils/cx"

export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  children: ReactNode
  className?: string
}

export const Table = forwardRef<HTMLTableElement, TableProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div className="w-full overflow-auto rounded-lg border border-white/10">
        <table
          ref={ref}
          className={cx("w-full caption-bottom text-sm", className)}
          {...props}
        >
          {children}
        </table>
      </div>
    )
  }
)
Table.displayName = "Table"

export interface TableHeaderProps
  extends HTMLAttributes<HTMLTableSectionElement> {
  children: ReactNode
  className?: string
}

export const TableHeader = forwardRef<
  HTMLTableSectionElement,
  TableHeaderProps
>(({ children, className, ...props }, ref) => {
  return (
    <thead
      ref={ref}
      className={cx("bg-white/5 [&_tr]:border-b [&_tr]:border-white/10", className)}
      {...props}
    >
      {children}
    </thead>
  )
})
TableHeader.displayName = "TableHeader"

export interface TableBodyProps
  extends HTMLAttributes<HTMLTableSectionElement> {
  children: ReactNode
  className?: string
}

export const TableBody = forwardRef<HTMLTableSectionElement, TableBodyProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <tbody
        ref={ref}
        className={cx(
          "[&_tr:nth-child(even)]:bg-white/[0.03]",
          "[&_tr:last-child]:border-0",
          className
        )}
        {...props}
      >
        {children}
      </tbody>
    )
  }
)
TableBody.displayName = "TableBody"

export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  children: ReactNode
  className?: string
}

export const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <tr
        ref={ref}
        className={cx(
          "border-b border-white/10 transition-colors hover:bg-white/5",
          className
        )}
        {...props}
      >
        {children}
      </tr>
    )
  }
)
TableRow.displayName = "TableRow"

export interface TableHeadProps
  extends HTMLAttributes<HTMLTableCellElement> {
  children?: ReactNode
  className?: string
}

export const TableHead = forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <th
        ref={ref}
        className={cx(
          "h-10 px-4 text-left align-middle text-xs font-medium uppercase tracking-wider text-white/50",
          className
        )}
        {...props}
      >
        {children}
      </th>
    )
  }
)
TableHead.displayName = "TableHead"

export interface TableCellProps
  extends HTMLAttributes<HTMLTableCellElement> {
  children?: ReactNode
  className?: string
}

export const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <td
        ref={ref}
        className={cx(
          "px-4 py-3 align-middle text-sm text-white/70",
          className
        )}
        {...props}
      >
        {children}
      </td>
    )
  }
)
TableCell.displayName = "TableCell"
