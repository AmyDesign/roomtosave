/**
 * 扣除项处理
 *
 * 扣除项作用于 Total Income → Net Income → Taxable Income。
 * RRSP 和 FHSA 是最常见的，其他扣除项（工会会费、托儿费等）作为 P1 扩展位。
 */
import type { DeductionsInput } from "./types";

export interface DeductionsBreakdown {
  rrsp: number;
  fhsa: number;
  other: number;
  total: number;
}

export function sumDeductions(deductions: DeductionsInput): DeductionsBreakdown {
  const rrsp = Math.max(0, deductions.rrspContribution || 0);
  const fhsa = Math.max(0, deductions.fhsaContribution || 0);
  const other =
    (deductions.unionDues ?? 0) +
    (deductions.childcareExpenses ?? 0) +
    (deductions.movingExpenses ?? 0) +
    (deductions.capitalLossCarryforward ?? 0) +
    (deductions.other ?? 0);

  return {
    rrsp,
    fhsa,
    other: Math.max(0, other),
    total: rrsp + fhsa + Math.max(0, other),
  };
}
