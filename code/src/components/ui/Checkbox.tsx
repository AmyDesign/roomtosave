import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
  description?: ReactNode;
}

/*
 * No box around the checkbox. The old version wrapped each one in a bordered
 * card, which made a single yes/no question look as heavy as a whole section.
 */
export const Checkbox = forwardRef<HTMLInputElement, Props>(
  ({ className, label, description, id, ...rest }, ref) => {
    return (
      <label
        htmlFor={id}
        className={cn("flex items-start gap-2.5 cursor-pointer group", className)}
      >
        <input
          ref={ref}
          id={id}
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 rounded-[3px] border-line-strong text-accent focus:ring-0 focus:ring-offset-0 cursor-pointer"
          {...rest}
        />
        <span className="flex-1">
          <span className="block text-body text-ink">{label}</span>
          {description && (
            <span className="block text-label text-ink-muted mt-0.5">
              {description}
            </span>
          )}
        </span>
      </label>
    );
  },
);
Checkbox.displayName = "Checkbox";
