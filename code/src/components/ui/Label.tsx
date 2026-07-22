/**
 * SUPERSEDED — labels now come from `Field` in ui/BoxField.tsx, which owns the
 * label + control-height pairing. Unreferenced; safe to delete.
 */

import type { LabelHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props extends LabelHTMLAttributes<HTMLLabelElement> {
  help?: ReactNode;
}

export function Label({ className, children, help, ...rest }: Props) {
  return (
    <label className={cn("block text-label text-ink mb-1.5", className)} {...rest}>
      <span className="flex items-center gap-2">
        <span>{children}</span>
        {help && <span className="text-micro text-ink-muted">{help}</span>}
      </span>
    </label>
  );
}
