import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "brand" | "informative" | "positive" | "warning" | "critical";
export type BadgeVariant = "weak" | "outline" | "solid";
export type BadgeSize = "medium" | "large";

/**
 * SEED 스타일 Badge — 상태/카테고리 표시용.
 * - tone: 의미(색), variant: 강조도(weak/outline/solid), size: medium/large
 * - Weak: 반복되는 목록·카테고리·상태 표시에 권장 (SEED 가이드)
 */
export function Badge({
  tone = "neutral",
  variant = "weak",
  size = "medium",
  children,
  className = "",
}: {
  tone?: BadgeTone;
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`badge badge-tone-${tone} badge-variant-${variant} badge-size-${size} ${className}`}>
      {children}
    </span>
  );
}
