/**
 * Main tax calculation entry: TaxInput -> TaxBreakdown
 */
import type { TaxInput, TaxBreakdown } from "./types";
import { getFederalConfig, getProvincialConfig } from "./data";
import { aggregateIncome } from "./income";
import { sumDeductions } from "./deductions";
import { calculateClawbacks } from "./clawbacks";
import {
  calculateFederalTaxBeforeCredits,
  getMarginalRate,
} from "./federal-tax";
import {
  calculateProvincialTaxBeforeCredits,
  calculateBasicTaxReduction,
  calculateSurtax,
  calculateHealthPremium,
  calculateLIFT,
  calculateRefundableSalesTaxCredit,
  getProvincialMarginalRate,
} from "./provincial-tax";
import {
  calculateFederalCredits,
  calculateProvincialCredits,
} from "./credits";

export function calculateTax(input: TaxInput): TaxBreakdown {
  const federalConfig = getFederalConfig(input.taxYear);
  const provincialConfig = getProvincialConfig(input.taxYear, input.province);

  // 1. Aggregate income (pass provincialConfig for QPP rate support)
  const incomeBreak = aggregateIncome(input.income, federalConfig, provincialConfig);

  // 2. Non-SBR deductions: RRSP/FHSA + CPP enhanced + SE CPP employer base
  //    + SE QPIP employer share (TICKET-031: federal line 22300 / TP-1 line 248)
  const deductions = sumDeductions(input.deductions);
  const deductionsBeforeSBR =
    deductions.total +
    incomeBreak.cppContributionEnhanced +
    incomeBreak.selfEmploymentCppDeduction +
    incomeBreak.selfEmploymentQpipDeduction;
  const netIncomeBeforeSBR = Math.max(0, incomeBreak.totalIncome - deductionsBeforeSBR);

  // 3. EI clawback (line 23200, using netIncomeBeforeSBR to avoid circular dependency)
  const clawbacks = calculateClawbacks({
    benefits: input.income.benefits,
    netIncomeBeforeSBR,
    federalConfig,
  });

  // 4. Net Income
  const netIncome = Math.max(0, netIncomeBeforeSBR - clawbacks.total);

  // 5. Taxable Income
  const taxableIncome = netIncome;

  // 6. Federal tax
  const federalTaxBeforeCredits = calculateFederalTaxBeforeCredits(taxableIncome, federalConfig);
  const federalCredits = calculateFederalCredits({
    netIncome,
    cppContributionBase: incomeBreak.cppContributionBase,
    eiPremium: incomeBreak.eiPremium,
    ppipPremium: incomeBreak.ppipPremium,
    employmentIncome: incomeBreak.employmentIncome,
    eligibleDividends: incomeBreak.eligibleDividends,
    nonEligibleDividends: incomeBreak.nonEligibleDividends,
    config: federalConfig,
  });
  const basicFederalTax = Math.max(0, federalTaxBeforeCredits - federalCredits.amount);
  // Quebec abatement: 16.5% reduction of basic federal tax (T1 line 44000)
  const federalAbatement = (provincialConfig.federalAbatementRate ?? 0) * basicFederalTax;
  const netFederalTax = basicFederalTax - federalAbatement;

  // 7. Provincial tax
  // QC uses its own net/taxable income: additional workers deduction (TP-1 line 201)
  // TICKET-035: the deduction for workers (déduction pour travailleur) is based
  // on "eligible work income", which is employment income PLUS net business
  // (self-employment) income -- not employment alone. Verified against
  // Wealthsimple 2025 QC7 (pure self-employment $50,000 still gets the full
  // $1,420). Using employmentIncome here silently denied it to the
  // self-employed and over-taxed them by up to the deduction x the QC rate.
  const qcWorkersDeduction = provincialConfig.workersDeduction
    ? Math.min(provincialConfig.workersDeduction, incomeBreak.earnedIncome)
    : 0;
  const provincialTaxableIncome = Math.max(0, taxableIncome - qcWorkersDeduction);
  const provincialTaxBeforeCredits = calculateProvincialTaxBeforeCredits(provincialTaxableIncome, provincialConfig);
  const provincialCredits = calculateProvincialCredits({
    cppContributionBase: incomeBreak.cppContributionBase,
    eiPremium: incomeBreak.eiPremium,
    ppipPremium: incomeBreak.ppipPremium,
    employmentIncome: incomeBreak.employmentIncome,
    eligibleDividends: incomeBreak.eligibleDividends,
    nonEligibleDividends: incomeBreak.nonEligibleDividends,
    config: provincialConfig,
    federalGrossUp: federalConfig.dividendGrossUp,
  });
  const provincialTaxAfterBaseCredits = Math.max(0, provincialTaxBeforeCredits - provincialCredits.baseAmount);
  const basicTaxReduction = calculateBasicTaxReduction(provincialTaxAfterBaseCredits, netIncome, provincialConfig);
  const provincialTaxAfterBasicReduction = Math.max(0, provincialTaxAfterBaseCredits - basicTaxReduction);
  const surtax = calculateSurtax(provincialTaxAfterBasicReduction, provincialConfig);
  const provincialTaxAfterSurtaxAndDTC = Math.max(0, provincialTaxAfterBasicReduction + surtax - provincialCredits.dividendTaxCredit);
  const liftCredit = calculateLIFT({ netIncome, earnedIncome: incomeBreak.employmentIncome, config: provincialConfig });
  const provincialAfterLift = Math.max(0, provincialTaxAfterSurtaxAndDTC - liftCredit);
  const healthPremium = calculateHealthPremium(provincialTaxableIncome, provincialConfig);
  // QC RAMQ drug insurance premium (TP-1 line 447), income-tested on QC net
  // income (line 275 == provincialTaxableIncome here). Single filer, Schedule K.
  //
  // The premium is $0 at or below the exemption threshold, then PHASES IN over two
  // rate tiers, capped at the annual maximum. It is NOT a cliff to the maximum --
  // that was TICKET-033 (fixed 2026-07-19).
  //
  // Rates are empirically calibrated against Wealthsimple 2024 (see quebec.test.ts
  // for the four observed points). If a year has no rate1 configured, the engine
  // falls back to the old cliff behaviour so uncalibrated years are unchanged.
  // TICKET-033: a filer covered all year by a private/group drug plan is exempt
  // from the premium entirely (Schedule K), regardless of income.
  const drugExemption = provincialConfig.drugInsurancePremiumExemption ?? 0;
  const drugMax = input.hasPrivateDrugCoverage ? 0 : (provincialConfig.drugInsurancePremium ?? 0);
  const drugExcess = Math.max(0, provincialTaxableIncome - drugExemption);
  let drugPremium = 0;
  if (drugMax > 0 && drugExcess > 0) {
    const rate1 = provincialConfig.drugInsurancePremiumRate1;
    if (rate1 === undefined) {
      drugPremium = drugMax; // uncalibrated year: legacy cliff
    } else {
      const band = provincialConfig.drugInsurancePremiumTier1Band ?? 5000;
      const rate2 = provincialConfig.drugInsurancePremiumRate2 ?? rate1;
      const tier1 = Math.min(drugExcess, band) * rate1;
      const tier2 = Math.max(0, drugExcess - band) * rate2;
      drugPremium = Math.min(drugMax, Math.round((tier1 + tier2) * 100) / 100);
    }
  }
  // TICKET-036: QC contribution to the health services fund (TP-1 line 446,
  // Schedule F). Payable on income NOT subject to source deductions, so the
  // base is total income less employment income. Pure-employment filers have a
  // base of $0 and are unaffected; QC5 (employment + $6,900 of dividends) sits
  // below threshold1 and is likewise $0, matching Wealthsimple.
  // Base = non-employment income less ONLY the contribution deductions
  // attributable to it (TP-1 line 248). General deductions -- crucially RRSP --
  // do NOT reduce it.
  //
  // Both halves of that are nailed down by real Wealthsimple data:
  //   - QC7 @ RRSP $30,238: net income falls to $16,129 yet WS still charged the
  //     full $150, so RRSP cannot be in the base.
  //   - QC9 (self-employment $80,000): line 446 = $259.20. Solving with this
  //     base gives thresholds $18,130 / $63,060 -- both round numbers, and each
  //     exactly 2.04% below the published 2026 figures ($18,500 / $64,355),
  //     i.e. one year of indexation. A gross-income base instead yields $19,817
  //     / $69,080: not round, and implying the thresholds FELL year over year.
  const hsfBase = Math.max(
    0,
    incomeBreak.totalIncome
      - incomeBreak.employmentIncome
      - incomeBreak.selfEmploymentContributionDeduction,
  );
  const hsfT1 = provincialConfig.healthServicesFundThreshold1;
  const hsfT2 = provincialConfig.healthServicesFundThreshold2;
  const hsfRate = provincialConfig.healthServicesFundRate ?? 0;
  const hsfTier1Max = provincialConfig.healthServicesFundTier1Max ?? 0;
  const hsfMax = provincialConfig.healthServicesFundMax ?? 0;
  let healthServicesFund = 0;
  if (hsfT1 !== undefined && hsfT2 !== undefined && hsfBase > hsfT1) {
    healthServicesFund =
      hsfBase <= hsfT2
        ? Math.min(hsfTier1Max, hsfRate * (hsfBase - hsfT1))
        : Math.min(hsfMax, hsfTier1Max + hsfRate * (hsfBase - hsfT2));
    healthServicesFund = Math.round(healthServicesFund * 100) / 100;
  }

  const netProvincialTax =
    provincialAfterLift + healthPremium + drugPremium + healthServicesFund;

  // 8. Refundable provincial credits
  const provincialRefundableCredits = calculateRefundableSalesTaxCredit({ netIncome, config: provincialConfig });

  // 9. Totals
  const totalTax = netFederalTax + netProvincialTax;
  const totalTaxWithheld = incomeBreak.federalTaxWithheld + incomeBreak.provincialTaxWithheld;
  const cppOverpayment = incomeBreak.cppOverpayment;
  const cppPayable = incomeBreak.selfEmploymentCppPayable;
  // Self-employed QC QPIP is payable on the return (TICKET-031), like SE QPP.
  const qpipPayable = incomeBreak.selfEmploymentQpipPayable;
  const clawbacksPayable = clawbacks.total;
  const refundOrOwing =
    totalTaxWithheld + cppOverpayment + provincialRefundableCredits - totalTax - cppPayable - qpipPayable - clawbacksPayable;

  const fedMarginalRaw = getMarginalRate(taxableIncome, federalConfig.brackets);
  // Quebec abatement also reduces the effective federal marginal rate
  const fedMarginal = fedMarginalRaw * (1 - (provincialConfig.federalAbatementRate ?? 0));
  const provMarginal = getProvincialMarginalRate(provincialTaxableIncome, provincialConfig);

  return {
    totalIncome: incomeBreak.totalIncome,
    netIncome,
    taxableIncome,
    federalTaxBeforeCredits,
    federalCredits: federalCredits.amount,
    federalAbatement,
    netFederalTax,
    provincialTaxBeforeCredits,
    provincialSurtax: surtax,
    provincialCredits: provincialCredits.amount,
    provincialBasicTaxReduction: basicTaxReduction,
    provincialLiftCredit: liftCredit,
    provincialHealthPremium: healthPremium,
    provincialDrugPremium: drugPremium,
    provincialHealthServicesFund: healthServicesFund,
    netProvincialTax,
    provincialRefundableCredits,
    totalTax,
    totalTaxWithheld,
    cppOverpayment,
    cppPayable,
    qpipPayable,
    clawbacksPayable,
    refundOrOwing,
    effectiveRate: incomeBreak.totalIncome > 0 ? totalTax / incomeBreak.totalIncome : 0,
    marginalRate: fedMarginal + provMarginal,
  };
}
