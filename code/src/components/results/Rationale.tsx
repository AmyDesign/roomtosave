"use client";

import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import { useI18n } from "@/i18n/I18nProvider";
import type { RationaleItem, Warning } from "@/lib/tax";
import { cn } from "@/lib/utils";

export function Rationale({
  items,
  warnings,
}: {
  items: RationaleItem[];
  warnings: Warning[];
}) {
  const { t } = useI18n();

  return (
    <>
      {/*
        Warnings come first and are always open. Burying a "you have over-
        contributed" line under a collapsed panel would be the one place this
        page could actually cost someone money.
      */}
      {warnings.length > 0 && (
        <CollapsibleCard
          title={t("results.warningsTitle")}
          meta={String(warnings.length)}
        >
          <ul className="space-y-2">
            {warnings.map((w, i) => (
              <li
                key={i}
                className={cn(
                  "rounded-control px-3 py-2.5 text-label leading-relaxed",
                  w.level === "error" && "bg-negative-bg text-negative-text",
                  w.level === "warning" && "bg-warning-bg text-warning-text",
                  w.level === "info" && "bg-surface-sunken text-ink-secondary",
                )}
              >
                {t(`warning.${w.key}`, w.vars)}
              </li>
            ))}
          </ul>
        </CollapsibleCard>
      )}

      <CollapsibleCard title={t("results.rationaleTitle")} defaultOpen={false}>
        <ul className="space-y-2.5">
          {items.map((item, i) => (
            <li
              key={i}
              className="flex gap-2.5 text-label leading-relaxed text-ink-secondary"
            >
              <span
                aria-hidden="true"
                className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink-muted"
              />
              <span>{t(`rationale.${item.key}`, item.vars)}</span>
            </li>
          ))}
        </ul>
      </CollapsibleCard>
    </>
  );
}
