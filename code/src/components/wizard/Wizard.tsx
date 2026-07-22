"use client";

import { useFormStore } from "@/store/useFormStore";
import { WizardLayout } from "./WizardLayout";
import { StepBasicInfo } from "./StepBasicInfo";
import { StepEmployment } from "./StepEmployment";
import { StepRoom } from "./StepRoom";
import { StepResults } from "./StepResults";

export function Wizard() {
  const step = useFormStore((s) => s.step);

  return (
    <WizardLayout>
      {step === "basic" && <StepBasicInfo />}
      {step === "employment" && <StepEmployment />}
      {step === "room" && <StepRoom />}
      {step === "results" && <StepResults />}
    </WizardLayout>
  );
}
