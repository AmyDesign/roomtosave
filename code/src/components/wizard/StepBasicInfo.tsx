"use client";

import {
  FieldGrid,
  PlainNumberField,
  SelectField,
} from "@/components/ui/BoxField";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { useFormStore } from "@/store/useFormStore";
import { useI18n } from "@/i18n/I18nProvider";
import { getSupportedProvinces, getSupportedYears } from "@/lib/tax";
import type { ProvinceCode, TaxYear } from "@/lib/tax";

export function StepBasicInfo() {
  const { t } = useI18n();
  const data = useFormStore((s) => s.data);
  const update = useFormStore((s) => s.update);
  const nextStep = useFormStore((s) => s.nextStep);
  const loadSample = useFormStore((s) => s.loadSample);

  const years = getSupportedYears().map((y) => ({
    value: String(y),
    label: String(y),
  }));
  const provinces = getSupportedProvinces(data.taxYear).map((p) => ({
    value: p,
    label: t(`provinces.${p}`),
  }));

  return (
    <div className="space-y-3.5">
      <div>
        <h1 className="text-display font-medium tracking-tight">
          {t("basic.title")}
        </h1>
        <p className="mt-1 text-body text-ink-secondary">{t("basic.hint")}</p>
      </div>

      <CollapsibleCard
        title={t("basic.section")}
        meta={t("employment.fieldCount", { n: 3 })}
      >
        <FieldGrid cols={3}>
          <SelectField
            label={t("basic.taxYear")}
            value={String(data.taxYear)}
            onChange={(v) => update("taxYear", Number(v) as TaxYear)}
            options={years}
          />
          <SelectField
            label={t("basic.province")}
            value={data.province}
            onChange={(v) => update("province", v as ProvinceCode)}
            options={provinces}
          />
          <PlainNumberField
            label={t("basic.age")}
            help={t("basic.ageHelp")}
            min={0}
            max={120}
            value={data.age}
            onValueChange={(n) => update("age", n)}
          />
        </FieldGrid>

        {/* TICKET-033 私人药保豁免勾选项已移至「就业收入」页，与 QPIP (Box 55)
            等其他魁省专属字段放在一起 —— 原本放在这里是唯一的魁省项目，用户找不到。 */}
        <div className="mt-5 pt-4 border-t border-line">
          <Checkbox
            id="ftb"
            checked={data.isFirstTimeHomeBuyer}
            onChange={(e) => update("isFirstTimeHomeBuyer", e.target.checked)}
            label={t("basic.firstTimeBuyer")}
            description={t("basic.firstTimeBuyerHelp")}
          />
        </div>
      </CollapsibleCard>

      {/*
        First step, so the left slot has no Back button. It holds the sample
        shortcut instead: a visitor who doesn't have a slip in front of them can
        still see what the tool does, which is most of them on a first visit.
      */}
      <div className="flex justify-between items-center pt-2">
        <Button variant="ghost" onClick={loadSample}>
          {t("basic.trySample")}
        </Button>
        <Button onClick={nextStep}>{t("wizard.next")}</Button>
      </div>
    </div>
  );
}
