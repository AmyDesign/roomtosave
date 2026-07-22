/**
 * Investment income golden cases — dividend tax credit, capital gains, capital losses
 *
 * Each case is verified by running the same inputs through the engine and spot-checking
 * against manual CRA/WS calculations.  The key invariants under test are:
 *
 *   1. Gross-up is applied correctly (eligible ×1.38, non-eligible ×1.15)
 *   2. Capital gains 50% inclusion rate (losses clamped at zero net gain)
 *   3. Federal DTC reduces netFederalTax by grossedUp × rateEligible/nonEligible
 *   4. Provincial DTC reduces netProvincialTax by the same formula
 *   5. Adding eligible dividends can LOWER provincial tax in BC (DTC > gross-up tax)
 *   6. Capital losses that exceed capital gains do NOT create negative taxable income
 *
 * Tolerance: $5 (rounding differences vs manual calculation).
 * Engine output values were derived by compiling the TS engine and running Node.js
 * directly, then cross-checking key figures against CRA tax computation formulas.
 */
import { describe, it, expect } from "vitest";
import { calculateTax } from "../calculator";
import type { TaxInput } from "../types";

const TOL = 5;
const close = (actual: number, expected: number, label: string) =>
  it(`${label} within ±$${TOL}`, () =>
    expect(Math.abs(actual - expected)).toBeLessThan(TOL));

// ---------------------------------------------------------------------------
// Helper: run once per describe block
// ---------------------------------------------------------------------------
function runCase(input: TaxInput) {
  return calculateTax(input);
}

// ---------------------------------------------------------------------------
// CASE 1 — ON 2025 T4 $70K + eligible dividends $5,000
//
// Gross-up: 5,000 × 1.38 = 6,900 → totalIncome = 76,900
// Federal DTC = 6,900 × 15.0198% = $1,036.37
// Ontario DTC = 6,900 × 10%      = $690.00
// Effective rate on actual $5K div ≈ 9.4% (vs 20.5% marginal) — confirms DTC works
// ---------------------------------------------------------------------------
describe("ON 2025 T4 $70K + eligible dividends $5K", () => {
  const result = runCase({
    taxYear: 2025, province: "ON", age: 35,
    isFirstTimeHomeBuyer: false,
    rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
    income: {
      employment: {
        gross: 70000, federalTaxWithheld: 12000,
        provincialTaxWithheld: 0, cppContribution: 3956.75,
        eiPremium: 1090.62, cppPensionableEarnings: 70000,
      },
      investment: { eligibleDividends: 5000 },
    },
    deductions: { rrspContribution: 0, fhsaContribution: 0 },
  });

  // Gross-up correctness: 70,000 + 5,000×1.38 = 76,900
  close(result.totalIncome, 76900, "totalIncome (gross-up applied)");
  close(result.netFederalTax, 7961.87, "netFederalTax");
  close(result.netProvincialTax, 4002.14, "netProvincialTax");
  close(result.totalTax, 11964.01, "totalTax");
  close(result.refundOrOwing, 35.99, "refundOrOwing");

  // DTC sanity: effective tax on $5K actual dividend must be < 20.5% marginal rate
  it("effective tax on eligible dividend < 20.5% marginal (DTC benefit confirmed)", () => {
    // totalTax with dividends vs without (withheld 0 for fair comparison)
    const withoutDiv = calculateTax({
      taxYear: 2025, province: "ON", age: 35,
      isFirstTimeHomeBuyer: false,
      rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
      income: {
        employment: {
          gross: 70000, federalTaxWithheld: 0,
          provincialTaxWithheld: 0, cppContribution: 3956.75,
          eiPremium: 1090.62, cppPensionableEarnings: 70000,
        },
      },
      deductions: { rrspContribution: 0, fhsaContribution: 0 },
    });
    const withDiv = calculateTax({
      taxYear: 2025, province: "ON", age: 35,
      isFirstTimeHomeBuyer: false,
      rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
      income: {
        employment: {
          gross: 70000, federalTaxWithheld: 0,
          provincialTaxWithheld: 0, cppContribution: 3956.75,
          eiPremium: 1090.62, cppPensionableEarnings: 70000,
        },
        investment: { eligibleDividends: 5000 },
      },
      deductions: { rrspContribution: 0, fhsaContribution: 0 },
    });
    const taxIncrease = withDiv.totalTax - withoutDiv.totalTax;
    const effectiveRate = taxIncrease / 5000;
    // At 20.5% marginal, without DTC the rate would be ~28%+ (on grossed-up amount)
    // With federal+ON DTC the combined effective rate on $5K actual should be < 15%
    expect(effectiveRate).toBeLessThan(0.15);
    expect(effectiveRate).toBeGreaterThan(0); // dividends are still taxed, not free
  });
});

// ---------------------------------------------------------------------------
// CASE 2 — ON 2025 T4 $90K + non-eligible dividends $3K + capital gains $10K
//
// Non-elig gross-up: 3,000 × 1.15 = 3,450
// Capital gain inclusion: 10,000 × 50% = 5,000
// totalIncome = 90,000 + 3,450 + 5,000 = 98,450
// Federal DTC on non-elig = 3,450 × 9.0301% = $311.54
// ---------------------------------------------------------------------------
describe("ON 2025 T4 $90K + non-eligible div $3K + capital gains $10K", () => {
  const result = runCase({
    taxYear: 2025, province: "ON", age: 45,
    isFirstTimeHomeBuyer: false,
    rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
    income: {
      employment: {
        gross: 90000, federalTaxWithheld: 17000,
        provincialTaxWithheld: 0, cppContribution: 4034.10,
        eiPremium: 1090.62, cppPensionableEarnings: 71300,
      },
      investment: { nonEligibleDividends: 3000, capitalGains: 10000 },
    },
    deductions: { rrspContribution: 0, fhsaContribution: 0 },
  });

  // Non-elig gross-up + 50% cap gain inclusion: 90000 + 3450 + 5000 = 98450
  close(result.totalIncome, 98450, "totalIncome (non-elig gross-up + cap gain inclusion)");
  close(result.netFederalTax, 13092.45, "netFederalTax");
  // TICKET-025 (2026-06-06): ON surtax must be computed BEFORE the dividend
  // tax credit is deducted (Ontario Taxation Act 2007 s.19.1) — previously the
  // DTC was lumped into the surtax base, undercounting the surtax. Combined
  // with the ON non-eligible DTC rate fix (3.2863% -> 2.9863%, the correct
  // 2020-2026 rate per taxtips.ca), this scenario's WS-verified twin (D1–D5
  // sheet "D3") now matches WS to the penny: owing $2,691.56.
  close(result.netProvincialTax, 6596.41, "netProvincialTax");
  close(result.totalTax, 19688.85, "totalTax");
  close(result.refundOrOwing, -2688.85, "refundOrOwing (owing)");
});

// ---------------------------------------------------------------------------
// CASE 3 — BC 2025 T4 $60K + eligible dividends $8K + non-eligible dividends $2K
//
// Elig gross-up:    8,000 × 1.38 = 11,040
// Non-elig gross-up: 2,000 × 1.15 = 2,300
// totalIncome = 60,000 + 11,040 + 2,300 = 73,340
//
// BC provincial DTC is very generous for eligible dividends:
// BC DTC = 11,040 × 12% + 2,300 × 1.96% = 1,324.80 + 45.08 = $1,369.88
// (rate corrected by TICKET-024: BC non-eligible DTC is 1.96%, not 2.5164%)
// This EXCEEDS the BC tax on the gross-up → provincial tax goes DOWN vs no-div baseline.
// ---------------------------------------------------------------------------
describe("BC 2025 T4 $60K + eligible div $8K + non-eligible div $2K", () => {
  const result = runCase({
    taxYear: 2025, province: "BC", age: 40,
    isFirstTimeHomeBuyer: false,
    rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
    income: {
      employment: {
        gross: 60000, federalTaxWithheld: 9000,
        provincialTaxWithheld: 0, cppContribution: 3363.25,
        eiPremium: 996.00, cppPensionableEarnings: 60000,
      },
      investment: { eligibleDividends: 8000, nonEligibleDividends: 2000 },
    },
    deductions: { rrspContribution: 0, fhsaContribution: 0 },
  });

  close(result.totalIncome, 73340, "totalIncome (both gross-ups applied)");
  close(result.netFederalTax, 6508.55, "netFederalTax");
  // Updated 2026-06-06 after TICKET-024 (BC non-eligible DTC rate 2.5164% -> 1.96%).
  // BC has no surtax, so TICKET-025's surtax-ordering fix does not change this case.
  close(result.netProvincialTax, 2086.56, "netProvincialTax");
  close(result.totalTax, 8595.11, "totalTax");
  close(result.refundOrOwing, 406.39, "refundOrOwing (refund)");

  // Key property: BC provincial tax DECREASES when adding eligible dividends
  // (DTC more than offsets the gross-up tax at this income level)
  it("BC provincial tax lower with eligible dividends than without (large DTC benefit)", () => {
    const withoutDiv = calculateTax({
      taxYear: 2025, province: "BC", age: 40,
      isFirstTimeHomeBuyer: false,
      rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
      income: {
        employment: {
          gross: 60000, federalTaxWithheld: 0,
          provincialTaxWithheld: 0, cppContribution: 3363.25,
          eiPremium: 996.00, cppPensionableEarnings: 60000,
        },
      },
      deductions: { rrspContribution: 0, fhsaContribution: 0 },
    });
    expect(result.netProvincialTax).toBeLessThan(withoutDiv.netProvincialTax);
  });
});

// ---------------------------------------------------------------------------
// CASE 4 — ON 2025 investment-only: eligible div $15K + cap gains $20K - losses $5K
//
// No T4.  Tests the engine with pure investment income.
// Elig gross-up: 15,000 × 1.38 = 20,700
// Net capital gain: (20,000 − 5,000) × 50% = 7,500
// totalIncome = 0 + 20,700 + 7,500 = 28,200
//
// Income is low → federal BPA ($16,129) absorbs most federal tax.
// Ontario: health premium applies at this income level.
// ---------------------------------------------------------------------------
describe("ON 2025 investment-only: elig div $15K + cap gains $20K − losses $5K", () => {
  const result = runCase({
    taxYear: 2025, province: "ON", age: 55,
    isFirstTimeHomeBuyer: false,
    rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
    income: {
      investment: {
        eligibleDividends: 15000,
        capitalGains: 20000,
        capitalLosses: 5000,
      },
    },
    deductions: { rrspContribution: 0, fhsaContribution: 0 },
  });

  // Gross-up + net cap gain inclusion: 20700 + 7500 = 28200
  close(result.totalIncome, 28200, "totalIncome (gross-up + net cap gain 50% inclusion)");
  close(result.netFederalTax, 0, "netFederalTax (BPA + DTC fully covers tax)");
  // ON health premium at $28,200: flat $300
  close(result.netProvincialTax, 300, "netProvincialTax (health premium only)");
  close(result.totalTax, 300, "totalTax");
  close(result.refundOrOwing, -300, "refundOrOwing (nothing withheld, $300 owing)");

  it("no CPP payable (no employment or self-employment income)", () => {
    expect(result.cppPayable).toBe(0);
    expect(result.cppOverpayment).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// CASE 5 — BC 2025 T4 $50K + capital gains $5K offset by losses $8K
//
// Capital losses > capital gains → net capital gain clamped to zero.
// totalIncome = 50,000 only (same as T4-only baseline).
// taxableIncome = netIncome (no capital income added).
// ---------------------------------------------------------------------------
describe("BC 2025 T4 $50K + cap gains $5K overwhelmed by losses $8K (net gain = 0)", () => {
  const withLosses = runCase({
    taxYear: 2025, province: "BC", age: 35,
    isFirstTimeHomeBuyer: false,
    rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
    income: {
      employment: {
        gross: 50000, federalTaxWithheld: 7000,
        provincialTaxWithheld: 0, cppContribution: 2766.75,
        eiPremium: 820.00, cppPensionableEarnings: 50000,
      },
      investment: { capitalGains: 5000, capitalLosses: 8000 },
    },
    deductions: { rrspContribution: 0, fhsaContribution: 0 },
  });

  // Losses > gains → no capital income added to totalIncome
  close(withLosses.totalIncome, 50000, "totalIncome = T4 gross only (losses exceed gains)");
  close(withLosses.netFederalTax, 4177.92, "netFederalTax (same as T4-only)");
  close(withLosses.refundOrOwing, 1121.17, "refundOrOwing");

  it("capital losses > gains produces same result as no investment income", () => {
    const noInvestment = calculateTax({
      taxYear: 2025, province: "BC", age: 35,
      isFirstTimeHomeBuyer: false,
      rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
      income: {
        employment: {
          gross: 50000, federalTaxWithheld: 7000,
          provincialTaxWithheld: 0, cppContribution: 2766.75,
          eiPremium: 820.00, cppPensionableEarnings: 50000,
        },
      },
      deductions: { rrspContribution: 0, fhsaContribution: 0 },
    });
    // Should be bit-for-bit identical: losses don't create negative income
    expect(withLosses.totalIncome).toBe(noInvestment.totalIncome);
    expect(withLosses.taxableIncome).toBe(noInvestment.taxableIncome);
    expect(Math.abs(withLosses.totalTax - noInvestment.totalTax)).toBeLessThan(1);
  });
});

// ---------------------------------------------------------------------------
// CASE 6 — ON 2025 T4 $60K + interest $1,000 (no DTC, regression guard)
//
// Interest income has no gross-up and no DTC.
// totalIncome = 60,000 + 1,000 = 61,000 (straight addition, no gross-up)
// This ensures the investment income plumbing doesn't accidentally apply
// gross-up or DTC to interest.
// ---------------------------------------------------------------------------
describe("ON 2025 T4 $60K + interest $1K (no gross-up, no DTC — regression guard)", () => {
  const result = runCase({
    taxYear: 2025, province: "ON", age: 35,
    isFirstTimeHomeBuyer: false,
    rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
    income: {
      employment: {
        gross: 60000, federalTaxWithheld: 10000,
        provincialTaxWithheld: 0, cppContribution: 3363.25,
        eiPremium: 996.00, cppPensionableEarnings: 60000,
      },
      investment: { interest: 1000 },
    },
    deductions: { rrspContribution: 0, fhsaContribution: 0 },
  });

  // No gross-up: totalIncome = 60,000 + 1,000 = 61,000 exactly
  close(result.totalIncome, 61000, "totalIncome (interest = no gross-up)");
  close(result.netFederalTax, 5844.73, "netFederalTax");
  close(result.netProvincialTax, 3126.22, "netProvincialTax");
  close(result.totalTax, 8970.95, "totalTax");
  close(result.refundOrOwing, 1030.55, "refundOrOwing");

  it("CPP overpayment still calculated correctly alongside interest income", () => {
    // CPP contribution 3363.25 > max at $60K → small overpayment
    expect(result.cppOverpayment).toBeCloseTo(1.5, 0);
  });
});

// ---------------------------------------------------------------------------
// CASE 7 — ON 2025 T4 $120K + eligible dividends $10K (surtax + eligible DTC)
//
// TICKET-025 surtax-ordering regression test for ELIGIBLE dividends.
// D3 (Case 2) only tested non-eligible dividends; this case validates that
// the surtax is computed before the eligible DTC is deducted.
// Taxable income ≈ 133,122 → ON surtax both brackets triggered.
// ---------------------------------------------------------------------------
describe("ON 2025 T4 $120K + eligible div $10K (surtax + DTC regression)", () => {
  const result = runCase({
    taxYear: 2025, province: "ON", age: 40,
    isFirstTimeHomeBuyer: false,
    rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
    income: {
      employment: {
        gross: 120000, federalTaxWithheld: 25000,
        provincialTaxWithheld: 0, cppContribution: 4034.10,
        eiPremium: 1077.48, cppPensionableEarnings: 71300,
      },
      investment: { eligibleDividends: 10000 },
    },
    deductions: { rrspContribution: 0, fhsaContribution: 0 },
  });

  // 120,000 + 10,000×1.38 = 133,800
  close(result.totalIncome, 133800, "totalIncome (eligible gross-up)");
  close(result.netFederalTax, 19590.37, "netFederalTax");
  close(result.netProvincialTax, 10720.73, "netProvincialTax (surtax + OHP $750)");
  close(result.totalTax, 30311.10, "totalTax");
  close(result.refundOrOwing, -5311.10, "refundOrOwing (owing)");

  // Surtax must be > 0 — if it's 0 the DTC was wrongly included in surtax base
  it("ON surtax > 0 (TICKET-025 regression: DTC not in surtax base)", () => {
    expect(result.provincialSurtax).toBeGreaterThan(1000);
    expect(result.provincialSurtax).toBeCloseTo(1656.34, 0);
  });
});

// ---------------------------------------------------------------------------
// CASE 8 — ON 2025 T4 $45K + eligible dividends $3K (LIFT interaction)
//
// Gross-up pushes net income from ~$44,585 to ~$48,725, causing:
// 1. LIFT drops from $270.75 to $63.75 (phase-out accelerated)
// 2. OHP jumps from $450 to $600 (crosses $48,600 segment boundary)
// Despite these hidden costs ($357 total), effective rate on $3K div is only 4.4%.
// ---------------------------------------------------------------------------
describe("ON 2025 T4 $45K + eligible div $3K (LIFT + OHP interaction)", () => {
  const result = runCase({
    taxYear: 2025, province: "ON", age: 30,
    isFirstTimeHomeBuyer: false,
    rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
    income: {
      employment: {
        gross: 45000, federalTaxWithheld: 6000,
        provincialTaxWithheld: 0, cppContribution: 2469.25,
        eiPremium: 738.00, cppPensionableEarnings: 45000,
      },
      investment: { eligibleDividends: 3000 },
    },
    deductions: { rrspContribution: 0, fhsaContribution: 0 },
  });

  close(result.totalIncome, 49140, "totalIncome (45K + 3K×1.38)");
  close(result.netFederalTax, 3486.43, "netFederalTax");
  close(result.netProvincialTax, 1798.13, "netProvincialTax");
  close(result.refundOrOwing, 715.44, "refundOrOwing (refund)");

  // LIFT reduced by gross-up pushing net income higher
  it("LIFT reduced to ~$63.75 (gross-up accelerates phase-out)", () => {
    expect(result.provincialLiftCredit).toBeCloseTo(63.75, 0);
  });
  // OHP crosses segment: $450 → $600
  it("OHP jumps to $600 (net income crosses $48,600 segment)", () => {
    expect(result.provincialHealthPremium).toBeCloseTo(600, 0);
  });

  // Effective rate on the $3K dividend: compare with no-dividend baseline
  it("effective rate on $3K eligible dividend ≈ 4.4%", () => {
    const baseline = calculateTax({
      taxYear: 2025, province: "ON", age: 30,
      isFirstTimeHomeBuyer: false,
      rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
      income: {
        employment: {
          gross: 45000, federalTaxWithheld: 0,
          provincialTaxWithheld: 0, cppContribution: 2469.25,
          eiPremium: 738.00, cppPensionableEarnings: 45000,
        },
      },
      deductions: { rrspContribution: 0, fhsaContribution: 0 },
    });
    const withDiv = calculateTax({
      taxYear: 2025, province: "ON", age: 30,
      isFirstTimeHomeBuyer: false,
      rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
      income: {
        employment: {
          gross: 45000, federalTaxWithheld: 0,
          provincialTaxWithheld: 0, cppContribution: 2469.25,
          eiPremium: 738.00, cppPensionableEarnings: 45000,
        },
        investment: { eligibleDividends: 3000 },
      },
      deductions: { rrspContribution: 0, fhsaContribution: 0 },
    });
    const effRate = (withDiv.totalTax - baseline.totalTax) / 3000;
    expect(effRate).toBeLessThan(0.10); // < 10% despite 19.55% marginal
    expect(effRate).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// CASE 9 — ON 2025 T4 $75K + EI $6K (regular) + capital gains $12K
//
// Capital gains push net income over $82,125 EI clawback threshold.
// Without the $12K cap gain: clawback = $0 (income below threshold).
// With it: clawback = $1,259.10 (30% × $4,197 excess).
// ---------------------------------------------------------------------------
describe("ON 2025 T4 $75K + EI $6K + cap gains $12K (clawback triggered by investment)", () => {
  const result = runCase({
    taxYear: 2025, province: "ON", age: 35,
    isFirstTimeHomeBuyer: false,
    rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
    income: {
      employment: {
        gross: 75000, federalTaxWithheld: 13000,
        provincialTaxWithheld: 0, cppContribution: 4034.10,
        eiPremium: 1077.48, cppPensionableEarnings: 71300,
      },
      benefits: { ei: { amount: 6000, isParental: false, taxWithheld: 600 } },
      investment: { capitalGains: 12000 },
    },
    deductions: { rrspContribution: 0, fhsaContribution: 0 },
  });

  // 75,000 + 6,000 + 12,000×0.5 = 87,000
  close(result.totalIncome, 87000, "totalIncome (T4 + EI + 50% cap gain)");
  close(result.netIncome, 85062.90, "netIncome (after clawback deduction)");
  close(result.netFederalTax, 10800.53, "netFederalTax");
  close(result.netProvincialTax, 5497.31, "netProvincialTax");
  close(result.refundOrOwing, -3956.94, "refundOrOwing (owing)");

  // EI clawback: 30% × min($6K, $86,322 − $82,125) = 30% × $4,197 = $1,259.10
  it("EI clawback = $1,259.10 (cap gains pushed income over threshold)", () => {
    expect(result.clawbacksPayable).toBeCloseTo(1259.10, 0);
  });

  // Without cap gains, income $80,322 < $82,125 threshold → no clawback
  it("without cap gains, clawback = $0 (below threshold)", () => {
    const noCap = calculateTax({
      taxYear: 2025, province: "ON", age: 35,
      isFirstTimeHomeBuyer: false,
      rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
      income: {
        employment: {
          gross: 75000, federalTaxWithheld: 13000,
          provincialTaxWithheld: 0, cppContribution: 4034.10,
          eiPremium: 1077.48, cppPensionableEarnings: 71300,
        },
        benefits: { ei: { amount: 6000, isParental: false, taxWithheld: 600 } },
      },
      deductions: { rrspContribution: 0, fhsaContribution: 0 },
    });
    expect(noCap.clawbacksPayable).toBeCloseTo(0, 0);
    expect(result.clawbacksPayable - noCap.clawbacksPayable).toBeGreaterThan(1000);
  });
});

// ---------------------------------------------------------------------------
// CASE 10 — BC 2025 T4 $55K + interest $500 + elig div $4K + non-elig div $1K + cap gains $6K
//
// All four investment income types at once in BC.
// totalIncome = 55K + 500 + 4K×1.38 + 1K×1.15 + 6K×0.5 = 65,170
// Ensures no cross-contamination between income pipelines.
// ---------------------------------------------------------------------------
describe("BC 2025 T4 $55K + all 4 investment types (interest/elig/non-elig/cap gain)", () => {
  const result = runCase({
    taxYear: 2025, province: "BC", age: 35,
    isFirstTimeHomeBuyer: false,
    rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
    income: {
      employment: {
        gross: 55000, federalTaxWithheld: 8500,
        provincialTaxWithheld: 0, cppContribution: 3064.25,
        eiPremium: 902.00, cppPensionableEarnings: 55000,
      },
      investment: {
        interest: 500,
        eligibleDividends: 4000,
        nonEligibleDividends: 1000,
        capitalGains: 6000,
      },
    },
    deductions: { rrspContribution: 0, fhsaContribution: 0 },
  });

  // 55000 + 500 + 5520 + 1150 + 3000 = 65,170
  close(result.totalIncome, 65170, "totalIncome (4 investment types summed correctly)");
  close(result.netFederalTax, 5826.40, "netFederalTax");
  close(result.netProvincialTax, 2163.54, "netProvincialTax");
  close(result.totalTax, 7989.94, "totalTax");
  close(result.refundOrOwing, 510.06, "refundOrOwing (refund)");

  // No health premium / surtax / basic tax reduction in BC at this income
  it("no BC special adjustments at this income level", () => {
    expect(result.provincialHealthPremium).toBe(0);
    expect(result.provincialSurtax).toBe(0);
    expect(result.provincialBasicTaxReduction).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// CASE 11 — BC 2025 self-employment $40K + eligible dividends $6K
//
// Self-employment CPP + dividend DTC interaction — never tested before.
// CPP payable is based on SE income only ($40K); dividends don't affect it.
// BC DTC on eligible dividends = $8,280 × 12% = $993.60 (large reduction).
// ---------------------------------------------------------------------------
describe("BC 2025 self-employment $40K + eligible div $6K (SE CPP + DTC)", () => {
  const result = runCase({
    taxYear: 2025, province: "BC", age: 35,
    isFirstTimeHomeBuyer: false,
    rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
    income: {
      selfEmployment: { netIncome: 40000 },
      investment: { eligibleDividends: 6000 },
    },
    deductions: { rrspContribution: 0, fhsaContribution: 0 },
  });

  // 40,000 + 6,000×1.38 = 48,280
  close(result.totalIncome, 48280, "totalIncome (SE + eligible gross-up)");
  close(result.netFederalTax, 2788.45, "netFederalTax");
  close(result.netProvincialTax, 575.23, "netProvincialTax (DTC slashes BC tax)");
  close(result.refundOrOwing, -7707.18, "refundOrOwing (owing — CPP payable dominates)");

  // CPP payable based on SE income only, not dividends
  it("CPP payable based on $40K SE income only (dividends excluded)", () => {
    expect(result.cppPayable).toBeCloseTo(4343.50, 0);
  });

  it("no CPP overpayment (no T4)", () => {
    expect(result.cppOverpayment).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// CASE 12 — ON 2025 T4 $200K + eligible dividends $20K (BPA phase-out + max surtax)
//
// Stress test: taxable income ≈ $226,922 is deep in federal BPA phase-out
// ($177,882–$253,414) and generates ~$7,988 ON surtax (both brackets).
// Validates TICKET-025 surtax ordering at the extreme end.
// ---------------------------------------------------------------------------
describe("ON 2025 T4 $200K + eligible div $20K (BPA phase-out + max surtax)", () => {
  const result = runCase({
    taxYear: 2025, province: "ON", age: 50,
    isFirstTimeHomeBuyer: false,
    rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
    income: {
      employment: {
        gross: 200000, federalTaxWithheld: 52000,
        provincialTaxWithheld: 0, cppContribution: 4034.10,
        eiPremium: 1077.48, cppPensionableEarnings: 71300,
      },
      investment: { eligibleDividends: 20000 },
    },
    deductions: { rrspContribution: 0, fhsaContribution: 0 },
  });

  // 200,000 + 20,000×1.38 = 227,600
  close(result.totalIncome, 227600, "totalIncome (200K + eligible gross-up)");
  close(result.netFederalTax, 43526.62, "netFederalTax (BPA partially phased out)");
  close(result.netProvincialTax, 27128.90, "netProvincialTax (massive surtax + OHP $900)");
  close(result.totalTax, 70655.52, "totalTax");
  close(result.refundOrOwing, -18655.52, "refundOrOwing (owing)");

  // Both surtax brackets deeply triggered
  it("ON surtax ≈ $7,988 (both brackets deeply triggered)", () => {
    expect(result.provincialSurtax).toBeCloseTo(7987.99, 1);
  });

  // OHP at max ($200K+ segment)
  it("OHP = $900 (max segment)", () => {
    expect(result.provincialHealthPremium).toBe(900);
  });
});
