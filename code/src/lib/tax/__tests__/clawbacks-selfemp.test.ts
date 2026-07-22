/**
 * TICKET-013 测试: EI 福利 + EI clawback + 自雇收入 + 自雇 CPP 自动算
 */
import { describe, it, expect } from "vitest";
import { calculateTax } from "../calculator";
import { calculateClawbacks } from "../clawbacks";
import { getFederalConfig } from "../data";
import type { TaxInput } from "../types";

function baseInput(overrides: Partial<TaxInput> = {}): TaxInput {
  return {
    taxYear: 2025,
    province: "BC",
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

// =========================
// EI 福利金聚合
// =========================
describe("EI benefits — TICKET-013", () => {
  it("EI 福利金 100% 计入 totalIncome", () => {
    const r = calculateTax(
      baseInput({
        income: {
          employment: {
            gross: 0,
            federalTaxWithheld: 0,
            provincialTaxWithheld: 0,
            cppContribution: 0,
            eiPremium: 0,
          },
          benefits: {
            ei: { amount: 10000, isParental: false, taxWithheld: 1000 },
          },
        },
      }),
    );
    expect(r.totalIncome).toBe(10000);
    // EI 预扣税进 federalTaxWithheld
    expect(r.totalTaxWithheld).toBe(1000);
  });

  it("EI 不计入 Earned Income (不影响 RRSP 额度) — 通过 totalIncome 验证间接", () => {
    // 这里只验证 totalIncome 与 employment.gross 解耦
    const r = calculateTax(
      baseInput({
        income: {
          benefits: {
            ei: { amount: 5000, isParental: true, taxWithheld: 0 },
          },
        },
      }),
    );
    expect(r.totalIncome).toBe(5000);
  });
});

// =========================
// EI Clawback 算法
// =========================
describe("EI clawback — TICKET-013", () => {
  const federalConfig2025 = getFederalConfig(2025);

  it("低收入 (低于 threshold) → 不触发 clawback", () => {
    const c = calculateClawbacks({
      benefits: { ei: { amount: 10000, isParental: false, taxWithheld: 0 } },
      netIncomeBeforeSBR: 50000, // < 82125 threshold
      federalConfig: federalConfig2025,
    });
    expect(c.ei).toBe(0);
    expect(c.total).toBe(0);
  });

  it("高收入 + 非产假 EI → 触发 clawback (TICKET-017 修正公式)", () => {
    const c = calculateClawbacks({
      benefits: { ei: { amount: 10000, isParental: false, taxWithheld: 0 } },
      netIncomeBeforeSBR: 100000, // 82125 threshold + 17875 over
      federalConfig: federalConfig2025,
    });
    // 正确公式: 0.30 × min(EI, excess)
    //         = 0.30 × min(10000, 21000)
    //         = 0.30 × 10000 = 3000
    // (旧错误公式 min(EI, 0.30×excess) 会得 6300, TICKET-017 修复)
    expect(c.ei).toBeCloseTo(3000, 1);
  });

  it("clawback 上限 = 30% × EI 本身 (excess 再大也不能超)", () => {
    const c = calculateClawbacks({
      benefits: { ei: { amount: 5000, isParental: false, taxWithheld: 0 } },
      netIncomeBeforeSBR: 200000, // 远超 threshold
      federalConfig: federalConfig2025,
    });
    // 0.30 × min(5000, 121000) = 0.30 × 5000 = 1500
    expect(c.ei).toBe(1500);
  });

  it("产假 / 陪产假 EI → 完全豁免 clawback", () => {
    const c = calculateClawbacks({
      benefits: { ei: { amount: 20000, isParental: true, taxWithheld: 0 } },
      netIncomeBeforeSBR: 150000, // 远超 threshold
      federalConfig: federalConfig2025,
    });
    expect(c.ei).toBe(0);
  });

  it("无 EI → clawback 为 0", () => {
    const c = calculateClawbacks({
      benefits: undefined,
      netIncomeBeforeSBR: 200000,
      federalConfig: federalConfig2025,
    });
    expect(c.total).toBe(0);
  });

  it("EI clawback 整合进 calculator: 高收入工资 + 非产假 EI (TICKET-017 修正)", () => {
    // 工资 $90K + EI $8K 非产假 → 总 $98K, netIncomeBeforeSBR = $98K (cpp=0 没扣 enhanced)
    // 正确 clawback = 0.30 × min(8000, 98000-82125) = 0.30 × min(8000, 15875) = 0.30 × 8000 = 2400
    const r = calculateTax(
      baseInput({
        income: {
          employment: {
            gross: 90000,
            federalTaxWithheld: 0,
            provincialTaxWithheld: 0,
            cppContribution: 0,
            eiPremium: 0,
          },
          benefits: {
            ei: { amount: 8000, isParental: false, taxWithheld: 0 },
          },
        },
      }),
    );
    expect(r.totalIncome).toBe(98000);
    expect(r.netIncome).toBeLessThan(r.totalIncome);
    // clawback ≈ 2400 (totalIncome - netIncome)
    const impliedClawback = r.totalIncome - r.netIncome;
    expect(impliedClawback).toBeGreaterThan(2350);
    expect(impliedClawback).toBeLessThan(2450);
  });
});

// =========================
// 自雇收入 + CPP 自动算
// =========================
describe("Self-employment — TICKET-013", () => {
  it("自雇 net income 100% 计入 totalIncome", () => {
    const r = calculateTax(
      baseInput({
        income: { selfEmployment: { netIncome: 50000 } },
      }),
    );
    expect(r.totalIncome).toBe(50000);
  });

  it("自雇 $50K → 自动算 CPP, netIncome 应该比 totalIncome 少 (扣除 line 22200 + 22215)", () => {
    const r = calculateTax(
      baseInput({
        income: { selfEmployment: { netIncome: 50000 } },
      }),
    );
    // pensionable = min(50000, 71300) - 3500 = 46500
    // line 22200 (雇主基础) = 46500 × 4.95% ≈ 2301.75
    // line 22215 (双份增强) = 46500 × 2% = 930
    // 总扣除 ≈ 3231.75
    const expectedDeduction = 46500 * 0.0495 + 46500 * 0.02;
    const impliedDeduction = r.totalIncome - r.netIncome;
    expect(impliedDeduction).toBeCloseTo(expectedDeduction, 1);
  });

  it("自雇 $100K (超过 YMPE $71,300) → pensionable cap 在 YMPE - basicExemption", () => {
    const r = calculateTax(
      baseInput({
        income: { selfEmployment: { netIncome: 100000 } },
      }),
    );
    // pensionable = 71300 - 3500 = 67800 (cap)
    // 扣除 = 67800 × (0.0495 + 0.02) = 67800 × 0.0695 ≈ 4712.10
    const pensionable = 71300 - 3500;
    const expectedDeduction = pensionable * 0.0495 + pensionable * 0.02;
    const impliedDeduction = r.totalIncome - r.netIncome;
    expect(impliedDeduction).toBeCloseTo(expectedDeduction, 1);
  });

  it("自雇低于 basicExemption ($3500) → pensionable = 0, 无 CPP 扣除", () => {
    const r = calculateTax(
      baseInput({
        income: { selfEmployment: { netIncome: 3000 } },
      }),
    );
    expect(r.totalIncome).toBe(3000);
    // 应该没有 CPP 扣除 → netIncome ≈ totalIncome
    expect(r.netIncome).toBe(3000);
  });
});

// =========================
// 混合: 工资 + EI + 自雇
// =========================
describe("Mixed income — TICKET-013", () => {
  it("工资 $40K + EI $5K 非产假 + 自雇 $20K → totalIncome = $65K", () => {
    const r = calculateTax(
      baseInput({
        income: {
          employment: {
            gross: 40000,
            federalTaxWithheld: 0,
            provincialTaxWithheld: 0,
            cppContribution: 1800,
            eiPremium: 600,
          },
          benefits: { ei: { amount: 5000, isParental: false, taxWithheld: 0 } },
          selfEmployment: { netIncome: 20000 },
        },
      }),
    );
    expect(r.totalIncome).toBe(65000);
    // 该 case netIncomeBeforeSBR ≈ 65K - cppEnhanced - selfEmpCpp22200 ≈ 65K - small
    // < 79K threshold → no EI clawback
    // netIncome 接近 totalIncome 但少自雇 CPP 扣除
    expect(r.netIncome).toBeLessThan(r.totalIncome);
    expect(r.netIncome).toBeGreaterThan(60000); // 至少接近
  });

  it("baseline (P0 case): 工资单一 — TICKET-010 测试场景不应被破坏", () => {
    // P0 标准 $80K BC case 应该仍然产生相同 taxableIncome
    const r = calculateTax(
      baseInput({
        income: {
          employment: {
            gross: 80000,
            federalTaxWithheld: 0,
            provincialTaxWithheld: 0,
            cppContribution: 3867,
            eiPremium: 1049,
          },
        },
      }),
    );
    expect(r.totalIncome).toBe(80000);
    // netIncome 应该 = 80000 - cppEnhanced ≈ 79350 (P0 已验证)
    expect(r.netIncome).toBeCloseTo(79350, 0);
  });
});
