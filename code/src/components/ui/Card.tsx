/**
 * SUPERSEDED — nothing imports this any more. Every section on every page is a
 * `CollapsibleCard`. Kept only because the project isn't under version control;
 * safe to delete. Do not reach for it in new code: it has the pre-redesign
 * padding and would look wrong beside everything else.
 */

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-surface rounded-card border border-line px-7 py-6",
        className,
      )}
      {...rest}
    />
  );
}

export function CardTitle({
  className,
  ...rest
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn("text-title font-medium text-ink", className)} {...rest} />
  );
}

export function CardDescription({
  className,
  ...rest
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-label text-ink-secondary", className)} {...rest} />
  );
}

/**
 * A small label sitting above a group of rows. Sentence case, never uppercase --
 * uppercase micro-labels read as decoration, which is what we're avoiding.
 */
export function SectionLabel({
  className,
  ...rest
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-micro text-ink-muted mb-2", className)} {...rest} />
  );
}
