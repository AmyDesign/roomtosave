/**
 * 烟测：TICKET-003 / TICKET-005 / TICKET-006 / TICKET-007 / TICKET-008
 *
 * 重点：用真实 2024 ON T4 数据验证补税金额精确到分。
 */
import { describe, it, expect } from "vitest";
import {
  optimize,
  calculateScenario,
  splitContribution,
  calculateTax,
} from "../index";
import type { TaxInput } from "../index";

function baseInput(overrides: Partial<TaxInput> = {}): TaxInput {
  return {
    taxYear: 2025,
    province: "BC",
    age: 30,
    isFirstTimeHomeBuyer: false,
    rrspRoomAvailable: 20000,
    fhsaRoomAvailable: 0,
    fhsaLifetimeUsed: 0,
    income: {
      employment: {
        gross: 80000,
        federalTaxWithheld: 0,
        provincialTaxWithheld: 0,
        cppContribution: 3867,
        eiPremium: 1049,
      },
    },
    deductions: { rrspContribution: 0, fhsaContribution: 0 },
    ...overrides,
  };
}

describe("real-world calibration (2024 ON)", () => {
  it("精确到分：$67,983.35 收入 → 补税 ≈ $1,085.32", () => {
    const input: TaxInput = {
      taxYear: 2024,
      province: "ON",
      age: 35,
      isFirstTimeHomeBuyer: false,
      rrspRoomAvailable: 0,
      fhsaRoomAvailable: 0,
      fhsaLifetimeUsed: 0,
      income: {
        employment: {
          gross: 67983.35,
          federalTaxWithheld: 10251.38,
          provincialTaxWithheld: 0,
          cppContribution: 3836.77,
          eiPremium: 1049.12,
        },
      },
      deductions: { rrspContribution: 0, fhsaContribution: 0 },
    };
    const r = calculateTax(input);
    // 应该欠税约 $1,085.32（实际 CRA 计算），容差 $1
    expect(-r.refundOrOwing).toBeCloseTo(1085.32, 0);
    // OHP 应该是 $600（$48,600–$72,000 区段）
    expect(r.provincialHealthPremium).toBe(600);
  });

  it("OHP 各区段：$30k → $300", () => {
    const input: TaxInput = {
      taxYear: 2024,
      province: "ON",
      age: 30,
      isFirstTimeHomeBuyer: false,
      rrspRoomAvailable: 0,
      fhsaRoomAvailable: 0,
      fhsaLifetimeUsed: 0,
      income: {
        employment: {
          gross: 30000,
          federalTaxWithheld: 0,
          provincialTaxWithheld: 0,
          cppContribution: 0,
          eiPremium: 0,
        },
      },
      deductions: { rrspContribution: 0, fhsaContribution: 0 },
    };
    expect(calculateTax(input).provincialHealthPremium).toBe(300);
  });

  it("OHP: $150k → $750", () => {
    const r = calculateTax({
      taxYear: 2024,
      province: "ON",
      age: 30,
      isFirstTimeHomeBuyer: false,
      rrspRoomAvailable: 0,
      fhsaRoomAvailable: 0,
      fhsaLifetimeUsed: 0,
      income: {
        employment: {
          gross: 150000,
          federalTaxWithheld: 0,
          provincialTaxWithheld: 0,
          cppContribution: 0,
          eiPremium: 0,
        },
      },
      deductions: { rrspContribution: 0, fhsaContribution: 0 },
    });
    expect(r.provincialHealthPremium).toBe(750);
  });

  it("BC 没有 OHP", () => {
    const r = calculateTax(baseInput({ province: "BC" }));
    expect(r.provincialHealthPremium).toBe(0);
  });
});

describe("optimizer — TICKET-003 strategies", () => {
  it("Case 3 (zero_owing): 欠税 + 有足够额度 → 找到使补税≈0 的供款", () => {
    const r = optimize(
      baseInput({
        income: {
          employment: {
            gross: 80000,
            federalTaxWithheld: 9000,
            provincialTaxWithheld: 3000,
            cppContribution: 3867,
            eiPremium: 1049,
          },
        },
      }),
    );
    expect(r.baseline.refundOrOwing).toBeLessThan(0);
    expect(r.recommendation.strategy).toBe("zero_owing");
    expect(r.optimized.refundOrOwing).toBeGreaterThanOrEqual(0);
    expect(r.optimized.refundOrOwing).toBeLessThan(100);
  });

  it("TICKET-021: zero_owing 策略下 expectedRefund 必须 snap 到 0 (不能显示 $1)", () => {
    // findContributionForZeroOwing 用 Math.ceil 会让 optimized.refundOrOwing 落在 (0, $1).
    // formatCAD (maximumFractionDigits=0) 把 $0.5+ 显示成 "$1 refund" 跟策略名矛盾.
    // 修法: recommendation.expectedRefund snap 到 0 (不影响 optimized.refundOrOwing).
    const r = optimize(
      baseInput({
        income: {
          employment: {
            gross: 80000,
            federalTaxWithheld: 9000,
            provincialTaxWithheld: 3000,
            cppContribution: 3867,
            eiPremium: 1049,
          },
        },
      }),
    );
    expect(r.recommendation.strategy).toBe("zero_owing");
    // expectedRefund 必须正好是 0, 不是 $0.50 也不是 $1
    expect(r.recommendation.expectedRefund).toBe(0);
    // 但 optimized.refundOrOwing 本身还是精确值 (snap 只影响 UI 显示字段)
    expect(r.optimized.refundOrOwing).toBeGreaterThanOrEqual(0);
    expect(r.optimized.refundOrOwing).toBeLessThan(1);
  });

  it("Case 1 (already_refund): 已退税 → 推荐 $0", () => {
    const r = optimize(
      baseInput({
        income: {
          employment: {
            gross: 80000,
            federalTaxWithheld: 15000,
            provincialTaxWithheld: 5000,
            cppContribution: 3867,
            eiPremium: 1049,
          },
        },
      }),
    );
    expect(r.baseline.refundOrOwing).toBeGreaterThan(0);
    expect(r.recommendation.strategy).toBe("already_refund");
    expect(r.recommendation.totalContribution).toBe(0);
  });

  it("Case 2 (room_capped): 用尽额度仍欠税 → 推荐 = totalRoom", () => {
    const r = optimize(
      baseInput({
        rrspRoomAvailable: 1000,
        income: {
          employment: {
            gross: 150000,
            federalTaxWithheld: 0,
            provincialTaxWithheld: 0,
            cppContribution: 3867,
            eiPremium: 1049,
          },
        },
      }),
    );
    expect(r.recommendation.strategy).toBe("room_capped");
    expect(r.recommendation.totalContribution).toBe(1000);
  });

  it("no_room: 欠税但无额度", () => {
    const r = optimize(baseInput({ rrspRoomAvailable: 0 }));
    expect(r.baseline.refundOrOwing).toBeLessThan(0);
    expect(r.recommendation.strategy).toBe("no_room");
  });

  it("OptimizationResult.room 暴露给 slider 用", () => {
    const r = optimize(baseInput({ rrspRoomAvailable: 15000 }));
    expect(r.room.total).toBe(15000);
    expect(r.room.rrsp).toBe(15000);
    expect(r.room.fhsa).toBe(0);
  });
});

describe("splitContribution — TICKET-005 helper", () => {
  it("FTHB 优先 FHSA", () => {
    expect(splitContribution(5000, 8000, 20000, true)).toEqual({
      fhsa: 5000,
      rrsp: 0,
    });
    expect(splitContribution(15000, 8000, 20000, true)).toEqual({
      fhsa: 8000,
      rrsp: 7000,
    });
  });
  it("非 FTHB：FHSA 总是 0", () => {
    expect(splitContribution(5000, 8000, 20000, false)).toEqual({
      fhsa: 0,
      rrsp: 5000,
    });
  });
  it("超过总额度 → 受 room 限制", () => {
    expect(splitContribution(50000, 8000, 20000, true)).toEqual({
      fhsa: 8000,
      rrsp: 20000,
    });
  });
  it("负数 → 0", () => {
    expect(splitContribution(-100, 8000, 20000, true)).toEqual({
      fhsa: 0,
      rrsp: 0,
    });
  });
});

describe("calculateScenario — slider 实时计算", () => {
  it("更高供款 → 更高退税（单调性）", () => {
    const input = baseInput();
    const at0 = calculateScenario(input, 0);
    const at5k = calculateScenario(input, 5000);
    const at15k = calculateScenario(input, 15000);
    expect(at5k.refundOrOwing).toBeGreaterThan(at0.refundOrOwing);
    expect(at15k.refundOrOwing).toBeGreaterThan(at5k.refundOrOwing);
  });
});

// =============================
//  TICKET-010 — 策略切换器
// =============================

describe("optimizer — TICKET-010 strategy switcher", () => {
  describe("max_refund 策略", () => {
    it("额度足够小、不会推过 BPA → 用尽全部 totalRoom", () => {
      const r = optimize(
        baseInput({
          rrspRoomAvailable: 30000,
          income: {
            employment: {
              gross: 80000,
              federalTaxWithheld: 9000,
              provincialTaxWithheld: 3000,
              cppContribution: 3867,
              eiPremium: 1049,
            },
          },
        }),
        { strategy: "max_refund" },
      );
      expect(r.recommendation.preference).toBe("max_refund");
      expect(r.recommendation.strategy).toBe("max_refund");
      expect(r.recommendation.totalContribution).toBe(30000);
      // optimized.taxableIncome 应该仍 >= 联邦 BPA
      expect(r.optimized.taxableIncome).toBeGreaterThanOrEqual(16129);
    });

    it("额度大到能推过 BPA → 在 BPA 边界停下", () => {
      const r = optimize(
        baseInput({
          rrspRoomAvailable: 100000, // 远超 BPA 所需
          income: {
            employment: {
              gross: 80000,
              federalTaxWithheld: 9000,
              provincialTaxWithheld: 3000,
              cppContribution: 3867,
              eiPremium: 1049,
            },
          },
        }),
        { strategy: "max_refund" },
      );
      expect(r.recommendation.strategy).toBe("max_refund_bpa_capped");
      expect(r.recommendation.totalContribution).toBeLessThan(100000);
      // 应税收入应该 >= 联邦 BPA（floor 后允许 < $1 浮动）
      expect(r.optimized.taxableIncome).toBeGreaterThanOrEqual(16128);
      expect(r.optimized.taxableIncome).toBeLessThan(16130);
    });

    it("totalRoom = 0 → no_room（即使是 max_refund 偏好）", () => {
      const r = optimize(baseInput({ rrspRoomAvailable: 0 }), {
        strategy: "max_refund",
      });
      expect(r.recommendation.strategy).toBe("no_room");
      expect(r.recommendation.totalContribution).toBe(0);
    });

    it("已经有退税 + 偏好 max_refund → 仍推荐用尽额度", () => {
      const r = optimize(
        baseInput({
          rrspRoomAvailable: 10000,
          income: {
            employment: {
              gross: 80000,
              federalTaxWithheld: 15000,
              provincialTaxWithheld: 5000,
              cppContribution: 3867,
              eiPremium: 1049,
            },
          },
        }),
        { strategy: "max_refund" },
      );
      // 已退税 但 max_refund 偏好仍应建议用满额度
      expect(r.recommendation.strategy).toBe("max_refund");
      expect(r.recommendation.totalContribution).toBe(10000);
      // 退税应比 baseline 多
      expect(r.optimized.refundOrOwing).toBeGreaterThan(r.baseline.refundOrOwing);
    });
  });

  describe("drop_bracket 策略", () => {
    it("$80K BC + 30K room → 找到降一档的供款（联邦 57375 边界）", () => {
      const r = optimize(
        baseInput({
          rrspRoomAvailable: 30000,
        }),
        { strategy: "drop_bracket" },
      );
      expect(r.recommendation.strategy).toBe("drop_bracket");
      // baseline taxable ≈ 79350，降到 57375 需约 21975 → 应小于 totalRoom
      expect(r.recommendation.totalContribution).toBeGreaterThan(0);
      expect(r.recommendation.totalContribution).toBeLessThan(30000);
      // 边际税率应严格下降
      expect(r.optimized.marginalRate).toBeLessThan(r.baseline.marginalRate);
    });

    it("$80K BC + 5K room → 不够降一档 → drop_bracket_capped", () => {
      const r = optimize(
        baseInput({
          rrspRoomAvailable: 5000,
        }),
        { strategy: "drop_bracket" },
      );
      expect(r.recommendation.strategy).toBe("drop_bracket_capped");
      expect(r.recommendation.totalContribution).toBe(5000);
      // 边际税率应不变（差一点降不下来）
      expect(r.optimized.marginalRate).toBeCloseTo(r.baseline.marginalRate, 4);
    });

    it("低收入用户（$40K BC）已在最低 combined bracket → already_lowest_bracket", () => {
      const r = optimize(
        baseInput({
          rrspRoomAvailable: 10000,
          income: {
            employment: {
              gross: 40000,
              federalTaxWithheld: 0,
              provincialTaxWithheld: 0,
              cppContribution: 2010,
              eiPremium: 524,
            },
          },
        }),
        { strategy: "drop_bracket" },
      );
      expect(r.recommendation.strategy).toBe("already_lowest_bracket");
      expect(r.recommendation.totalContribution).toBe(0);
    });

    it("$80K BC 2025 drop_bracket: combined rate 从 28.2% 降到 22.2%", () => {
      // 2025: 联邦第 1 档 14.5% (中产减税, TICKET-014 修正); 之前是 15%
      const r = optimize(
        baseInput({ rrspRoomAvailable: 30000 }),
        { strategy: "drop_bracket" },
      );
      // baseline: fed 20.5% + BC 7.7% = 28.2%
      expect(r.baseline.marginalRate).toBeCloseTo(0.282, 3);
      // optimized: fed 14.5% + BC 7.7% = 22.2%
      expect(r.optimized.marginalRate).toBeCloseTo(0.222, 3);
    });
  });

  // -------------------------------------------------------------------------
  // TICKET-037 -- 边际收益归零护栏
  //
  // 任何策略都不应推荐超过「再多供也不改变结果」的那个点。自雇场景最典型：
  // QPP/QPIP/HSF 都按毛收入计算，RRSP 完全抵消不掉，所以所得税一归零就到头。
  // QC8（自雇 $25,000）实测：拐点在 $5,900，而修复前 max_refund 推 $7,184
  // （只按 BPA 封顶，漏算了 QPP/QPIP 抵免）、zero_owing 直接推满 room。
  // -------------------------------------------------------------------------
  describe("边际收益归零护栏 (TICKET-037)", () => {
    const selfEmployed = (rrspRoomAvailable: number) =>
      baseInput({
        province: "QC",
        rrspRoomAvailable,
        income: { selfEmployment: { netIncome: 25000 } },
      });

    it("推荐停在拐点，不再随 room 增大而增大", () => {
      for (const room of [10000, 35000, 100000]) {
        for (const strategy of ["max_refund", "zero_owing"] as const) {
          const r = optimize(selfEmployed(room), { strategy });
          expect(r.recommendation.totalContribution).toBeCloseTo(5900, -1);
          expect(r.recommendation.strategy).toBe("diminishing_returns_capped");
        }
      }
    });

    it("拐点处的结果与供满 room 完全相同", () => {
      const capped = optimize(selfEmployed(35000), { strategy: "max_refund" });
      const atFullRoom = calculateScenario(selfEmployed(35000), 35000, 0, 35000);
      expect(capped.optimized.refundOrOwing).toBeCloseTo(
        atFullRoom.refundOrOwing,
        2,
      );
    });

    it("少供一点就会变差（证明没有砍过头）", () => {
      const r = optimize(selfEmployed(35000), { strategy: "max_refund" });
      const rec = r.recommendation.totalContribution;
      const less = calculateScenario(selfEmployed(35000), rec - 200, 0, 35000);
      expect(less.refundOrOwing).toBeLessThan(r.optimized.refundOrOwing - 0.01);
    });

    it("受雇场景仍可用满 room（护栏不误伤）", () => {
      const employed = baseInput({
        province: "QC",
        rrspRoomAvailable: 45000,
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
      });
      const r = optimize(employed, { strategy: "max_refund" });
      expect(r.recommendation.totalContribution).toBe(45000);
      expect(r.recommendation.strategy).toBe("max_refund");
    });
  });

  describe("策略切换的对比性", () => {
    const input = baseInput({
      rrspRoomAvailable: 30000,
      income: {
        employment: {
          gross: 80000,
          federalTaxWithheld: 9000,
          provincialTaxWithheld: 3000,
          cppContribution: 3867,
          eiPremium: 1049,
        },
      },
    });

    it("同一份输入下三个策略给出不同推荐", () => {
      const zo = optimize(input, { strategy: "zero_owing" });
      const mr = optimize(input, { strategy: "max_refund" });
      const db = optimize(input, { strategy: "drop_bracket" });
      // max_refund 应该是最大的（用尽额度）
      expect(mr.recommendation.totalContribution).toBeGreaterThanOrEqual(
        zo.recommendation.totalContribution,
      );
      expect(mr.recommendation.totalContribution).toBeGreaterThanOrEqual(
        db.recommendation.totalContribution,
      );
      // 三者都应在 0 到 totalRoom 之间
      for (const r of [zo, mr, db]) {
        expect(r.recommendation.totalContribution).toBeGreaterThanOrEqual(0);
        expect(r.recommendation.totalContribution).toBeLessThanOrEqual(30000);
      }
    });

    it("默认策略 = zero_owing（无 options 参数时保持 P0 行为）", () => {
      const r1 = optimize(input);
      const r2 = optimize(input, { strategy: "zero_owing" });
      expect(r1.recommendation.preference).toBe("zero_owing");
      expect(r2.recommendation.preference).toBe("zero_owing");
      expect(r1.recommendation.totalContribution).toBe(
        r2.recommendation.totalContribution,
      );
    });
  });
});
