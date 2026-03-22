import type { ComponentType } from "react";

export function isReactComponent(value: unknown): value is ComponentType {
  return (
    typeof value === "function" ||
    (typeof value === "object" && value !== null && "$$typeof" in value)
  );
}
