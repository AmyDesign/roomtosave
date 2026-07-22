"use client";

import { BoxField, FieldGrid } from "@/components/ui/BoxField";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import { Button } from "@/components/ui/Button";
import { useFormStore } from "@/store/useFormStore";
import { useI18n } from "@/i18n/I18nProvider";

export function StepRoom() {
  const { t } = useI18n();
  const data = useFormStore((s) => s.data);
  const update = useFormStore((s) => s.update);
  const nextStep = useFormStore((s) => s.nextStep);
  const prevStep = useFormStore((s) => s.prevStep);

  const eligible = data.isFirstTimeHomeBuyer;

  /** "1 field", not "1 fields". Chinese maps both to the same string. */
  const count = (n: number) =>
    t(n === 1 ? "employment.fieldCountOne" : "employment.fieldCount", { n });

  return (
    <div className="space-y-3.5">
      <div>
        <h1 className="text-display font-medium tracking-tight">
          {t("room.title")}
        </h1>
        <p className="mt-1 text-body text-ink-secondary">{t("room.hint")}</p>
      </div>

      <CollapsibleCard
        title={t("room.rrspSection")}
        meta={count(1)}
      >
        <FieldGrid>
          <BoxField
            label={t("room.rrspRoom")}
            help={t("room.rrspRoomHelp")}
            value={data.rrspRoomAvailable}
            onValueChange={(n) => update("rrspRoomAvailable", n)}
          />
        </FieldGrid>
      </CollapsibleCard>

      {/*
        When the filer isn't a first-time buyer these fields used to render
        greyed out, which asks the reader to work out why. Saying so is shorter
        than two disabled boxes and doesn't leave them poking at a dead control.
      */}
      <CollapsibleCard
        title={t("room.fhsaSection")}
        meta={eligible ? count(2) : ""}
      >
        {eligible ? (
          <FieldGrid>
            <BoxField
              label={t("room.fhsaRoom")}
              help={t("room.fhsaRoomHelp")}
              value={data.fhsaRoomAvailable}
              onValueChange={(n) => update("fhsaRoomAvailable", n)}
            />
            <BoxField
              label={t("room.fhsaLifetimeUsed")}
              help={t("room.fhsaLifetimeUsedHelp")}
              value={data.fhsaLifetimeUsed}
              onValueChange={(n) => update("fhsaLifetimeUsed", n)}
            />
          </FieldGrid>
        ) : (
          <p className="rounded-control bg-surface-sunken px-3 py-2.5 text-micro leading-relaxed text-ink-secondary">
            {t("room.fhsaNotEligible")}
          </p>
        )}
      </CollapsibleCard>

      <div className="flex justify-between items-center pt-2">
        <Button variant="secondary" onClick={prevStep}>
          {t("wizard.prev")}
        </Button>
        <Button onClick={nextStep}>{t("wizard.calculate")}</Button>
      </div>
    </div>
  );
}
