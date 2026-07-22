"use client";

import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import { useI18n } from "@/i18n/I18nProvider";
import { cn, formatCAD, formatPercent, snapNearZero } from "@/lib/utils";
import type { TaxBreakdown } from "@/lib/tax";

interface Props {
  baseline: TaxBreakdown;
  optimized: TaxBreakdown;
}

export function ComparisonTable({ baseline, optimized }: Props) {
  const { t, locale } = useI18n();

  const rows: Array<{ key: string; baseline: string; optimized: string }> = [
    {
      key: t("results.comparison.totalIncome"),
      baseline: formatCAD(baseline.totalIncome, locale),
      optimized: formatCAD(optimized.totalIncome, locale),
    },
    {
      key: t("results.comparison.taxableIncome"),
      baseline: formatCAD(baseline.taxableIncome, locale),
      optimized: formatCAD(optimized.taxableIncome, locale),
    },
    {
      key: t("results.comparison.federalTax"),
      baseline: formatCAD(baseline.netFederalTax, locale),
      optimized: formatCAD(optimized.netFederalTax, locale),
    },
    {
      key: t("results.comparison.provincialTax"),
      baseline: formatCAD(baseline.netProvincialTax, locale),
      optimized: formatCAD(optimized.netProvincialTax, locale),
    },
    {
      key: t("results.comparison.totalTax"),
      baseline: formatCAD(baseline.totalTax, locale),
      optimized: formatCAD(optimized.totalTax, locale),
    },
    {
      key: t("results.comparison.effectiveRate"),
      baseline: formatPercent(baseline.effectiveRate),
      optimized: formatPercent(optimized.effectiveRate),
    },
    {
      key: t("results.comparison.marginalRate"),
      baseline: formatPercent(baseline.marginalRate),
      optimized: formatPercent(optimized.marginalRate),
    },
    {
      key: t("results.comparison.refundOrOwing"),
      // TICKET-022: |amount| < $1 snap 到 $0 — 跟 RecommendationCard / InteractiveScenario
      // 保持一致, 防止 "$1 refund" 假退税显示.
      baseline: formatCAD(snapNearZero(baseline.refundOrOwing), locale),
      optimized: formatCAD(snapNearZero(optimized.refundOrOwing), locale),
    },
  ];

  return (
    <CollapsibleCard
      title={t("results.comparison.header")}
      defaultOpen={false}
      bodyClassName="p-0"
    >
      <table className="w-full">
        <thead>
          <tr className="border-b border-line">
            <th className="py-2.5 pl-5 pr-3 text-left text-micro font-normal text-ink-muted">
              {t("results.comparison.item")}
            </th>
            <th className="py-2.5 px-3 text-right text-micro font-normal text-ink-muted">
              {t("results.baseline")}
            </th>
            <th className="py-2.5 pl-3 pr-5 text-right text-micro font-normal text-ink-muted">
              {t("results.optimized")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const isLast = i === rows.length - 1;
            return (
              <tr
                key={r.key}
                className={cn(
                  "border-b border-line last:border-b-0",
                  isLast && "border-t border-line-strong",
                )}
              >
                <td
                  className={cn(
                    "py-2.5 pl-5 pr-3 text-label text-ink-secondary",
                    isLast && "font-medium text-ink",
                  )}
                >
                  {r.key}
                </td>
                <td
                  className={cn(
                    "py-2.5 px-3 text-right text-label text-ink-secondary tabular",
                    isLast && "font-medium text-ink",
                  )}
                >
                  {r.baseline}
                </td>
                <td
                  className={cn(
                    "py-2.5 pl-3 pr-5 text-right text-label text-ink tabular",
                    isLast && "font-medium",
                  )}
                >
                  {r.optimized}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </CollapsibleCard>
  );
}
