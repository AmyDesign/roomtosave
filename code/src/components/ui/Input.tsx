import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  prefix?: string;
}

/*
 * The prefix ("$") sits inside the field rather than in its own bordered box --
 * one outline per field, not two. Amounts are right-aligned and tabular so a
 * column of them lines up digit-for-digit; a wrong order of magnitude then
 * shows up as a ragged edge instead of hiding in plain sight.
 */
export const Input = forwardRef<HTMLInputElement, Props>(
  ({ className, prefix, ...rest }, ref) => {
    if (prefix) {
      return (
        <div
          className={cn(
            "flex items-center h-9 rounded-control border border-line-strong bg-surface",
            "focus-within:border-accent transition-colors",
            className,
          )}
        >
          <span className="pl-2.5 pr-1 text-label text-ink-muted select-none">
            {prefix}
          </span>
          <input
            ref={ref}
            className="flex-1 min-w-0 w-full pr-2.5 text-body text-ink bg-transparent outline-none text-right"
            {...rest}
          />
        </div>
      );
    }
    return (
      <input
        ref={ref}
        className={cn(
          "h-9 w-full px-2.5 text-body text-ink rounded-control border border-line-strong bg-surface",
          "focus:border-accent outline-none transition-colors",
          className,
        )}
        {...rest}
      />
    );
  },
);
Input.displayName = "Input";
