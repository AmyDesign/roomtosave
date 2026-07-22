import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ProvinceCode,
  StrategyPreference,
  TaxInput,
  TaxYear,
} from "@/lib/tax";

export type WizardStep = "basic" | "employment" | "room" | "results";

interface FormState {
  step: WizardStep;
  data: TaxInput;
  strategy: StrategyPreference;
  setStep: (step: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  update: <K extends keyof TaxInput>(key: K, value: TaxInput[K]) => void;
  updateIncomeEmployment: (
    patch: Partial<NonNullable<TaxInput["income"]["employment"]>>,
  ) => void;
  /** P1 TICKET-013: 通用 income 子节点合并 (EI / 自雇 / 投资 等) */
  updateIncome: (patch: Partial<TaxInput["income"]>) => void;
  updateDeductions: (patch: Partial<TaxInput["deductions"]>) => void;
  setStrategy: (s: StrategyPreference) => void;
  /** Fill a realistic return and jump to the results, so a first-time visitor
   *  sees what the tool produces without transcribing a slip first. */
  loadSample: () => void;
  reset: () => void;
}

const STEP_ORDER: WizardStep[] = ["basic", "employment", "room", "results"];

const initialData: TaxInput = {
  taxYear: 2025 as TaxYear,
  province: "BC" as ProvinceCode,
  age: 30,
  isFirstTimeHomeBuyer: false,
  hasPrivateDrugCoverage: false,
  rrspRoomAvailable: 0,
  fhsaRoomAvailable: 0,
  fhsaLifetimeUsed: 0,
  income: {
    employment: {
      gross: 0,
      federalTaxWithheld: 0,
      provincialTaxWithheld: 0,
      cppContribution: 0,
      eiPremium: 0,
    },
  },
  deductions: {
    rrspContribution: 0,
    fhsaContribution: 0,
  },
};

/*
 * The example that loads behind the "see a sample" button. An Ontario employee
 * on $68k with $22k of unused room -- the most relatable case for the widest
 * audience, and deliberately not Quebec so the first thing a visitor sees isn't
 * QPP2 and RL-1 boxes. Withholding leaves a small $329 balance owing at
 * baseline; paired with the max_refund strategy the results page opens on a
 * ~$5,500 refund, which is the tool at its most convincing. Numbers were taken
 * from the engine so the demo is internally consistent, not made up.
 */
const sampleData: TaxInput = {
  taxYear: 2025 as TaxYear,
  province: "ON" as ProvinceCode,
  age: 32,
  isFirstTimeHomeBuyer: false,
  hasPrivateDrugCoverage: false,
  rrspRoomAvailable: 22000,
  fhsaRoomAvailable: 0,
  fhsaLifetimeUsed: 0,
  income: {
    employment: {
      gross: 68000,
      federalTaxWithheld: 7000,
      provincialTaxWithheld: 3600,
      cppContribution: 3837.75,
      eiPremium: 1077.48,
      cppPensionableEarnings: 68000,
    },
  },
  deductions: {
    rrspContribution: 0,
    fhsaContribution: 0,
  },
};

export const useFormStore = create<FormState>()(
  persist(
    (set, get) => ({
      step: "basic",
      data: initialData,
      strategy: "zero_owing" as StrategyPreference,
      setStep: (step) => set({ step }),
      nextStep: () => {
        const idx = STEP_ORDER.indexOf(get().step);
        if (idx < STEP_ORDER.length - 1) set({ step: STEP_ORDER[idx + 1] });
      },
      prevStep: () => {
        const idx = STEP_ORDER.indexOf(get().step);
        if (idx > 0) set({ step: STEP_ORDER[idx - 1] });
      },
      update: (key, value) =>
        set({ data: { ...get().data, [key]: value } }),
      updateIncomeEmployment: (patch) => {
        const current = get().data;
        const employment = current.income.employment ?? {
          gross: 0,
          federalTaxWithheld: 0,
          provincialTaxWithheld: 0,
          cppContribution: 0,
          eiPremium: 0,
        };
        set({
          data: {
            ...current,
            income: {
              ...current.income,
              employment: { ...employment, ...patch },
            },
          },
        });
      },
      updateIncome: (patch) => {
        const current = get().data;
        set({
          data: {
            ...current,
            income: { ...current.income, ...patch },
          },
        });
      },
      updateDeductions: (patch) => {
        const current = get().data;
        set({
          data: {
            ...current,
            deductions: { ...current.deductions, ...patch },
          },
        });
      },
      setStrategy: (strategy) => set({ strategy }),
      loadSample: () =>
        set({
          step: "results",
          data: sampleData,
          strategy: "max_refund",
        }),
      reset: () =>
        set({ step: "basic", data: initialData, strategy: "zero_owing" }),
    }),
    {
      name: "tax-optimizer-form",
      version: 3,
    },
  ),
);

export const STEPS = STEP_ORDER;
