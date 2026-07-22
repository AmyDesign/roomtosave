/**
 * Tax data registry
 *
 * To add a new province/year: register here only, no business logic changes needed.
 * JSON uses "upTo": null for the top bracket; converted to Infinity on load.
 */
import type {
  FederalTaxConfig,
  ProvincialTaxConfig,
  ProvinceCode,
  TaxBracket,
  TaxYear,
} from "../types";

import federal2024 from "./2024/federal.json";
import bc2024 from "./2024/bc.json";
import ontario2024 from "./2024/ontario.json";
import qc2024 from "./2024/qc.json";
import federal2025 from "./2025/federal.json";
import bc2025 from "./2025/bc.json";
import ontario2025 from "./2025/ontario.json";
import qc2025 from "./2025/qc.json";

interface RawBracket {
  upTo: number | null;
  rate: number;
}

function normalizeBrackets(raw: RawBracket[]): TaxBracket[] {
  return raw.map((b) => ({
    upTo: b.upTo === null ? Number.POSITIVE_INFINITY : b.upTo,
    rate: b.rate,
  }));
}

function normalizeHealthPremium(
  raw: Array<{ upTo: number | null; flat?: number; base?: number; rate?: number; from?: number; max?: number }>,
) {
  return raw.map((s) => ({ ...s, upTo: s.upTo === null ? Number.POSITIVE_INFINITY : s.upTo }));
}

function buildFederalConfig(raw: typeof federal2025, year: TaxYear): FederalTaxConfig {
  return {
    year,
    brackets: normalizeBrackets(raw.brackets as RawBracket[]),
    bpa: raw.bpa,
    canadaEmploymentAmount: raw.canadaEmploymentAmount,
    rrspMaxLimit: raw.rrspMaxLimit,
    fhsaAnnualLimit: raw.fhsaAnnualLimit,
    fhsaLifetimeLimit: raw.fhsaLifetimeLimit,
    rrspOvercontributionAllowance: raw.rrspOvercontributionAllowance,
    eiClawbackThreshold: raw.eiClawbackThreshold,
    oasClawbackThreshold: raw.oasClawbackThreshold,
    dividendGrossUp: raw.dividendGrossUp,
    dividendCreditRate: raw.dividendCreditRate,
    cppBaseRate: raw.cppBaseRate,
    cppEnhancedRate: raw.cppEnhancedRate,
    cppBasicExemption: raw.cppBasicExemption,
    cppYMPE: raw.cppYMPE,
    cppYAMPE: raw.cppYAMPE,
    cpp2Rate: raw.cpp2Rate,
  };
}

const federalConfigs: Record<TaxYear, FederalTaxConfig> = {
  2024: buildFederalConfig(federal2024 as unknown as typeof federal2025, 2024),
  2025: buildFederalConfig(federal2025, 2025),
};

const provincialConfigs: Record<TaxYear, Partial<Record<ProvinceCode, ProvincialTaxConfig>>> = {
  2024: {
    BC: {
      year: 2024, code: "BC",
      nameEn: bc2024.nameEn, nameZh: bc2024.nameZh,
      brackets: normalizeBrackets(bc2024.brackets as RawBracket[]),
      bpa: bc2024.bpa,
      basicTaxReduction: bc2024.basicTaxReduction,
      dividendCreditRate: bc2024.dividendCreditRate,
      salesTaxCredit: bc2024.salesTaxCredit,
    },
    ON: {
      year: 2024, code: "ON",
      nameEn: ontario2024.nameEn, nameZh: ontario2024.nameZh,
      brackets: normalizeBrackets(ontario2024.brackets as RawBracket[]),
      bpa: ontario2024.bpa,
      surtaxes: ontario2024.surtaxes,
      healthPremium: normalizeHealthPremium(ontario2024.healthPremium as never),
      liftCredit: ontario2024.liftCredit,
      dividendCreditRate: ontario2024.dividendCreditRate,
    },
    QC: {
      year: 2024, code: "QC",
      nameEn: qc2024.nameEn, nameZh: qc2024.nameZh,
      brackets: normalizeBrackets(qc2024.brackets as RawBracket[]),
      bpa: qc2024.bpa,
      federalAbatementRate: qc2024.federalAbatementRate,
      dividendCreditRate: qc2024.dividendCreditRate,
      pensionBaseRate: qc2024.pensionBaseRate,
      pensionEnhancedRate: qc2024.pensionEnhancedRate,
      qpipEmployeeRate: qc2024.qpipEmployeeRate,
      qpipSelfEmployedRate: qc2024.qpipSelfEmployedRate,
      qpipMaxInsurable: qc2024.qpipMaxInsurable,
      workersDeduction: qc2024.workersDeduction,
      healthServicesFundThreshold1: qc2024.healthServicesFundThreshold1,
      healthServicesFundThreshold2: qc2024.healthServicesFundThreshold2,
      healthServicesFundRate: qc2024.healthServicesFundRate,
      healthServicesFundTier1Max: qc2024.healthServicesFundTier1Max,
      healthServicesFundMax: qc2024.healthServicesFundMax,
      drugInsurancePremium: qc2024.drugInsurancePremium,
      drugInsurancePremiumExemption: qc2024.drugInsurancePremiumExemption,
      drugInsurancePremiumRate1: qc2024.drugInsurancePremiumRate1,
      drugInsurancePremiumRate2: qc2024.drugInsurancePremiumRate2,
      drugInsurancePremiumTier1Band: qc2024.drugInsurancePremiumTier1Band,
      creditsOnlyBPA: qc2024.creditsOnlyBPA,
    },
  },
  2025: {
    BC: {
      year: 2025, code: "BC",
      nameEn: bc2025.nameEn, nameZh: bc2025.nameZh,
      brackets: normalizeBrackets(bc2025.brackets as RawBracket[]),
      bpa: bc2025.bpa,
      basicTaxReduction: bc2025.basicTaxReduction,
      dividendCreditRate: bc2025.dividendCreditRate,
      salesTaxCredit: bc2025.salesTaxCredit,
    },
    ON: {
      year: 2025, code: "ON",
      nameEn: ontario2025.nameEn, nameZh: ontario2025.nameZh,
      brackets: normalizeBrackets(ontario2025.brackets as RawBracket[]),
      bpa: ontario2025.bpa,
      surtaxes: ontario2025.surtaxes,
      healthPremium: normalizeHealthPremium(ontario2025.healthPremium as never),
      liftCredit: ontario2025.liftCredit,
      dividendCreditRate: ontario2025.dividendCreditRate,
    },
    QC: {
      year: 2025, code: "QC",
      nameEn: qc2025.nameEn, nameZh: qc2025.nameZh,
      brackets: normalizeBrackets(qc2025.brackets as RawBracket[]),
      bpa: qc2025.bpa,
      federalAbatementRate: qc2025.federalAbatementRate,
      dividendCreditRate: qc2025.dividendCreditRate,
      pensionBaseRate: qc2025.pensionBaseRate,
      pensionEnhancedRate: qc2025.pensionEnhancedRate,
      qpipEmployeeRate: qc2025.qpipEmployeeRate,
      qpipSelfEmployedRate: qc2025.qpipSelfEmployedRate,
      qpipMaxInsurable: qc2025.qpipMaxInsurable,
      workersDeduction: qc2025.workersDeduction,
      healthServicesFundThreshold1: qc2025.healthServicesFundThreshold1,
      healthServicesFundThreshold2: qc2025.healthServicesFundThreshold2,
      healthServicesFundRate: qc2025.healthServicesFundRate,
      healthServicesFundTier1Max: qc2025.healthServicesFundTier1Max,
      healthServicesFundMax: qc2025.healthServicesFundMax,
      drugInsurancePremium: qc2025.drugInsurancePremium,
      drugInsurancePremiumExemption: qc2025.drugInsurancePremiumExemption,
      drugInsurancePremiumRate1: qc2025.drugInsurancePremiumRate1,
      drugInsurancePremiumRate2: qc2025.drugInsurancePremiumRate2,
      drugInsurancePremiumTier1Band: qc2025.drugInsurancePremiumTier1Band,
      creditsOnlyBPA: qc2025.creditsOnlyBPA,
    },
  },
};

export function getFederalConfig(year: TaxYear): FederalTaxConfig {
  const config = federalConfigs[year];
  if (!config) throw new Error(`Federal tax config not available for year ${year}`);
  return config;
}

export function getProvincialConfig(year: TaxYear, province: ProvinceCode): ProvincialTaxConfig {
  const config = provincialConfigs[year]?.[province];
  if (!config) throw new Error(`Provincial tax config not available for ${province} in ${year}`);
  return config;
}

export function getSupportedProvinces(year: TaxYear): ProvinceCode[] {
  return Object.keys(provincialConfigs[year] ?? {}) as ProvinceCode[];
}

export function getSupportedYears(): TaxYear[] {
  return Object.keys(federalConfigs).map(Number) as TaxYear[];
}
