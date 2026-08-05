"use client";

import { useId, useState, type ReactNode } from "react";
import { NumberInput } from "./NumberInput";
import { cn } from "@/lib/utils";

/** Shared by every control on a form page, so heights never disagree. */
const CONTROL =
  "h-full w-full rounded-control border border-line-strong bg-surface " +
  "outline-none transition-colors " +
  "hover:border-ink-muted focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-bg)]";

/**
 * A field carries its explanation on two levels:
 *
 *   hint — one short line, always on screen. Answers only "where do I get this
 *          number, and what if I don't have one". Someone who has never filed a
 *          return should be able to fill the page from these alone.
 *   help — the full explanation, behind a "?". Rates, gross-ups, edge cases:
 *          true but not needed to type a number in.
 *
 * The help used to be a `title` attribute. A native tooltip needs a hover, so
 * on a phone it does not exist at all, and on a desktop you have to already
 * suspect there is something to read. Everything written for this page was
 * invisible in practice. A disclosure costs a line of markup and is reachable
 * by touch, keyboard, and screen reader.
 */
export function Field({
  label,
  hint,
  help,
  children,
  className,
}: {
  label: ReactNode;
  hint?: string;
  help?: string;
  children: ReactNode;
  className?: string;
}) {
  const [showHelp, setShowHelp] = useState(false);
  const helpId = useId();

  return (
    <div className={cn("min-w-0", className)}>
      <div className="mb-1.5 flex items-baseline gap-1.5">
        <label className="min-w-0 flex-1 block text-label text-ink-secondary truncate">
          {label}
        </label>
        {help && (
          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            aria-expanded={showHelp}
            aria-controls={helpId}
            aria-label={
              typeof label === "string" ? `More about ${label}` : "More"
            }
            className={cn(
              "shrink-0 h-[18px] w-[18px] rounded-full leading-none",
              "border text-micro transition-colors",
              showHelp
                ? "border-accent bg-accent text-white"
                : "border-line-strong text-ink-muted hover:border-ink-muted hover:text-ink-secondary",
            )}
          >
            ?
          </button>
        )}
      </div>

      <div className="flex items-stretch gap-2 h-[54px] max-[640px]:h-[50px]">
        {children}
      </div>

      {hint && (
        <p className="mt-1.5 text-micro leading-snug text-ink-muted">{hint}</p>
      )}
      {help && showHelp && (
        <p
          id={helpId}
          className={cn(
            "mt-1.5 rounded-control bg-surface-sunken px-2.5 py-2",
            "text-micro leading-relaxed text-ink-secondary",
          )}
        >
          {help}
        </p>
      )}
    </div>
  );
}

/** Badge geometry lives here once; the empty spacer has to match it exactly. */
const BADGE_BOX = "w-[54px] max-[640px]:w-[50px] shrink-0";

interface Props {
  label: ReactNode;
  /** Slip box reference -- "14", "17A", "B.B". Sits immediately left of the
   *  input so matching a number on paper to a field here is one movement. */
  boxNo?: string;
  /** One always-visible line: where this number comes from. See `Field`. */
  hint?: string;
  /** The full explanation, behind the "?". See `Field`. */
  help?: string;
  value: number;
  onValueChange: (n: number) => void;
}

/**
 * One amount from a slip.
 *
 * Layout follows the physical slip rather than form convention: the box number
 * is adjacent to its input, not tucked into the label. Research on dense
 * data-entry forms points the same way -- proximity between the identifier and
 * the field beats label placement.
 *
 * A field with no box number gets no badge and no placeholder for one: its
 * input runs the full width, flush with the label and the hint beneath it.
 * Reserving the column instead only indents the input away from everything
 * else in its own field, which reads as a defect rather than as alignment.
 */
export function BoxField({
  label,
  boxNo,
  hint,
  help,
  value,
  onValueChange,
}: Props) {
  return (
    <Field label={label} hint={hint} help={help}>
      {boxNo && (
        <span
          aria-hidden="true"
          className={cn(
            BADGE_BOX,
            "flex items-center justify-center rounded-control",
            "bg-badge-bg border border-badge-line",
            "text-label max-[640px]:text-micro text-badge-ink tabular",
          )}
        >
          {boxNo}
        </span>
      )}
      <div className="relative flex-1 min-w-0">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-label text-ink-muted">
          $
        </span>
        <NumberInput
          value={value}
          onValueChange={onValueChange}
          min={0}
          step="0.01"
          placeholder="0.00"
          aria-label={typeof label === "string" ? label : undefined}
          className={cn(
            CONTROL,
            "pl-7 pr-3.5 text-right text-amount text-ink tabular",
            "placeholder:text-line-strong",
          )}
        />
      </div>
    </Field>
  );
}

/**
 * A non-monetary number (an age, a count). Left-aligned, because right-aligning
 * it would make it read as an amount alongside the fields that are.
 */
export function PlainNumberField({
  label,
  hint,
  help,
  value,
  onValueChange,
  suffix,
  ...rest
}: Props & { suffix?: string; min?: number; max?: number }) {
  return (
    <Field label={label} hint={hint} help={help}>
      <div className="relative flex-1 min-w-0">
        <NumberInput
          value={value}
          onValueChange={onValueChange}
          aria-label={typeof label === "string" ? label : undefined}
          className={cn(
            CONTROL,
            "px-3.5 text-amount text-ink tabular",
            suffix && "pr-12",
          )}
          {...rest}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-label text-ink-muted">
            {suffix}
          </span>
        )}
      </div>
    </Field>
  );
}

/** A choice, at the same height and weight as the fields around it. */
export function SelectField({
  label,
  hint,
  help,
  value,
  onChange,
  options,
}: {
  label: ReactNode;
  hint?: string;
  help?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Field label={label} hint={hint} help={help}>
      <div className="relative flex-1 min-w-0">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={typeof label === "string" ? label : undefined}
          className={cn(
            CONTROL,
            "appearance-none cursor-pointer pl-3.5 pr-10 text-body text-ink",
          )}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </div>
    </Field>
  );
}

/**
 * Fields laid out in two columns that read DOWN each column, so the sequence of
 * box numbers stays intact. A row-major grid would zig-zag (14 -> 17, back to
 * 17A) which is exactly the order you are not following on the slip.
 *
 * Collapses to a single column below 640px; DOM order is already sequential so
 * the numbers stay in order there too.
 */
export function BoxGrid({
  rows,
  single,
  children,
}: {
  /** Number of rows before wrapping to the second column. */
  rows: number;
  /** A lone field keeps half-width rather than stretching across both columns. */
  single?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn("box-grid", single && "box-grid--single")}
      style={{ "--rows": rows } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

/**
 * Plain row-major grid for pages that aren't transcribing a slip -- there is no
 * box-number sequence to preserve, so reading across is the natural order.
 */
export function FieldGrid({
  cols = 2,
  children,
}: {
  cols?: 2 | 3;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid gap-4 max-[640px]:gap-3.5 max-[640px]:grid-cols-1",
        cols === 3
          ? "grid-cols-3 max-[760px]:grid-cols-2"
          : "grid-cols-2",
      )}
    >
      {children}
    </div>
  );
}
