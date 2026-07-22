/**
 * Provincial tax calculation (Ontario surtax, OHP, LIFT, BC BTR, etc.)
 */
import type { ProvincialTaxConfig } from "./types";
import { calculateBracketTax, getMarginalRate } from "./federal-tax";

export function calculateProvincialTaxBeforeCredits(
  taxableIncome: number,
  config: ProvincialTaxConfig,
): number {
  return calculateBracketTax(taxableIncome, config.brackets);
}

export function calculateHealthPremium(
  taxableIncome: number,
  config: ProvincialTaxConfig,
): number {
  if (!config.healthPremium || config.healthPremium.length === 0) return 0;
  for (const seg of config.healthPremium) {
    if (taxableIncome <= seg.upTo) {
      if (seg.flat !== undefined) return seg.flat;
      const base = seg.base ?? 0;
      const rate = seg.rate ?? 0;
      const from = seg.from ?? 0;
      const max = seg.max ?? Number.POSITIVE_INFINITY;
      return Math.min(max, base + rate * Math.max(0, taxableIncome - from));
    }
  }
  return 0;
}

export function calculateLIFT(args: {
  netIncome: number;
  earnedIncome: number;
  config: ProvincialTaxConfig;
}): number {
  const c = args.config.liftCredit;
  if (!c) return 0;
  if (args.earnedIncome < c.minEarnedIncome) return 0;
  const reduced = c.max - c.phaseOutRate * Math.max(0, args.netIncome - c.phaseOutStart);
  return Math.max(0, reduced);
}

export function calculateBasicTaxReduction(
  provincialTaxAfterCredits: number,
  netIncome: number,
  config: ProvincialTaxConfig,
): number {
  if (!config.basicTaxReduction) return 0;
  const { maxAmount, phaseOutStart, phaseOutRate } = config.basicTaxReduction;
  const theoretical = Math.max(0, maxAmount - phaseOutRate * Math.max(0, netIncome - phaseOutStart));
  return Math.min(theoretical, provincialTaxAfterCredits);
}

/**
 * Refundable provincial credit reduced by a flat percentage of net income
 * above a threshold (e.g. BC Sales Tax Credit via Form BC479, reported on
 * T1 line 47900 "Provincial or territorial refundable credits"). TICKET-026.
 *
 * Single-filer formula: credit = max(0, maxAmount - phaseOutRate * max(0, netIncome - phaseOutStart))
 * For BC: $75 max, reduced 2% of net income over $15,000 (single; spousal
 * thresholds/amounts differ and are NOT modelled since the engine has no
 * spouse/marital-status concept).
 *
 * Unlike the non-refundable LIFT/basic-tax-reduction credits (which can only
 * reduce provincial tax payable to zero), this credit is REFUNDABLE -- it is
 * added directly to the taxpayer's refund (or used to reduce a balance owing)
 * regardless of whether provincial tax payable is already zero. It must be
 * added to refundOrOwing in the calculator, NOT subtracted from netProvincialTax.
 */
export function calculateRefundableSalesTaxCredit(args: {
  netIncome: number;
  config: ProvincialTaxConfig;
}): number {
  const c = args.config.salesTaxCredit;
  if (!c) return 0;
  const reduced = c.maxAmount - c.phaseOutRate * Math.max(0, args.netIncome - c.phaseOutStart);
  // CRA convention: amounts entered on tax forms/schedules (incl. Form BC479)
  // are rounded to the nearest whole dollar. WS reproduces this -- e.g. at
  // net income $16,129 the raw formula gives $52.42, but WS reports exactly
  // $52 (verified against uploaded WS export, TICKET-026). Round here so the
  // engine matches WS to the cent in the phase-out band; at full ($75) or
  // zero ($0) the rounding is a no-op.
  return Math.round(Math.max(0, reduced));
}

export function calculateSurtax(
  provincialTaxAfterCredits: number,
  config: ProvincialTaxConfig,
): number {
  if (!config.surtaxes || config.surtaxes.length === 0) return 0;
  let surtax = 0;
  for (const tier of config.surtaxes) {
    if (provincialTaxAfterCredits > tier.threshold) {
      surtax += (provincialTaxAfterCredits - tier.threshold) * tier.rate;
    }
  }
  return surtax;
}

export function getProvincialMarginalRate(
  taxableIncome: number,
  config: ProvincialTaxConfig,
): number {
  const baseRate = getMarginalRate(taxableIncome, config.brackets);
  if (config.surtaxes && config.surtaxes.length > 0) {
    let multiplier = 1;
    const provincialBase = calculateBracketTax(taxableIncome, config.brackets);
    for (const tier of config.surtaxes) {
      if (provincialBase > tier.threshold) multiplier += tier.rate;
    }
    return baseRate * multiplier;
  }
  return baseRate;
}
