import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

/*
 * At most one primary button per screen. Everything else is secondary or ghost
 * -- that restraint is what keeps the single accent meaningful.
 */
const VARIANT: Record<Variant, string> = {
  primary:
    "bg-accent text-white font-medium px-6 hover:bg-accent-hover disabled:bg-line-strong disabled:cursor-not-allowed",
  secondary:
    "bg-surface text-ink border border-line-strong hover:bg-surface-sunken disabled:text-ink-muted",
  ghost:
    "bg-transparent text-ink-secondary hover:text-ink hover:bg-surface-sunken disabled:text-ink-muted",
};

const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-label",
  md: "h-10 px-5 text-body max-[640px]:h-11",
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ className, variant = "primary", size = "md", ...rest }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-control font-medium transition-colors",
          VARIANT[variant],
          SIZE[size],
          className,
        )}
        {...rest}
      />
    );
  },
);
Button.displayName = "Button";
