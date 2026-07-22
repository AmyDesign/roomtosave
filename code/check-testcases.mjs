#!/usr/bin/env node
/**
 * check-testcases.mjs — 把 test-cases.md 里记录的预期值跟当前引擎对一遍。
 *
 * 为什么需要它
 * ------------
 * test-cases.md 里的数字写下来那一刻是对的，但引擎一直在改。引擎一改，
 * 那些标着 ✅ 的旧数字就悄悄失效了 —— 文档上的 ✅ 还在，数字已经不对。
 * 这个项目里已经发生过多次：QC1 的记录值过期了一个月（差 $1,173.59）、
 * QC7 有过四代作废值、QC6 也有过 stale 值。
 *
 * 危险的地方在于它**没有症状**。测试挂了你会知道；文档烂掉了，你只会在
 * 下次拿它去跟 Wealthsimple 比对时，浪费半小时查一个根本不存在的 bug。
 *
 * 怎么用
 * ------
 *   cd code && node check-testcases.mjs           # 编译引擎 + 全量校验
 *   node check-testcases.mjs --skip-build         # 复用上次编译结果（快）
 *   node check-testcases.mjs QC7 QC8              # 只查指定 case
 *
 * 退出码 0 = 全部一致；1 = 有漂移（可挂进 CI / pre-commit）。
 *
 * 数据从哪来
 * ----------
 * test-cases.md 里每个 case 下面有一个 ```json fixture 代码块。人读的表格
 * 照旧保留 —— 那些分析、归因、踩坑记录才是这份文档最值钱的部分，不该被
 * 机器格式挤掉。机读块只负责「输入 + 预期值」这一小块可验证的事实。
 */

import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MD = path.resolve(HERE, "../skills/test-cases.md");
const OUT = path.join(os.tmpdir(), "rts-engine-dist");

const args = process.argv.slice(2);
const skipBuild = args.includes("--skip-build");
const only = args.filter((a) => !a.startsWith("--")).map((s) => s.toUpperCase());

// ---------------------------------------------------------------------------
// 1. 编译引擎
// ---------------------------------------------------------------------------
if (!skipBuild) {
  process.stderr.write("编译引擎… ");
  try {
    execSync(
      `node node_modules/typescript/lib/tsc.js -p tsconfig.engine.json --outDir "${OUT}"`,
      { cwd: HERE, stdio: ["ignore", "pipe", "pipe"] },
    );
    process.stderr.write("完成\n\n");
  } catch (e) {
    process.stderr.write("失败\n");
    process.stderr.write(String(e.stdout ?? e.message));
    process.exit(2);
  }
}

const require_ = createRequire(import.meta.url);
const { calculateTax } = require_(path.join(OUT, "calculator.js"));

// ---------------------------------------------------------------------------
// 2. 抽出机读块
// ---------------------------------------------------------------------------
const md = fs.readFileSync(MD, "utf8");
const blocks = [...md.matchAll(/```json fixture\r?\n([\s\S]*?)```/g)];

if (blocks.length === 0) {
  console.error("在 test-cases.md 里没找到任何 ```json fixture 块。");
  process.exit(2);
}

/** @type {Map<string, any>} */
const fixtures = new Map();
for (const [, body] of blocks) {
  let f;
  try {
    f = JSON.parse(body);
  } catch (e) {
    console.error(`机读块 JSON 解析失败：${e.message}\n${body.slice(0, 200)}`);
    process.exit(2);
  }
  if (fixtures.has(f.id)) {
    console.error(`重复的 fixture id：${f.id}`);
    process.exit(2);
  }
  fixtures.set(f.id, f);
}

/**
 * `extends` 让 QC10 这类「复用某个已有 case 配置」的场景不用抄一遍输入。
 * 这正是 QC10 出错的地方 —— 原来只在散文里写「= QC6」，人照着改的时候
 * 漏了预扣那两栏。写成 extends 之后，复用关系由机器保证。
 */
function resolveInput(f, seen = new Set()) {
  if (!f.extends) return structuredClone(f.input ?? {});
  if (seen.has(f.id)) throw new Error(`extends 循环引用：${f.id}`);
  seen.add(f.id);
  const parent = fixtures.get(f.extends);
  if (!parent) throw new Error(`${f.id} extends 了不存在的 ${f.extends}`);
  return deepMerge(resolveInput(parent, seen), f.input ?? {});
}

function deepMerge(base, over) {
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) {
    out[k] =
      v && typeof v === "object" && !Array.isArray(v) && typeof out[k] === "object"
        ? deepMerge(out[k], v)
        : v;
  }
  return out;
}

// ---------------------------------------------------------------------------
// 3. 逐点跑
// ---------------------------------------------------------------------------
const money = (n) =>
  (n >= 0 ? "退 " : "欠 ") +
  Math.abs(n).toLocaleString("en-CA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

let checked = 0;
const drifts = [];
const disputed = [];
const errors = [];

for (const f of fixtures.values()) {
  if (only.length && !only.includes(f.id.toUpperCase())) continue;

  let baseInput;
  try {
    baseInput = resolveInput(f);
  } catch (e) {
    errors.push({ id: f.id, msg: e.message });
    continue;
  }

  for (const p of f.points ?? []) {
    const input = deepMerge(baseInput, p.override ?? {});
    if (p.rrsp !== undefined) {
      input.deductions = { ...input.deductions, rrspContribution: p.rrsp };
    }
    // 供款不能超过额度，否则引擎会截断，比出来的差异是假的
    if (input.rrspRoomAvailable !== undefined) {
      input.rrspRoomAvailable = Math.max(
        input.rrspRoomAvailable,
        input.deductions?.rrspContribution ?? 0,
      );
    }

    let r;
    try {
      r = calculateTax(input);
    } catch (e) {
      errors.push({ id: f.id, label: p.label ?? `RRSP ${p.rrsp}`, msg: e.message });
      continue;
    }

    const tol = p.tol ?? f.tol ?? 0.01;
    const label = p.label ?? `RRSP $${(p.rrsp ?? 0).toLocaleString("en-CA")}`;

    checked++;
    const diff = r.refundOrOwing - p.expect;
    if (Math.abs(diff) > tol) {
      // `disputed` = 已知不一致、且已经查过但没定论的点。仍然报出来，但不算失败 ——
      // 一个永远红着的检查很快就会被无视，那比没有检查更糟。
      (p.disputed ? disputed : drifts).push({
        id: f.id,
        label,
        doc: p.expect,
        engine: r.refundOrOwing,
        diff,
        src: p.verified,
        why: p.disputed,
      });
    }

    // 可选的额外字段断言（药保费、HSF 之类）
    for (const [field, want] of Object.entries(p.assert ?? {})) {
      checked++;
      const got = r[field];
      if (got === undefined) {
        errors.push({ id: f.id, label, msg: `引擎没有字段 ${field}` });
      } else if (Math.abs(got - want) > tol) {
        drifts.push({
          id: f.id,
          label: `${label} · ${field}`,
          doc: want,
          engine: got,
          diff: got - want,
          src: p.verified,
        });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 4. 报告
// ---------------------------------------------------------------------------
const ran = only.length ? only.join(", ") : `${fixtures.size} 个 case`;
console.log(`已校验 ${ran} 共 ${checked} 个断言。\n`);

if (errors.length) {
  console.log("⚠️  跑不起来的：");
  for (const e of errors) {
    console.log(`   ${e.id}${e.label ? ` · ${e.label}` : ""} — ${e.msg}`);
  }
  console.log("");
}

if (disputed.length) {
  console.log("🔵 已知悬案（不算失败，但别忘了）：");
  for (const d of disputed) {
    console.log(
      `   ${d.id} · ${d.label} — 文档 ${money(d.doc)}，引擎 ${money(d.engine)}（差 ${d.diff.toFixed(2)}）`,
    );
    console.log(`      ${d.why}`);
  }
  console.log("");
}

if (drifts.length === 0 && errors.length === 0) {
  console.log("✅ 文档记录值与当前引擎一致（悬案除外）。");
  process.exit(0);
}

if (drifts.length) {
  const w = (s, n) => String(s).padEnd(n);
  const r = (s, n) => String(s).padStart(n);
  console.log("❌ 以下记录值与当前引擎不符：\n");
  console.log(
    `   ${w("Case", 8)} ${w("测点", 26)} ${r("文档", 16)} ${r("引擎", 16)} ${r("差额", 13)}  来源`,
  );
  console.log(`   ${"-".repeat(88)}`);
  for (const d of drifts) {
    console.log(
      `   ${w(d.id, 8)} ${w(d.label, 26)} ${r(money(d.doc), 16)} ${r(money(d.engine), 16)} ${r(
        (d.diff >= 0 ? "+" : "") + d.diff.toFixed(2),
        13,
      )}  ${d.src ?? "—"}`,
    );
  }
  console.log(`
   怎么判断是哪边的问题：
     · 来源是 WS / TurboTax 的点漂了 → 大概率是**引擎回归**，先查最近改了什么
     · 来源是「引擎值」的点漂了     → 大概率是**文档过期**，确认引擎改动是有意的之后更新数字
     · 一整个 case 全漂            → 先看是不是配置（税年、省份、预扣）写错了`);
}

process.exit(1);
