"use client";

/**
 * SUPERSEDED — replaced by `CollapsibleRow` in ui/CollapsibleCard.tsx, so the
 * whole app has one disclosure pattern rather than two. Unreferenced; safe to
 * delete.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  title: ReactNode;
  /** Shown next to the title when collapsed -- e.g. a running total, so the
   *  user can tell a section has data without expanding it. */
  summary?: ReactNode;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  /** Label for the collapsed-state action. */
  addLabel: string;
  /** Label for the expanded-state action. Clearing the section's data is the
   *  caller's job -- this component only toggles. */
  removeLabel: string;
  children: ReactNode;
  className?: string;
}

/**
 * One optional income category.
 *
 * Collapsed by default so the page shows the shape of what's available without
 * paying the height cost of every field. Most filers use one of these at most;
 * expanding all of them up front is what made the old page long.
 */
export function CollapsibleSection({
  title,
  summary,
  open,
  onOpen,
  onClose,
  addLabel,
  removeLabel,
  children,
  className,
}: Props) {
  return (
    <div className={cn("border-t border-line", className)}>
      <div className="flex items-center justify-between gap-4 py-2.5">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-body text-ink">{title}</span>
          {!open && summary && (
            <span className="text-label text-ink-muted truncate">{summary}</span>
          )}
        </div>
        <button
          type="button"
          onClick={open ? onClose : onOpen}
          className="shrink-0 text-label text-ink-secondary hover:text-ink underline underline-offset-2 decoration-line-strong transition-colors"
        >
          {open ? removeLabel : addLabel}
        </button>
      </div>
      {open && <div className="pb-3">{children}</div>}
    </div>
  );
}
