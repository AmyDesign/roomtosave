#!/usr/bin/env node
/**
 * run-dividend-tests.mjs
 *
 * Standalone test runner for dividend / investment income cases.
 * No vitest / rollup needed — compiles with local tsc then runs in Node.
 *
 * Usage (from the code/ directory):
 *   node run-dividend-tests.mjs
 *
 * Or with an explicit output dir (useful in CI):
 *   OUT=/tmp/my_out node run-dividend-tests.mjs
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.OUT ?? '/tmp/dtc_test_out';

// ── 1. Compile (skip if already compiled) ───────────────────────────────────
if (!existsSync(join(OUT, 'calculator.js'))) {
  console.log('Compiling TypeScript engine...');
  const tsc = join(__dirname, 'node_modules', '.bin', 'tsc');
  execSync(
    `${tsc} --outDir ${OUT} --module commonjs --moduleResolution node ` +
    `--esModuleInterop true --target es2020 --skipLibCheck --resolveJsonModule ` +
    `${__dirname}/src/lib/tax/calculator.ts`,
    { stdio: 'inherit' }
  );
  console.log('Compiled.\n');
} else {
  console.log(`Using cached build at ${OUT}\n`);
}

const require = createRequire(import.meta.url);
const { calculateTax } = require(join(OUT, 'calculator.js'));

// ── 2. Micro test harness ───────────────────────────────────────────────────
let passed = 0, failed = 0;
const failures = [];

function close(actual, expected, label, tol = 5) {
  const diff = Math.abs(actual - expected);
  if (diff < tol) {
    passed++;
    console.log(`  ✓  ${label}  (${actual.toFixed(2)})`);
  } else {
    failed++;
    const msg = `  ✗  ${label}: expected ≈${expected}, got ${actual.toFixed(2)} (diff ${diff.toFixed(2)})`;
    console.log(msg);
    failures.push(msg);
  }
}

function assert(condition, label) {
  if (condition) { passed++; console.log(`  ✓  ${label}`); }
  else { failed++; const m = `  ✗  ${label}`; console.log(m); failures.push(m); }
}

function suite(name, fn) { console.log(`\n── ${name}`); fn(); }

// ── 3. Cases ────────────────────────────────────────────────────────────────

suite('CASE 1 — ON 2025 T4 $70K + eligible dividends $5K', () => {
  const r = calculateTax({
    taxYear: 2025, province: 'ON', age: 35,
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
  // 70000 + 5000×1.38 = 76900
  close(r.totalIncome,      76900,    'totalIncome (5000×1.38 gross-up applied)');
  close(r.netFederalTax,    7961.87,  'netFederalTax (federal DTC reduces tax)');
  close(r.netProvincialTax, 4002.14,  'netProvincialTax (ON DTC applied)');
  close(r.totalTax,         11964.01, 'totalTax');
  close(r.refundOrOwing,    35.99,    'refundOrOwing');

  // DTC sanity: effective rate on actual $5K dividend must be well below 20.5% marginal
  const base = calculateTax({
    taxYear: 2025, province: 'ON', age: 35, isFirstTimeHomeBuyer: false,
    rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
    income: { employment: { gross: 70000, federalTaxWithheld: 0,
      provincialTaxWithheld: 0, cppContribution: 3956.75,
      eiPremium: 1090.62, cppPensionableEarnings: 70000 } },
    deductions: { rrspContribution: 0, fhsaContribution: 0 },
  });
  const withDiv = calculateTax({
    taxYear: 2025, province: 'ON', age: 35, isFirstTimeHomeBuyer: false,
    rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
    income: { employment: { gross: 70000, federalTaxWithheld: 0,
      provincialTaxWithheld: 0, cppContribution: 3956.75,
      eiPremium: 1090.62, cppPensionableEarnings: 70000 },
      investment: { eligibleDividends: 5000 } },
    deductions: { rrspContribution: 0, fhsaContribution: 0 },
  });
  const eff = (withDiv.totalTax - base.totalTax) / 5000;
  assert(eff < 0.15,  `effective rate on $5K elig div < 15% (got ${(eff*100).toFixed(1)}%)`);
  assert(eff > 0,     'eligible dividends still taxed (rate > 0)');
  // Exact federal formula: grossedUp × (marginalRate − dtcRate) = 6900 × (0.205 − 0.150198) = 378.13
  const fedInc = withDiv.netFederalTax - base.netFederalTax;
  assert(Math.abs(fedInc - 378.13) < 1,
    `fed tax increase matches formula 6900×(20.5%−15.02%) (${fedInc.toFixed(2)} ≈ 378.13)`);
});

suite('CASE 2 — ON 2025 T4 $90K + non-eligible div $3K + capital gains $10K', () => {
  const r = calculateTax({
    taxYear: 2025, province: 'ON', age: 45,
    isFirstTimeHomeBuyer: false,
    rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
    income: {
      employment: { gross: 90000, federalTaxWithheld: 17000,
        provincialTaxWithheld: 0, cppContribution: 4034.10,
        eiPremium: 1090.62, cppPensionableEarnings: 71300 },
      investment: { nonEligibleDividends: 3000, capitalGains: 10000 },
    },
    deductions: { rrspContribution: 0, fhsaContribution: 0 },
  });
  // 90000 + 3000×1.15 + 10000×0.5 = 90000 + 3450 + 5000 = 98450
  close(r.totalIncome,      98450,    'totalIncome (non-elig ×1.15 + 50% cap gain inclusion)');
  close(r.netFederalTax,    13092.45, 'netFederalTax');
  // TICKET-025 (2026-06-06): ON surtax computed before DTC deduction (Ontario
  // Taxation Act 2007 s.19.1) + ON non-eligible DTC rate fix 3.2863%->2.9863%.
  // WS-verified twin "D3" now matches WS to the penny: owing $2,691.56.
  close(r.netProvincialTax, 6596.41,  'netProvincialTax');
  close(r.totalTax,         19688.85, 'totalTax');
  close(r.refundOrOwing,    -2688.85, 'refundOrOwing (owing)');
});

suite('CASE 3 — BC 2025 T4 $60K + eligible div $8K + non-eligible div $2K', () => {
  const r = calculateTax({
    taxYear: 2025, province: 'BC', age: 40,
    isFirstTimeHomeBuyer: false,
    rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
    income: {
      employment: { gross: 60000, federalTaxWithheld: 9000,
        provincialTaxWithheld: 0, cppContribution: 3363.25,
        eiPremium: 996.00, cppPensionableEarnings: 60000 },
      investment: { eligibleDividends: 8000, nonEligibleDividends: 2000 },
    },
    deductions: { rrspContribution: 0, fhsaContribution: 0 },
  });
  // 60000 + 8000×1.38 + 2000×1.15 = 60000 + 11040 + 2300 = 73340
  close(r.totalIncome,      73340,   'totalIncome (both gross-ups)');
  close(r.netFederalTax,    6508.55, 'netFederalTax');
  // Updated 2026-06-06 after TICKET-024 (BC non-eligible DTC rate 2.5164% -> 1.96%).
  // BC has no surtax, so TICKET-025's surtax-ordering fix does not change this case.
  close(r.netProvincialTax, 2086.56, 'netProvincialTax');
  close(r.totalTax,         8595.11, 'totalTax');
  close(r.refundOrOwing,    406.39,  'refundOrOwing (refund)');

  // BC eligible DTC is generous enough that provincial tax DECREASES when dividends are added
  const withoutDiv = calculateTax({
    taxYear: 2025, province: 'BC', age: 40, isFirstTimeHomeBuyer: false,
    rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
    income: { employment: { gross: 60000, federalTaxWithheld: 0,
      provincialTaxWithheld: 0, cppContribution: 3363.25,
      eiPremium: 996.00, cppPensionableEarnings: 60000 } },
    deductions: { rrspContribution: 0, fhsaContribution: 0 },
  });
  assert(r.netProvincialTax < withoutDiv.netProvincialTax,
    `BC prov tax LOWER with dividends (${r.netProvincialTax.toFixed(2)} < ${withoutDiv.netProvincialTax.toFixed(2)}) — DTC > gross-up tax`);
});

suite('CASE 4 — ON 2025 investment-only: elig div $15K + cap gains $20K − losses $5K', () => {
  const r = calculateTax({
    taxYear: 2025, province: 'ON', age: 55,
    isFirstTimeHomeBuyer: false,
    rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
    income: {
      investment: { eligibleDividends: 15000, capitalGains: 20000, capitalLosses: 5000 },
    },
    deductions: { rrspContribution: 0, fhsaContribution: 0 },
  });
  // 15000×1.38 + (20000−5000)×0.5 = 20700 + 7500 = 28200
  close(r.totalIncome,      28200, 'totalIncome (gross-up + net 50% cap gain)');
  close(r.netFederalTax,    0,     'netFederalTax = 0 (BPA + DTC fully absorbs)');
  close(r.netProvincialTax, 300,   'netProvincialTax = ON health premium $300');
  close(r.totalTax,         300,   'totalTax = $300');
  close(r.refundOrOwing,    -300,  'refundOrOwing ($300 owing, nothing withheld)');
  assert(r.cppPayable === 0,     'cppPayable = 0 (no employment income)');
  assert(r.cppOverpayment === 0, 'cppOverpayment = 0');
});

suite('CASE 5 — BC 2025 T4 $50K + cap losses $8K exceed cap gains $5K → net = 0', () => {
  const withLosses = calculateTax({
    taxYear: 2025, province: 'BC', age: 35,
    isFirstTimeHomeBuyer: false,
    rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
    income: {
      employment: { gross: 50000, federalTaxWithheld: 7000,
        provincialTaxWithheld: 0, cppContribution: 2766.75,
        eiPremium: 820.00, cppPensionableEarnings: 50000 },
      investment: { capitalGains: 5000, capitalLosses: 8000 },
    },
    deductions: { rrspContribution: 0, fhsaContribution: 0 },
  });
  close(withLosses.totalIncome,   50000,   'totalIncome = T4 only (losses clamp gains to 0)');
  close(withLosses.netFederalTax, 4177.92, 'netFederalTax same as T4-only baseline');
  close(withLosses.refundOrOwing, 1121.17, 'refundOrOwing');

  const noInv = calculateTax({
    taxYear: 2025, province: 'BC', age: 35, isFirstTimeHomeBuyer: false,
    rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
    income: { employment: { gross: 50000, federalTaxWithheld: 7000,
      provincialTaxWithheld: 0, cppContribution: 2766.75,
      eiPremium: 820.00, cppPensionableEarnings: 50000 } },
    deductions: { rrspContribution: 0, fhsaContribution: 0 },
  });
  assert(withLosses.totalIncome === noInv.totalIncome,     'totalIncome identical to no-investment case');
  assert(withLosses.taxableIncome === noInv.taxableIncome, 'taxableIncome identical to no-investment case');
  assert(Math.abs(withLosses.totalTax - noInv.totalTax) < 1, 'totalTax identical (losses never add tax)');
});

suite('CASE 6 — ON 2025 T4 $60K + interest $1K — no gross-up, no DTC (regression guard)', () => {
  const r = calculateTax({
    taxYear: 2025, province: 'ON', age: 35,
    isFirstTimeHomeBuyer: false,
    rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
    income: {
      employment: { gross: 60000, federalTaxWithheld: 10000,
        provincialTaxWithheld: 0, cppContribution: 3363.25,
        eiPremium: 996.00, cppPensionableEarnings: 60000 },
      investment: { interest: 1000 },
    },
    deductions: { rrspContribution: 0, fhsaContribution: 0 },
  });
  // Interest: 1:1 inclusion, no gross-up → 61000 exactly
  close(r.totalIncome,      61000,   'totalIncome (interest 1:1, no gross-up)');
  close(r.netFederalTax,    5844.73, 'netFederalTax');
  close(r.netProvincialTax, 3126.22, 'netProvincialTax');
  close(r.totalTax,         8970.95, 'totalTax');
  close(r.refundOrOwing,    1030.55, 'refundOrOwing (refund)');
  assert(Math.abs(r.cppOverpayment - 1.5) < 1, 'CPP overpayment still calculated correctly alongside interest');
});

suite('CASE 7 — ON 2025 T4 $120K + eligible div $10K (surtax + eligible DTC)', () => {
  const r = calculateTax({
    taxYear: 2025, province: 'ON', age: 40,
    isFirstTimeHomeBuyer: false,
    rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
    income: {
      employment: { gross: 120000, federalTaxWithheld: 25000,
        provincialTaxWithheld: 0, cppContribution: 4034.10,
        eiPremium: 1077.48, cppPensionableEarnings: 71300 },
      investment: { eligibleDividends: 10000 },
    },
    deductions: { rrspContribution: 0, fhsaContribution: 0 },
  });
  close(r.totalIncome,      133800,    'totalIncome (120K + 10K*1.38)');
  close(r.netFederalTax,    19590.37,  'netFederalTax');
  close(r.netProvincialTax, 10720.73,  'netProvincialTax (surtax + OHP $750)');
  close(r.totalTax,         30311.10,  'totalTax');
  close(r.refundOrOwing,    -5311.10,  'refundOrOwing (owing)');
  assert(r.provincialSurtax > 1000,
    `ON surtax > $1000 (got ${r.provincialSurtax.toFixed(2)}) -- TICKET-025 regression`);
  assert(Math.abs(r.provincialSurtax - 1656.34) < 5,
    `ON surtax approx $1656.34 (got ${r.provincialSurtax.toFixed(2)})`);
});

suite('CASE 8 — ON 2025 T4 $45K + eligible div $3K (LIFT + OHP interaction)', () => {
  const r = calculateTax({
    taxYear: 2025, province: 'ON', age: 30,
    isFirstTimeHomeBuyer: false,
    rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
    income: {
      employment: { gross: 45000, federalTaxWithheld: 6000,
        provincialTaxWithheld: 0, cppContribution: 2469.25,
        eiPremium: 738.00, cppPensionableEarnings: 45000 },
      investment: { eligibleDividends: 3000 },
    },
    deductions: { rrspContribution: 0, fhsaContribution: 0 },
  });
  close(r.totalIncome,      49140,    'totalIncome (45K + 3K*1.38)');
  close(r.netFederalTax,    3486.43,  'netFederalTax');
  close(r.netProvincialTax, 1798.13,  'netProvincialTax');
  close(r.refundOrOwing,    715.44,   'refundOrOwing (refund)');
  assert(Math.abs(r.provincialLiftCredit - 63.75) < 2,
    `LIFT approx $63.75 (got ${r.provincialLiftCredit.toFixed(2)}) -- gross-up accelerates phase-out`);
  assert(r.provincialHealthPremium === 600,
    `OHP = $600 (jumped from $450 -- net income crossed $48,600 segment)`);
  const base = calculateTax({
    taxYear: 2025, province: 'ON', age: 30, isFirstTimeHomeBuyer: false,
    rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
    income: { employment: { gross: 45000, federalTaxWithheld: 0,
      provincialTaxWithheld: 0, cppContribution: 2469.25,
      eiPremium: 738.00, cppPensionableEarnings: 45000 } },
    deductions: { rrspContribution: 0, fhsaContribution: 0 },
  });
  const withDiv = calculateTax({
    taxYear: 2025, province: 'ON', age: 30, isFirstTimeHomeBuyer: false,
    rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
    income: { employment: { gross: 45000, federalTaxWithheld: 0,
      provincialTaxWithheld: 0, cppContribution: 2469.25,
      eiPremium: 738.00, cppPensionableEarnings: 45000 },
      investment: { eligibleDividends: 3000 } },
    deductions: { rrspContribution: 0, fhsaContribution: 0 },
  });
  const eff = (withDiv.totalTax - base.totalTax) / 3000;
  assert(eff < 0.10, `effective rate < 10% (got ${(eff*100).toFixed(1)}%) despite LIFT down and OHP up`);
  assert(eff > 0, 'dividends still taxed');
});

suite('CASE 9 — ON 2025 T4 $75K + EI $6K + cap gains $12K (clawback triggered by investment)', () => {
  const r = calculateTax({
    taxYear: 2025, province: 'ON', age: 35,
    isFirstTimeHomeBuyer: false,
    rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
    income: {
      employment: { gross: 75000, federalTaxWithheld: 13000,
        provincialTaxWithheld: 0, cppContribution: 4034.10,
        eiPremium: 1077.48, cppPensionableEarnings: 71300 },
      benefits: { ei: { amount: 6000, isParental: false, taxWithheld: 600 } },
      investment: { capitalGains: 12000 },
    },
    deductions: { rrspContribution: 0, fhsaContribution: 0 },
  });
  close(r.totalIncome,   87000,    'totalIncome (T4 + EI + 50% cap gain)');
  close(r.netIncome,     85062.90, 'netIncome (after clawback deduction)');
  close(r.netFederalTax, 10800.53, 'netFederalTax');
  close(r.refundOrOwing, -3956.94, 'refundOrOwing (owing)');
  assert(Math.abs(r.clawbacksPayable - 1259.10) < 1,
    `EI clawback = $1,259.10 (got ${r.clawbacksPayable.toFixed(2)}) -- cap gains pushed over $82,125 threshold`);
  const noCap = calculateTax({
    taxYear: 2025, province: 'ON', age: 35, isFirstTimeHomeBuyer: false,
    rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
    income: {
      employment: { gross: 75000, federalTaxWithheld: 13000,
        provincialTaxWithheld: 0, cppContribution: 4034.10,
        eiPremium: 1077.48, cppPensionableEarnings: 71300 },
      benefits: { ei: { amount: 6000, isParental: false, taxWithheld: 600 } },
    },
    deductions: { rrspContribution: 0, fhsaContribution: 0 },
  });
  assert(Math.abs(noCap.clawbacksPayable) < 1,
    `without cap gains, clawback = $0 (income below $82,125 threshold; got ${noCap.clawbacksPayable.toFixed(2)})`);
  assert(r.clawbacksPayable - noCap.clawbacksPayable > 1000,
    `cap gains increased clawback by $${(r.clawbacksPayable - noCap.clawbacksPayable).toFixed(0)}`);
});

suite('CASE 10 — BC 2025 T4 $55K + all 4 investment types', () => {
  const r = calculateTax({
    taxYear: 2025, province: 'BC', age: 35,
    isFirstTimeHomeBuyer: false,
    rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
    income: {
      employment: { gross: 55000, federalTaxWithheld: 8500,
        provincialTaxWithheld: 0, cppContribution: 3064.25,
        eiPremium: 902.00, cppPensionableEarnings: 55000 },
      investment: { interest: 500, eligibleDividends: 4000,
        nonEligibleDividends: 1000, capitalGains: 6000 },
    },
    deductions: { rrspContribution: 0, fhsaContribution: 0 },
  });
  close(r.totalIncome,      65170,    'totalIncome (4 investment types summed)');
  close(r.netFederalTax,    5826.40,  'netFederalTax');
  close(r.netProvincialTax, 2163.54,  'netProvincialTax');
  close(r.totalTax,         7989.94,  'totalTax');
  close(r.refundOrOwing,    510.06,   'refundOrOwing (refund)');
  assert(r.provincialHealthPremium === 0, 'no health premium in BC');
  assert(r.provincialSurtax === 0,        'no surtax in BC');
});

suite('CASE 11 — BC 2025 self-employment $40K + eligible div $6K (SE CPP + DTC)', () => {
  const r = calculateTax({
    taxYear: 2025, province: 'BC', age: 35,
    isFirstTimeHomeBuyer: false,
    rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
    income: {
      selfEmployment: { netIncome: 40000 },
      investment: { eligibleDividends: 6000 },
    },
    deductions: { rrspContribution: 0, fhsaContribution: 0 },
  });
  close(r.totalIncome,      48280,     'totalIncome (SE + eligible gross-up)');
  close(r.netFederalTax,    2788.45,   'netFederalTax');
  close(r.netProvincialTax, 575.23,    'netProvincialTax (DTC slashes BC tax)');
  close(r.refundOrOwing,    -7707.18,  'refundOrOwing (owing -- CPP dominates)');
  assert(Math.abs(r.cppPayable - 4343.50) < 5,
    `CPP payable approx $4,343.50 (got ${r.cppPayable.toFixed(2)}) -- SE income only`);
  assert(r.cppOverpayment === 0, 'no CPP overpayment (no T4)');
});

suite('CASE 12 — ON 2025 T4 $200K + eligible div $20K (BPA phase-out + max surtax)', () => {
  const r = calculateTax({
    taxYear: 2025, province: 'ON', age: 50,
    isFirstTimeHomeBuyer: false,
    rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
    income: {
      employment: { gross: 200000, federalTaxWithheld: 52000,
        provincialTaxWithheld: 0, cppContribution: 4034.10,
        eiPremium: 1077.48, cppPensionableEarnings: 71300 },
      investment: { eligibleDividends: 20000 },
    },
    deductions: { rrspContribution: 0, fhsaContribution: 0 },
  });
  close(r.totalIncome,      227600,    'totalIncome (200K + 20K*1.38)');
  close(r.netFederalTax,    43526.62,  'netFederalTax (BPA partially phased out)');
  close(r.netProvincialTax, 27128.90,  'netProvincialTax (massive surtax + OHP $900)');
  close(r.totalTax,         70655.52,  'totalTax');
  close(r.refundOrOwing,    -18655.52, 'refundOrOwing (owing)');
  assert(Math.abs(r.provincialSurtax - 7987.99) < 5,
    `ON surtax approx $7,988 (got ${r.provincialSurtax.toFixed(2)}) -- both brackets deep`);
  assert(r.provincialHealthPremium === 900, 'OHP = $900 (max segment)');
});

suite('CASE 13 — ON 2025 self-employment $60K + non-eligible div $5K (ON SE CPP + non-elig DTC)', () => {
  const r = calculateTax({
    taxYear: 2025, province: 'ON', age: 40,
    isFirstTimeHomeBuyer: false,
    rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
    income: {
      selfEmployment: { netIncome: 60000 },
      investment: { nonEligibleDividends: 5000 },
    },
    deductions: { rrspContribution: 0, fhsaContribution: 0 },
  });
  close(r.totalIncome,      65750,     'totalIncome (SE + non-elig x1.15)');
  close(r.netFederalTax,    5967.80,   'netFederalTax');
  close(r.netProvincialTax, 3131.83,   'netProvincialTax (OHP $600, no surtax)');
  close(r.refundOrOwing,    -15823.13, 'refundOrOwing (owing - SE no withholding)');
  assert(Math.abs(r.cppPayable - 6723.50) < 5,
    `CPP payable = $6,723.50 dual (got ${r.cppPayable.toFixed(2)})`);
  assert(r.provincialHealthPremium === 600, 'OHP = $600');
  assert(r.provincialSurtax === 0, 'no surtax');
});

suite('CASE 14 — ON 2025 $80K + parental EI $10K + elig div $5K (parental EI clawback exemption)', () => {
  const r = calculateTax({
    taxYear: 2025, province: 'ON', age: 32,
    isFirstTimeHomeBuyer: false,
    rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
    income: {
      employment: { gross: 80000, federalTaxWithheld: 14000,
        provincialTaxWithheld: 0, cppContribution: 4034.10,
        eiPremium: 1077.48, cppPensionableEarnings: 71300 },
      benefits: { ei: { amount: 10000, isParental: true, taxWithheld: 1000 } },
      investment: { eligibleDividends: 5000 },
    },
    deductions: { rrspContribution: 0, fhsaContribution: 0 },
  });
  close(r.totalIncome,      96900,    'totalIncome (T4 + EI + elig x1.38)');
  close(r.netFederalTax,    12051.77, 'netFederalTax');
  close(r.netProvincialTax, 5840.04,  'netProvincialTax');
  close(r.refundOrOwing,    -2891.82, 'refundOrOwing (owing)');
  assert(Math.abs(r.clawbacksPayable) < 1,
    `parental EI clawback = $0 (got ${r.clawbacksPayable.toFixed(2)}) -- EXEMPT`);
  // Verify regular EI WOULD trigger $3,000 clawback
  const asRegular = calculateTax({
    taxYear: 2025, province: 'ON', age: 32, isFirstTimeHomeBuyer: false,
    rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
    income: {
      employment: { gross: 80000, federalTaxWithheld: 14000,
        provincialTaxWithheld: 0, cppContribution: 4034.10,
        eiPremium: 1077.48, cppPensionableEarnings: 71300 },
      benefits: { ei: { amount: 10000, isParental: false, taxWithheld: 1000 } },
      investment: { eligibleDividends: 5000 },
    },
    deductions: { rrspContribution: 0, fhsaContribution: 0 },
  });
  assert(Math.abs(asRegular.clawbacksPayable - 3000) < 1,
    `if regular EI, clawback = $3,000 (got ${asRegular.clawbacksPayable.toFixed(2)})`);
});

suite('CASE 15 — BC 2025 $140K + elig div $12K + cap gains $15K (BC high-income brackets)', () => {
  const r = calculateTax({
    taxYear: 2025, province: 'BC', age: 45,
    isFirstTimeHomeBuyer: false,
    rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
    income: {
      employment: { gross: 140000, federalTaxWithheld: 30000,
        provincialTaxWithheld: 0, cppContribution: 4034.10,
        eiPremium: 1077.48, cppPensionableEarnings: 71300 },
      investment: { eligibleDividends: 12000, capitalGains: 15000 },
    },
    deductions: { rrspContribution: 0, fhsaContribution: 0 },
  });
  close(r.totalIncome,      164060,    'totalIncome (T4 + elig x1.38 + cap x0.5)');
  close(r.netFederalTax,    27043.42,  'netFederalTax');
  close(r.netProvincialTax, 11753.57,  'netProvincialTax (BC 14.7% bracket)');
  close(r.totalTax,         38797.00,  'totalTax');
  close(r.refundOrOwing,    -8797.00,  'refundOrOwing (owing)');
  assert(r.provincialSurtax === 0, 'no surtax in BC');
  assert(r.provincialHealthPremium === 0, 'no health premium in BC');
});

// -- 4. Summary ---
const total = passed + failed;
console.log(`\n${'─'.repeat(55)}`);
if (failed === 0) {
  console.log(`All ${total} assertions passed ✓`);
} else {
  console.log(`${passed}/${total} passed, ${failed} FAILED`);
  console.log('\nFailed:');
  failures.forEach(f => console.log(f));
}
process.exit(failed > 0 ? 1 : 0);
