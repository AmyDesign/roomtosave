"use client";

/**
 * 互动调节器 (TICKET-005)
 *
 * 用户用滑块/数字输入框调整供款金额, 即时看到对应的退税/补税/边际税率/剩余额度。
 * 左边永远显示推荐方案, 右边显示用户自定义方案。
 *
 * P1 - TICKET-010: 推荐侧 subtitle 跟随当前策略变化。
 */

import { useMemo, useState } from "react";
import { BoxField, FieldGrid } from "@/components/ui/BoxField";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import { useI18n } from "@/i18n/I18nProvider";
import { cn, formatCAD, formatPercent, snapNearZero } from "@/lib/utils";
import { calculateScenario, splitContribution } from "@/lib/tax";
import type { OptimizationResult, TaxInput } from "@/lib/tax";

const SLIDER_STEP = 50;

interface Props {
  input: TaxInput;
  result: OptimizationResult;
}

export function InteractiveScenario({ input, result }: Props) {
  const { t, locale } = useI18n();
  const totalRoom = result.room.total;
  const fhsaRoom = result.room.fhsa;
  const rrspRoom = result.room.rrsp;
  const recommended = result.recommendation.totalContribution;

  const [userTotal, setUserTotal] = useState<number>(recommended);

  // Clamp inside [0, totalRoom] for safety
  const clampedUser = Math.min(Math.max(0, userTotal), totalRoom);

  const userScenario = useMemo(
    () => calculateScenario(input, clampedUser, fhsaRoom, rrspRoom),
    [input, clampedUser, fhsaRoom, rrspRoom],
  );

  const userSplit = useMemo(
    () =>
      splitContribution(
        clampedUser,
        fhsaRoom,
        rrspRoom,
        input.isFirstTimeHomeBuyer,
      ),
    [clampedUser, fhsaRoom, rrspRoom, input.isFirstTimeHomeBuyer],
  );

  if (totalRoom <= 0) return null;

  return (
    <CollapsibleCard title={t("interactive.title")}>
      <p className="-mt-1 mb-4 text-label leading-relaxed text-ink-secondary">
        {t("interactive.description")}
      </p>

      <FieldGrid>
        <BoxField
          label={t("interactive.contribution")}
          value={clampedUser}
          onValueChange={setUserTotal}
        />
      </FieldGrid>

      {/* The slider is the fast control and the field is the precise one; they
          drive the same number, so they sit together rather than in separate
          groups. */}
      <input
        type="range"
        min={0}
        max={totalRoom}
        step={SLIDER_STEP}
        value={clampedUser}
        onChange={(e) => setUserTotal(Number(e.target.value))}
        className="mt-4 w-full cursor-pointer [accent-color:var(--prog)]"
        aria-label={t("interactive.sliderLabel")}
      />
      <div className="mt-1 flex items-center justify-between gap-3 text-micro text-ink-muted tabular">
        <span>{formatCAD(0, locale)}</span>
        <button
          type="button"
          onClick={() => setUserTotal(recommended)}
          disabled={clampedUser === recommended}
          className={cn(
            "text-label underline underline-offset-2 decoration-line-strong transition-colors",
            clampedUser === recommended
              ? "invisible"
              : "text-ink-secondary hover:text-ink",
          )}
        >
          {t("interactive.reset")}
        </button>
        <span>{formatCAD(totalRoom, locale)}</span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3.5 max-[640px]:grid-cols-1">
        <ScenarioPanel
          title={t("interactive.recommendedScenario")}
          subtitle={t(
            `interactive.recommendedSubtitle.${result.recommendation.preference}`,
          )}
          totalContribution={recommended}
          fhsa={result.recommendation.fhsaContribution}
          rrsp={result.recommendation.rrspContribution}
          refundOrOwing={result.recommendation.expectedRefund}
          marginalRate={result.optimized.marginalRate}
          remainingRoom={totalRoom - recommended}
          locale={locale}
          t={t}
          tone="recommended"
        />
        <ScenarioPanel
          title={t("interactive.yourScenario")}
          subtitle={
            clampedUser === recommended
              ? t("interactive.yourSubtitleSameAsRec")
              : t("interactive.yourSubtitleCustom")
          }
          totalContribution={clampedUser}
          fhsa={userSplit.fhsa}
          rrsp={userSplit.rrsp}
          refundOrOwing={userScenario.refundOrOwing}
          marginalRate={userScenario.marginalRate}
          remainingRoom={totalRoom - clampedUser}
          locale={locale}
          t={t}
          tone="user"
        />
      </div>
    </CollapsibleCard>
  );
}

interface PanelProps {
  title: string;
  subtitle: string;
  totalContribution: number;
  fhsa: number;
  rrsp: number;
  refundOrOwing: number;
  marginalRate: number;
  remainingRoom: number;
  locale: "en" | "zh";
  t: (key: string, vars?: Record<string, string | number>) => string;
  tone: "recommended" | "user";
}

function ScenarioPanel({
  title,
  subtitle,
  totalContribution,
  fhsa,
  rrsp,
  refundOrOwing,
  marginalRate,
  remainingRoom,
  locale,
  t,
  tone,
}: PanelProps) {
  // TICKET-022: (1) snap 小残值 < $1 到 0 (跟 RecommendationCard 一致, 防止 "Refund $1" 假退税);
  // (2) 解耦 label 和 color — refundOrOwing === 0 时 label 用 "Owing" (跟 zero_owing 策略名一致),
  //     但 color 用绿色 (positive 结果, $0 是目标达成).
  const displayValue = snapNearZero(refundOrOwing);
  const isRefund = displayValue > 0; // strict > 0 才叫 Refund (跟 RecommendationCard 一致)
  const refundLabel = isRefund
    ? t("interactive.refund")
    : t("interactive.owing");

  return (
    <div
      className={cn(
        "rounded-card border p-4",
        tone === "recommended"
          ? "border-line bg-surface-sunken"
          : "border-line-strong bg-surface",
      )}
    >
      <h3 className="text-body font-medium text-ink">{title}</h3>
      <p className="mt-0.5 text-micro text-ink-muted">{subtitle}</p>

      <dl className="mt-3.5 space-y-1.5">
        <Row
          label={t("interactive.contribution")}
          value={formatCAD(totalContribution, locale)}
          strong
        />
        {fhsa > 0 && (
          <Row label={t("interactive.fhsa")} value={formatCAD(fhsa, locale)} indent />
        )}
        {rrsp > 0 && (
          <Row label={t("interactive.rrsp")} value={formatCAD(rrsp, locale)} indent />
        )}

        <div className="flex items-baseline justify-between gap-2 border-t border-line pt-2.5 !mt-2.5">
          <dt className="text-label text-ink-secondary">{refundLabel}</dt>
          <dd
            className={cn(
              "text-amount font-semibold tabular",
              // >= 0 都算 positive (绿). 只有真正欠税才红.
              displayValue >= 0 ? "text-positive" : "text-negative",
            )}
          >
            {formatCAD(Math.abs(displayValue), locale)}
          </dd>
        </div>

        <Row
          label={t("interactive.marginalRate")}
          value={formatPercent(marginalRate)}
        />
        <Row
          label={t("interactive.remainingRoom")}
          value={formatCAD(remainingRoom, locale)}
        />
      </dl>
    </div>
  );
}

function Row({
  label,
  value,
  strong = false,
  indent = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  indent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt
        className={cn(
          "text-label text-ink-secondary",
          indent && "pl-3 text-micro text-ink-muted",
        )}
      >
        {label}
      </dt>
      <dd
        className={cn(
          "text-label text-ink tabular",
          strong && "font-medium",
          indent && "text-micro text-ink-muted",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
