/**
 * Income aggregation module
 *
 * P1 updates:
 *   - TICKET-013: EI benefits + self-employment (auto CPP)
 *   - TICKET-014: T4 CPP split via Box 26 pensionable earnings
 *   - Investment: interest + eligible/non-eligible dividends + capital gains
 */
import type { IncomeInput, FederalTaxConfig, ProvincialTaxConfig } from "./types";

export interface IncomeBreakdown {
  totalIncome: number;
  earnedIncome: number;
  federalTaxWithheld: number;
  provincialTaxWithheld: number;
  cppContribution: number;
  cppContributionBase: number;
  cppContributionEnhanced: number;
  selfEmploymentCppDeduction: number;
  selfEmploymentCppPayable: number;
  /** Self-employed QC QPIP premium payable on the return (TP-1). 0 for employment-only / non-QC. */
  selfEmploymentQpipPayable: number;
  /**
   * TICKET-031: the deductible share of self-employed QPIP premiums
   * (federal line 22300 / TP-1 line 248). The rest is creditable via
   * `ppipPremium` (federal line 31215).
   */
  selfEmploymentQpipDeduction: number;
  /**
   * TICKET-036: total contribution deductions attributable to self-employment
   * income (QPP base + enhanced + CPP2, plus the deductible share of QPIP) --
   * i.e. TP-1 line 248 for a pure self-employed filer. This is the amount that
   * reduces the health-services-fund base; general deductions like RRSP do not.
   */
  selfEmploymentContributionDeduction: number;
  cppOverpayment: number;
  eiPremium: number;
  employmentIncome: number;
  /**
   * Actual eligible dividends (pre gross-up) -- for DTC calculation.
   * Already included in totalIncome at x1.38.
   */
  eligibleDividends: number;
  /**
   * Actual non-eligible dividends (pre gross-up) -- for DTC calculation.
   * Already included in totalIncome at x1.15.
   */
  nonEligibleDividends: number;
  /** Quebec PPIP/QPIP premium from T4 Box 55 (or calculated for SE). 0 for non-QC. */
  ppipPremium: number;
}

function splitT4CppContribution(
  box16: number,
  pensionableEarnings: number,
  config: FederalTaxConfig,
  provincialConfig?: ProvincialTaxConfig,
): { base: number; enhanced: number; overpayment: number } {
  if (box16 <= 0) return { base: 0, enhanced: 0, overpayment: 0 };
  if (!Number.isFinite(config.cppYMPE)) {
    throw new Error(
      `Federal config missing cppYMPE for year ${config.year}`,
    );
  }
  // QPP uses different base/enhanced rates than CPP (5.40/1.00 vs 4.95/1.00)
  const baseRate = provincialConfig?.pensionBaseRate ?? config.cppBaseRate;
  const enhancedRate = provincialConfig?.pensionEnhancedRate ?? config.cppEnhancedRate;
  const cappedPensionable = Math.min(Math.max(0, pensionableEarnings), config.cppYMPE);
  const contributionBase = Math.max(0, cappedPensionable - config.cppBasicExemption);
  const requiredBase = contributionBase * baseRate;
  const requiredEnhanced = contributionBase * enhancedRate;
  const requiredTotal = requiredBase + requiredEnhanced;

  if (box16 <= requiredTotal) {
    const totalRate = baseRate + enhancedRate;
    const base = box16 * (baseRate / totalRate);
    return { base, enhanced: box16 - base, overpayment: 0 };
  }
  return { base: requiredBase, enhanced: requiredEnhanced, overpayment: box16 - requiredTotal };
}

function calculateSelfEmploymentCpp(
  netIncome: number,
  config: FederalTaxConfig,
  provincialConfig?: ProvincialTaxConfig,
): { creditBase: number; deductionBase: number; deductionEnhanced: number; totalContribution: number } {
  if (netIncome <= 0) return { creditBase: 0, deductionBase: 0, deductionEnhanced: 0, totalContribution: 0 };
  // QPP uses different base rate (5.40% vs CPP 4.95%); enhanced rate is the same (1.00%)
  const baseRate = provincialConfig?.pensionBaseRate ?? config.cppBaseRate;
  const enhancedRate = provincialConfig?.pensionEnhancedRate ?? config.cppEnhancedRate;
  const pensionable = Math.max(0, Math.min(netIncome, config.cppYMPE) - config.cppBasicExemption);
  const creditBase = pensionable * baseRate;
  const deductionBase = pensionable * baseRate;
  // TICKET-030: the self-employed pay CPP2/QPP2 at double the employee rate on
  // earnings between YMPE and YAMPE. Fully deductible, so it joins the enhanced
  // (deduction) bucket rather than the credit base.
  const deductionEnhanced =
    pensionable * enhancedRate * 2 + calculateCpp2(netIncome, config, true);
  return { creditBase, deductionBase, deductionEnhanced, totalContribution: creditBase + deductionBase + deductionEnhanced };
}

/**
 * CPP2/QPP2 — the second additional contribution (TICKET-030).
 *
 * Applies only to pensionable earnings between the YMPE and the YAMPE, at 4%
 * (doubled for the self-employed, who pay both halves). It is FULLY DEDUCTIBLE
 * (federal line 22215 / TP-1 line 248) and never creditable, so callers should
 * route the result to the deduction bucket.
 *
 *   2024: ($73,200 - $68,500) x 4%  = $188 max employee
 *   2025: ($81,200 - $71,300) x 4%  = $396 max employee
 *
 * Returns 0 for years whose config predates CPP2 (no cppYAMPE/cpp2Rate).
 */
function calculateCpp2(
  pensionableEarnings: number,
  config: FederalTaxConfig,
  selfEmployed: boolean,
): number {
  if (!config.cppYAMPE || !config.cpp2Rate) return 0;
  const band = Math.max(
    0,
    Math.min(pensionableEarnings, config.cppYAMPE) - config.cppYMPE,
  );
  return band * config.cpp2Rate * (selfEmployed ? 2 : 1);
}

function calculateSelfEmploymentQpip(
  netIncome: number,
  provincialConfig: ProvincialTaxConfig,
): number {
  if (netIncome <= 0 || !provincialConfig.qpipSelfEmployedRate || !provincialConfig.qpipMaxInsurable) return 0;
  const insurable = Math.min(netIncome, provincialConfig.qpipMaxInsurable);
  return insurable * provincialConfig.qpipSelfEmployedRate;
}

export function aggregateIncome(
  income: IncomeInput,
  federalConfig: FederalTaxConfig,
  provincialConfig?: ProvincialTaxConfig,
): IncomeBreakdown {
  let totalIncome = 0;
  let earnedIncome = 0;
  let federalTaxWithheld = 0;
  let provincialTaxWithheld = 0;
  let cppContribution = 0;
  let cppContributionBase = 0;
  let cppContributionEnhanced = 0;
  let selfEmploymentCppDeduction = 0;
  let selfEmploymentCppPayable = 0;
  let selfEmploymentQpipPayable = 0;
  let selfEmploymentQpipDeduction = 0;
  let selfEmploymentContributionDeduction = 0;
  let cppOverpayment = 0;
  let eiPremium = 0;
  let employmentIncome = 0;
  let eligibleDividends = 0;
  let nonEligibleDividends = 0;
  let ppipPremium = 0;

  // T4 employment
  if (income.employment) {
    const emp = income.employment;
    totalIncome += emp.gross;
    earnedIncome += emp.gross;
    employmentIncome += emp.gross;
    federalTaxWithheld += emp.federalTaxWithheld;
    provincialTaxWithheld += emp.provincialTaxWithheld;
    cppContribution += emp.cppContribution;
    const pensionable = emp.cppPensionableEarnings ?? emp.gross;
    const split = splitT4CppContribution(emp.cppContribution, pensionable, federalConfig, provincialConfig);
    cppContributionBase += split.base;
    cppContributionEnhanced += split.enhanced;
    cppOverpayment += split.overpayment;
    // TICKET-030: CPP2/QPP2 (T4 Box 16A/17A, RL-1 Box B.B) is reported
    // separately from Box 16/17 and is fully deductible, so it goes straight
    // into the enhanced (deduction) bucket without touching the credit base.
    //
    // Deliberately NOT auto-computed when the slip omits it. A real T4 for
    // someone over the YMPE always carries Box 16A/17A, and defaulting to 0
    // keeps the QC1/QC3/QC4 baselines (verified against WS with Box B.B left
    // empty) reproducible. `calculateCpp2` is still available and is used for
    // self-employment, where no slip exists. If we later decide UI users should
    // get CPP2 inferred from gross pay, flip this to the fallback and re-verify
    // those three cases with Box B.B filled.
    const cpp2 = emp.cpp2Contribution ?? 0;
    cppContributionEnhanced += cpp2;
    cppContribution += cpp2;
    eiPremium += emp.eiPremium;
    ppipPremium += emp.ppipPremium ?? 0;
  }

  // Self-employment (TICKET-013 + 018)
  if (income.selfEmployment) {
    const seNet = Math.max(0, income.selfEmployment.netIncome);
    totalIncome += seNet;
    earnedIncome += seNet;
    const seCpp = calculateSelfEmploymentCpp(seNet, federalConfig, provincialConfig);
    cppContributionBase += seCpp.creditBase;
    cppContributionEnhanced += seCpp.deductionEnhanced;
    selfEmploymentCppDeduction += seCpp.deductionBase;
    cppContribution += seCpp.totalContribution;
    selfEmploymentCppPayable += seCpp.totalContribution;
    // TICKET-036: track the SE-attributable deduction separately -- it is what
    // shrinks the health-services-fund base (TP-1 line 248).
    selfEmploymentContributionDeduction += seCpp.deductionBase + seCpp.deductionEnhanced;
    // Self-employed QC residents also pay QPIP. It is a premium PAYABLE on the
    // return (TP-1 line 439), and its tax relief is SPLIT two ways:
    //
    //   - federal line 22300 / TP-1 line 248 : DEDUCTION  (43.736% of premium)
    //   - federal line 31215                 : CREDIT     (56.264% of premium)
    //
    // (CRA Schedule 10.) That 43.736% is not an arbitrary constant -- it is
    // exactly 1 - qpipEmployeeRate/qpipSelfEmployedRate (1 - 0.494/0.878), i.e.
    // the "employee half" is creditable and the "employer half" is deductible,
    // mirroring how self-employed QPP is handled. Derive it from config rather
    // than hard-coding the published percentage so it stays correct if the
    // rates change.
    //
    // TICKET-031: part 1 added the payable; part 2 (this) fixes the relief,
    // which was previously credited in full and never deducted.
    if (provincialConfig) {
      const seQpip = calculateSelfEmploymentQpip(seNet, provincialConfig);
      const empRate = provincialConfig.qpipEmployeeRate;
      const seRate = provincialConfig.qpipSelfEmployedRate;
      const creditShare = empRate && seRate ? Math.min(1, empRate / seRate) : 1;
      const seQpipCredit = seQpip * creditShare;
      ppipPremium += seQpipCredit;
      selfEmploymentQpipDeduction += seQpip - seQpipCredit;
      selfEmploymentContributionDeduction += seQpip - seQpipCredit;
      selfEmploymentQpipPayable += seQpip;
    }
  }

  // Rental net income
  if (income.rental) {
    totalIncome += income.rental.netIncome;
  }

  // Benefits (TICKET-013: EI)
  if (income.benefits) {
    if (income.benefits.ei) {
      totalIncome += Math.max(0, income.benefits.ei.amount);
      federalTaxWithheld += Math.max(0, income.benefits.ei.taxWithheld);
    }
    if (income.benefits.cpp) totalIncome += income.benefits.cpp;
    if (income.benefits.oas) totalIncome += income.benefits.oas;
    if (income.benefits.pension) totalIncome += income.benefits.pension;
  }

  // Investment income (P1: interest + dividends + capital gains)
  if (income.investment) {
    const inv = income.investment;
    if (inv.interest) totalIncome += inv.interest;
    if (inv.eligibleDividends && inv.eligibleDividends > 0) {
      eligibleDividends += inv.eligibleDividends;
      totalIncome += inv.eligibleDividends * federalConfig.dividendGrossUp.eligible;
    }
    if (inv.nonEligibleDividends && inv.nonEligibleDividends > 0) {
      nonEligibleDividends += inv.nonEligibleDividends;
      totalIncome += inv.nonEligibleDividends * federalConfig.dividendGrossUp.nonEligible;
    }
    if (inv.foreignDividends) {
      totalIncome += inv.foreignDividends.amount;
    }
    if (inv.capitalGains && inv.capitalGains > 0) {
      const netGains = inv.capitalGains - Math.max(0, inv.capitalLosses ?? 0);
      if (netGains > 0) totalIncome += netGains * 0.5;
    }
  }

  if (income.other) totalIncome += income.other;

  return {
    totalIncome, earnedIncome, federalTaxWithheld, provincialTaxWithheld,
    cppContribution, cppContributionBase, cppContributionEnhanced,
    selfEmploymentCppDeduction, selfEmploymentCppPayable, selfEmploymentQpipPayable,
    selfEmploymentQpipDeduction, selfEmploymentContributionDeduction, cppOverpayment,
    eiPremium, employmentIncome, eligibleDividends, nonEligibleDividends, ppipPremium,
  };
}
