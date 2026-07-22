"use client";

import { cn } from "@/lib/utils";

export interface ProgressStep {
  /** Step name, e.g. "Employment income". */
  name: string;
  /** One-line hint of what the step covers. Hidden on narrow screens. */
  hint?: string;
}

interface Props {
  steps: ProgressStep[];
  /** Zero-based index of the step being worked on. */
  current: number;
  /** Called when a visited step is clicked. Omit to make the bar read-only. */
  onJump?: (index: number) => void;
}

function Check() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[54%] w-[54%]"
      aria-hidden="true"
    >
      <path d="M3.5 8.5l3 3 6-6.5" />
    </svg>
  );
}

/**
 * Where you are in the wizard.
 *
 * This is the only coloured thing on an input page, and deliberately so: with
 * everything else achromatic, blue stops being decoration and becomes the
 * answer to "how much further?".
 *
 * Sizing comes from --prog-step / --prog-dot / --prog-gap (see globals.css), so
 * a breakpoint changes one number and the connector geometry follows.
 */
export function Progress({ steps, current, onJump }: Props) {
  return (
    <ol className="progress flex items-start pt-2.5 pb-7 max-[640px]:pt-1.5 max-[640px]:pb-6">
      {steps.map((s, i) => {
        const done = i < current;
        const now = i === current;
        const clickable = !!onJump && i <= current;
        return (
          <li key={s.name} className="contents">
            {i > 0 && (
              <div
                aria-hidden="true"
                className={cn(
                  "progress-seg flex-1 h-[5px] rounded-full",
                  i <= current ? "bg-prog" : "bg-prog-track",
                )}
              />
            )}
            <div
              className="flex flex-col items-center gap-2.5 shrink-0 max-[640px]:gap-2"
              style={{ width: "var(--prog-step)" }}
            >
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onJump?.(i)}
                aria-current={now ? "step" : undefined}
                className={cn(
                  "relative z-10 flex items-center justify-center rounded-full border-2 transition-colors",
                  "h-[var(--prog-dot)] w-[var(--prog-dot)]",
                  done || now
                    ? "border-prog"
                    : "border-prog-track bg-surface",
                  done && "bg-prog text-white",
                  now && "bg-surface ring-[3px] ring-surface",
                  clickable ? "cursor-pointer" : "cursor-default",
                )}
              >
                {done && <Check />}
                {now && (
                  <span className="block h-[36%] w-[36%] rounded-full bg-prog" />
                )}
              </button>
              <span className="text-center leading-tight">
                <span
                  className={cn(
                    "block text-label font-medium max-[640px]:text-micro",
                    now
                      ? "text-ink"
                      : done
                        ? "text-ink-secondary"
                        : "text-ink-muted",
                  )}
                >
                  {s.name}
                </span>
                {s.hint && (
                  <span className="mt-0.5 block text-micro text-ink-muted/75 whitespace-nowrap max-[640px]:hidden">
                    {s.hint}
                  </span>
                )}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
