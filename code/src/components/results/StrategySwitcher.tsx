"use client";

/**
 * 策略切换器（P1 — TICKET-010）
 *
 * 用户在三种推荐目标间切换：
 *   - 补税归零（zero_owing）：让今年补税额降到 0
 *   - 退税最大化（max_refund）：用尽额度（但应税收入不会推过 federal BPA）
 *   - 降到下一个税阶（drop_bracket）：让 combined marginal rate 降一档
 *
 * 切换后通过 useFormStore.setStrategy 通知上层重新计算（StepResults 用 useMemo 依赖 strategy）。
 *
 * 视觉上做成分段控件而不是三张卡片：这是「同一份数据的三种看法」的开关，
 * 不是三个待选方案。分段控件把这层意思直接讲清楚，也省掉一整块高度。
 */

import { useId } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { useFormStore } from "@/store/useFormStore";
import type { StrategyPreference } from "@/lib/tax";
import { cn } from "@/lib/utils";

const STRATEGIES: ReadonlyArray<{
  key: StrategyPreference;
  labelKey: string;
  descKey: string;
}> = [
  {
    key: "zero_owing",
    labelKey: "strategy.zeroOwing.label",
    descKey: "strategy.zeroOwing.desc",
  },
  {
    key: "max_refund",
    labelKey: "strategy.maxRefund.label",
    descKey: "strategy.maxRefund.desc",
  },
  {
    key: "drop_bracket",
    labelKey: "strategy.dropBracket.label",
    descKey: "strategy.dropBracket.desc",
  },
];

export function StrategySwitcher() {
  const { t } = useI18n();
  const strategy = useFormStore((s) => s.strategy);
  const setStrategy = useFormStore((s) => s.setStrategy);
  const groupId = useId();

  const activeDescKey =
    STRATEGIES.find((s) => s.key === strategy)?.descKey ??
    "strategy.zeroOwing.desc";

  return (
    <section className="bg-surface border border-line rounded-card p-5">
      <h3 id={`${groupId}-title`} className="text-label text-ink-secondary">
        {t("strategy.title")}
      </h3>

      <div
        role="radiogroup"
        aria-labelledby={`${groupId}-title`}
        className={cn(
          "mt-2 grid grid-cols-3 gap-1 rounded-control bg-surface-sunken p-1",
          "max-[560px]:grid-cols-1",
        )}
      >
        {STRATEGIES.map((opt) => {
          const isActive = strategy === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setStrategy(opt.key)}
              className={cn(
                "rounded-[4px] px-3 py-2 text-body transition-colors",
                isActive
                  ? "bg-surface text-ink font-medium shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                  : "text-ink-secondary hover:text-ink",
              )}
            >
              {t(opt.labelKey)}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-label leading-relaxed text-ink-secondary">
        {t(activeDescKey)}
      </p>
    </section>
  );
}
