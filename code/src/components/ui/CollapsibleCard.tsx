"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  title: ReactNode;
  /** Quiet text on the right of the header -- a count, a scope, a total. */
  meta?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-3.5 w-3.5 shrink-0 transition-transform", className)}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

/**
 * A section of the form: dark header bar, collapsible body.
 *
 * The dark bar is doing real work -- it gives the page an architecture that
 * hairlines alone did not. Because the accent is achromatic it reads as
 * structure rather than as something demanding attention.
 */
export function CollapsibleCard({
  title,
  meta,
  defaultOpen = true,
  children,
  className,
  bodyClassName,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      className={cn(
        "bg-surface border border-line rounded-card overflow-hidden",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "w-full flex items-center gap-2.5 px-[18px] py-5 text-left",
          "bg-accent text-white hover:bg-accent-hover transition-colors",
        )}
      >
        <Chevron className={open ? "" : "-rotate-90"} />
        <h2 className="flex-1 text-body font-medium">{title}</h2>
        {meta && <span className="text-micro text-white/60">{meta}</span>}
      </button>
      {open && <div className={cn("p-5", bodyClassName)}>{children}</div>}
    </section>
  );
}

interface SubProps {
  title: ReactNode;
  tag?: ReactNode;
  /** Shown when collapsed so a filled-in section is visible without opening. */
  summary?: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

/**
 * A nested, optional section -- same interaction as the card above, but visually
 * quiet since it lives inside one. Using one disclosure pattern everywhere means
 * there is a single thing to learn.
 */
export function CollapsibleRow({
  title,
  tag,
  summary,
  open,
  onToggle,
  children,
}: SubProps) {
  return (
    <div className="border-t border-line first:border-t-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center gap-2.5 py-3.5 text-left text-ink hover:text-ink-secondary transition-colors"
      >
        <Chevron
          className={cn("text-ink-muted", open ? "" : "-rotate-90")}
        />
        <span className="flex-1 flex items-baseline gap-2 min-w-0">
          <span className="text-body">{title}</span>
          {tag && <span className="text-micro text-ink-muted">{tag}</span>}
        </span>
        {!open && summary && (
          <span className="text-label text-ink-muted tabular">{summary}</span>
        )}
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  );
}
