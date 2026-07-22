"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { useFormStore, STEPS } from "@/store/useFormStore";
import { Progress, type ProgressStep } from "@/components/ui/Progress";

export function WizardLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const step = useFormStore((s) => s.step);
  const setStep = useFormStore((s) => s.setStep);
  const current = STEPS.indexOf(step);

  const steps: ProgressStep[] = STEPS.map((s) => ({
    name: t(`wizard.steps.${s}`),
    hint: t(`wizard.stepHints.${s}`),
  }));

  return (
    <div>
      <Progress
        steps={steps}
        current={current}
        onJump={(i) => setStep(STEPS[i])}
      />
      {children}
    </div>
  );
}
