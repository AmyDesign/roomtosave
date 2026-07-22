/**
 * Quebec tax calculation tests
 *
 * Covers all Quebec-specific functionality:
 *   1. Federal abatement (16.5% of basic federal tax, T1 line 44000)
 *   2. Quebec provincial brackets (4 brackets: 14%, 19%, 24%, 25.75%)
 *   3. Quebec BPA ($18,571 for 2025, $18,056 for 2024)
 *   4. Quebec dividend tax credit rates (eligible: 11.70%, non-eligible: 3.42%)
 *   5. Abatement interaction with RRSP/FHSA deductions
 *   6. Cross-province comparison to confirm abatement reduces federal tax
 *   7. Both tax years (2024 + 2025)
 *   8. Self-employment QPP + QPIP + abatement
 *   9. Marginal rate reflects abatement reduction
 *  10. QPP rates (5.40% base vs CPP 4.95%), QPIP (0.494%), QC-reduced EI
 *
 * QPP/QPIP inputs (2025):
 *   QPP max employee = (71300-3500) x 6.40% = $4,339.20
 *   QC EI rate 1.31%, max insurable $65,700 -> max $860.67
 *   QPIP employee rate 0.494%, max insurable $98,000
 *
 * Expected values derived from the TS engine with QPP/QPIP support.
 * Tolerance: $5 (allows rounding differences).
 */
import { describe, it, expect } from "vitest";
import { calculateTax } from "../calculator";
import { getProvincialConfig, getSupportedProvinces } from "../data";
import type { TaxInput } from "../types";

const TOL = 5;
const close = (actual: number, expected: number, label: string) =>
  it(`${label} within +/-$${TOL}`, () =>
    expect(Math.abs(actual - expected)).toBeLessThan(TOL));

function qcInput(overrides: Partial<TaxInput> = {}): TaxInput {
  return {
    taxYear: 2025,
    province: "QC",
    age: 30,
    isFirstTimeHomeBuyer: false,
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
    deductions: { rrspContribution: 0, fhsaContribution: 0 },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Data registry -- QC is registered for both years with QPP/QPIP config
// ---------------------------------------------------------------------------
describe("Quebec data registry", () => {
  it("QC is a supported province for 2024", () => {
    expect(getSupportedProvinces(2024)).toContain("QC");
  });

  it("QC is a supported province for 2025", () => {
    expect(getSupportedProvinces(2025)).toContain("QC");
  });

  it("QC 2025 config has federalAbatementRate = 0.165", () => {
    const cfg = getProvincialConfig(2025, "QC");
    expect(cfg.federalAbatementRate).toBe(0.165);
  });

  it("QC 2024 config has federalAbatementRate = 0.165", () => {
    const cfg = getProvincialConfig(2024, "QC");
    expect(cfg.federalAbatementRate).toBe(0.165);
  });

  it("QC BPA for 2025 = $18,571", () => {
    const cfg = getProvincialConfig(2025, "QC");
    expect(cfg.bpa.base).toBe(18571);
  });

  it("QC BPA for 2024 = $18,056", () => {
    const cfg = getProvincialConfig(2024, "QC");
    expect(cfg.bpa.base).toBe(18056);
  });

  it("QC dividend credit rates correct for 2025", () => {
    const cfg = getProvincialConfig(2025, "QC");
    expect(cfg.dividendCreditRate?.eligible).toBe(0.117);
    expect(cfg.dividendCreditRate?.nonEligible).toBe(0.0342);
  });

  it("QC 2025 QPP rates present", () => {
    const cfg = getProvincialConfig(2025, "QC");
    expect(cfg.pensionBaseRate).toBe(0.054);
    expect(cfg.pensionEnhancedRate).toBe(0.01);
  });

  it("QC 2025 QPIP rates present", () => {
    const cfg = getProvincialConfig(2025, "QC");
    expect(cfg.qpipEmployeeRate).toBe(0.00494);
    expect(cfg.qpipSelfEmployedRate).toBe(0.00878);
    expect(cfg.qpipMaxInsurable).toBe(98000);
  });

  it("QC 2024 QPIP max insurable = $94,000", () => {
    const cfg = getProvincialConfig(2024, "QC");
    expect(cfg.qpipMaxInsurable).toBe(94000);
  });

  it("BC and ON do NOT have federalAbatementRate or QPP", () => {
    const bc = getProvincialConfig(2025, "BC");
    const on = getProvincialConfig(2025, "ON");
    expect(bc.federalAbatementRate).toBeUndefined();
    expect(on.federalAbatementRate).toBeUndefined();
    expect(bc.pensionBaseRate).toBeUndefined();
    expect(on.pensionBaseRate).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// CASE 1 -- QC 2025 T4 $80K (QPP + QC-EI + QPIP)
//
// QPP: min(80K,71300)-3500 = 67800, x6.40% = $4,339.20
// QC EI: min(80K,65700) x 1.31% = $860.67
// QPIP: 80K x 0.494% = $395.20
// ---------------------------------------------------------------------------
describe("QC 2025 T4 $80K (QPP + QPIP)", () => {
  const result = calculateTax(
    qcInput({
      income: {
        employment: {
          gross: 80000,
          federalTaxWithheld: 10000,
          provincialTaxWithheld: 8000,
          cppContribution: 4339.20,
          eiPremium: 860.67,
          ppipPremium: 395.20,
          cppPensionableEarnings: 80000,
        },
      },
    }),
  );

  close(result.totalIncome, 80000, "totalIncome");
  close(result.taxableIncome, 79322, "taxableIncome");
  close(result.federalTaxBeforeCredits, 12818.51, "federalTaxBeforeCredits");
  close(result.federalCredits, 3264.98, "federalCredits");
  close(result.federalAbatement, 1576.33, "federalAbatement (16.5%)");
  close(result.netFederalTax, 7977.20, "netFederalTax");
  close(result.netProvincialTax, 10293.69, "netProvincialTax");
  close(result.totalTax, 18270.89, "totalTax");
  close(result.refundOrOwing, -270.89, "refundOrOwing");

  it("abatement = exactly 16.5% of basic federal tax", () => {
    const basicFedTax = Math.max(
      0,
      result.federalTaxBeforeCredits - result.federalCredits,
    );
    expect(result.federalAbatement).toBeCloseTo(basicFedTax * 0.165, 2);
  });

  it("no surtax, health premium, LIFT, or basic tax reduction in QC", () => {
    expect(result.provincialSurtax).toBe(0);
    expect(result.provincialHealthPremium).toBe(0);
    expect(result.provincialLiftCredit).toBe(0);
    expect(result.provincialBasicTaxReduction).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// CASE 2 -- QC 2025 T4 $50K (first bracket only)
//
// QPP: (50K-3500) x 6.40% = $2,976.00
// QC EI: 50K x 1.31% = $655.00
// QPIP: 50K x 0.494% = $247.00
// ---------------------------------------------------------------------------
describe("QC 2025 T4 $50K (first bracket only)", () => {
  const result = calculateTax(
    qcInput({
      income: {
        employment: {
          gross: 50000,
          federalTaxWithheld: 5500,
          provincialTaxWithheld: 5000,
          cppContribution: 2976.00,
          eiPremium: 655.00,
          ppipPremium: 247.00,
          cppPensionableEarnings: 50000,
        },
      },
    }),
  );

  close(result.totalIncome, 50000, "totalIncome");
  close(result.federalAbatement, 682.39, "federalAbatement");
  close(result.netFederalTax, 3453.30, "netFederalTax");
  close(result.netProvincialTax, 4891.16, "netProvincialTax");
  close(result.totalTax, 8344.46, "totalTax");
  close(result.refundOrOwing, 2155.54, "refundOrOwing (refund)");

  it("effective rate ~16.7%", () => {
    expect(result.effectiveRate).toBeCloseTo(0.167, 2);
  });
});

// ---------------------------------------------------------------------------
// CASE 3 -- QC 2025 T4 $120K (third QC bracket: 24%)
//
// QPP at max: $4,339.20 (pensionable capped at YMPE $71,300)
// QPIP: min(120K,98K) x 0.494% = $484.12
// ---------------------------------------------------------------------------
describe("QC 2025 T4 $120K (third bracket, 24%)", () => {
  const result = calculateTax(
    qcInput({
      age: 40,
      income: {
        employment: {
          gross: 120000,
          federalTaxWithheld: 18000,
          provincialTaxWithheld: 14000,
          cppContribution: 4339.20,
          eiPremium: 860.67,
          ppipPremium: 484.12,
          cppPensionableEarnings: 71300,
        },
      },
    }),
  );

  close(result.totalIncome, 120000, "totalIncome");
  close(result.federalAbatement, 2968.70, "federalAbatement");
  close(result.netFederalTax, 15023.40, "netFederalTax");
  close(result.netProvincialTax, 18464.04, "netProvincialTax");
  close(result.totalTax, 33487.44, "totalTax");
  close(result.refundOrOwing, -1487.44, "refundOrOwing (owing)");

  it("effective rate ~27.9%", () => {
    expect(result.effectiveRate).toBeCloseTo(0.279, 2);
  });

  it("marginal rate ~45.71% (fed 26% after abatement + QC 24%)", () => {
    expect(result.marginalRate).toBeCloseTo(0.4571, 2);
  });
});

// ---------------------------------------------------------------------------
// CASE 4 -- QC 2025 T4 $80K + RRSP $10K (abatement + deduction interaction)
// ---------------------------------------------------------------------------
describe("QC 2025 T4 $80K + RRSP $10K (abatement reduces with deduction)", () => {
  const result = calculateTax(
    qcInput({
      rrspRoomAvailable: 10000,
      income: {
        employment: {
          gross: 80000,
          federalTaxWithheld: 10000,
          provincialTaxWithheld: 8000,
          cppContribution: 4339.20,
          eiPremium: 860.67,
          ppipPremium: 395.20,
          cppPensionableEarnings: 80000,
        },
      },
      deductions: { rrspContribution: 10000, fhsaContribution: 0 },
    }),
  );

  close(result.taxableIncome, 69322, "taxableIncome (reduced by RRSP)");
  close(result.federalAbatement, 1238.08, "federalAbatement (lower than no-RRSP)");
  close(result.netFederalTax, 6265.45, "netFederalTax");
  close(result.netProvincialTax, 8393.69, "netProvincialTax");
  close(result.totalTax, 14659.14, "totalTax");
  close(result.refundOrOwing, 3340.86, "refundOrOwing (bigger refund with RRSP)");

  it("RRSP reduces abatement by ~$338 (16.5% of the federal tax reduction)", () => {
    const noRRSP = calculateTax(
      qcInput({
        income: {
          employment: {
            gross: 80000,
            federalTaxWithheld: 10000,
            provincialTaxWithheld: 8000,
            cppContribution: 4339.20,
            eiPremium: 860.67,
            ppipPremium: 395.20,
            cppPensionableEarnings: 80000,
          },
        },
      }),
    );
    const abatementDrop = noRRSP.federalAbatement - result.federalAbatement;
    // $10K RRSP at 20.5% marginal = $2,050 less federal tax
    // 16.5% of $2,050 = $338.25 less abatement
    expect(abatementDrop).toBeCloseTo(338.25, 0);
  });
});

// ---------------------------------------------------------------------------
// CASE 5 -- QC 2025 T4 $70K + eligible dividends $5K (QC DTC rates)
//
// QPP: (70K-3500) x 6.40% = $4,256.00
// QPIP: 70K x 0.494% = $345.80
// ---------------------------------------------------------------------------
describe("QC 2025 T4 $70K + eligible dividends $5K (QC DTC)", () => {
  const result = calculateTax(
    qcInput({
      income: {
        employment: {
          gross: 70000,
          federalTaxWithheld: 9000,
          provincialTaxWithheld: 7000,
          cppContribution: 4256.00,
          eiPremium: 860.67,
          ppipPremium: 345.80,
          cppPensionableEarnings: 70000,
        },
        investment: { eligibleDividends: 5000 },
      },
    }),
  );

  // Gross-up: 70,000 + 5,000x1.38 = 76,900
  close(result.totalIncome, 76900, "totalIncome (eligible gross-up)");
  close(result.federalAbatement, 1303.78, "federalAbatement");
  close(result.netFederalTax, 6597.90, "netFederalTax");
  close(result.netProvincialTax, 8899.86, "netProvincialTax");
  close(result.totalTax, 15497.76, "totalTax");
  close(result.refundOrOwing, 502.24, "refundOrOwing");

  it("QC DTC on eligible dividends is lower than ON DTC (11.70% vs 10%)", () => {
    const onResult = calculateTax({
      taxYear: 2025,
      province: "ON",
      age: 30,
      isFirstTimeHomeBuyer: false,
      rrspRoomAvailable: 0,
      fhsaRoomAvailable: 0,
      fhsaLifetimeUsed: 0,
      income: {
        employment: {
          gross: 70000,
          federalTaxWithheld: 9000,
          provincialTaxWithheld: 7000,
          cppContribution: 3956.75,
          eiPremium: 1090.62,
          cppPensionableEarnings: 70000,
        },
        investment: { eligibleDividends: 5000 },
      },
      deductions: { rrspContribution: 0, fhsaContribution: 0 },
    });
    // QC has higher provincial tax (higher brackets) despite generous DTC
    expect(result.netProvincialTax).toBeGreaterThan(onResult.netProvincialTax);
  });
});

// ---------------------------------------------------------------------------
// CASE 6 -- QC 2024 T4 $60K (previous tax year)
//
// QPP 2024: (60K-3500) x 6.40% = $3,616.00
// QC EI 2024: 60K x 1.32% = $792.00
// QPIP 2024: 60K x 0.494% = $296.40
// RAMQ drug premium 2024 = $737.50 (rates change Jul 1, so the tax-year cap is
//   the mean of the two half-year caps: (731 + 744) / 2). TP-1 line 447.
// Verified line-by-line against Wealthsimple 2024 on 2026-07-19:
//   TP-1 201=1380, 248=565, 275/299=58055, 350=18056, 399=2527.84,
//   401=8441.45, 447=737.50, 450=6651.11, 451=6000, 479=651.11
//   Federal refund 2056.90 - QC owing 651.11 = 1405.79
// ---------------------------------------------------------------------------
describe("QC 2024 T4 $60K (2024 year -- brackets and BPA)", () => {
  const result = calculateTax(
    qcInput({
      taxYear: 2024,
      income: {
        employment: {
          gross: 60000,
          federalTaxWithheld: 7000,
          provincialTaxWithheld: 6000,
          cppContribution: 3616.00,
          eiPremium: 792.00,
          ppipPremium: 296.40,
          cppPensionableEarnings: 60000,
        },
      },
    }),
  );

  close(result.totalIncome, 60000, "totalIncome");
  close(result.federalAbatement, 976.78, "federalAbatement (2024)");
  close(result.netFederalTax, 4943.10, "netFederalTax");
  close(result.netProvincialTax, 6651.11, "netProvincialTax");
  close(result.totalTax, 11594.21, "totalTax");
  close(result.refundOrOwing, 1405.79, "refundOrOwing");

  it("RAMQ drug premium 2024 = $737.50 (mean of Jul-1 half-year caps)", () => {
    expect(result.provincialDrugPremium).toBeCloseTo(737.50, 2);
  });

  it("2024 abatement also = 16.5% of basic federal tax", () => {
    const basicFedTax = Math.max(
      0,
      result.federalTaxBeforeCredits - result.federalCredits,
    );
    expect(result.federalAbatement).toBeCloseTo(basicFedTax * 0.165, 2);
  });
});

// ---------------------------------------------------------------------------
// CASE 6b -- RAMQ drug premium phase-in (TICKET-033)
//
// The premium is NOT a cliff to the annual maximum. Above the exemption
// ($18,910 for 2024) it phases in over two rate tiers, then caps at $737.50.
//
// All four points below were read off a real Wealthsimple 2024 return
// (TP-1 line 447) on 2026-07-19 -- the same QC6 slip, varying only the RRSP
// deduction to move QC net income (line 275) across the phase-in band:
//
//   RRSP     line 275   excess over 18,910   WS line 447
//   ------   --------   ------------------   -----------
//        0     58,055         39,145            737.50   (capped)
//   30,000     28,055          9,145            737.50   (capped)
//   32,000     26,055          7,145            561.01   (tier 2)
//   35,000     23,055          4,145            271.96   (tier 1)
//
// The rates in data/2024/qc.json are calibrated to reproduce these exactly.
// They are empirical (Revenu Québec does not publish the tier percentages);
// 2025 is deliberately left uncalibrated and still uses the legacy cliff.
// ---------------------------------------------------------------------------
describe("QC 2024 RAMQ drug premium phase-in (Wealthsimple-verified)", () => {
  const atRrsp = (rrspContribution: number) =>
    calculateTax(
      qcInput({
        taxYear: 2024,
        rrspRoomAvailable: 100000,
        income: {
          employment: {
            gross: 60000,
            federalTaxWithheld: 7000,
            provincialTaxWithheld: 6000,
            cppContribution: 3616.0,
            eiPremium: 792.0,
            ppipPremium: 296.4,
            cppPensionableEarnings: 60000,
          },
        },
        deductions: { rrspContribution, fhsaContribution: 0 },
      }),
    );

  // [RRSP deduction, expected TP-1 line 447, expected net refund]
  const cases: Array<[number, number, number]> = [
    [0, 737.5, 1405.79],
    [30000, 737.5, 9840.9],
    [32000, 561.01, 10547.89],
    [35000, 271.96, 11632.69],
  ];

  for (const [rrsp, premium, refund] of cases) {
    it(`RRSP $${rrsp}: line 447 = $${premium}, net refund = $${refund}`, () => {
      const r = atRrsp(rrsp);
      expect(r.provincialDrugPremium).toBeCloseTo(premium, 2);
      expect(r.refundOrOwing).toBeCloseTo(refund, 2);
    });
  }

  it("premium is $0 once QC net income falls to/below the exemption", () => {
    expect(atRrsp(43730).provincialDrugPremium).toBe(0);
  });

  it("phase-in is monotonic in income and never exceeds the annual maximum", () => {
    let prev = 0;
    for (let rrsp = 43000; rrsp >= 28000; rrsp -= 500) {
      const p = atRrsp(rrsp).provincialDrugPremium;
      expect(p).toBeGreaterThanOrEqual(prev - 0.005);
      expect(p).toBeLessThanOrEqual(737.5);
      prev = p;
    }
  });
});

// ---------------------------------------------------------------------------
// CASE 5b -- RAMQ drug premium phase-in, 2025 rates (TICKET-034)
//
// Wealthsimple 2025 (QC5 slip: $70K T4 + $5,000 eligible dividends), varying
// only the RRSP deduction, read 2026-07-19:
//
//   RRSP     line 275   excess over 19,890   WS line 447
//   ------   --------   ------------------   -----------
//   47,000     27,815          7,925            735.98   (tier 2)
//   50,000     24,815          4,925            386.12   (tier 1)
//
// Unlike 2024, the 2025 rates come out exactly clean -- 7.84% and 11.76%
// (= 1.5 x 7.84%) -- which strongly suggests these ARE the statutory values.
// ---------------------------------------------------------------------------
describe("QC 2025 RAMQ drug premium phase-in (Wealthsimple-verified)", () => {
  const atRrsp = (rrspContribution: number) =>
    calculateTax(
      qcInput({
        rrspRoomAvailable: 200000,
        income: {
          employment: {
            gross: 70000,
            federalTaxWithheld: 9000,
            provincialTaxWithheld: 7000,
            cppContribution: 4256.0,
            eiPremium: 860.67,
            ppipPremium: 345.8,
            cppPensionableEarnings: 70000,
          },
          investment: { eligibleDividends: 5000 },
        },
        deductions: { rrspContribution, fhsaContribution: 0 },
      }),
    );

  // [RRSP deduction, expected TP-1 line 447, expected net refund]
  const cases: Array<[number, number, number]> = [
    [47000, 735.98, 14777.16],
    [50000, 386.12, 15547.02],
  ];

  for (const [rrsp, premium, refund] of cases) {
    it(`RRSP $${rrsp}: line 447 = $${premium}, net refund = $${refund}`, () => {
      const r = atRrsp(rrsp);
      expect(r.provincialDrugPremium).toBeCloseTo(premium, 2);
      expect(r.refundOrOwing).toBeCloseTo(refund, 2);
    });
  }

  it("caps at the 2025 maximum at baseline income (QC5 baseline unchanged)", () => {
    const r = atRrsp(0);
    expect(r.provincialDrugPremium).toBeCloseTo(755, 2);
    expect(r.refundOrOwing).toBeCloseTo(502.24, 2);
  });
});

// ---------------------------------------------------------------------------
// TICKET-033 -- private/group drug plan exemption
//
// A filer covered all year by a private (usually employer) drug plan pays no
// RAMQ premium at all, regardless of income (Schedule K). Most employed people
// are in this situation, so without the flag the engine over-taxed them by up
// to the annual maximum.
// ---------------------------------------------------------------------------
describe("QC RAMQ premium -- private drug coverage exemption (TICKET-033)", () => {
  const qc5 = (hasPrivateDrugCoverage?: boolean) =>
    calculateTax(
      qcInput({
        hasPrivateDrugCoverage,
        rrspRoomAvailable: 200000,
        income: {
          employment: {
            gross: 70000,
            federalTaxWithheld: 9000,
            provincialTaxWithheld: 7000,
            cppContribution: 4256.0,
            eiPremium: 860.67,
            ppipPremium: 345.8,
            cppPensionableEarnings: 70000,
          },
          investment: { eligibleDividends: 5000 },
        },
        deductions: { rrspContribution: 0, fhsaContribution: 0 },
      }),
    );

  it("charges the premium when covered by the public plan", () => {
    const r = qc5(false);
    expect(r.provincialDrugPremium).toBeCloseTo(755, 2);
    expect(r.refundOrOwing).toBeCloseTo(502.24, 2);
  });

  it("charges $0 when covered by a private plan, worth exactly the maximum", () => {
    const r = qc5(true);
    expect(r.provincialDrugPremium).toBe(0);
    expect(r.refundOrOwing).toBeCloseTo(502.24 + 755, 2);
  });

  it("defaults to the public plan when the flag is omitted (no regression)", () => {
    expect(qc5(undefined).refundOrOwing).toBeCloseTo(502.24, 2);
  });

  it("is inert outside Québec (drug premium)", () => {
    const on = calculateTax({
      taxYear: 2025,
      province: "ON",
      age: 30,
      isFirstTimeHomeBuyer: false,
      hasPrivateDrugCoverage: true,
      rrspRoomAvailable: 0,
      fhsaRoomAvailable: 0,
      fhsaLifetimeUsed: 0,
      income: {
        employment: {
          gross: 70000,
          federalTaxWithheld: 9000,
          provincialTaxWithheld: 0,
          cppContribution: 4034.1,
          eiPremium: 1077.48,
          cppPensionableEarnings: 70000,
        },
      },
      deductions: { rrspContribution: 0, fhsaContribution: 0 },
    });
    expect(on.provincialDrugPremium).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// TICKET-036 -- contribution to the health services fund (TP-1 line 446)
//
// Payable on income NOT subject to source deductions. Two properties matter and
// both are pinned by real Wealthsimple 2025 data (read 2026-07-19):
//
//   QC8  self-employment $25,000, RRSP $0      -> line 446 = $51.83
//   QC7  self-employment $50,000, RRSP $30,238 -> line 446 = $150.00 (capped)
//
// The second point is what proves the base is GROSS non-employment income: at
// that RRSP level net income is only $16,129, below any plausible threshold, so
// a net-income base would wrongly produce $0. Deductions do not shrink the base.
// ---------------------------------------------------------------------------
describe("QC health services fund contribution (TICKET-036)", () => {
  const se = (netIncome: number, rrspContribution: number) =>
    calculateTax(
      qcInput({
        rrspRoomAvailable: 200000,
        income: { selfEmployment: { netIncome } },
        deductions: { rrspContribution, fhsaContribution: 0 },
      }),
    );

  it("phases in at 1% above the threshold (WS: $51.83 at $25,000)", () => {
    expect(se(25000, 0).provincialHealthServicesFund).toBeCloseTo(51.83, 2);
  });

  it("caps at $150 in the first tier (WS: $50,000 income)", () => {
    expect(se(50000, 0).provincialHealthServicesFund).toBeCloseTo(150, 2);
  });

  it("base is gross income -- an RRSP deduction does NOT reduce it", () => {
    // net income at this RRSP is only $16,129, yet WS still charged $150
    expect(se(50000, 30238).provincialHealthServicesFund).toBeCloseTo(150, 2);
    expect(Math.abs(se(50000, 30238).refundOrOwing)).toBeCloseTo(6541.0, 2);
  });

  it("is $0 for a pure-employment filer (base excludes employment income)", () => {
    const employed = calculateTax(
      qcInput({
        income: {
          employment: {
            gross: 80000,
            federalTaxWithheld: 10000,
            provincialTaxWithheld: 8000,
            cppContribution: 4339.2,
            eiPremium: 860.67,
            ppipPremium: 395.2,
            cppPensionableEarnings: 80000,
          },
        },
        deductions: { rrspContribution: 0, fhsaContribution: 0 },
      }),
    );
    expect(employed.provincialHealthServicesFund).toBe(0);
  });

  it("is $0 when non-employment income sits below the threshold (QC5)", () => {
    const qc5 = calculateTax(
      qcInput({
        income: {
          employment: {
            gross: 70000,
            federalTaxWithheld: 9000,
            provincialTaxWithheld: 7000,
            cppContribution: 4256.0,
            eiPremium: 860.67,
            ppipPremium: 345.8,
            cppPensionableEarnings: 70000,
          },
          investment: { eligibleDividends: 5000 },
        },
        deductions: { rrspContribution: 0, fhsaContribution: 0 },
      }),
    );
    expect(qc5.provincialHealthServicesFund).toBe(0);
    expect(qc5.refundOrOwing).toBeCloseTo(502.24, 2);
  });
});

// ---------------------------------------------------------------------------
// TICKET-030 -- QPP2/CPP2 (second additional contribution)
//
// Applies to pensionable earnings between the YMPE and the YAMPE at 4%
// (doubled for the self-employed). Fully deductible, never creditable.
//
//   2024: ($73,200 - $68,500) x 4% = $188 max employee
//   2025: ($81,200 - $71,300) x 4% = $396 max employee
//
// For employment income it is taken from the slip (T4 Box 17A / RL-1 Box B.B)
// and is NOT inferred from gross pay -- that keeps QC1/QC3/QC4, which were
// verified against WS with Box B.B left empty, reproducible.
// ---------------------------------------------------------------------------
describe("QC QPP2 / CPP2 second additional contribution (TICKET-030)", () => {
  const highEarner = (cpp2Contribution?: number) =>
    calculateTax(
      qcInput({
        age: 35,
        income: {
          employment: {
            gross: 120000,
            federalTaxWithheld: 18000,
            provincialTaxWithheld: 14000,
            cppContribution: 4339.2,
            eiPremium: 860.67,
            ppipPremium: 484.12,
            cppPensionableEarnings: 120000,
            ...(cpp2Contribution === undefined ? {} : { cpp2Contribution }),
          },
        },
        deductions: { rrspContribution: 0, fhsaContribution: 0 },
      }),
    );

  it("is not inferred from gross pay when the slip omits it", () => {
    expect(highEarner(undefined).refundOrOwing).toBeCloseTo(
      highEarner(0).refundOrOwing,
      2,
    );
  });

  it("Box 17A is deductible, so it reduces tax versus omitting it", () => {
    const withCpp2 = highEarner(396).refundOrOwing;
    const without = highEarner(0).refundOrOwing;
    expect(withCpp2).toBeGreaterThan(without);
    // fully deductible at the filer's marginal rate -- never a credit
    expect(withCpp2 - without).toBeGreaterThan(100);
    expect(withCpp2 - without).toBeLessThan(396);
  });

  it("self-employed pay QPP2 at double rate on the YMPE-to-YAMPE band", () => {
    const se = calculateTax(
      qcInput({
        income: { selfEmployment: { netIncome: 90000 } },
        deductions: { rrspContribution: 0, fhsaContribution: 0 },
      }),
    );
    const qpp2 = (81200 - 71300) * 0.04 * 2; // $792
    // base 67,800 x 5.4% x2 + enhanced 67,800 x 1% x2 + QPP2
    expect(se.cppPayable).toBeCloseTo(67800 * 0.054 * 2 + 67800 * 0.01 * 2 + qpp2, 2);
  });

  it("does not apply below the YMPE", () => {
    const low = calculateTax(
      qcInput({
        income: { selfEmployment: { netIncome: 50000 } },
        deductions: { rrspContribution: 0, fhsaContribution: 0 },
      }),
    );
    expect(low.cppPayable).toBeCloseTo(5952, 2); // unchanged QC7 value
  });
});

// ---------------------------------------------------------------------------
// CASE 7 -- QC 2025 self-employment $50K (QPP payable + QPIP + abatement)
//
// SE QPP: pensionable=46500, creditBase=2511, dedBase=2511, dedEnh=930
//   total QPP payable = $5,952.00
// SE QPIP: 50K x 0.878% = $439.00
// ---------------------------------------------------------------------------
describe("QC 2025 self-employment $50K (SE QPP + QPIP + abatement)", () => {
  const result = calculateTax(
    qcInput({
      income: { selfEmployment: { netIncome: 50000 } },
    }),
  );

  close(result.totalIncome, 50000, "totalIncome");
  close(result.taxableIncome, 46559, "taxableIncome (after SE QPP deduction)");
  close(result.federalAbatement, 657.46, "federalAbatement");
  close(result.netFederalTax, 3327.14, "netFederalTax");
  close(result.netProvincialTax, 4673.32, "netProvincialTax");
  close(result.refundOrOwing, -14005.61, "refundOrOwing (owing -- QPP dominates)");

  it("QPP payable = $5,952.00 (higher than CPP $5,533.50)", () => {
    expect(result.cppPayable).toBeCloseTo(5952.00, 0);
  });

  it("no CPP overpayment (no T4)", () => {
    expect(result.cppOverpayment).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// CASE 8 -- Cross-province comparison: abatement reduces federal tax
//
// QC uses QPP inputs, BC/ON use CPP inputs (as they would in real life).
// Despite different credit bases, the abatement invariant holds for QC.
// ---------------------------------------------------------------------------
describe("Cross-province: QC abatement reduces federal tax vs BC/ON", () => {
  const qcIncome = {
    employment: {
      gross: 80000,
      federalTaxWithheld: 0,
      provincialTaxWithheld: 0,
      cppContribution: 4339.20,
      eiPremium: 860.67,
      ppipPremium: 395.20,
      cppPensionableEarnings: 80000,
    },
  };
  const cppIncome = {
    employment: {
      gross: 80000,
      federalTaxWithheld: 0,
      provincialTaxWithheld: 0,
      cppContribution: 3867,
      eiPremium: 1049,
      cppPensionableEarnings: 80000,
    },
  };
  const deductions = { rrspContribution: 0, fhsaContribution: 0 };
  const base = {
    age: 30,
    isFirstTimeHomeBuyer: false,
    rrspRoomAvailable: 0,
    fhsaRoomAvailable: 0,
    fhsaLifetimeUsed: 0,
  };

  const qc = calculateTax({ ...base, taxYear: 2025, province: "QC" as const, income: qcIncome, deductions });
  const bc = calculateTax({ ...base, taxYear: 2025, province: "BC" as const, income: cppIncome, deductions });
  const on = calculateTax({ ...base, taxYear: 2025, province: "ON" as const, income: cppIncome, deductions });

  it("BC and ON have zero abatement", () => {
    expect(bc.federalAbatement).toBe(0);
    expect(on.federalAbatement).toBe(0);
  });

  it("QC abatement > 0", () => {
    expect(qc.federalAbatement).toBeGreaterThan(1000);
  });

  it("QC has same federalTaxBeforeCredits as BC (same brackets, same gross)", () => {
    // Federal brackets are identical; taxableIncome may differ slightly due to
    // QPP vs CPP enhanced deduction, but federalTaxBeforeCredits should be close
    expect(Math.abs(qc.federalTaxBeforeCredits - bc.federalTaxBeforeCredits)).toBeLessThan(50);
  });

  it("QC netFederalTax is lower than BC and ON (abatement effect)", () => {
    expect(qc.netFederalTax).toBeLessThan(bc.netFederalTax);
    expect(qc.netFederalTax).toBeLessThan(on.netFederalTax);
  });

  it("QC has highest total provincial tax (higher brackets than BC/ON)", () => {
    expect(qc.netProvincialTax).toBeGreaterThan(bc.netProvincialTax);
    expect(qc.netProvincialTax).toBeGreaterThan(on.netProvincialTax);
  });
});

// ---------------------------------------------------------------------------
// CASE 9 -- Marginal rate reflects abatement
//
// At $80K, federal marginal rate is 20.5%.
// After abatement: 20.5% x (1 - 0.165) = 17.1175%
// QC provincial marginal at $80K: 19% (second bracket $53,255-$106,495)
// Combined: 17.1175% + 19% = 36.1175%
// ---------------------------------------------------------------------------
describe("QC marginal rate reflects 16.5% abatement reduction", () => {
  const qc = calculateTax(
    qcInput({
      income: {
        employment: {
          gross: 80000,
          federalTaxWithheld: 0,
          provincialTaxWithheld: 0,
          cppContribution: 4339.20,
          eiPremium: 860.67,
          ppipPremium: 395.20,
          cppPensionableEarnings: 80000,
        },
      },
    }),
  );

  it("marginal rate ~36.12% (fed 20.5%x0.835 + QC 19%)", () => {
    // 20.5% x 0.835 = 17.1175%, + 19% = 36.1175%
    expect(qc.marginalRate).toBeCloseTo(0.3612, 3);
  });

  it("QC marginal > BC marginal at $80K (QC 19% prov outweighs abatement)", () => {
    const bc = calculateTax({
      taxYear: 2025,
      province: "BC",
      age: 30,
      isFirstTimeHomeBuyer: false,
      rrspRoomAvailable: 0,
      fhsaRoomAvailable: 0,
      fhsaLifetimeUsed: 0,
      income: {
        employment: {
          gross: 80000,
          federalTaxWithheld: 0,
          provincialTaxWithheld: 0,
          cppContribution: 3867,
          eiPremium: 1049,
          cppPensionableEarnings: 80000,
        },
      },
      deductions: { rrspContribution: 0, fhsaContribution: 0 },
    });
    // BC at $80K: fed 20.5% + BC 7.7% = 28.2%
    // QC at $80K: fed 17.12% + QC 19% = 36.12%
    expect(qc.marginalRate).toBeGreaterThan(bc.marginalRate);
  });
});

// ---------------------------------------------------------------------------
// CASE 10 -- QC 2025 T4 $80K + FHSA $8K (first-time buyer + abatement)
// ---------------------------------------------------------------------------
describe("QC 2025 T4 $80K + FHSA $8K (first-time buyer)", () => {
  const result = calculateTax(
    qcInput({
      isFirstTimeHomeBuyer: true,
      fhsaRoomAvailable: 8000,
      income: {
        employment: {
          gross: 80000,
          federalTaxWithheld: 10000,
          provincialTaxWithheld: 8000,
          cppContribution: 4339.20,
          eiPremium: 860.67,
          ppipPremium: 395.20,
          cppPensionableEarnings: 80000,
        },
      },
      deductions: { rrspContribution: 0, fhsaContribution: 8000 },
    }),
  );

  it("taxable income reduced by $8K FHSA", () => {
    expect(result.taxableIncome).toBeCloseTo(71322, 0);
  });

  it("abatement lower than no-contribution case", () => {
    const noContrib = calculateTax(
      qcInput({
        income: {
          employment: {
            gross: 80000,
            federalTaxWithheld: 10000,
            provincialTaxWithheld: 8000,
            cppContribution: 4339.20,
            eiPremium: 860.67,
            ppipPremium: 395.20,
            cppPensionableEarnings: 80000,
          },
        },
      }),
    );
    expect(result.federalAbatement).toBeLessThan(noContrib.federalAbatement);
  });

  it("total tax lower than no-contribution case", () => {
    const noContrib = calculateTax(
      qcInput({
        income: {
          employment: {
            gross: 80000,
            federalTaxWithheld: 10000,
            provincialTaxWithheld: 8000,
            cppContribution: 4339.20,
            eiPremium: 860.67,
            ppipPremium: 395.20,
            cppPensionableEarnings: 80000,
          },
        },
      }),
    );
    expect(result.totalTax).toBeLessThan(noContrib.totalTax);
    // Tax saved ~ $8K x 36.12% marginal ~ $2,890
    const taxSaved = noContrib.totalTax - result.totalTax;
    expect(taxSaved).toBeGreaterThan(2500);
    expect(taxSaved).toBeLessThan(3200);
  });
});

// ---------------------------------------------------------------------------
// CASE 11 -- QC very low income: below BPA (no tax, no abatement needed)
//
// QPP: (15K-3500) x 6.40% = $736.00
// QC EI: 15K x 1.31% = $196.50
// QPIP: 15K x 0.494% = $74.10
// ---------------------------------------------------------------------------
describe("QC 2025 income below BPA (zero tax, zero abatement)", () => {
  const result = calculateTax(
    qcInput({
      income: {
        employment: {
          gross: 15000,
          federalTaxWithheld: 500,
          provincialTaxWithheld: 500,
          cppContribution: 736.00,
          eiPremium: 196.50,
          ppipPremium: 74.10,
          cppPensionableEarnings: 15000,
        },
      },
    }),
  );

  it("federalAbatement = 0 (basic federal tax is 0 or negative)", () => {
    expect(result.federalAbatement).toBe(0);
  });

  it("netFederalTax = 0", () => {
    expect(result.netFederalTax).toBe(0);
  });

  it("provincial tax = 0 and RAMQ drug premium = 0 (net income below $19,890 exemption, Schedule K situation 32)", () => {
    // QC net income (line 275) = 15000 - 115 enhanced QPP - 1420 workers deduction = $13,465,
    // which is <= the 2025 single-filer exemption of $19,890, so the premium is $0.
    expect(result.provincialDrugPremium).toBe(0);
    expect(result.netProvincialTax).toBe(0);
  });

  it("full refund of withheld amounts (no tax, no premium)", () => {
    expect(result.refundOrOwing).toBeCloseTo(1000, 0);
  });
});

// ---------------------------------------------------------------------------
// CASE 12 -- QC 2025 T4 $70K + non-eligible dividends $3K
// ---------------------------------------------------------------------------
describe("QC 2025 T4 $70K + non-eligible dividends $3K (QC non-elig DTC)", () => {
  const result = calculateTax(
    qcInput({
      income: {
        employment: {
          gross: 70000,
          federalTaxWithheld: 9000,
          provincialTaxWithheld: 7000,
          cppContribution: 4256.00,
          eiPremium: 860.67,
          ppipPremium: 345.80,
          cppPensionableEarnings: 70000,
        },
        investment: { nonEligibleDividends: 3000 },
      },
    }),
  );

  // 70,000 + 3,000x1.15 = 73,450
  close(result.totalIncome, 73450, "totalIncome (non-eligible gross-up)");

  it("totalTax is reasonable (sanity check)", () => {
    expect(result.totalTax).toBeGreaterThan(12000);
    expect(result.totalTax).toBeLessThan(16000);
  });

  it("QC non-eligible DTC provides smaller credit than eligible DTC would", () => {
    const eligResult = calculateTax(
      qcInput({
        income: {
          employment: {
            gross: 70000,
            federalTaxWithheld: 9000,
            provincialTaxWithheld: 7000,
            cppContribution: 4256.00,
            eiPremium: 860.67,
            ppipPremium: 345.80,
            cppPensionableEarnings: 70000,
          },
          investment: { eligibleDividends: 3000 },
        },
      }),
    );
    // Eligible dividends get larger DTC -> lower provincialCredits
    expect(result.provincialCredits).toBeLessThan(eligResult.provincialCredits);
  });
});

// ---------------------------------------------------------------------------
// CASE 13 -- QC + EI clawback (abatement still applies on reduced income)
//
// QPIP: 85K x 0.494% = $419.90
// ---------------------------------------------------------------------------
describe("QC 2025 T4 $85K + EI $5K non-parental (clawback + abatement)", () => {
  const result = calculateTax(
    qcInput({
      age: 35,
      income: {
        employment: {
          gross: 85000,
          federalTaxWithheld: 13000,
          provincialTaxWithheld: 10000,
          cppContribution: 4339.20,
          eiPremium: 860.67,
          ppipPremium: 419.90,
          cppPensionableEarnings: 71300,
        },
        benefits: {
          ei: { amount: 5000, isParental: false, taxWithheld: 500 },
        },
      },
    }),
  );

  it("totalIncome = $90,000 (T4 + EI)", () => {
    expect(result.totalIncome).toBe(90000);
  });

  it("EI clawback triggered (income > $82,125)", () => {
    expect(result.clawbacksPayable).toBeGreaterThan(0);
  });

  it("federalAbatement > 0 (abatement still applies with clawback)", () => {
    expect(result.federalAbatement).toBeGreaterThan(1500);
  });

  it("abatement = 16.5% of basic federal tax (invariant holds with clawback)", () => {
    const basicFedTax = Math.max(
      0,
      result.federalTaxBeforeCredits - result.federalCredits,
    );
    expect(result.federalAbatement).toBeCloseTo(basicFedTax * 0.165, 2);
  });
});
