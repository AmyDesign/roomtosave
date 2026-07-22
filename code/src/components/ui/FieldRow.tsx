/**
 * SUPERSEDED — the label-left/control-right row lost to `BoxField`, which puts
 * the slip's box number beside its input instead. Unreferenced; safe to delete.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  /** What the field is, in plain words. */
  label: ReactNode;
  /** Slip box reference, e.g. "Box 14". Kept visually quiet -- it's a lookup
   *  key while transcribing, not the primary meaning of the row. */
  boxNo?: ReactNode;
  /** One-line clarification shown under the label. Use sparingly: a row that
   *  needs a paragraph probably needs a different layout. */
  help?: ReactNode;
  /** The control. Given a fixed width so a column of amounts aligns. */
  children: ReactNode;
  className?: string;
}

/**
 * One row of the transcription layout: label on the left, control on the right,
 * hairline above.
 *
 * The whole point is that reading down the form mirrors reading down the slip,
 * so rows are deliberately uniform -- same height, same control width, no
 * per-row decoration competing for attention.
 */
export function FieldRow({ label, boxNo, help, children, className }: Props) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 py-2.5 border-t border-line",
        className,
      )}
    >
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-body text-ink">{label}</span>
          {boxNo && (
            <span className="text-micro text-ink-muted shrink-0">{boxNo}</span>
          )}
        </div>
        {help && (
          <p className="text-label text-ink-muted mt-0.5 pr-4">{help}</p>
        )}
      </div>
      <div className="w-[150px] shrink-0">{children}</div>
    </div>
  );
}

/**
 * Closes off a run of FieldRows. Rows carry only a top border, so without this
 * the last row has no bottom edge and the group looks unfinished.
 */
export function FieldRowGroupEnd() {
  return <div className="border-t border-line" />;
}
