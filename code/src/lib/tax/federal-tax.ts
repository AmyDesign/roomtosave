/**
 * 联邦税计算
 */
import type { FederalTaxConfig, TaxBracket } from "./types";

/**
 * 按累进税阶分段计算税额
 */
export function calculateBracketTax(
  taxableIncome: number,
  brackets: TaxBracket[],
): number {
  if (taxableIncome <= 0) return 0;

  let tax = 0;
  let previousCap = 0;

  for (const bracket of brackets) {
    if (taxableIncome <= previousCap) break;
    const cap = Math.min(taxableIncome, bracket.upTo);
    const slice = cap - previousCap;
    if (slice > 0) tax += slice * bracket.rate;
    previousCap = bracket.upTo;
    if (taxableIncome <= bracket.upTo) break;
  }

  return tax;
}

/**
 * 计算给定应税收入处的边际税率
 */
export function getMarginalRate(
  taxableIncome: number,
  brackets: TaxBracket[],
): number {
  for (const bracket of brackets) {
    if (taxableIncome <= bracket.upTo) return bracket.rate;
  }
  return brackets[brackets.length - 1].rate;
}

/**
 * 计算联邦 BPA（含高收入 phase-out）
 */
export function calculateFederalBPA(
  netIncome: number,
  config: FederalTaxConfig,
): number {
  const { base, phaseOutStart, phaseOutEnd, minimum } = config.bpa;
  if (!phaseOutStart || !phaseOutEnd || !minimum) return base;

  if (netIncome <= phaseOutStart) return base;
  if (netIncome >= phaseOutEnd) return minimum;

  // 线性 phase-out
  const range = phaseOutEnd - phaseOutStart;
  const reduction = ((netIncome - phaseOutStart) / range) * (base - minimum);
  return base - reduction;
}

/**
 * 计算联邦税（基础税额，未减抵免）
 */
export function calculateFederalTaxBeforeCredits(
  taxableIncome: number,
  config: FederalTaxConfig,
): number {
  return calculateBracketTax(taxableIncome, config.brackets);
}
