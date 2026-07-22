/**
 * Optimizer - P1 TICKET-010: supports 3 user preference strategies
 *
 *   - zero_owing   (P0 default): contribute just enough to bring tax owing to 0
 *   - max_refund   (P1):         use full room, but stop before pushing taxable income below federal BPA
 *   - drop_bracket (P1):         smallest contribution that lowers combined marginal rate by one bracket
 *
 * Within each path, the actual result label (RecommendationStrategy) reflects
 * the boundary that was hit (already_refund / room_capped / max_refund_bpa_capped / etc.).
 *
 * FHSA priority (first-time home buyers): allocate FHSA first, then RRSP.
 */
import type {
  TaxInput,
  OptimizationResult,
  TaxBreakdown,
  Warning,
  RationaleItem,
  StrategyPreference,
  RecommendationStrategy,
  FederalTaxConfig,
  ProvincialTaxConfig,
} from "./types";
import { calculateTax } from "./calculator";
import { getFederalConfig, getProvincialConfig } from "./data";

const SENSITIVITY_POINTS = 21;
const SEARCH_TOLERANCE = 0.5;
const MAX_SEARCH_ITER = 60;

export interface OptimizeOptions {
  strategy?: StrategyPreference;
}

export function optimize(
  input: TaxInput,
  options: OptimizeOptions = {},
): OptimizationResult {
  const preference: StrategyPreference = options.strategy ?? "zero_owing";
  const federalConfig = getFederalConfig(input.taxYear);
  const provincialConfig = getProvincialConfig(input.taxYear, input.province);

  const fhsaRoomActual = input.isFirstTimeHomeBuyer
    ? Math.min(
        Math.max(0, input.fhsaRoomAvailable),
        Math.max(0, federalConfig.fhsaLifetimeLimit - input.fhsaLifetimeUsed),
      )
    : 0;
  const rrspRoom = Math.max(0, input.rrspRoomAvailable);
  const totalRoom = fhsaRoomActual + rrspRoom;

  const baseline = calculateScenario(input, 0, fhsaRoomActual, rrspRoom);

  let optimalTotal = 0;
  let strategy: RecommendationStrategy;

  if (preference === "zero_owing") {
    ({ amount: optimalTotal, strategy } = solveZeroOwing({
      input,
      baseline,
      totalRoom,
      fhsaRoomActual,
      rrspRoom,
    }));
  } else if (preference === "max_refund") {
    ({ amount: optimalTotal, strategy } = solveMaxRefund({
      input,
      totalRoom,
      fhsaRoomActual,
      rrspRoom,
      federalConfig,
    }));
  } else {
    ({ amount: optimalTotal, strategy } = solveDropBracket({
      input,
      baseline,
      totalRoom,
      fhsaRoomActual,
      rrspRoom,
      federalConfig,
      provincialConfig,
    }));
  }

  // TICKET-037: never recommend past the point where extra dollars stop
  // helping. Applied to every strategy so the guardrail cannot be bypassed by
  // adding a new one later.
  const trimmed = findDiminishingReturnPoint(
    input,
    optimalTotal,
    fhsaRoomActual,
    rrspRoom,
  );
  if (trimmed < optimalTotal - 0.5) {
    optimalTotal = trimmed;
    strategy = "diminishing_returns_capped";
  }

  const { fhsa: fhsaContribution, rrsp: rrspContribution } = splitContribution(
    optimalTotal,
    fhsaRoomActual,
    rrspRoom,
    input.isFirstTimeHomeBuyer,
  );

  const optimized = calculateTax({
    ...input,
    deductions: {
      ...input.deductions,
      rrspContribution,
      fhsaContribution,
    },
  });

  const sensitivity = buildSensitivity({
    input,
    totalRoomCap: totalRoom,
    pointCount: SENSITIVITY_POINTS,
    fhsaRoomActual,
    rrspRoom,
  });

  const warnings = buildWarnings({
    input,
    federalConfig,
    optimized,
    fhsaContribution,
    rrspContribution,
  });

  const rationale = buildRationale({
    preference,
    strategy,
    fhsaContribution,
    rrspContribution,
    baseline,
    optimized,
    isFirstTimeHomeBuyer: input.isFirstTimeHomeBuyer,
    totalRoom,
  });

  const taxSaved = baseline.totalTax - optimized.totalTax;

  // P1 TICKET-021: zero_owing 策略下, findContributionForZeroOwing 用 Math.ceil 把
  // contribution 向上取整到整数美元, 导致 optimized.refundOrOwing 落在 (0, $1) 的小
  // 残值 (overshoot ≤ 1 × 边际税率, 最坏 ~$0.84). formatCAD 的 maximumFractionDigits=0
  // 会把 $0.50+ 显示成 "$1 refund", 跟策略名称 "Zero out tax owing" 矛盾.
  // 既然策略意图就是 0, snap 到 0 保 UI 一致. (只影响 recommendation.expectedRefund 显示,
  // 不动 optimized.refundOrOwing 本身, 所以 ComparisonTable 和 InteractiveScenario 仍用精确值)
  const rawRefund = optimized.refundOrOwing;
  const expectedRefund =
    strategy === "zero_owing" && rawRefund > 0 && rawRefund < 1
      ? 0
      : round(rawRefund);

  return {
    baseline,
    optimized,
    recommendation: {
      fhsaContribution: round(fhsaContribution),
      rrspContribution: round(rrspContribution),
      totalContribution: round(fhsaContribution + rrspContribution),
      expectedRefund,
      taxSaved: round(taxSaved),
      preference,
      strategy,
      rationale,
    },
    room: {
      total: round(totalRoom),
      fhsa: round(fhsaRoomActual),
      rrsp: round(rrspRoom),
    },
    sensitivity,
    warnings,
  };
}

export function splitContribution(
  total: number,
  fhsaRoom: number,
  rrspRoom: number,
  isFirstTimeHomeBuyer: boolean,
): { fhsa: number; rrsp: number } {
  const clamped = Math.max(0, total);
  if (isFirstTimeHomeBuyer) {
    const fhsa = Math.min(clamped, Math.max(0, fhsaRoom));
    const rrsp = Math.min(clamped - fhsa, Math.max(0, rrspRoom));
    return { fhsa, rrsp };
  }
  return { fhsa: 0, rrsp: Math.min(clamped, Math.max(0, rrspRoom)) };
}

export function calculateScenario(
  input: TaxInput,
  totalContribution: number,
  fhsaRoomActual?: number,
  rrspRoom?: number,
): TaxBreakdown {
  const federalConfig = getFederalConfig(input.taxYear);
  const fhsa =
    fhsaRoomActual ??
    (input.isFirstTimeHomeBuyer
      ? Math.min(
          Math.max(0, input.fhsaRoomAvailable),
          Math.max(0, federalConfig.fhsaLifetimeLimit - input.fhsaLifetimeUsed),
        )
      : 0);
  const rrsp = rrspRoom ?? Math.max(0, input.rrspRoomAvailable);
  const { fhsa: fhsaContribution, rrsp: rrspContribution } = splitContribution(
    totalContribution,
    fhsa,
    rrsp,
    input.isFirstTimeHomeBuyer,
  );
  return calculateTax({
    ...input,
    deductions: {
      ...input.deductions,
      rrspContribution,
      fhsaContribution,
    },
  });
}

interface SolverArgs {
  input: TaxInput;
  baseline: TaxBreakdown;
  totalRoom: number;
  fhsaRoomActual: number;
  rrspRoom: number;
}

/**
 * TICKET-037 guardrail: the smallest contribution achieving the same result as
 * `proposed`.
 *
 * Every strategy can over-recommend. `zero_owing` falls back to the full room
 * whenever owing cannot be zeroed; `max_refund` caps at the BPA even though the
 * real plateau arrives earlier, because credits other than the BPA (CPP/QPP,
 * EI, QPIP) also offset tax. Past the plateau each extra dollar buys nothing
 * and permanently consumes room.
 *
 * This bites hardest for the self-employed: their CPP/QPP, QPIP and health-fund
 * contributions are computed on GROSS income, so no deduction can reduce them.
 * In QC8 (self-employment $25,000) 69% of the bill is outside income tax, and
 * the plateau lands at $5,900 while the strategies proposed $7,184 and $35,000.
 *
 * refundOrOwing is non-decreasing in contribution, so a binary search finds the
 * knee. Returns `proposed` unchanged when there is no plateau below it.
 */
function findDiminishingReturnPoint(
  input: TaxInput,
  proposed: number,
  fhsaRoomActual: number,
  rrspRoom: number,
): number {
  if (proposed <= 0) return proposed;
  const at = (amount: number) =>
    calculateScenario(input, amount, fhsaRoomActual, rrspRoom).refundOrOwing;
  const best = at(proposed);
  // within a cent of the best outcome counts as achieving it
  const EPSILON = 0.01;
  if (at(0) >= best - EPSILON) return 0;

  let lo = 0; // known strictly worse
  let hi = proposed; // known to achieve `best`
  // converge to the cent so the answer does not depend on the starting bound
  // (otherwise two strategies proposing different amounts can land $1 apart)
  for (let i = 0; i < MAX_SEARCH_ITER && hi - lo > 0.01; i += 1) {
    const mid = (lo + hi) / 2;
    if (at(mid) >= best - EPSILON) hi = mid;
    else lo = mid;
  }
  return Math.min(proposed, Math.ceil(hi));
}

function solveZeroOwing(
  args: Omit<SolverArgs, "baseline"> & { baseline: TaxBreakdown },
): { amount: number; strategy: RecommendationStrategy } {
  const { input, baseline, totalRoom, fhsaRoomActual, rrspRoom } = args;
  if (baseline.refundOrOwing >= 0) {
    return { amount: 0, strategy: "already_refund" };
  }
  if (totalRoom <= 0) {
    return { amount: 0, strategy: "no_room" };
  }
  const maxRoomResult = calculateScenario(
    input,
    totalRoom,
    fhsaRoomActual,
    rrspRoom,
  );
  if (maxRoomResult.refundOrOwing < 0) {
    return { amount: totalRoom, strategy: "room_capped" };
  }
  const amount = findContributionForZeroOwing(
    input,
    totalRoom,
    fhsaRoomActual,
    rrspRoom,
  );
  return { amount, strategy: "zero_owing" };
}

function solveMaxRefund(args: {
  input: TaxInput;
  totalRoom: number;
  fhsaRoomActual: number;
  rrspRoom: number;
  federalConfig: FederalTaxConfig;
}): { amount: number; strategy: RecommendationStrategy } {
  const { input, totalRoom, fhsaRoomActual, rrspRoom, federalConfig } = args;
  if (totalRoom <= 0) {
    return { amount: 0, strategy: "no_room" };
  }
  const atMax = calculateScenario(input, totalRoom, fhsaRoomActual, rrspRoom);
  if (atMax.taxableIncome >= federalConfig.bpa.base) {
    return { amount: totalRoom, strategy: "max_refund" };
  }
  const baseline = calculateScenario(input, 0, fhsaRoomActual, rrspRoom);
  const target = federalConfig.bpa.base;
  const needed = baseline.taxableIncome - target;
  const amount = Math.max(0, Math.min(totalRoom, Math.floor(needed)));
  return { amount, strategy: "max_refund_bpa_capped" };
}

function solveDropBracket(args: {
  input: TaxInput;
  baseline: TaxBreakdown;
  totalRoom: number;
  fhsaRoomActual: number;
  rrspRoom: number;
  federalConfig: FederalTaxConfig;
  provincialConfig: ProvincialTaxConfig;
}): { amount: number; strategy: RecommendationStrategy } {
  const { baseline, totalRoom, federalConfig, provincialConfig } = args;
  const bounds = bracketBoundaries(federalConfig, provincialConfig);
  const currentTaxable = baseline.taxableIncome;
  let target: number | null = null;
  for (const b of bounds) {
    if (b < currentTaxable) target = b;
    else break;
  }
  if (target === null || totalRoom <= 0) {
    if (totalRoom <= 0 && target !== null) {
      return { amount: 0, strategy: "no_room" };
    }
    return { amount: 0, strategy: "already_lowest_bracket" };
  }
  const required = Math.ceil(currentTaxable - target);
  if (required > totalRoom) {
    return { amount: totalRoom, strategy: "drop_bracket_capped" };
  }
  return { amount: required, strategy: "drop_bracket" };
}

function bracketBoundaries(
  federalConfig: FederalTaxConfig,
  provincialConfig: ProvincialTaxConfig,
): number[] {
  const set = new Set<number>();
  for (const b of federalConfig.brackets) {
    if (Number.isFinite(b.upTo)) set.add(b.upTo);
  }
  for (const b of provincialConfig.brackets) {
    if (Number.isFinite(b.upTo)) set.add(b.upTo);
  }
  return Array.from(set).sort((a, b) => a - b);
}

function findContributionForZeroOwing(
  input: TaxInput,
  totalRoom: number,
  fhsaRoomActual: number,
  rrspRoom: number,
): number {
  let lo = 0;
  let hi = totalRoom;
  for (let i = 0; i < MAX_SEARCH_ITER; i++) {
    if (hi - lo < SEARCH_TOLERANCE) break;
    const mid = (lo + hi) / 2;
    const r = calculateScenario(input, mid, fhsaRoomActual, rrspRoom);
    if (r.refundOrOwing < 0) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return Math.min(Math.ceil(hi), totalRoom);
}

function buildSensitivity(args: {
  input: TaxInput;
  totalRoomCap: number;
  pointCount: number;
  fhsaRoomActual: number;
  rrspRoom: number;
}): OptimizationResult["sensitivity"] {
  const { input, totalRoomCap, pointCount, fhsaRoomActual, rrspRoom } = args;
  const result: OptimizationResult["sensitivity"] = [];
  if (totalRoomCap <= 0) {
    const single = calculateScenario(input, 0, fhsaRoomActual, rrspRoom);
    return [
      {
        totalContribution: 0,
        refund: single.refundOrOwing,
        marginalRate: single.marginalRate,
      },
    ];
  }
  const step = totalRoomCap / (pointCount - 1);
  for (let i = 0; i < pointCount; i++) {
    const amount = step * i;
    const r = calculateScenario(input, amount, fhsaRoomActual, rrspRoom);
    result.push({
      totalContribution: round(amount),
      refund: round(r.refundOrOwing),
      marginalRate: r.marginalRate,
    });
  }
  return result;
}

function buildWarnings(args: {
  input: TaxInput;
  federalConfig: FederalTaxConfig;
  optimized: TaxBreakdown;
  fhsaContribution: number;
  rrspContribution: number;
}): Warning[] {
  const warnings: Warning[] = [];
  const { input, federalConfig, optimized, fhsaContribution, rrspContribution } =
    args;

  if (input.isFirstTimeHomeBuyer) {
    const remainingLifetime = Math.max(
      0,
      federalConfig.fhsaLifetimeLimit -
        input.fhsaLifetimeUsed -
        fhsaContribution,
    );
    if (remainingLifetime <= 8000 && remainingLifetime > 0) {
      warnings.push({
        level: "info",
        key: "fhsa_lifetime_low",
        vars: { remaining: remainingLifetime },
      });
    }
  }

  if (
    input.rrspRoomAvailable > 0 &&
    rrspContribution >= input.rrspRoomAvailable
  ) {
    warnings.push({ level: "info", key: "rrsp_room_maxed" });
  }

  if (optimized.taxableIncome < federalConfig.bpa.base) {
    warnings.push({
      level: "warning",
      key: "below_bpa",
      vars: { bpa: federalConfig.bpa.base },
    });
  }

  if (!input.isFirstTimeHomeBuyer && input.fhsaRoomAvailable > 0) {
    warnings.push({ level: "info", key: "fhsa_requires_first_time_buyer" });
  }

  return warnings;
}

function buildRationale(args: {
  preference: StrategyPreference;
  strategy: RecommendationStrategy;
  fhsaContribution: number;
  rrspContribution: number;
  baseline: TaxBreakdown;
  optimized: TaxBreakdown;
  isFirstTimeHomeBuyer: boolean;
  totalRoom: number;
}): RationaleItem[] {
  const items: RationaleItem[] = [];
  const {
    strategy,
    fhsaContribution,
    rrspContribution,
    baseline,
    optimized,
    isFirstTimeHomeBuyer,
    totalRoom,
  } = args;

  const totalContribution = fhsaContribution + rrspContribution;

  switch (strategy) {
    case "already_refund":
      items.push({
        key: "rationale_strategy_already_refund",
        vars: { refund: round(Math.max(0, baseline.refundOrOwing)) },
      });
      break;
    case "no_room":
      items.push({
        key: "rationale_strategy_no_room",
        vars: { owing: round(Math.abs(baseline.refundOrOwing)) },
      });
      break;
    case "zero_owing":
      items.push({
        key: "rationale_strategy_zero_owing",
        vars: {
          total: round(totalContribution),
          baselineOwing: round(Math.abs(baseline.refundOrOwing)),
        },
      });
      break;
    case "room_capped":
      items.push({
        key: "rationale_strategy_room_capped",
        vars: {
          total: round(totalContribution),
          remainingOwing: round(Math.max(0, -optimized.refundOrOwing)),
        },
      });
      break;
    // TICKET-037: trimmed back to the point of diminishing returns
    case "diminishing_returns_capped":
      items.push({
        key: "rationale_strategy_diminishing_returns_capped",
        vars: {
          total: round(totalContribution),
          remainingOwing: round(Math.max(0, -optimized.refundOrOwing)),
        },
      });
      break;
    case "max_refund":
      items.push({
        key: "rationale_strategy_max_refund",
        vars: {
          total: round(totalContribution),
          refund: round(Math.max(0, optimized.refundOrOwing)),
        },
      });
      break;
    case "max_refund_bpa_capped":
      items.push({
        key: "rationale_strategy_max_refund_bpa_capped",
        vars: {
          total: round(totalContribution),
          refund: round(Math.max(0, optimized.refundOrOwing)),
        },
      });
      break;
    case "drop_bracket":
      items.push({
        key: "rationale_strategy_drop_bracket",
        vars: {
          total: round(totalContribution),
          oldRate: (baseline.marginalRate * 100).toFixed(1),
          newRate: (optimized.marginalRate * 100).toFixed(1),
        },
      });
      break;
    case "drop_bracket_capped":
      items.push({
        key: "rationale_strategy_drop_bracket_capped",
        vars: {
          total: round(totalContribution),
          rate: (optimized.marginalRate * 100).toFixed(1),
        },
      });
      break;
    case "already_lowest_bracket":
      items.push({
        key: "rationale_strategy_already_lowest_bracket",
        vars: { rate: (baseline.marginalRate * 100).toFixed(1) },
      });
      break;
  }

  if (isFirstTimeHomeBuyer && fhsaContribution > 0) {
    items.push({
      key: "rationale_fhsa_priority",
      vars: { amount: round(fhsaContribution) },
    });
  }

  if (rrspContribution > 0) {
    items.push({
      key: "rationale_rrsp_amount",
      vars: { amount: round(rrspContribution) },
    });
  }

  if (totalContribution > 0) {
    const taxSaved = baseline.totalTax - optimized.totalTax;
    items.push({
      key: "rationale_tax_saved",
      vars: {
        saved: round(taxSaved),
        effectiveSavingsRate:
          totalContribution > 0
            ? ((taxSaved / totalContribution) * 100).toFixed(1)
            : "0.0",
      },
    });
  }

  if (totalRoom > 0) {
    items.push({ key: "rationale_try_slider" });
  }

  return items;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
