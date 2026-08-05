/**
 * Tax engine core types
 */

export type ProvinceCode =
  | "BC"
  | "ON"
  | "AB"
  | "SK"
  | "MB"
  | "QC"
  | "NB"
  | "NS"
  | "PE"
  | "NL"
  | "YT"
  | "NT"
  | "NU";

export type TaxYear = 2024 | 2025;

export interface TaxBracket {
  upTo: number;
  rate: number;
}

export interface BPAConfig {
  base: number;
  phaseOutStart?: number;
  phaseOutEnd?: number;
  minimum?: number;
}

export interface SurtaxBracket {
  threshold: number;
  rate: number;
}

export interface HealthPremiumSegment {
  upTo: number;
  flat?: number;
  base?: number;
  rate?: number;
  from?: number;
  max?: number;
}

export interface FederalTaxConfig {
  year: TaxYear;
  brackets: TaxBracket[];
  bpa: BPAConfig;
  canadaEmploymentAmount: number;
  rrspMaxLimit: number;
  fhsaAnnualLimit: number;
  fhsaLifetimeLimit: number;
  rrspOvercontributionAllowance: number;
  eiClawbackThreshold: number;
  oasClawbackThreshold: number;
  dividendGrossUp: { eligible: number; nonEligible: number };
  dividendCreditRate: { eligible: number; nonEligible: number };
  cppBaseRate: number;
  cppEnhancedRate: number;
  cppBasicExemption: number;
  cppYMPE: number;
  /**
   * Year's Additional Maximum Pensionable Earnings — the second ceiling used by
   * CPP2/QPP2 (2024 = $73,200; 2025 = $81,200). Earnings between cppYMPE and
   * cppYAMPE attract the second additional contribution. Same for CPP and QPP.
   */
  cppYAMPE?: number;
  /**
   * CPP2/QPP2 (second additional) contribution rate — 4% for employees, doubled
   * for the self-employed. Fully DEDUCTIBLE (line 22215 / TP-1 line 248), never
   * creditable.
   */
  cpp2Rate?: number;
}

export interface LIFTConfig {
  max: number;
  phaseOutStart: number;
  phaseOutRate: number;
  minEarnedIncome: number;
}

export interface BasicTaxReductionConfig {
  maxAmount: number;
  phaseOutStart: number;
  phaseOutRate: number;
}

/**
 * Refundable provincial credit reduced by a flat rate above a net-income
 * threshold (e.g. BC Sales Tax Credit, claimed via Form BC479, reported on
 * T1 line 47900 "Provincial or territorial refundable credits"). TICKET-026.
 * Single-filer formula only -- the engine does not currently model spouses,
 * and BC's spousal threshold/amount differ (see _source in bc.json).
 */
export interface RefundableCreditConfig {
  maxAmount: number;
  phaseOutStart: number;
  phaseOutRate: number;
}

export interface ProvincialTaxConfig {
  year: TaxYear;
  code: ProvinceCode;
  nameEn: string;
  nameZh: string;
  brackets: TaxBracket[];
  bpa: BPAConfig;
  employmentAmount?: number;
  surtaxes?: SurtaxBracket[];
  healthPremium?: HealthPremiumSegment[];
  liftCredit?: LIFTConfig;
  basicTaxReduction?: BasicTaxReductionConfig;
  dividendCreditRate?: { eligible: number; nonEligible: number };
  /** Refundable provincial credit, e.g. BC Sales Tax Credit (TICKET-026). */
  salesTaxCredit?: RefundableCreditConfig;
  /** Quebec federal abatement: 16.5% reduction of basic federal tax (T1 line 44000). */
  federalAbatementRate?: number;
  /** QPP base contribution rate (employee portion, e.g. 5.40% vs CPP 4.95%). */
  pensionBaseRate?: number;
  /** QPP enhanced contribution rate (employee portion, e.g. 1.00%). */
  pensionEnhancedRate?: number;
  /** QPIP employee premium rate (e.g. 0.494%). */
  qpipEmployeeRate?: number;
  /** QPIP self-employed premium rate (e.g. 0.878%). */
  qpipSelfEmployedRate?: number;
  /** QPIP maximum insurable earnings (e.g. $98,000 for 2025). */
  qpipMaxInsurable?: number;
  /** QC-specific: workers deduction (TP-1 line 201, deduction pour travailleur). */
  workersDeduction?: number;
  /** QC-specific: RAMQ drug insurance premium for those without private coverage (TP-1 line 447). This is the MAXIMUM annual premium. */
  drugInsurancePremium?: number;
  /**
   * QC-specific: net-income (TP-1 line 275) exemption threshold for the RAMQ drug
   * premium, single filer (Schedule K situation 32). If line 275 <= this amount the
   * premium is $0; above it the premium PHASES IN (see the rate fields below) up to
   * `drugInsurancePremium`. The engine models single filers only (no spouse).
   * 2025 = $19,890; 2024 = $18,910.
   */
  drugInsurancePremiumExemption?: number;
  /**
   * QC-specific: RAMQ premium phase-in, tier 1 rate — applied to the first
   * `drugInsurancePremiumTier1Band` of net income above the exemption.
   * If this is undefined the engine falls back to the old cliff behaviour
   * (full maximum as soon as income exceeds the exemption).
   */
  drugInsurancePremiumRate1?: number;
  /** QC-specific: RAMQ premium phase-in, tier 2 rate — applied to income above the tier-1 band. */
  drugInsurancePremiumRate2?: number;
  /** QC-specific: width of the tier-1 band above the exemption (Schedule K uses $5,000). */
  drugInsurancePremiumTier1Band?: number;
  /** If true, provincial non-refundable credits include only BPA (QC does not credit CPP/EI/PPIP). */
  creditsOnlyBPA?: boolean;
  /**
   * QC-specific: contribution to the health services fund (TP-1 line 446,
   * Schedule F). Payable on income NOT subject to source deductions -- i.e.
   * total income less employment income and certain government benefits.
   *
   *   base <= threshold1              -> $0
   *   threshold1 < base <= threshold2 -> min(tier1Max, rate x (base - threshold1))
   *   base > threshold2               -> min(max, tier1Max + rate x (base - threshold2))
   *
   * Undefined for years/provinces without the contribution (then it is $0).
   */
  healthServicesFundThreshold1?: number;
  healthServicesFundThreshold2?: number;
  healthServicesFundRate?: number;
  healthServicesFundTier1Max?: number;
  healthServicesFundMax?: number;
}

export interface EmploymentIncome {
  gross: number;
  federalTaxWithheld: number;
  provincialTaxWithheld: number;
  cppContribution: number;
  eiPremium: number;
  cppPensionableEarnings?: number;
  /**
   * Second additional CPP/QPP contribution — T4 Box 16A (CPP2) / Box 17A (QPP2),
   * RL-1 Box B.B. Only non-zero when pensionable earnings exceed the YMPE.
   * Fully deductible (line 22215 / TP-1 line 248), never creditable, and kept
   * separate from `cppContribution` (T4 Box 16/17) which is base + first
   * additional only. TICKET-030.
   */
  cpp2Contribution?: number;
  /** Quebec PPIP/QPIP premium (T4 Box 55). Only for QC residents. */
  ppipPremium?: number;
}

export interface InvestmentIncome {
  interest?: number;
  eligibleDividends?: number;
  nonEligibleDividends?: number;
  foreignDividends?: { amount: number; foreignTaxPaid: number };
  capitalGains?: number;
  capitalLosses?: number;
}

export interface BenefitIncome {
  ei?: { amount: number; isParental: boolean; taxWithheld: number };
  cpp?: number;
  oas?: number;
  pension?: number;
}

export interface IncomeInput {
  employment?: EmploymentIncome;
  /**
   * `netIncome` (T2125 line 9946) is what the engine taxes. `grossIncome` and
   * `expenses` are what the form collects -- asking someone to subtract two
   * numbers themselves is asking for an arithmetic slip -- and are kept only so
   * a saved return reopens with both halves still filled in.
   */
  selfEmployment?: {
    netIncome: number;
    grossIncome?: number;
    expenses?: number;
  };
  benefits?: BenefitIncome;
  investment?: InvestmentIncome;
  rental?: { netIncome: number };
  other?: number;
}

export interface DeductionsInput {
  rrspContribution: number;
  fhsaContribution: number;
  unionDues?: number;
  childcareExpenses?: number;
  movingExpenses?: number;
  capitalLossCarryforward?: number;
  other?: number;
}

export interface TaxInput {
  taxYear: TaxYear;
  province: ProvinceCode;
  age: number;
  isFirstTimeHomeBuyer: boolean;
  rrspRoomAvailable: number;
  fhsaRoomAvailable: number;
  fhsaLifetimeUsed: number;
  income: IncomeInput;
  deductions: DeductionsInput;
  /**
   * QC only: true if the filer had basic prescription drug coverage through a
   * private/group (usually employer) plan for the whole year. Such a filer is
   * exempt from the RAMQ premium (TP-1 line 447 / Schedule K), so the premium
   * is $0 regardless of income.
   *
   * Defaults to false (covered by the public RAMQ plan, premium applies), which
   * matches Schedule K's default assumption. Ignored outside Québec.
   */
  hasPrivateDrugCoverage?: boolean;
}

export interface TaxBreakdown {
  totalIncome: number;
  netIncome: number;
  taxableIncome: number;
  federalTaxBeforeCredits: number;
  federalCredits: number;
  federalAbatement: number;
  netFederalTax: number;
  provincialTaxBeforeCredits: number;
  provincialSurtax: number;
  provincialCredits: number;
  provincialBasicTaxReduction: number;
  provincialLiftCredit: number;
  provincialHealthPremium: number;
  /** QC RAMQ drug insurance premium (TP-1 line 447). 0 for non-QC. */
  provincialDrugPremium: number;
  /** QC contribution to the health services fund (TP-1 line 446). 0 for non-QC. */
  provincialHealthServicesFund: number;
  netProvincialTax: number;
  /** Refundable provincial credits added to the refund (e.g. BC Sales Tax Credit, T1 line 47900). TICKET-026. */
  provincialRefundableCredits: number;
  totalTax: number;
  totalTaxWithheld: number;
  cppOverpayment: number;
  cppPayable: number;
  /** Self-employed QC QPIP premium payable (TP-1). 0 for employment-only / non-QC. */
  qpipPayable: number;
  clawbacksPayable: number;
  refundOrOwing: number;
  effectiveRate: number;
  marginalRate: number;
}

export type StrategyPreference = "zero_owing" | "max_refund" | "drop_bracket";

export type RecommendationStrategy =
  | "already_refund"
  | "zero_owing"
  | "room_capped"
  | "no_room"
  | "max_refund"
  | "max_refund_bpa_capped"
  | "drop_bracket"
  | "drop_bracket_capped"
  | "already_lowest_bracket"
  /** TICKET-037: trimmed back to the point where extra contributions stop helping. */
  | "diminishing_returns_capped";

export interface OptimizationResult {
  baseline: TaxBreakdown;
  optimized: TaxBreakdown;
  recommendation: {
    fhsaContribution: number;
    rrspContribution: number;
    totalContribution: number;
    expectedRefund: number;
    taxSaved: number;
    preference: StrategyPreference;
    strategy: RecommendationStrategy;
    rationale: RationaleItem[];
  };
  room: {
    total: number;
    fhsa: number;
    rrsp: number;
  };
  sensitivity: Array<{
    totalContribution: number;
    refund: number;
    marginalRate: number;
  }>;
  warnings: Warning[];
}

export interface RationaleItem {
  key: string;
  vars?: Record<string, number | string>;
}

export interface Warning {
  level: "info" | "warning" | "error";
  key: string;
  vars?: Record<string, number | string>;
}
