/**
 * 福利金回缴 (Clawbacks) - 对应 CRA line 23200 (Social Benefits Repayment)
 *
 * P1 - TICKET-013: EI clawback 实现
 *
 * **EI clawback**:
 *   规则: 非产假/陪产假 EI 福利金, 当净收入 (调整前) 超过 eiClawbackThreshold 时,
 *         需要按 30% 回缴, cap 在收到的 EI 福利金本身。
 *   公式: clawback = min(eiNonParentalAmount, 0.30 × max(0, netIncomeBeforeSBR - threshold))
 *   产假 / 陪产假 EI **完全豁免** clawback。
 *
 *   threshold 来源: federalConfig.eiClawbackThreshold (2024 = $79,000, 2025 = $82,125)
 *
 * **OAS clawback** (P1/P2 后续):
 *   预留接口, 暂未实现。规则: 15% × max(0, netIncome - $93,454).
 *
 * 注: clawback 计算依赖 netIncome, 但 clawback 本身也是 deduction 影响 netIncome。
 *     CRA 实际做法是用 "netIncomeBeforeSBR" (即不含 line 23200) 来算 SBR, 避免循环。
 *     调用方应该先算除 SBR 外的所有 deductions, 得到 netIncomeBeforeSBR, 再调用此函数。
 */
import type { BenefitIncome, FederalTaxConfig } from "./types";

export interface ClawbackBreakdown {
  /** EI 回缴 (line 23200 一部分) */
  ei: number;
  /** OAS 回缴 (P1/P2 后续; 当前总是 0) */
  oas: number;
  /** 总 SBR (line 23200) */
  total: number;
}

/**
 * 计算 social benefits repayment (SBR, line 23200)
 *
 * @param netIncomeBeforeSBR 已减除其他扣除项 (RRSP/FHSA/CPP 增强/CPP 22200 等) 但 **未减 SBR** 的净收入
 */
export function calculateClawbacks(args: {
  benefits: BenefitIncome | undefined;
  netIncomeBeforeSBR: number;
  federalConfig: FederalTaxConfig;
}): ClawbackBreakdown {
  const { benefits, netIncomeBeforeSBR, federalConfig } = args;

  let ei = 0;
  let oas = 0;

  // --- EI clawback ---
  // CRA formula: lesser of (30% × regular EI) and (30% × (netIncome − threshold))
  // = 0.30 × min(EI, excess)
  // 这里曾经写成 min(EI, 0.30 × excess), 数学上不等价: 会在 EI < 0.30 × excess
  // 但 EI > excess × 0.30 时 高估 clawback (TICKET-017 修复).
  if (benefits?.ei && !benefits.ei.isParental) {
    const eiAmount = Math.max(0, benefits.ei.amount);
    const excess = Math.max(
      0,
      netIncomeBeforeSBR - federalConfig.eiClawbackThreshold,
    );
    ei = 0.30 * Math.min(eiAmount, excess);
  }

  // --- OAS clawback (P1/P2 后续) ---
  // 预留: if (benefits?.oas) { oas = min(benefits.oas, 0.15 * max(0, netIncomeBeforeSBR - federalConfig.oasClawbackThreshold)); }

  return { ei, oas, total: ei + oas };
}
