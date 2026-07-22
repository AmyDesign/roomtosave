/**
 * SUPERSEDED — use `SelectField` in ui/BoxField.tsx, which matches the 54px
 * control height used everywhere else. Unreferenced; safe to delete.
 */

import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface Props
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  options: Option[];
}

export const Select = forwardRef<HTMLSelectElement, Props>(
  ({ className, options, ...rest }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "h-9 w-full px-2.5 text-body text-ink rounded-control border border-line-strong bg-surface",
          "focus:border-accent outline-none transition-colors",
          className,
        )}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  },
);
Select.displayName = "Select";
