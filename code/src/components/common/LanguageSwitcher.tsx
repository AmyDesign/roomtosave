"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "en", label: "EN" },
  { value: "zh", label: "中文" },
] as const;

/**
 * Segmented switch. The selected option is a raised white pill on a sunken
 * track -- reads as "one of these two" rather than as two separate buttons.
 */
export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="inline-flex rounded-full border border-line bg-surface-sunken p-0.5">
      {OPTIONS.map((o) => {
        const on = locale === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => setLocale(o.value)}
            aria-pressed={on}
            className={cn(
              "rounded-full px-3 py-1 text-micro transition-colors",
              on
                ? "bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,0.07),0_0_0_1px_rgba(0,0,0,0.04)]"
                : "text-ink-muted hover:text-ink-secondary",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
