"use client";

import type { OptimizationResult } from "@/lib/tax";
import { useI18n } from "@/i18n/I18nProvider";
import { cn, formatCAD, snapNearZero } from "@/lib/utils";

/**
 * The answer.
 *
 * Everything else on this page supports one number, so that number gets the
 * whole top of the card at hero size and the only saturated colour on the
 * screen. The contributions that produce it sit under it as supporting detail
 * -- readable, but visibly secondary.
 */
export function RecommendationCard({ result }: { result: OptimizationResult }) {
  const { t, locale } = useI18n();
  const rec = result.recommendation;

  // TICKET-022: snap |amount| < $1 to 0 so the zero-owing strategy doesn't
  // report a $1 refund. Label and colour are decoupled: exactly $0 is "owing"
  // by label (it matches the strategy name) but still reads as a good outcome.
  const outcome = snapNearZero(rec.expectedRefund);
  const isRefund = outcome > 0;
  const isNegative = outcome < 0;

  return (
    <section className="bg-surface border border-line rounded-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 bg-accent px-[18px] py-5 text-white">
        <h2 className="text-body font-medium">{t("results.recommendation")}</h2>
        <span className="text-micro text-white/60">
          {t(`strategy.${preferenceToCamel(rec.preference)}.label`)}
        </span>
      </div>

      <div className="p-5">
        <p className="text-label text-ink-secondary">
          {isRefund ? t("results.expectedRefund") : t("results.expectedOwing")}
        </p>
        <p
          className={cn(
            "mt-0.5 text-hero font-semibold tracking-tight tabular max-[640px]:text-display",
            isNegative ? "text-negative" : "text-positive",
          )}
        >
          {formatCAD(Math.abs(outcome), locale)}
        </p>
        <p className="mt-1.5 text-label text-ink-secondary">
          {t("results.taxSaved")} · {formatCAD(rec.taxSaved, locale)}
        </p>

        <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-line pt-4 max-[520px]:grid-cols-1 max-[520px]:gap-3">
          <Stat
            label={t("results.fhsa")}
            value={formatCAD(rec.fhsaContribution, locale)}
          />
          <Stat
            label={t("results.rrsp")}
            value={formatCAD(rec.rrspContribution, locale)}
          />
          <Stat
            label={t("results.totalContribution")}
            value={formatCAD(rec.totalContribution, locale)}
            strong
          />
        </dl>
      </div>
    </section>
  );
}

function preferenceToCamel(p: string): string {
  return p.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function Stat({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="max-[520px]:flex max-[520px]:items-baseline max-[520px]:justify-between">
      <dt className="text-label text-ink-secondary">{label}</dt>
      <dd
        className={cn(
          "mt-1 text-amount text-ink tabular max-[520px]:mt-0",
          strong && "font-medium",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
