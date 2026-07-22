/**
 * Non-refundable Tax Credits
 *
 * P0: BPA, CPP/EI premium, Canada Employment Amount
 * P1: Dividend Tax Credit (DTC) for federal + provincial
 */
import type {
  FederalTaxConfig,
  ProvincialTaxConfig,
  TaxBracket,
} from "./types";
import { calculateFederalBPA } from "./federal-tax";

export interface CreditsBreakdown {
  /** Credit base for display: BPA + CPP + EI + employment amount */
  base: number;
  /** Base credit amount = base x lowest rate */
  baseAmount: number;
  /**
   * Dividend Tax Credit (DTC).
   * Federal: grossed-up x federalCreditRate; Provincial: grossed-up x provincialCreditRate.
   * Applied directly as a dollar reduction from tax (not base x rate form).
   */
  dividendTaxCredit: number;
  /** Total credits = baseAmount + dividendTaxCredit */
  amount: number;
}

function lowestRate(brackets: TaxBracket[]): number {
  return brackets[0]?.rate ?? 0;
}

/**
 * Calculate federal non-refundable credits (including DTC, P1 new).
 *
 * Federal DTC (line 40425):
 *   = grossed-up eligible dividends x federalCreditRate.eligible
 *   + grossed-up non-eligible dividends x federalCreditRate.nonEligible
 *
 * where grossed-up = actual x grossUp (1.38 / 1.15).
 * DTC is a direct dollar tax reduction (not base x lowest-rate form).
 */
export function calculateFederalCredits(params: {
  netIncome: number;
  cppContributionBase: number;
  eiPremium: number;
  ppipPremium: number;
  employmentIncome: number;
  eligibleDividends: number;
  nonEligibleDividends: number;
  config: FederalTaxConfig;
}): CreditsBreakdown {
  const {
    netIncome,
    cppContributionBase,
    eiPremium,
    ppipPremium,
    employmentIncome,
    eligibleDividends,
    nonEligibleDividends,
    config,
  } = params;

  const bpa = calculateFederalBPA(netIncome, config);
  const cppEi = cppContributionBase + eiPremium + ppipPremium;
  const employmentAmount =
    employmentIncome > 0
      ? Math.min(config.canadaEmploymentAmount, employmentIncome)
      : 0;

  const base = bpa + cppEi + employmentAmount;
  const baseAmount = base * lowestRate(config.brackets);

  // Dividend Tax Credit (line 40425) - direct dollar reduction
  const grossedUpEligible = eligibleDividends * config.dividendGrossUp.eligible;
  const grossedUpNonEligible = nonEligibleDividends * config.dividendGrossUp.nonEligible;
  const dividendTaxCredit =
    grossedUpEligible * config.dividendCreditRate.eligible +
    grossedUpNonEligible * config.dividendCreditRate.nonEligible;

  const amount = baseAmount + dividendTaxCredit;

  return { base, baseAmount, dividendTaxCredit, amount };
}

/**
 * Calculate provincial non-refundable credits (P1: BPA + CPP/EI + employment amount + DTC).
 *
 * Provincial DTC computed same way as federal but using provincial dividendCreditRate.
 * If province config lacks dividendCreditRate (unsupported province), DTC = 0.
 */
export function calculateProvincialCredits(params: {
  cppContributionBase: number;
  eiPremium: number;
  ppipPremium: number;
  employmentIncome: number;
  eligibleDividends: number;
  nonEligibleDividends: number;
  config: ProvincialTaxConfig;
  federalGrossUp: { eligible: number; nonEligible: number };
}): CreditsBreakdown {
  const {
    cppContributionBase,
    eiPremium,
    ppipPremium,
    employmentIncome,
    eligibleDividends,
    nonEligibleDividends,
    config,
    federalGrossUp,
  } = params;

  const bpa = config.bpa.base;

  // QC (TP-1): non-refundable credits include only BPA.
  // CPP/EI/PPIP/employment are NOT provincial credits in QC.
  let base: number;
  if (config.creditsOnlyBPA) {
    base = bpa;
  } else {
    const cppEi = cppContributionBase + eiPremium + ppipPremium;
    const empAmount = config.employmentAmount
      ? Math.min(config.employmentAmount, employmentIncome)
      : 0;
    base = bpa + cppEi + empAmount;
  }
  const baseAmount = base * lowestRate(config.brackets);

  // Provincial DTC (Schedule 428) - only for supported provinces
  let dividendTaxCredit = 0;
  if (config.dividendCreditRate) {
    const grossedUpEligible = eligibleDividends * federalGrossUp.eligible;
    const grossedUpNonEligible = nonEligibleDividends * federalGrossUp.nonEligible;
    dividendTaxCredit =
      grossedUpEligible * config.dividendCreditRate.eligible +
      grossedUpNonEligible * config.dividendCreditRate.nonEligible;
  }

  const amount = baseAmount + dividendTaxCredit;

  return { base, baseAmount, dividendTaxCredit, amount };
}
