"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { useFormStore } from "@/store/useFormStore";
import { useI18n } from "@/i18n/I18nProvider";
import { optimize } from "@/lib/tax";
import { RecommendationCard } from "@/components/results/RecommendationCard";
import { ComparisonTable } from "@/components/results/ComparisonTable";
import { InteractiveScenario } from "@/components/results/InteractiveScenario";
import { Rationale } from "@/components/results/Rationale";
import { StrategySwitcher } from "@/components/results/StrategySwitcher";

export function StepResults() {
  const { t } = useI18n();
  const data = useFormStore((s) => s.data);
  const strategy = useFormStore((s) => s.strategy);
  const prevStep = useFormStore((s) => s.prevStep);
  const reset = useFormStore((s) => s.reset);

  const result = useMemo(
    () => optimize(data, { strategy }),
    [data, strategy],
  );

  return (
    <div className="space-y-3.5">
      <div>
        <h1 className="text-display font-medium tracking-tight">
          {t("results.title")}
        </h1>
        <p className="mt-1 text-body text-ink-secondary">{t("results.hint")}</p>
      </div>

      {/*
        Order is answer first, then the controls that change it, then the
        working. Someone who trusts the tool can stop after the first card;
        someone who doesn't can read all the way down to the line-by-line.
      */}
      <RecommendationCard result={result} />
      <StrategySwitcher />
      <InteractiveScenario input={data} result={result} />
      <Rationale
        items={result.recommendation.rationale}
        warnings={result.warnings}
      />
      <ComparisonTable baseline={result.baseline} optimized={result.optimized} />

      <div className="flex justify-between items-center pt-2">
        <Button variant="secondary" onClick={prevStep}>
          {t("results.backToEdit")}
        </Button>
        <Button variant="ghost" onClick={reset}>
          {t("wizard.reset")}
        </Button>
      </div>
    </div>
  );
}
