/**
 * Golden cases - real-world regression tests
 *
 * Each case uses real user data + commercial tax software (Wealthsimple Tax / TurboTax)
 * as the authoritative baseline. Tolerance: $5 (allows rounding differences between tools).
 */
import { describe, it, expect } from "vitest";
import { calculateTax } from "../calculator";
import type { TaxInput } from "../types";

interface GoldenCase {
  name: string;
  source: string;
  input: TaxInput;
  expected: {
    totalIncome: number;
    netIncome: number;
    taxableIncome: number;
    netFederalTax: number;
    netProvincialTax: number;
    totalTax: number;
    totalTaxWithheld: number;
    cppOverpayment: number;
    cppPayable: number;
    clawbacksPayable: number;
    refundOrOwing: number;
  };
  tolerance?: number;
}

const TOLERANCE_DEFAULT = 5;

const CASES: GoldenCase[] = [
  {
    name: "ON 2024 single T4 ($67,983.35 -> owing $1,085.32)",
    source: "Real CRA assessment, verified 2026-05 (P0 baseline)",
    input: {
      taxYear: 2024, province: "ON", age: 35,
      isFirstTimeHomeBuyer: false,
      rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
      income: {
        employment: {
          gross: 67983.35, federalTaxWithheld: 10251.38,
          provincialTaxWithheld: 0, cppContribution: 3836.77,
          eiPremium: 1049.12, cppPensionableEarnings: 67983.35,
        },
      },
      deductions: { rrspContribution: 0, fhsaContribution: 0 },
    },
    expected: {
      totalIncome: 67983.35, netIncome: 67338.5, taxableIncome: 67338.5,
      netFederalTax: 7525, netProvincialTax: 3812, totalTax: 11337,
      totalTaxWithheld: 10251.38, cppOverpayment: 0, cppPayable: 0,
      clawbacksPayable: 0, refundOrOwing: -1085.32,
    },
    tolerance: 5,
  },
  {
    name: "ON 2025 T4 + non-parental EI + T5 interest (Yang)",
    source: "Wealthsimple Tax 2025 Summary, verified 2026-05-17",
    input: {
      taxYear: 2025, province: "ON", age: 30,
      isFirstTimeHomeBuyer: false,
      rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
      income: {
        employment: {
          gross: 53654.16, federalTaxWithheld: 8962.53,
          provincialTaxWithheld: 0, cppContribution: 3032.27,
          eiPremium: 879.94, cppPensionableEarnings: 53654.16,
        },
        benefits: { ei: { amount: 8268, isParental: false, taxWithheld: 944 } },
        investment: { interest: 223.46 },
      },
      deductions: { rrspContribution: 0, fhsaContribution: 0 },
    },
    expected: {
      totalIncome: 62145.62, netIncome: 61644.08, taxableIncome: 61644.08,
      netFederalTax: 6154.97, netProvincialTax: 3258.57, totalTax: 9413.54,
      totalTaxWithheld: 9906.53, cppOverpayment: 48.1, cppPayable: 0,
      clawbacksPayable: 0, refundOrOwing: 541.09,
    },
    tolerance: 5,
  },
  {
    name: "ON 2025 T4 only $50K (LIFT credit triggered -- refund $545)",
    source: "Wealthsimple Tax 2025 Test Summary, verified 2026-05-17",
    input: {
      taxYear: 2025, province: "ON", age: 35,
      isFirstTimeHomeBuyer: false,
      rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
      income: {
        employment: {
          gross: 50000, federalTaxWithheld: 7000,
          provincialTaxWithheld: 0, cppContribution: 2766.75,
          eiPremium: 820, cppPensionableEarnings: 50000,
        },
      },
      deductions: { rrspContribution: 0, fhsaContribution: 0 },
    },
    expected: {
      totalIncome: 50000, netIncome: 49535, taxableIncome: 49535,
      netFederalTax: 4177.92, netProvincialTax: 2276.9, totalTax: 6454.82,
      totalTaxWithheld: 7000, cppOverpayment: 0, cppPayable: 0,
      clawbacksPayable: 0, refundOrOwing: 545.18,
    },
    tolerance: 5,
  },
  {
    name: "ON 2025 T4 $85K + non-parental EI $5K (clawback ~$1,500, double-entry)",
    source: "WS B.xlsx Summary, verified 2026-05-17",
    input: {
      taxYear: 2025, province: "ON", age: 35,
      isFirstTimeHomeBuyer: false,
      rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
      income: {
        employment: {
          gross: 85000, federalTaxWithheld: 15500,
          provincialTaxWithheld: 0, cppContribution: 4034.1,
          eiPremium: 1077.48, cppPensionableEarnings: 71300,
        },
        benefits: { ei: { amount: 5000, isParental: false, taxWithheld: 500 } },
      },
      deductions: { rrspContribution: 0, fhsaContribution: 0 },
    },
    expected: {
      totalIncome: 90000, netIncome: 87822, taxableIncome: 87822,
      netFederalTax: 11366.15, netProvincialTax: 5749.76, totalTax: 17115.91,
      totalTaxWithheld: 16000, cppOverpayment: 0, cppPayable: 0,
      clawbacksPayable: 1500, refundOrOwing: -2615.91,
    },
    tolerance: 10,
  },
  {
    name: "BC 2025 T4 $80K + RRSP $40K (BC basic tax reduction phase-out, refund $9,935)",
    source: "Wealthsimple Tax 2025 T4 test, verified 2026-05-26 (TICKET-023)",
    input: {
      taxYear: 2025, province: "BC", age: 35,
      isFirstTimeHomeBuyer: false,
      rrspRoomAvailable: 40000, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
      income: {
        employment: {
          gross: 80000, federalTaxWithheld: 13500,
          provincialTaxWithheld: 0, cppContribution: 4034.1,
          eiPremium: 1077.48, cppPensionableEarnings: 71300,
        },
      },
      deductions: { rrspContribution: 40000, fhsaContribution: 0 },
    },
    expected: {
      totalIncome: 80000, netIncome: 39322, taxableIncome: 39322,
      netFederalTax: 2506.82, netProvincialTax: 1058.15, totalTax: 3564.97,
      totalTaxWithheld: 13500, cppOverpayment: 0, cppPayable: 0,
      clawbacksPayable: 0, refundOrOwing: 9935.03,
    },
    tolerance: 5,
  },
  {
    name: "BC 2025 T4 $70K + FHSA $8K + RRSP $35K (BC basic tax reduction fully absorbed, refund $10,367)",
    source: "Wealthsimple Tax 2025 T3 test, verified 2026-05-26 (TICKET-023)",
    input: {
      taxYear: 2025, province: "BC", age: 35,
      isFirstTimeHomeBuyer: true,
      rrspRoomAvailable: 35000, fhsaRoomAvailable: 8000, fhsaLifetimeUsed: 0,
      income: {
        employment: {
          gross: 70000, federalTaxWithheld: 11000,
          provincialTaxWithheld: 0, cppContribution: 3956.75,
          eiPremium: 1077.48, cppPensionableEarnings: 70000,
        },
      },
      deductions: { rrspContribution: 35000, fhsaContribution: 8000 },
    },
    expected: {
      totalIncome: 70000, netIncome: 26335, taxableIncome: 26335,
      netFederalTax: 633.04, netProvincialTax: 0, totalTax: 633.04,
      totalTaxWithheld: 11000, cppOverpayment: 0, cppPayable: 0,
      clawbacksPayable: 0, refundOrOwing: 10366.96,
    },
    tolerance: 5,
  },
  {
    name: "BC 2025 self-employment only $50K (CPP payable ~$5,533)",
    source: "Wealthsimple Tax 2025 Test Summary, verified 2026-05-17",
    input: {
      taxYear: 2025, province: "BC", age: 30,
      isFirstTimeHomeBuyer: false,
      rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
      income: { selfEmployment: { netIncome: 50000 } },
      deductions: { rrspContribution: 0, fhsaContribution: 0 },
    },
    expected: {
      totalIncome: 50000, netIncome: 46768.25, taxableIncome: 46768.25,
      netFederalTax: 4109, netProvincialTax: 1596, totalTax: 5705,
      totalTaxWithheld: 0, cppOverpayment: 0, cppPayable: 5533.5,
      clawbacksPayable: 0, refundOrOwing: -11238,
    },
    tolerance: 10,
  },
];

describe("Golden cases (real-world calibration)", () => {
  for (const c of CASES) {
    const tolerance = c.tolerance ?? TOLERANCE_DEFAULT;
    describe(c.name, () => {
      const result = calculateTax(c.input);

      it("source recorded", () => { expect(c.source.length).toBeGreaterThan(0); });

      it(`totalIncome within +-$${tolerance}`, () => {
        expect(Math.abs(result.totalIncome - c.expected.totalIncome)).toBeLessThan(tolerance);
      });
      it(`netIncome within +-$${tolerance}`, () => {
        expect(Math.abs(result.netIncome - c.expected.netIncome)).toBeLessThan(tolerance);
      });
      it(`taxableIncome within +-$${tolerance}`, () => {
        expect(Math.abs(result.taxableIncome - c.expected.taxableIncome)).toBeLessThan(tolerance);
      });
      it(`netFederalTax within +-$${tolerance}`, () => {
        expect(Math.abs(result.netFederalTax - c.expected.netFederalTax)).toBeLessThan(tolerance);
      });
      it(`netProvincialTax within +-$${tolerance}`, () => {
        expect(Math.abs(result.netProvincialTax - c.expected.netProvincialTax)).toBeLessThan(tolerance);
      });
      it(`totalTax within +-$${tolerance}`, () => {
        expect(Math.abs(result.totalTax - c.expected.totalTax)).toBeLessThan(tolerance);
      });
      it(`totalTaxWithheld within +-$${tolerance}`, () => {
        expect(Math.abs(result.totalTaxWithheld - c.expected.totalTaxWithheld)).toBeLessThan(tolerance);
      });
      it(`cppOverpayment within +-$${tolerance}`, () => {
        expect(Math.abs(result.cppOverpayment - c.expected.cppOverpayment)).toBeLessThan(tolerance);
      });
      it(`cppPayable within +-$${tolerance}`, () => {
        expect(Math.abs(result.cppPayable - c.expected.cppPayable)).toBeLessThan(tolerance);
      });
      it(`clawbacksPayable within +-$${tolerance}`, () => {
        expect(Math.abs(result.clawbacksPayable - c.expected.clawbacksPayable)).toBeLessThan(tolerance);
      });
      it(`refundOrOwing within +-$${tolerance} (core assertion)`, () => {
        expect(Math.abs(result.refundOrOwing - c.expected.refundOrOwing)).toBeLessThan(tolerance);
      });
    });
  }
});
