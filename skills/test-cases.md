# Tax Calculator — 测试场景集

> 所有用过 / 待测的测试场景的统一记录。**不用翻聊天历史就能继续测试**。
>
> **维护规则:** 测完某个场景就回来更新 Status + 结果。新加场景按命名规则编号(S = baseline,T = with contributions,YY = year-specific 已知用户数据)。

---

## 状态图例

| 标记 | 含义 |
|---|---|
| ✅ | WS 跟工具都验过,数字一致 |
| 🟡 | 工具算出来了 + 我手算 CRA 公式一致,但还没去 WS 比对 |
| 🔵 | 场景已设计 + 期望值已手算,**待测** |
| ⏸ | 跳过(WS 不支持,或场景不适用) |
| ❌ | 测过了,**数字不一致**,有 bug 待修 |

---

## 测试方法(三层)

**Layer 1: `npm test`(自动)**
- `code/__tests__/golden-cases.test.ts` 已经把核心 case 写成 vitest 回归测试
- 每次代码改动 → 跑一遍 → 如果某个 case 失败,立刻知道哪里崩了
- 容差 $5

**Layer 2: WS 对账(spot check)**
- 用同样数据填 WS,把 Refund/Owing 跟工具的对比
- 容差 $5(浮点累积),$5-$20 可疑,$20+ 开 ticket

**Layer 3: 手算 CRA 公式(深度查 bug 时用)**
- 我可以帮你按 CRA T1 表逐行算,跟两边比对

---

## 2025 关键参数速查

> 算 T4 / T4E 字段时用,确保数字内部自洽。

| 项目 | 2025 | 2024 |
|---|---:|---:|
| 联邦第 1 档税率 | **14.5%**(中产减税年度加权) | 15% |
| 联邦 BPA | $16,129 | $15,705 |
| ON 第 1 档 5.05% upTo | $52,886 | $51,446 |
| ON 第 2 档 9.15% upTo | $105,775 | $102,894 |
| ON BPA | $12,747 | $12,399 |
| ON surtax 第 1 档 | 20% × (ON tax > $5,710) | 20% × (> $5,554) |
| ON LIFT 最高 | $875 | $875 |
| ON LIFT 起始 phase-out | $32,500 | $32,500 |
| ON LIFT phase-out 率 | 5% | 5% |
| BC 第 1 档 5.06% upTo | $49,279 | $47,937 |
| BC 第 2 档 7.7% upTo | $98,560 | $95,875 |
| BC BPA | $12,932 | $12,580 |
| QC 第 1 档 14% upTo | $53,255 | $51,780 |
| QC 第 2 档 19% upTo | $106,495 | $103,545 |
| QC 第 3 档 24% upTo | $129,590 | $126,000 |
| QC 第 4 档（最高）| 25.75% | 25.75% |
| QC BPA | $18,571 | $18,056 |
| QC 联邦减免率（abatement）| 16.5% | 16.5% |
| QC 合资格 DTC（省级，of grossed-up）| 11.70% | 11.70% |
| QC 非合资格 DTC（省级，of grossed-up）| 3.42% | 3.42% |
| QPP 总员工率（base + enhanced）| **6.40%** | 6.40% |
| QPP 最高员工缴 | **$4,339.20** | — |
| QPIP 员工率 | 0.494% | 0.494% |
| QPIP max insurable | $98,000 | $94,000 |
| QC EI 员工率 | **1.31%** | 1.32% |
| CPP YMPE | $71,300 | $68,500 |
| CPP basic exemption | $3,500 | $3,500 |
| CPP 总员工率(base + enhanced) | 5.95% | 5.95% |
| EI 员工率 | 1.64% | 1.66% |
| EI insurable max | $65,700 | $63,200 |
| EI 最高保费 | $1,077.48 | $1,049.12 |
| EI clawback 起始 | $79,000 | $76,875 |
| Canada Employment Amount | $1,471 | $1,433 |

**自洽公式速记**(单 T4 标准情况):
- Box 14 = gross income(任意)
- Box 16 = `5.95% × (Box 26 − $3,500)`,cap 在 $4,034.10
- Box 18 = `1.64% × Box 24`(2025),cap 在 $1,077.48
- Box 24 = `min(Box 14, $65,700)`(2025)
- Box 26 = `min(Box 14, $71,300)`(2025)

**QC 自洽公式速记**（Box 10 = QC 时）:
- Box 16 留空（QC 不用 CPP）
- Box 17（QPP）= `6.40% × (Box 26 − $3,500)`，cap 在 $4,339.20
- Box 18（QC EI）= `1.31% × Box 24`（2025）/ `1.32%`（2024），低于标准 EI
- Box 55（QPIP）= `0.494% × min(Box 14, $98,000)`
- Box 24 / Box 26 同上

---

## WS 已知 quirks(必读,避免误判 bug)

| Quirk | 影响 | 怎么处理 |
|---|---|---|
| T4E **Box 7(repayment rate)如果不设**,WS 不算 EI clawback(line 23500 / 42200 都不出现) | 高收入 + EI 用户的 owing 在 WS 上**少算 $1000+** | 测 EI clawback 时,**手动把 Box 7 设成 30** |
| WS 不让你直接标 EI 是 "parental"(产假) | S3 类场景无法在 WS 测 | 我们工具有 isParental checkbox,只能靠我手算的"应该是 0 clawback"对照 |
| EI clawback 在 CRA T1 上**入账两次** — line 23500(从 net income 减)+ line 42200(加到 total payable) | 容易漏一半。**我们工具修过这个 bug = TICKET-020** | golden-cases.test.ts Case 4 已验证 |
| LIFT credit phase-out 在 net income $50K 完全 phase out | 净收入 ≥ $50K 的 ON 用户 LIFT = $0,看起来"没生效" | 这是对的;只有 net income < $50K 才看得到 |
| CPP overpayment(line 44800)当 Box 16 > 5.95% × (Box 26 − $3500) 时出现 | 跨工作 / 多 T4 用户常见;单 T4 默认对账无影响 | TICKET-014 已支持 |
| BC basic tax reduction(Schedule BC line 6103)在 net income < $40,807 时有效 | BC 低/中收入用户在大额 RRSP/FHSA 供款后退税比工具多 | TICKET-023 已修复：2025=$562 max/rate 3.56%/归零 $40,807;2024=$521 max/rate 3.56%/归零 $36,053 |
| **T5 同时有 Box 24(合资格)+ Box 10(非合资格)时，WS 不自动算 Box 25**，整张 T5 不进申报 | totalIncome 少掉全部股息 gross-up，看起来像 bug 实际是 WS 数据录入问题 | **拆成两张 T5**：一张只填 Box 24（WS 自动算 Box 25/26），一张只填 Box 10 + 手动填 Box 11 = Box 10 × 1.15 |
| **合资格股息 T5 拆成独立 Slip 后，Box 25 仍可能不自动计算**（WS 有时不 auto-fill Box 25）| 合资格 gross-up 不进 totalIncome，DTC 丢失，退税金额偏高（因为少了应税收入但也少了 DTC） | 直接在 Box 25 **手动输入** = Box 24 × 1.38（例如 Box 24 = $8,000 → Box 25 = $11,040） |

---

## 🗂 已验证 case(historical & gold standard)

### P0-Yang-2024: ON 2024 真实 CRA assessment ✅

- **Status:** ✅ Verified — **$0.02 精度**(P0 黄金对账标准)
- **来源:** 真实用户的 CRA assessment
- **Input:**
  - taxYear: 2024, province: ON, age: 35
  - T4 Box 14: $67,983.35, Box 16: $3,836.77, Box 18: $1,049.12, Box 22: $10,251.38, Box 26: $67,983.35
  - 无 EI / 无投资 / 无 FHSA / 无 RRSP
- **WS:** N/A(用的是 CRA 实际评估单)
- **工具:** owing $1,085.34
- **真实 CRA:** owing $1,085.32
- **差:** $0.02 ✓

### Yang-2025: ON 2025 T4 + 非产假 EI + T5 利息 ✅

- **Status:** ✅ Verified — WS 跟工具 $0.01 精度
- **来源:** 真实用户(Yang)WS Summary.xlsx,2026-05-17
- **Input:**
  - taxYear: 2025, province: ON
  - T4 Box 14: $53,654.16, Box 16: $3,032.27, Box 18: $879.94, Box 22: $8,962.53, Box 26: $53,654.16
  - T4E Box 14: $8,268(regular,**非** parental), Box 22: $944
  - T5 Box 13: $223.46
- **WS Summary 数字:**
  - Total income $62,145.62 / Net income $61,644.08 / Total tax $9,413.54
  - Fed tax $6,154.97 / Prov tax $3,258.57
  - CPP overpayment $48.10(Box 16 多缴)
  - **Refund $541.09**
- **工具:** $541.09 ✓
- **何时用:** TICKET-014(CPP overpayment)+ TICKET-015(T5 利息)+ 2025 14.5% 税率 综合回归

---

## 📋 阶段 1: Baseline scenarios(供款 = 0)

> 验证基础税务计算,不涉及 RRSP/FHSA 优化器。

### S1: ON 2025 简单 T4 $50K ✅

- **Status:** ✅ Passed(2026-05-17)
- **Tests:** 联邦第 1 档 14.5% + ON 第 1 档 5.05% + OHP $600 段 + **LIFT $23.25**
- **Input:**
  - taxYear: 2025, province: ON, age: 35
  - T4 Box 14: **$50,000**, Box 16: **$2,766.75**, Box 18: **$820**, Box 22: **$7,000**, Box 24: $50,000, Box 26: $50,000
  - 无 EI/T5/RRSP/FHSA
- **WS:** refund $545
- **工具:** refund $545 ✓
- **Notes:** LIFT $23.25 = $875 − 5% × ($49,535 − $32,500). 不实现 LIFT 时会少 $23(TICKET-016 修复)

### S2: ON 2025 T4 $85K + 非产假 EI $5K ✅

- **Status:** ✅ Passed(2026-05-17,**WS 用方案 B 重测**)
- **Tests:** EI clawback 公式 + line 23500 / 42200 双重入账 + 第 2 联邦档
- **Input:**
  - taxYear: 2025, province: ON, age: 35
  - T4 Box 14: **$85,000**, Box 16: **$4,034.10**(YMPE cap), Box 18: **$1,077.48**(EI max), Box 22: **$15,500**, Box 24: $65,700, Box 26: $71,300
  - **T4E Box 7: 30**(必须设!否则 WS 不算 clawback)
  - T4E Box 14: **$5,000**, Box 15: $5,000(全部 regular,**不是** parental), Box 22: $500
- **WS A(Box 7 未设):** owing $1,561 ❌ — WS 漏算 clawback
- **WS B(Box 7 = 30):** owing **$2,616** ✓ — CRA 标准
- **工具:** owing $2,616 ✓(TICKET-017 公式修复 + TICKET-020 双重入账)
- **Notes:**
  - Clawback = $0.30 × min($5,000 EI, $89,322 − $79,000) = $0.30 × $5,000 = $1,500
  - $1,500 入账两次(line 23500 减 net income → 节税 $445,line 42200 加 payable → 还 $1,500),净 owing 增加 $1,055

### S3: ON 2025 + 产假 EI(豁免 clawback)⏸

- **Status:** ⏸ Skipped — WS 不让标 parental
- **Tests:** isParental flag → clawback = 0
- **Input(同 S2,只改一处):**
  - 同 S2 全部数据,但 T4E 应标为 **maternity / parental** 而不是 regular
- **WS:** 无法直接测(WS 不区分 parental)
- **工具:** 应该 owing $1,561(同 WS A 的"无 clawback"结果,因为 isParental=true 触发豁免)
- **Notes:** 这个 case 仍能在工具 UI 里测 — 勾上"产假/陪产"checkbox → owing 应跟 S2 的 WS A 一致

### S4: ON 2025 T4 $55K + T5 利息 $1K ✅

- **Status:** ✅ Passed(2026-05-17)
- **Tests:** T5 interest 100% 计入
- **Input:**
  - taxYear: 2025, province: ON, age: 35
  - T4 Box 14: **$55,000**, Box 16: **$3,063.25**, Box 18: **$902.00**, Box 22: **$8,500**, Box 26: $55,000
  - T5 Box 13: **$1,000**
- **WS:** refund $816
- **工具:** refund $816 ✓ exact match

### S5: BC 2025 纯自雇 $50K ✅

- **Status:** ✅ Passed(2026-05-17)
- **Tests:** 自雇双份 CPP 自动算(9.9% base + 2% enhanced)+ **cppPayable 加进 owing**(TICKET-018)
- **Input:**
  - taxYear: 2025, province: BC, age: 30
  - T4 全 0
  - selfEmployment.netIncome: **$50,000**
  - Box 22: 0(自雇无预扣)
- **WS:** owing $11,238
- **工具:** owing $11,238 ✓
- **Notes:**
  - 自雇 CPP 总缴 = $46,500 × 11.9% = $5,533.50
  - 拆:抵免 $2,301.75(line 30800)+ 扣除 $2,301.75(line 22200)+ 扣除 $930(line 22215)
  - 报税时**整笔补缴** = line 42100 加进 Total payable = 收入税 $5,705 + CPP $5,533 = $11,238

---

## 📋 阶段 1 待测: 补漏 baseline scenarios

> 当前已验过的 S1-S5 没覆盖的代码路径。Status 全是 🔵 待测。

### S6: BC 2025 $60K T4 baseline ✅

- **Status:** ✅ Passed(2026-05-25)
- **Tests:** BC 没 OHP/surtax/LIFT 的"纯净"路径,跨第 1 档边界($49,279)进第 2 档
- **Input:**
  - taxYear: 2025, province: BC, age: 35
  - T4 Box 14: **$60,000**, Box 16: **$3,361.75**(= 5.95% × $56,500), Box 18: **$984.00**(= 1.64% × $60,000), Box 22: **$9,000**, Box 24: $60,000, Box 26: $60,000
- **手算预期:** refund ≈ **$1,267**
  - Net income ≈ $59,400(=$60,000 − $565 CPP enhanced)
  - Fed tax: $57,375 × 14.5% + $2,025 × 20.5% = $8,319 + $415 = $8,734;减抵免(BPA + CPP base + EI + CEA)× 14.5% ≈ $3,031 → net fed ≈ $5,703... 让我再算 — 实际净联邦 ≈ $4,983
  - BC tax: $49,279 × 5.06% + $10,121 × 7.7% = $2,494 + $779 = $3,273;减抵免($12,932 + $2,798 + $984)× 5.06% = $853 → net BC ≈ $2,420
  - Total tax ≈ $7,403;Withheld $9,000 → refund $1,597
  - **(手算可能 ±$300,以 WS 为准)**

### S7: ON 2024 $60K T4(2024 回归测试)✅

- **Status:** ✅ Passed(2026-05-25)
- **Tests:** 2024 配置(15% 第 1 档,$12,399 ON BPA, $51,446 ON 第 1 档 upTo)
- **Input:**
  - taxYear: **2024**, province: ON, age: 35
  - T4 Box 14: $60,000, Box 16: $3,361.75, Box 18: **$996**(2024 是 1.66%), Box 22: $9,500, Box 24: $60,000, Box 26: $60,000
- **手算预期:** refund 大约 $600 量级(2024 用 15% 第 1 档,比 2025 多缴一点税)

### S8: ON 2025 $25K 低收入(LIFT 满额)✅

- **Status:** ✅ Passed(2026-05-25)— 之前差异原因：WS 误用 2024 税年，2025 重测完全对齐
- **Tests:** LIFT 满额 $875 + OHP 在 $20K-$25K 桥接段 + 收入完全在第 1 档
- **Input:**
  - taxYear: 2025, province: ON, age: 30
  - T4 Box 14: **$25,000**, Box 16: **$1,279.25**(= 5.95% × $21,500), Box 18: **$410**(= 1.64% × $25,000), Box 22: **$1,500**, Box 24: $25,000, Box 26: $25,000
- **WS(2025):** refund $385 ✓
- **工具:** refund $385 ✓
- **供款测试(2025):** $1K/$2K/$3K/$3.5K/$4K/$5K/$10K 全部 ✅
- **Notes:** 之前用 WS 2024 年度测(BPA $15,705 / 15% 第1档 / 就业金额 $1,433)，导致联邦税高出 $98。2025 重测后两边完全一致。LIFT $875 满额抵消省收入税 → 只剩 OHP $287.10。

### S9: ON 2025 $180K 高收入(surtax + BPA phase-out)✅

- **Status:** ✅ Passed(2026-05-25)— 之前差异原因：WS 误用 2024 税年，2025 重测完全对齐
- **Tests:** ON surtax 两档触发 + 联邦 BPA phase-out + OHP $750 段
- **Input:**
  - taxYear: 2025, province: ON, age: 40
  - T4 Box 14: **$180,000**, Box 16: **$4,034.10**(YMPE max), Box 18: **$1,077.48**(EI max), Box 22: **$42,000**, Box 24: $65,700, Box 26: $71,300
- **WS(2025):** owing $12,324 ✓
- **工具:** owing $12,324 ✓
- **供款测试(2025):** $35K/$10K/$43K/$5K/$20K 全部 ✅
- **Notes:** 之前 WS 用 2024 年度(BPA $15,578 phase-out / YMPE $68,500 / ON BPA $12,399 / surtax 门槛 $5,554/$7,108)，导致省税高出 $878。2025 重测后两边完全一致。

---

## 📋 阶段 2: 加供款 scenarios(测 RRSP/FHSA + 优化器)

> 验证 deduction 路径 + 3 种推荐策略。Status 全是 🔵 待测。

### T1: S1 + RRSP 变额(ON 2025 $50K) ✅

- **Status:** ✅ Passed(2026-05-26)— 含供款 $0/$10K/$33,406/$20K/$40K 全通过
- **Tests:** RRSP 1:1 减税 + LIFT phase-in(net income 下降 → LIFT 多了)+ OHP 跨段
- **Input:** 同 S1(ON 2025 $50K)+ 变额 RRSP 供款

### T2: ON 2025 $70K + RRSP 变额 ✅

- **Status:** ✅ Passed(2026-05-26)— 含供款 $0/$1,677/$43K/$11,960/$20K/$10K 全通过
- **Tests:** 联邦第 2 档 marginal 减税(LIFT 已 phase out → 不干扰)
- **Input:**
  - taxYear: 2025, province: ON, age: 35
  - T4 Box 14: **$70,000**, Box 16: **$3,956.75**, Box 18: **$1,077.48**(cap), Box 22: **$11,000**, Box 24: $65,700, Box 26: $70,000
  - 变额 RRSP 供款

### T3: BC 2025 + FTB + FHSA + RRSP 变额 ✅

- **Status:** ✅ Passed after fix(2026-05-26)— 修复 BC basic tax reduction 后全通过
- **Tests:** FHSA 路径 + first-time home buyer + BC basic tax reduction(低收入触发)
- **Input:**
  - taxYear: 2025, province: BC, age: 30, **isFirstTimeHomeBuyer: true**
  - T4 Box 14: **$70,000**, Box 16: **$3,956.75**, Box 18: **$1,077.48**, Box 22: **$11,000**, Box 24: $65,700, Box 26: $70,000
  - 变额总供款(FHSA 先填满 $8K 上限,剩余为 RRSP)
- **测试金额:** $0/$43K/$11,960/$20K/$40K/$30K/$25K 全通过 ✅
- **修复前失败:** $43K(WS $10,367 vs 工具 $9,910,差 $457)/ $40K(差 $408)/ $30K(差 $52)
- **根本原因:** BC basic tax reduction(Schedule BC line 6103)未实现 → TICKET-023

### T4: BC 2025 $80K + RRSP 变额(drop bracket scenario)✅

- **Status:** ✅ Passed after fix(2026-05-26)— 修复 BC basic tax reduction 后全通过
- **Tests:** Drop bracket + BC basic tax reduction(高额 RRSP 后 net income 落入低收入区)
- **Input:**
  - taxYear: 2025, province: BC, age: 35
  - T4 Box 14: **$80,000**, Box 16: **$4,034.10**(YMPE cap), Box 18: **$1,077.48**(EI max), Box 22: **$13,500**, Box 24: $65,700, Box 26: $71,300
  - 变额 RRSP 供款
- **测试金额:** $0/$43K/$21,947/$10K/$30K/$35K/$40K 全通过 ✅
- **修复前失败:** $43K(WS $10,629 vs 工具 $10,469,差 $160)/ $40K(差 $53)
- **根本原因:** 同 T3 — BC basic tax reduction 未实现 → TICKET-023

---

## 📋 阶段 3: 投资收入 scenarios(股息税收抵免 + 资本增益)

> 验证股息 gross-up、联邦/省级 DTC、资本增益 50% 计入、资本损失抵消。
> 所有期望值由引擎编译后 Node.js 直接运算得到，**还没在 WS 比对**，Status = 🔵。
> 测法：WS 新开一份 2025 报税 → 按下方 Input 填 T4 / T5 / Schedule 3 → 看 Summary refund/owing 跟工具一致。

### D1: ON 2025 T4 $70K + T5 合资格股息 $5,000 ✅

- **Status:** ✅ Verified — WS vs 工具对齐，含 RRSP 变额全通过（2026-05-27）
- **Tests:** 合资格股息 ×1.38 gross-up + 联邦 DTC (15.0198%) + ON DTC (10%) → 有效税率 ≈ 9%，远低于 20.5% 边际税率；RRSP 供款减税路径
- **Input:**
  - taxYear: 2025, province: ON, age: 35
  - T4 Box 14: **$70,000**, Box 16: **$3,956.75** (= 5.95% × $66,500), Box 18: **$1,077.48** (EI max), Box 22: **$11,000**, Box 24: $65,700, Box 26: $70,000
  - T5 Box 24(合资格股息实际金额): **$5,000** — WS 自动算出 Box 25 = $6,900、Box 26 = $1,036.37
  - 变额 RRSP 供款
- **WS baseline (RRSP=$0):** owing $967 ✓
- **RRSP 供款测试:** $3,260 / $5,000 / $10,000 / $18,860 / $20,000 / $43,000 全部 ✅
- **Notes:**
  - Total income = $76,900（= $70,000 + $5,000 × 1.38），gross-up 正确 ✓
  - 联邦 DTC $1,036.37 + ON 省级 DTC $690.00 共减税 $1,726.37 ✓
  - **坑（记录备查）：** 第一次测时 WS 省份未改成 ON（用了 BC），导致省税差 $1,137。改成 ON 后立即对齐。工具无 bug

### D2: BC 2025 T4 $60K + T5 合资格 $8,000 + 非合资格 $2,000 ✅

- **Status:** ✅ Verified — WS vs 工具 **$0.45** 精度（2026-05-27）。过程中发现并修复 BC 非合资格 DTC 税率 bug。
- **Tests:** 两种 gross-up 同时生效 + BC DTC(合资格 12% + 非合资格 **1.96%**) → BC 省税**低于**无股息 baseline
- **Input:**
  - taxYear: 2025, province: BC, age: 40
  - T4 Box 14: **$60,000**, Box 16: **$3,361.75** (= 5.95% × $56,500), Box 18: **$984.00** (= 1.64% × $60,000), Box 22: **$9,000**, Box 24: $60,000, Box 26: $60,000
  - T5 Slip 1：Box 24(合资格) = **$8,000**，**手动填** Box 25 = **$11,040**（WS 不一定自动算）
  - T5 Slip 2：Box 10(非合资格) = **$2,000**，手动填 Box 11 = **$2,300**
  - 无 RRSP / FHSA
- **WS baseline (RRSP=$0):** refund $403 ✓
- **RRSP 供款测试:** $500 / $2,000 / $10,000 / $15,400 / $20,000 / $43,000 全部 ✅
- **工具（修复后）:** refund $402.55 ✓
- **Bug 修复：** `bc.json` 非合资格 DTC 税率 **0.025164 → 0.0196**（2.5164% 是错的；正确值是 1.96%，BC 2019年起生效，来源：taxtips.ca）
- **Notes:**
  - WS quirk：同一张 T5 同时填 Box 24 + Box 10，WS 不自动算 Box 25 → 必须拆成两张 T5
  - WS quirk：即使分开两张，Box 25 也可能不自动填，需要手动输入 $11,040

### D3: ON 2025 T4 $90K + T5 非合资格 $3,000 + Schedule 3 资本增益 $10,000 ✅

- **Status:** ✅ Verified — WS vs 工具 **$0.0036** 精度，分文不差（2026-06-06）。过程中发现并修复 2 个引擎 bug（surtax 计算顺序 + ON 非合资格 DTC 税率），详见 TICKET-025。
- **Tests:** 非合资格 ×1.15 gross-up + 资本增益 50% 计入(= $5,000 进入应税收入)+ ON surtax 验证
- **Input:**
  - taxYear: 2025, province: ON, age: 45
  - T4 Box 14: **$90,000**, Box 16: **$4,034.10** (YMPE cap), Box 18: **$1,077.48** (EI max), Box 22: **$17,000**, Box 24: $65,700, Box 26: $71,300
  - T5 Box 10(非合资格): **$3,000**，**Box 11(taxable amount)手动填 $3,450**（= Box 10 × 1.15 gross-up，WS 不一定自动算，同 D2 quirk）
  - Schedule 3 资本增益: **$10,000** → 计入 $5,000 (50% inclusion)
  - 无 RRSP / FHSA
- **WS baseline:** owing **$2,691.56**（来自用户上传的 `Test D3_Summary.xlsx`：totalIncome $98,450 / netIncome $97,772 / netFederalTax $13,094.357 / netProvincialTax $6,597.200302 / totalTax $19,691.557752 / totalTaxWithheld $17,000）
- **用户报告（首次对账）:** "WS-owing $2692，工具-owing $2659" — 差 ~$33
- **RRSP 供款变额测试（修复后，2026-06-06）:** $2,000 / $8,944 / $10,000 / $20,000 / $40,397 / $43,000 全部 ✅ Passed
- **工具（修复后）:** netProvincialTax $6,597.20 / owing **$2,691.56** ✓ 与 WS 完全一致（精度 $0.0036）
- **Bug 修复（TICKET-025，两个 bug 叠加共 ~$33）：**
  1. **ON 非合资格股息 DTC 税率过期**：`ontario.json` 里 `dividendCreditRate.nonEligible` 从过期的 **3.2863%（2018/2019 税率）改成 2.9863%（2020–2026 正确税率）**。来源：[taxtips.ca](https://www.taxtips.ca/ontax/dividend-tax-credit.htm)。单独修复后差距从 $33.02 缩到 $20.60。
  2. **ON surtax 计算顺序错误**：根据 Ontario Taxation Act, 2007 s.19.1，「Ontario surtax 必须在扣除股息税收抵免（DTC）之前计算」。引擎之前把 DTC 错误地併入了算 surtax 的税基里，导致跨过 surtax 门槛（2025: 基础省税 > $5,710）且有股息收入的用户 surtax 被低估。重构 `calculator.ts` 让 surtax 基于「省税 − 基础抵免（不含 DTC）− basic tax reduction」计算，DTC 改为在 surtax 加上去之后才扣。
  - 两个 bug 一起修复后，引擎输出与 WS 精确到 $0.0036（本质上分文不差）。
- **Notes:**
  - WS 里 Schedule 3 要填 ACB 和 Proceeds；只要 Proceeds − ACB = $10,000 即可(例如 ACB $0，Proceeds $10,000)
  - 资本增益 50% 计入：$10,000 增益只有 $5,000 进 taxable income
  - **WS quirk 确认：** 这张 T5 只有 Box 10(非合资格)，没有 Box 24，WS 显示 "missing info"，需要**手动填 Box 11 = $3,450**（= $3,000 × 1.15）。这是 WS 的已知限制（同 D2 的 Box 25 quirk），**不是用户操作错误** — 用户的 T5 录入是完全正确的，差异 100% 来自工具自身的两个引擎 bug。

### D4: ON 2025 纯投资收入 — T5 合资格 $15,000 + Schedule 3 增益 $20K 扣损失 $5K ✅

- **Status:** ✅ Verified — WS vs 工具对齐，含供款变额全通过（2026-06-06）
- **Tests:** 无 T4 场景；BPA + DTC 完全抵消联邦税(净联邦税 $0)；只剩 ON 健康保费 $300；CPP payable = $0
- **Input:**
  - taxYear: 2025, province: ON, age: 55
  - **无 T4**(所有 T4 字段为 0)
  - T5 Box 24(合资格): **$15,000**，**Box 25(taxable amount)如果 WS 不自动算，手动填 $20,700**（= Box 24 × 1.38，同 D2 quirk）
  - Schedule 3: 资本增益 **$20,000**，资本损失 **$5,000** → 净增益 $15,000 → 计入 $7,500
  - **WS "Dispositions" 表格填法（凑出 $20,000 增益 + $5,000 损失这两笔）：** WS 不会让你直接填"增益 $20,000"，而是要填 Proceeds(售价) − Cost base(成本) − Expenses(费用)，引擎自动算 Gain (loss)。下面是两笔编好的、能精确凑出目标数字的交易（费用都填 $0，结果最干净）：

    | 第几笔 | Type | Description | Proceeds | Cost base | Expenses | → Gain (loss) |
    |---|---|---|---|---|---|---|
    | 1（增益）| Publicly traded shares, mutual funds, etc. | 例如 "ABC Corp 普通股" | **$45,000** | **$25,000** | $0 | **+$20,000** |
    | 2（损失）| Publicly traded shares, mutual funds, etc. | 例如 "XYZ Mutual Fund" | **$12,000** | **$17,000** | $0 | **−$5,000** |

    → WS 会自动把两笔加总：净资本损益 = $20,000 − $5,000 = **$15,000**，taxable capital gain = 50% × $15,000 = **$7,500**，正好对上工具期望值里的 Total income $28,200 (= $20,700 + $7,500)。
    Description 和具体公司名随便编都行（WS 不校验），只要 Proceeds / Cost base 这两列数字按上表填，Gain (loss) 列会自动算出对的数。如果你想用更圆的数字，只要保证「第一笔 Proceeds − Cost base = $20,000」「第二笔 Cost base − Proceeds = $5,000」就行，例如 1: $30,000/$10,000；2: $8,000/$13,000 同样能凑出 $20,000 / −$5,000。
  - 无 RRSP / FHSA
- **工具期望值:**
  - Total income: $28,200 (= $20,700 + $7,500)
  - Net income: $28,200
  - Net federal tax: **$0** (BPA $16,129 + DTC 完全吸收)
  - Net provincial tax: **$300** (ON 健康保费，净收入 $28,200 → 固定 $300 段)
  - Total tax: $300
  - **Owing $300** (无预扣税)
- **WS baseline (RRSP=$0):** owing $300 ✓ — 与工具期望值精确一致
- **RRSP/FHSA 供款变额测试（2026-06-06）:** $0 / $5,000 / $8,000 / $8,201 / $12,071 / $20,000 全部 ✅ Passed（$0 = baseline，与期望值 "Owing $300" 完全吻合）
- **Notes:**
  - 验证点 1：资本损失正确从增益扣除(净增益 $15K，不是 $20K)
  - 验证点 2：联邦税 = $0(不应是负数；DTC 超出税额的部分不退款)
  - 验证点 3：CPP payable 和 CPP overpayment 都应为 $0
  - 这个 case 没有 T4 工资收入，理论上没有 RRSP/FHSA Earned Income 上限的复杂交互（投资收入不算 Earned Income），所以各种供款金额下结果都应平滑变化 — 实测全部通过，符合预期

### D5: BC 2025 T4 $50K + 资本损失 $8K 超过增益 $5K(净增益 = 0) ✅

- **Status:** ✅ Verified — 基础 case（无 RRSP）WS vs 工具完全一致；RRSP 供款变额测试中发现并修复 1 个引擎 bug（BC Sales Tax Credit 完全缺失，缺口 $52–$75），详见下方 TICKET-026（2026-06-06）。
- **Tests:** 损失 > 增益 → 净资本收入 clamp 到 0 → 结果**与无投资收入完全一致**
- **Input:**
  - taxYear: 2025, province: BC, age: 35
  - T4 Box 14: **$50,000**, Box 16: **$2,766.75** (= 5.95% × $46,500), Box 18: **$820.00** (= 1.64% × $50,000), Box 22: **$7,000**, Box 24: $50,000, Box 26: $50,000
  - Schedule 3 资本增益: **$5,000**，资本损失: **$8,000**
  - **WS "Dispositions" 表格填法（凑出 $5,000 增益 + $8,000 损失这两笔）：** 跟 D4 一样，WS 要填 Proceeds(售价) − Cost base(成本) − Expenses(费用)，引擎自动算 Gain (loss)。下面两笔编好的交易（费用都填 $0）：

    | 第几笔 | Type | Description | Proceeds | Cost base | Expenses | → Gain (loss) |
    |---|---|---|---|---|---|---|
    | 1（增益）| Publicly traded shares, mutual funds, etc. | 例如 "DEF Corp 普通股" | **$20,000** | **$15,000** | $0 | **+$5,000** |
    | 2（损失）| Publicly traded shares, mutual funds, etc. | 例如 "GHI Mutual Fund" | **$7,000** | **$15,000** | $0 | **−$8,000** |

    → WS 自动加总：净资本损益 = $5,000 − $8,000 = **−$3,000**（损失超过增益）。这种情况下当年**应税资本增益 = $0**（不能用资本损失冲抵其他收入），多出来的 $3,000 净损失会变成 net capital loss，结转到以后年度或往前 3 年抵扣 — WS 应该会提示"可结转损失"或类似字样，这正是这个 case 想验证的点（净损失 clamp 到 0，不应该让 total income 变少或产生退税之外的奇怪结果）。
    Description 随便编，只要 Proceeds / Cost base 数字按上表填、两笔加总后 Proceeds−Cost base 净值 = −$3,000 即可。想用别的数字也行，比如 1: $12,000/$7,000(+$5,000)；2: $4,000/$12,000(−$8,000)，效果一样。
  - 无 RRSP / FHSA
- **工具期望值:**
  - Total income: **$50,000** (= T4 only；损失盖住增益，净增益 $0)
  - Net income: $49,535
  - Net federal tax: $4,177.92
  - Net provincial tax: $1,700.91
  - **Refund $1,121.17**
- **对照:** 跟无 Schedule 3 的纯 T4 $50K 结果**完全相同**
- **Notes:**
  - 这个 case 主要验证损失不会产生负的应税收入
  - WS 里：Schedule 3 填两条记录(增益 $5,000 + 损失 $8,000)，净 = −$3,000 → WS 应显示可结转损失，当年不产生应税资本增益

#### D5 扩展测试：RRSP 供款变额 → 发现 BC Sales Tax Credit 缺失（TICKET-026）

- **RRSP 供款变额测试（用户报告，2026-06-06）:** $0 / $256 / $500 / $1,200 / $2,000 / $10,000 / $19,800 / $20,000 / $33,406 / $35,000 / $41,000 / $43,000 — 12 个供款档位中 **8 个 Passed**，**4 个出现 refund 差异**（均为大额供款 → 净收入落入约 $15,000–$18,750 区间的场景）：

  | RRSP 供款 | WS refund | 工具 refund（修复前） | 差异 | 状态 |
  |---:|---:|---:|---:|---|
  | $0 / $256 / $500 / $1,200 / $2,000 / $10,000 / $19,800 / $20,000 | （各档实际值不同，如 $0 档为 $1,121.17） | 与 WS 一致 | $0 | ✅ Passed（8 档全部一致） |
  | $33,406 | $7,052 | $7,000 | **−$52** | ❌ 发现差异 |
  | $35,000 | $7,075 | $7,000 | **−$75** | ❌ 发现差异 |
  | $41,000 | $7,075 | $7,000 | **−$75** | ❌ 发现差异 |
  | $43,000 | $7,075 | $7,000 | **−$75** | ❌ 发现差异 |

- **根本原因（TICKET-026）：BC Sales Tax Credit（退还性省级抵免）在引擎里完全未实现。**
  - 用户上传的 `Test D5-35000_Summary.xlsx`（$35,000 供款档位的 WS 明细）是破案关键的"烟枪"证据：T1 **line 47900「Provincial or territorial refundable credits」= $75**，而工具的输出里完全没有任何对应项。
  - 顺着这条线索确认：这是 **BC Sales Tax Credit**（通过 **Form BC479** 申报的退还性省级抵免），单身公式为 `信用 = max(0, $75 − 2% × max(0, 净收入 − $15,000))`——净收入 ≤ $15,000 满额 $75，$15,000–$18,750 区间内线性递减，≥ $18,750 完全归零。来源：[gov.bc.ca — Sales tax credit](https://www2.gov.bc.ca/gov/content/taxes/income-taxes/personal/credits/sales-tax)。
  - **公式验证：** 把用户报告的全部 11 个有效数据点（不同 RRSP 供款 → 不同净收入）代入该公式，算出的信用额度与 WS 实际 refund 相对于「无此抵免」基准的差额**逐一精确匹配（11/11 命中，0 误差）**——证实这就是缺口的全部来源，不存在第二个未知因素。
  - D1–D4 的测试场景净收入都远高于 $18,750（这个抵免的窗口仅约 $3,750 宽），所以一直没有暴露这个缺口；D5 因为测了大额 RRSP 供款（把净收入压低进了 $15K–$18.75K 这个窄区间）才第一次撞见——表现为「供款超过约 $33K 后，工具算出的退税在 $7,000 处突然 plateau，比 WS 低 $52–$75，再增加供款也不再变化」。
  - 详见 `calculation-methodology.md` §1.6「BC Sales Tax Credit（退还性省级抵免）」与 `TICKETS-P1.md` TICKET-026 完整记录。

- **修复与验证（TICKET-026，已完成并回归通过，2026-06-06）：**
  - 新增 `calculateRefundableSalesTaxCredit()`：依据「净收入」和 `bc.json` 里新增的 `salesTaxCredit` 配置块（`maxAmount: 75, phaseOutStart: 15000, phaseOutRate: 0.02`）算出信用额度，按 CRA 整数美元舍入惯例套 `Math.round()`，计入 `refundOrOwing`（**退还性**——不计入 `netProvincialTax`，不受"税降到零即止"的限制）。
  - 过程中额外揪出两个连带问题：① `data/index.ts` 把 `ProvincialTaxConfig` 字段是逐个手动从 raw JSON 搬运的（不是整体 spread），漏传 `salesTaxCredit` 会导致它静默恒为 `undefined`、credit 恒算成 0（不报错）——这是第一轮验证显示"配置和公式都对、结果却全是 $0"的真正原因；② 必须对最终结果做 CRA 整数舍入（如净收入 $16,129 时，原始公式 $52.42 需舍入为 WS 显示的 $52）才能精确到分匹配。
  - 修复后重新计算全部 4 个差异点，**与 WS 精确匹配到分**：$33,406 → $7,052；$35,000 / $41,000 / $43,000 → $7,075。
  - 回归检查：ON 及其他省份 `provincialRefundableCredits` 恒为 $0、`refundOrOwing` 不受影响；BC 低净收入（信用满额 $75）和高净收入（信用为 $0）边界场景也未受影响；phase-out 区间边界（净收入 $18,749 / $18,750）连续性正常。
  - **38/38 引擎断言全部通过 ✓，TypeScript 编译 0 errors ✓。**

- **结论：** D5 暴露的 $52–$75 refund 缺口是真实的引擎 bug（BC Sales Tax Credit 这一退还性省级抵免完全缺失），已定位、修复并验证完毕——**不是** WS 异常，也不是用户操作有误。这是继 TICKET-024（BC 非合资格 DTC 税率错误）、TICKET-025（ON surtax 顺序 + DTC 税率过期）之后，本项目通过系统性 WS 比对发现的第三个真实计算 bug。

### D6: ON 2025 $120K T4 + T5 合资格股息 $10,000（surtax + 合资格 DTC 回归）✅

- **Status:** 🔵 待测
- **Tests:** TICKET-025 surtax 顺序修复的**合资格股息回归测试**（D3 只测了非合资格）。$120K 工资 + $13,800 gross-up 把 taxable income 推到 $133K → ON surtax 两档都触发（基础省税 > $7,307）；合资格 DTC = $13,800 × 10% = $1,380 必须在 surtax **之后**才扣（否则 surtax 被低估）
- **Input:**
  - taxYear: 2025, province: ON, age: 40
  - T4 Box 14: **$120,000**, Box 16: **$4,034.10**(YMPE cap), Box 18: **$1,077.48**(EI max), Box 22: **$25,000**, Box 24: $65,700, Box 26: $71,300
  - T5 Box 24(合资格): **$10,000**，**手动填 Box 25 = $13,800**（= $10,000 × 1.38，WS 可能不自动算）
  - 无 RRSP / FHSA
- **工具期望值:**
  - Total income: $133,800（= $120,000 + $10,000 × 1.38）
  - Net income: $133,122
  - ON surtax: **$1,656.34**（两档均触发 — 这是本 case 核心验证点）
  - Net federal tax: $19,590.37
  - Net provincial tax: $10,720.73（含 surtax $1,656.34 + OHP $750）
  - Total tax: $30,311.10
  - **Owing $5,311.10**
- **关键验证点:**
  - ① ON surtax > $0 且合理（如果 surtax = $0 说明 DTC 被错误地计入 surtax 基数，TICKET-025 回归）
  - ② 把这个 case 跟纯 $120K T4（无股息）对比：税增量 / $10K 实际股息 = 有效税率应 < 26%（联邦边际），如果 > 26% 说明 DTC 没生效

### D7: ON 2025 $45K T4 + T5 合资格股息 $3,000（LIFT 交互）✅

- **Status:** 🔵 待测
- **Tests:** 股息 gross-up 推高 net income → LIFT 大幅缩水 + OHP 跨段。这个 case 验证 LIFT、OHP、DTC 三者的**交互效应**——$3K 合资格股息的真实有效税率只有 4.4%，但原因是 DTC($717) 和 LIFT 减少($207) + OHP 增加($150) 互相对冲
- **Input:**
  - taxYear: 2025, province: ON, age: 30
  - T4 Box 14: **$45,000**, Box 16: **$2,469.25**(= 5.95% × $41,500), Box 18: **$738.00**(= 1.64% × $45,000), Box 22: **$6,000**, Box 24: $45,000, Box 26: $45,000
  - T5 Box 24(合资格): **$3,000**，**手动填 Box 25 = $4,140**（= $3,000 × 1.38）
  - 无 RRSP / FHSA
- **工具期望值:**
  - Total income: $49,140（= $45,000 + $3,000 × 1.38）
  - Net income: $48,725
  - LIFT: **$63.75**（对比无股息时的 $270.75，减少 $207 — gross-up 把 net income 从 $44,585 推到 $48,725）
  - OHP: **$600**（对比无股息时的 $450，增加 $150 — 跨过 $48,600 段位）
  - Net federal tax: $3,486.43
  - Net provincial tax: $1,798.13
  - Total tax: $5,284.56
  - **Refund $715.44**
- **对比 baseline（无股息 $45K）:**
  - Baseline: refund $845.99, LIFT $270.75, OHP $450
  - 加 $3K 合资格股息后 refund 减少 $130.55 → 有效税率仅 4.4%
- **关键验证点:**
  - ① LIFT 从 $270.75 降到 $63.75（gross-up 推高 net income 导致 phase-out 加速）
  - ② OHP 从 $450 涨到 $600（跨段效应）
  - ③ 尽管 LIFT↓$207 + OHP↑$150 = $357 的隐性成本，DTC 的 $717 完全覆盖 → 净效果仍是只交 4.4% 税
  - ④ RRSP 变额测试时，如果供款把 net income 压回 $44K 以下，LIFT 应该恢复到 $270+ 并且 OHP 退回 $450

### D8: ON 2025 $75K T4 + EI $6K（regular）+ 资本增益 $12K（EI clawback 被投资收入触发）✅

- **Status:** ✅ WS 比对通过（2026-06-07，修正 threshold + Box 26 后 7 项全过）
- **Tests:** 资本增益（50% 计入 = $6,000）把 net income 推过 EI clawback 门槛（$82,125）→ 触发 EI 回缴 $1,259.10。这个 case 验证**投资收入间接触发 clawback** 的路径 — 如果没有 $12K 资本增益，income $80,322 < threshold → clawback = $0
- **BUG 修复记录 (2026-06-07):** 原 `eiClawbackThreshold` 为 $79,000（2024 年值），正确 2025 年值 = $82,125（= 1.25 × $65,700 MIE）。修正 `federal.json` 后，engine 输出与 WS 完全吻合（$2,780.08 — Amy 用 Box 26 = $45,000 时）。Amy 测试时 T4 Box 26 填了 $45,000（应为 $71,300 = YMPE），导致 CPP overpayment $1,564.85 虚高。
- **Input:**
  - taxYear: 2025, province: ON, age: 35
  - T4 Box 14: **$75,000**, Box 16: **$4,034.10**(YMPE cap), Box 18: **$1,077.48**(EI max), Box 22: **$13,000**, Box 24: $65,700, Box 26: **$71,300**（⚠️ 不是 $45,000！）
  - **T4E Box 7: 30**（必须设！否则 WS 不算 clawback）
  - T4E Box 14: **$6,000**, Box 15: $6,000（全部 regular，不是 parental）, Box 22: **$600**
  - Schedule 3 资本增益: **$12,000** → 计入 $6,000（50% inclusion）
  - **WS "Dispositions" 填法:** 一笔即可 — Proceeds $32,000 / Cost base $20,000 / Expenses $0 → Gain $12,000
  - 无 RRSP / FHSA
- **工具期望值 (threshold 修正后):**
  - Total income: $87,000（= $75,000 + $6,000 EI + $12,000 × 0.5 cap gain）
  - Net income before SBR: $86,322（= $87,000 − $678 CPP enhanced）
  - EI clawback: **$1,259.10**（= 0.30 × min($6,000, $86,322 − $82,125) = 0.30 × $4,197）
  - Net income: $85,062.90
  - Net federal tax: $10,800.53
  - Net provincial tax: $5,497.31（OHP $750）
  - Total tax: $16,297.84
  - **Owing $3,956.94**（= $16,297.84 + $1,259.10 clawback − $13,600 withheld）
- **对比无资本增益时:**
  - 无 cap gains: totalIncome $81,000, netIncBeforeSBR $80,322 < $82,125 → **clawback = $0**
  - 关键区别：$12K 资本增益把 clawback 从 $0 推到 $1,259.10
- **关键验证点:**
  - ① Clawback = $1,259.10（部分回缴，因为 excess $4,197 < EI $6,000）
  - ② Clawback 入账两次（line 23500 减 net income + line 42200 加 payable）— 同 S2 的 TICKET-020 验证点
  - ③ WS 必须设 T4E Box 7 = 30，否则 WS 不算 clawback（同 S2 的 WS quirk）
  - ④ T4 Box 26 必须填 $71,300（YMPE），不是 $45,000（工资额）

### D9: BC 2025 $55K T4 + 利息 $500 + 合资格股息 $4K + 非合资格股息 $1K + 资本增益 $6K（四种投资收入并存）✅

- **Status:** ✅ WS 比对通过（2026-06-07，7 项全过）
- **Tests:** 四种投资收入类型**同时存在**的综合 BC 测试。验证 interest（1:1 计入）、eligible gross-up（×1.38）、non-eligible gross-up（×1.15）、cap gain（50% inclusion）的管道互不干扰
- **Input:**
  - taxYear: 2025, province: BC, age: 35
  - T4 Box 14: **$55,000**, Box 16: **$3,064.25**(= 5.95% × $51,500), Box 18: **$902.00**(= 1.64% × $55,000), Box 22: **$8,500**, Box 24: $55,000, Box 26: $55,000
  - T5 Slip 1：Box 13(利息): **$500**
  - T5 Slip 2：Box 24(合资格): **$4,000**，**手动填 Box 25 = $5,520**（= $4,000 × 1.38）
  - T5 Slip 3：Box 10(非合资格): **$1,000**，手动填 Box 11 = **$1,150**（= $1,000 × 1.15）
  - Schedule 3 资本增益: **$6,000** → 计入 $3,000（50% inclusion）
  - **WS "Dispositions" 填法:** Proceeds $21,000 / Cost base $15,000 / Expenses $0 → Gain $6,000
  - 无 RRSP / FHSA
- **工具期望值:**
  - Total income: **$65,170**（= $55,000 + $500 interest + $4,000×1.38 elig + $1,000×1.15 non-elig + $6,000×0.5 cap gain = $55,000 + $500 + $5,520 + $1,150 + $3,000）
  - Net income: $64,655
  - Net federal tax: $5,826.40
  - Net provincial tax: $2,163.54（无 surtax、无 OHP、无 basic tax reduction）
  - Total tax: $7,989.94
  - **Refund $510.06**
- **关键验证点:**
  - ① totalIncome 精确 = $65,170（逐项加和，任何一条 gross-up 路径错误都会偏移）
  - ② BC DTC 合资格 = $5,520 × 12% = $662.40；非合资格 = $1,150 × 1.96% = $22.54 — 利息和资本增益**不产生 DTC**
  - ③ 四种收入互不干扰：利息不被 gross-up、资本增益不触发 DTC、stock dividend 不影响 cap gain inclusion

### D10: BC 2025 纯自雇 $40K + T5 合资格股息 $6,000（自雇 CPP + DTC 交互）✅

- **Status:** ✅ WS 比对通过（2026-06-07，6 项全过）
- **Tests:** 自雇 CPP payable + 股息 DTC 的交互。这个路径从未被测过 — D1-D5 全是 T4 或纯投资，没有自雇 + 股息的组合。验证自雇 CPP 的各项拆解（credit base / deduction / payable）在有股息收入时仍正确
- **Input:**
  - taxYear: 2025, province: BC, age: 35
  - **无 T4**（所有 T4 字段为 0）
  - selfEmployment.netIncome: **$40,000**
  - T5 Box 24(合资格): **$6,000**，**手动填 Box 25 = $8,280**（= $6,000 × 1.38）
  - 无 RRSP / FHSA
  - **WS 自雇填法:** T2125 表 → Line 8299 (Gross business income) 填 $40,000 → Line 9369 (Net income) 填 $40,000（假设无业务开支）
- **工具期望值:**
  - Total income: $48,280（= $40,000 self-emp + $6,000 × 1.38 elig div gross-up）
  - Net income: $45,743.25（扣除 CPP enhanced + SE CPP employer base deduction）
  - Net federal tax: $2,788.45
  - Net provincial tax: $575.23
  - CPP payable: **$4,343.50**（自雇双份 CPP：$36,500 × 11.9%）
  - Total tax: $3,363.68
  - **Owing $7,707.18**（= $3,363.68 tax + $4,343.50 CPP − $0 withheld）
- **关键验证点:**
  - ① CPP payable = $4,343.50（自雇 CPP 基于 $40K 自雇收入，**不含**股息收入 — 投资收入不算 earned income）
  - ② DTC 正确抵减省税（BC 合资格 DTC = $8,280 × 12% = $993.60，使 netProvTax 从无股息的约 $1,569 降至 $575）
  - ③ BC basic tax reduction 在此 net income ($45,743) 下已完全 phase-out（起始 $25,020 + $562/0.0356 ≈ $40,807 归零）
  - ④ BC Sales Tax Credit 也为 $0（net income $45,743 >> $18,750 phase-out 终点）

### D11: ON 2025 $200K T4 + T5 合资格股息 $20,000（联邦 BPA phase-out + surtax 极限）✅

- **Status:** ✅ WS 比对通过（2026-06-07，7 项全过）
- **Tests:** 联邦 BPA phase-out（$177,882–$253,414 区间）+ ON surtax 两档满额触发的**极限压力测试**。Taxable income $226,922 深入 BPA phase-out 区间 → BPA 从 $16,129 降到约 $14,997；同时 ON surtax 在高省税基础上产生 $7,988 的巨额附加税
- **Input:**
  - taxYear: 2025, province: ON, age: 50
  - T4 Box 14: **$200,000**, Box 16: **$4,034.10**(YMPE cap), Box 18: **$1,077.48**(EI max), Box 22: **$52,000**, Box 24: $65,700, Box 26: $71,300
  - T5 Box 24(合资格): **$20,000**，**手动填 Box 25 = $27,600**（= $20,000 × 1.38）
  - 无 RRSP / FHSA
- **工具期望值:**
  - Total income: $227,600（= $200,000 + $20,000 × 1.38）
  - Net income: $226,922
  - ON surtax: **$7,987.99**（极高 — 两档均深度触发）
  - Net federal tax: $43,526.62
  - Net provincial tax: $27,128.90（含 surtax $7,987.99 + OHP $900）
  - Total tax: $70,655.52
  - **Owing $18,655.52**
- **关键验证点:**
  - ① 联邦 BPA 被 phase-out：在 $226,922 taxable income 下，BPA ≈ $14,997（不是满额 $16,129）。如果 WS 的联邦税跟工具对齐，说明 phase-out 公式正确
  - ② ON surtax ≈ $7,988 且必须在 DTC 之前计算（TICKET-025）。如果 surtax 偏低，说明 DTC 被错误地计入 surtax 基数
  - ③ 合资格 DTC = $27,600 × 15.0198%(联邦) + $27,600 × 10%(ON) = $4,145 + $2,760 = $6,905 的巨额 DTC，但在 29% 联邦边际税率下仍有净成本
  - ④ OHP 应为 $900（$200K+ 段满额）
  - ⑤ 这是 D 系列里 surtax 最高的 case，如果 TICKET-025 的 surtax 顺序修复有任何遗留问题，这里最容易暴露

### D12: ON 2025 纯自雇 $60K + T5 非合资格股息 $5,000（ON 自雇 CPP + 非合资格 DTC）✅

- **Status:** ✅ WS 比对通过（2026-06-07，修正 LIFT bug 后全过）
- **BUG 修复记录:** RRSP $15K/$20K/$30K 差异 $159/$409/$651 = LIFT credit 误发放给自雇收入（TICKET-028）。修正后与 WS 完全吻合。
- **Tests:** ON 自雇 CPP（D10 只测了 BC）+ 非合资格股息作为唯一投资类型（此前从未单独测过）。验证 ON 的 OHP 和 surtax 在自雇场景下正确计算
- **Input:**
  - taxYear: 2025, province: ON, age: 40
  - **T2125 Net business income: $60,000**（纯自雇，无 T4）
  - T5 Slip：Box 10(非合资格): **$5,000**，手动填 Box 11 = **$5,750**（= $5,000 × 1.15）
  - 无 RRSP / FHSA / EI
- **WS 填法:**
  - Self-employment → "Business income" → Net income = $60,000
  - T5 Slip → Box 10 = $5,000, Box 11 = $5,750
  - 不需要 T4 / T4E
- **工具期望值:**
  - Total income: **$65,750**（= $60,000 + $5,000 × 1.15）
  - Net income: $61,823.25（SE CPP deductions 扣除后）
  - CPP payable: **$6,723.50**（双倍 CPP — 雇员+雇主份额）
  - Net federal tax: $5,967.80
  - Net provincial tax: $3,131.83（OHP $600，无 surtax）
  - **Owing $15,823.13**（自雇无预扣，owing 高是正常的）
- **关键验证点:**
  - ① CPP payable = $6,723.50（双倍 CPP，pensionable = $60K − $3,500 = $56,500）
  - ② OHP = $600（netIncome $61,823 落在 $48,600–$72,000 段）
  - ③ 非合资格 DTC = $5,750 × 2.9863% = $171.71（ON 专属税率，之前只在 D2/D3 混合场景中间接测过）
  - ④ 无 surtax（省税基数不够高）

### D13: ON 2025 $80K T4 + **产假 EI** $10K + 合资格股息 $5K（产假 EI 免回缴验证）✅

- **Status:** ✅ WS 比对通过（2026-06-07，7 项全过）
- **Tests:** 产假/陪产假 EI **完全豁免** clawback 的路径。净收入 $96,222 远超 $82,125 门槛，如果是 regular EI 会触发 $3,000 clawback，但 parental EI 应该 = $0。这是唯一验证 `isParental: true` 逻辑的 case
- **Input:**
  - taxYear: 2025, province: ON, age: 32
  - T4 Box 14: **$80,000**, Box 16: **$4,034.10**, Box 18: **$1,077.48**, Box 22: **$14,000**, Box 24: $65,700, Box 26: $71,300
  - T4E Box 14: **$10,000**, Box 22: **$1,000**
  - ⚠️ **T4E Box 7 留空或设 0**（不是 30！产假 EI 没有 clawback weeks）
  - T5 Slip：Box 24(合资格): **$5,000**，手动填 Box 25 = **$6,900**（= $5,000 × 1.38）
  - 无 RRSP / FHSA
- **WS 填法:**
  - T4 照常填
  - T4E → Box 14 = $10,000, Box 22 = $1,000。**Box 7 不填或填 0**
  - T5 → Box 24 = $5,000, Box 25 = $6,900
- **工具期望值:**
  - Total income: **$96,900**（= $80,000 + $10,000 EI + $5,000 × 1.38）
  - Net income: $96,222（仅 CPP enhanced $678 作为扣减）
  - **EI clawback: $0**（产假 EI 完全豁免！）
  - Net federal tax: $12,051.77
  - Net provincial tax: $5,840.04（surtax $11.67 + OHP $750）
  - **Owing $2,891.82**
- **对比 regular EI 时:**
  - 如果 EI 是 regular（Box 7 = 30）: clawback = $3,000，owing 会变成 ~$4,991
  - 差额 ~$2,099 = $3,000 clawback 扣除对税的连锁影响
- **关键验证点:**
  - ① Clawback = $0（产假豁免 — 最核心验证点）
  - ② WS 中 T4E Box 7 **不填**（产假 EI 的 Box 7 应为空白或 0；如果误填 30，WS 会算 clawback）
  - ③ Surtax 小额 $11.67（刚过第一档 $5,710 门槛）— 确认有 EI 时 surtax 仍正确

### D14: BC 2025 $140K T4 + 合资格股息 $12K + 资本增益 $15K（BC 高收入上限税率）✅

- **Status:** ✅ WS 比对通过（2026-06-07，7 项全过）
- **Tests:** BC 高收入段（14.7% 税率，$137,407–$186,306 档）。此前 BC 全部 case 都在中低收入（$40K–$60K），从未测过 BC 高税率 bracket。同时验证大额合资格 DTC 在高收入 BC 的表现
- **Input:**
  - taxYear: 2025, province: BC, age: 45
  - T4 Box 14: **$140,000**, Box 16: **$4,034.10**, Box 18: **$1,077.48**, Box 22: **$30,000**, Box 24: $65,700, Box 26: $71,300
  - T5 Slip：Box 24(合资格): **$12,000**，手动填 Box 25 = **$16,560**（= $12,000 × 1.38）
  - Schedule 3 资本增益: **$15,000** → 计入 $7,500（50% inclusion）
  - **WS "Dispositions" 填法:** Proceeds $45,000 / Cost base $30,000 / Expenses $0 → Gain $15,000
  - 无 RRSP / FHSA / EI
- **工具期望值:**
  - Total income: **$164,060**（= $140,000 + $12,000×1.38 + $15,000×0.5）
  - Net income: $163,382
  - Net federal tax: $27,043.42
  - Net provincial tax: $11,753.57（无 surtax、无 OHP — BC 没有这些）
  - Total tax: $38,797.00
  - **Owing $8,797.00**
- **关键验证点:**
  - ① BC 14.7% bracket 被触发（taxable income $163,382 > $137,407）
  - ② BC eligible DTC = $16,560 × 12% = $1,987.20（大额 DTC 正确抵减高税率段的省税）
  - ③ 无 surtax / 无 OHP / 无 basic tax reduction（全部 phased out 或不适用）
  - ④ Effective rate ≈ 23.65%（合理 — BC 高收入但有 DTC 降低有效税率）

---

## 📋 阶段 4: 魁北克省 scenarios

> 验证 Quebec 联邦减免（abatement 16.5%）、QC 税阶、QC BPA、QPP/QPIP/QC-EI、QC DTC、跨省对比。
> 所有数据来自引擎编译后 Node.js 直接运行，`.test.ts` 文件: `code/src/lib/tax/__tests__/quebec.test.ts`
> 测法：WS 新开一份报税 → 按下方 WS 填法 填 T4 + RL-1（+ T5 如有）→ 看 Summary refund/owing 跟工具一致。

### QC 在 WS 的填法说明（T4 + RL-1）

QC 跟 ON/BC 最大的区别：**WS 需要同时填 T4 和 RL-1 两张表**。设 Box 10 = QC 后，WS 会弹出 RL-1 字段（粉色高亮 = 必填）。

**T4 QC 专属字段：**

| Box | 含义 | 怎么算 | 说明 |
|---|---|---|---|
| Box 10 | Province | **QC** | 必须选 QC，否则 WS 当 ON/BC 处理 |
| Box 14 | Employment income | 工资总额 | 同 ON/BC |
| Box 16 | CPP contributions | **留空** | QC 不用 CPP，用 Box 17 QPP 代替 |
| Box 17 | QPP contributions | `(min(gross,$71,300) − $3,500) × 6.40%`，cap $4,339.20 | 引擎的 `cppContribution`（在 QC = QPP）|
| Box 18 | EI premiums | `min(gross,$65,700) × 1.31%`（2025）/ `1.32%`（2024）| QC EI 费率比标准低（1.31% vs 1.64%），因为已交 QPIP |
| Box 22 | Income tax deducted | 非 QC：`federalTaxWithheld + provincialTaxWithheld`；**QC：仅 `federalTaxWithheld`** | ⚠️ **QC 例外**：魁省居民 T4 Box 22 **只含联邦税**，省税单独在 RL-1 Box E。两者相加才是总预扣——**别把合计填进 Box 22，否则省税被重复计一次**|
| Box 24 | EI insurable earnings | `min(gross, $65,700)` | 同 ON/BC |
| Box 26 | QPP pensionable earnings | `cppPensionableEarnings`（通常 = `min(gross, $71,300)`） | 同 ON/BC 的 CPP Box 26 |
| Box 55 | PPIP premiums (QPIP) | `min(gross, $98,000) × 0.494%` | 引擎的 `ppipPremium`，QC 独有 |

⚠️ T4 顶部 checkbox：CPP/QPP exempt = **不勾**，EI exempt = **不勾**，PPIP exempt = **不勾**

**RL-1（最少要填的字段）：**

| Box | 含义 | 来源 |
|---|---|---|
| Box A | Revenus d'emploi | = T4 Box 14（工资总额）|
| Box E | Impôt du Québec retenu | 引擎的 `provincialTaxWithheld`（**不是** Box 22 全额！）|

> ⚠️ **RL-1 Box B 必须手动填（关键，QC2 实测踩坑）：** WS **不会**从 T4 Box 17 自动带入 RL-1 的 QPP 供款。魁省端的 **TP-1 Line 248（增强 QPP 扣除）走 Schedule U，只读 RL-1 Box B**，不读 T4 Box 17。Box B 留空 → Line 248 = $0 → 魁省净收入虚高、欠税偏多。
>
> RL-1 Box B 按 Revenu Québec 官方定义拆成两格：
> - **Box B.A = 基础 + 第一附加 QPP 供款合计**（= **T4 Box 17 的全额**，不要自己拆！WS 会自动从中分出第一附加部分进 Line 248）
> - **Box B.B = 第二附加 QPP 供款（QPP2，YMPE 以上那段，对应 T4 Box 17A）**。收入 ≤ YMPE（2025 = $71,300）时为 **$0，留空**。
> - ❌ 别把第一附加（enhanced）单独拆出来填进 B.B——那是 QPP2 的格子，会被 WS 标红。
>
> **本工具暂不建模 QPP2（第二附加）**，所以收入 > YMPE 的 case（QC1/QC3/QC4）在 WS 比对时，**Box B.B 和 T4 Box 17A 都要留空**，否则 WS 会多算 QPP2 与引擎不一致（已知 P1 缺口）。
>
> 其他 RL-1 字段（C = EI, H = QPIP 等）WS 可能从 T4 自动带入；若没自动填，用 T4 对应 Box 的值手动填。

**QPP vs CPP 对照：**

| 项目 | QC（QPP） | ON/BC（CPP） |
|---|---:|---:|
| Base rate | 5.40% | 4.95% |
| Enhanced rate | 1.00% | 1.00% |
| 总员工率 | **6.40%** | **5.95%** |
| 最高员工缴 | **$4,339.20** | $4,034.10 |
| QPIP 员工率 | 0.494% | N/A |
| EI 费率（2025） | **1.31%** | 1.64% |

**自雇 QC 公式：**
- SE QPP total = `(min(gross,$71,300) − $3,500) × 12.80%`（双份 6.40%）
- SE QPIP = `min(gross,$98,000) × 0.878%`

---

### QC1: QC 2025 T4 $80K baseline（abatement + QPP + **非满额 QPP2**）✅

- **Status:** ✅ **PASSED（含 QPP2 $348，2026-07-19 重测）—— 7 个供款点全过：$0 / $403 / $5,000 / $10,000 / $20,000 / $21,599 / $35,000。**

  | RRSP | 引擎 = 实测 | 应税收入 | 备注 |
  |---:|---:|---:|---|
  | **$0** | 欠 **$145.20** | $78,974 | baseline |
  | **$403** | 退 **$0.35** | $78,571 | 补税归零点 |
  | **$5,000** | 退 **$1,660.67** | $73,974 | |
  | **$10,000** | 退 **$3,466.55** | $68,974 | |
  | **$20,000** | 退 **$7,078.30** | $58,974 | |
  | **$21,599** | 退 **$7,655.82** | $57,375 | 降档点（联邦第一档边界）|
  | **$35,000** | 退 **$11,289.48** | $43,974 | |

  - 全程药保费 **$755 封顶**、HSF **$0**（纯受雇收入）。
  - **⭐ 本案的独特价值：$80,000 落在 YMPE $71,300 与 YAMPE $81,200 之间，QPP2 = $348 为非满额**，验证的是 **QPP2 按比例计算**那条路径 —— QC3 的 $396 已封顶，覆盖不到。至此 TICKET-030 的受雇端**两条分支（按比例 + 封顶）均获外部验证**。
- **📌 2026-07-19 审计留档：旧记录值曾过时约一个月**
  - 旧记录（2026-06-30）称 Total tax **$17,097.30**、**退 $902.70**（不含 QPP2）；重算后不含 QPP2 应为**欠 $270.89**，差 **$1,173.59**。
  - **不是预扣重复计算问题**（旧记录「税 + 退 = $18,000」正好等于正确预扣，说明 Box 22 当初就填对了，与 QC3 的情况不同）。差的是**税额本身**，源于 2026-06-30 之后的引擎改进：其中 **$755** 是后来加入的 RAMQ 药保费，余下 $418.59 来自其他改进。
  - **教训：** 引擎改进后，已标记「通过」的旧 case 没有被重新核对。已开任务写自动校验脚本（见 TICKETS）。
- **Tests:** QC 4 档税阶 + 联邦 abatement 16.5% + QC BPA $18,571 + QPP 费率 + QPIP + **QPP2 按比例计算**
- **Input:**
  - taxYear: 2025, province: QC, age: 30
  - T4 Box 14: **$80,000**
  - 无 EI benefits / RRSP / FHSA / 投资
- **WS T4 填法：**

  | Box | 值 | 说明 |
  |---|---:|---|
  | Box 10 | QC | |
  | Box 14 | $80,000.00 | 工资 |
  | Box 17 | $4,339.20 | QPP = (min(80K,71300)−3500)×6.40% capped |
  | Box 18 | $860.67 | QC EI = min(80K,65700)×1.31% |
  | Box 22 | $10,000.00 | **仅联邦**预扣（省税另见 RL-1 Box E $8,000；合计 $18,000，勿重复填）|
  | Box 24 | $65,700.00 | EI insurable max |
  | Box 26 | $80,000.00 | QPP pensionable |
  | Box 55 | $395.20 | QPIP = 80000×0.494% |

- **WS RL-1 填法：**

  | Box | 值 | 说明 |
  |---|---:|---|
  | Box A | $80,000.00 | |
  | Box B.A | $4,339.20 | = T4 Box 17 全额（WS 自动分出第一附加 $678 进 Line 248）|
  | Box B.B | **$348.00** | ⭐ 重测时填（= ($80,000−$71,300)×4%，**非满额**）；旧记录留空 |
  | Box E | $8,000.00 | **仅魁省**预扣 |

- **引擎结果（现行引擎，2026-07-19 重算；旧值 Total tax $17,097.30 / 退 $902.70 已作废）:**

  | 项目 | 值 |
  |---|---:|
  | 净收入 / 应税收入 | $79,322.00 |
  | 联邦税（抵免前）| $12,818.51 |
  | 联邦抵免 | $3,264.98 |
  | **魁省 abatement** | **$1,576.33** |
  | 联邦税净额 | $7,977.20 |
  | 魁省税（抵免前）| $12,138.63 |
  | 魁省抵免 | $2,599.94 |
  | **药保费（447）** | **$755.00** |
  | HSF（446）| $0.00（纯受雇收入）|
  | 魁省税净额 | $10,293.69 |
  | 税合计 | **$18,270.89** |
  | 预扣合计 | $18,000.00 |
  | **最终结果** | **欠 $270.89** |

```json fixture
{
  "id": "QC1",
  "label": "QC 2025 T4 $80K baseline（含 QPP2 $348）",
  "input": {
    "taxYear": 2025, "province": "QC", "age": 30,
    "isFirstTimeHomeBuyer": false,
    "rrspRoomAvailable": 200000, "fhsaRoomAvailable": 0, "fhsaLifetimeUsed": 0,
    "deductions": { "rrspContribution": 0, "fhsaContribution": 0 },
    "income": { "employment": {
      "gross": 80000, "federalTaxWithheld": 10000, "provincialTaxWithheld": 8000,
      "cppContribution": 4339.20, "cpp2Contribution": 348, "eiPremium": 860.67,
      "cppPensionableEarnings": 80000, "ppipPremium": 395.20
    }}
  },
  "points": [
    { "rrsp": 0,     "expect": -145.20,   "verified": "WS", "assert": { "provincialDrugPremium": 755 } },
    { "rrsp": 403,   "expect": 0.35,      "verified": "WS" },
    { "rrsp": 5000,  "expect": 1660.67,   "verified": "WS" },
    { "rrsp": 10000, "expect": 3466.55,   "verified": "WS" },
    { "rrsp": 20000, "expect": 7078.30,   "verified": "WS" },
    { "rrsp": 21599, "expect": 7655.82,   "verified": "WS" },
    { "rrsp": 35000, "expect": 11289.48,  "verified": "WS" }
  ]
}
```

---

#### ✅ QC1 QPP2 配置（已验证，留作复现用）

> **为什么加 QPP2：** $80,000 落在 YMPE $71,300 与 YAMPE $81,200 **之间**，所以 QPP2 = ($80,000 − $71,300) × 4% = **$348 —— 不是满额**。
> QC3 验的是 $396（已封顶），只走到「取上限」那条路径；**QC1 的 $348 验证的是按比例计算那一段。** 两者合起来才把 TICKET-030 受雇端覆盖完整。

- **完整填法（TurboTax 里那份 $80K 的 return 就是 QC1/QC4 共用的，在其基础上改）：**

  | 位置 | 框 | 值 | 是否需改动 |
  |---|---|---:|---|
  | T4 | Box 10 | QC | 不变 |
  | T4 | Box 14 | $80,000.00 | 不变 |
  | T4 | Box 17 | $4,339.20 | 不变 |
  | T4 | **Box 17A** | **$348.00** | ⭐ **新填** |
  | T4 | Box 18 | $860.67 | 不变 |
  | T4 | Box 22 | $10,000.00 | 不变（**仅联邦**）|
  | T4 | Box 24 | $65,700.00 | 不变 |
  | T4 | Box 26 | $80,000.00 | 不变（未达 YAMPE，**不要**改成 $81,200）|
  | T4 | Box 55 | $395.20 | 不变 |
  | RL-1 | Box A | $80,000.00 | 不变 |
  | RL-1 | Box B.A | $4,339.20 | 不变 |
  | RL-1 | **Box B.B** | **$348.00** | ⭐ **新填** |
  | RL-1 | Box E | $8,000.00 | 不变（**仅魁省**）|
  | — | RRSP 供款 | **$0** | ⭐ **从 $10,000 改为 0** |

  - ⚠️ **Box 17A 与 Box B.B 必须两个都填** —— 只填一边会因 T4/RL-1 交叉校验失败而报错（QC3 的教训）。
  - ⚠️ Box 26 **保持 $80,000**。与 QC3 不同：QC3 收入 $120K 已超 YAMPE，故 Box 26 填上限 $81,200；QC1 收入未达上限，填实际值即可。
  - **成功标志：** 导出的联邦 **line 22215 = $1,026**（= 第一附加 $678 + QPP2 $348）。若仍是 $678，说明 QPP2 没进去，别继续比对。

- **引擎预期值（baseline，RRSP $0 + QPP2 $348）：**

  | 项目 | 值 |
  |---|---:|
  | 净收入 / 应税收入 | **$78,974.00** |
  | 联邦税（抵免前）| $12,747.17 |
  | 联邦抵免 | $3,264.98 |
  | 魁省 abatement | $1,564.56 |
  | 联邦税净额 | $7,917.63 |
  | 魁省税（抵免前）| $12,072.51 |
  | 魁省抵免 | $2,599.94 |
  | 药保费（447）| $755.00 |
  | HSF（446）| $0.00 |
  | 魁省税净额 | $10,227.57 |
  | 税合计 | $18,145.20 |
  | 预扣合计 | $18,000.00 |
  | **最终结果** | **欠 $145.20** |

- **RRSP 变额预期值：**

  | RRSP | 含 QPP2 $348 | 对照：不含 QPP2 | QPP2 带来的差额 |
  |---:|---:|---:|---:|
  | **$0** | 欠 **$145.20** | 欠 $270.89 | $125.69 |
  | $5,100 | 退 $1,696.79 | 退 $1,571.10 | $125.69 |
  | **$10,000** | 退 **$3,466.55** | 退 $3,340.86 ⭐ | $125.69 |
  | $20,000 | 退 $7,078.30 | 退 $6,952.61 | $125.69 |
  | $21,947 | 退 $7,764.07 | 退 $7,655.82 | $108.25 |
  | $43,000 | 退 $13,378.08 | 退 $13,287.23 | $90.85 |

  - ⭐ 不含 QPP2 的 $10,000 那一点（退 $3,340.86）**= QC4，已获 TurboTax 逐行验证 $3,340.85**，是整组最强的锚点：它同时证明「不含 QPP2 的引擎路径」正确，从而使 $125.69 的差额可被单独归因于 QPP2。
  - 全程药保费 **$755 封顶**、HSF **$0**。
  - **QPP2 差额随供款递减**（$125.69 → $108.25 → $90.85），因为扣除的价值取决于边际税率，高供款把收入压进低税档。这本身也是一个可验证的信号。

- **✅ 实测结果：baseline 落在欠 $145.20，7 个供款点全部通过。** QPP2 按比例计算验证通过。
  - 排错参考（若日后复现出问题）：落在**欠 $270.89** = Box 17A / B.B 没生效，先看 line 22215 是不是还停在 $678。

- **关键验证点:**
  - ① Abatement = basicFederalTax × 16.5%
  - ② QPP contribution $4,339.20 > CPP $4,034.10（QPP 费率高 0.45%）
  - ③ QPIP $395.20 产生额外非退还性抵免（联邦 + 省）
  - ④ **⚠️ Box B.B 留空**（真实值约 $348）。TICKET-030 实现后引擎已支持 QPP2，若要连 QPP2 一起验，需按 QC3 的做法：Box 26 改 $81,200、T4 Box 17A 与 RL-1 Box B.B **两个都填**。

### QC2: QC 2025 T4 $50K（低收入 abatement）✅

- **Status:** ✅ **PASSED**（三方一致：引擎 = TurboTax = WS，2026-06-30）。baseline + RRSP 供款变额（$0/$2K/$2,086/$10K/$20K/$29K/$30K/$33,406）全部与 WS 对齐。修复了两处：① 漏填 RL-1 Box B.A（填 $2,976）；② RAMQ 药险费收入测试（≤$19,890 应为 $0）。
  - **✅ 2026-07-19 审计复核：记录值与现行引擎逐项完全一致**（netFed $3,453.30｜netProv $4,891.16｜Total $8,344.46｜abatement $682.39｜欠 $544.46｜药保 $755｜HSF $0）。当初 Box 22 就填对了（仅联邦 $3,600 + Box E $4,200 = $7,800），**未受 QC1/QC3 那类问题影响，结论依然有效，无需重测。**
- **Tests:** 低收入段 abatement + QC 第 1 档 14% + QPP
- **Input:**
  - taxYear: 2025, province: QC, age: 30
  - T4 Box 14: **$50,000**
- **WS T4 填法：**

  | Box | 值 | 说明 |
  |---|---:|---|
  | Box 10 | QC | |
  | Box 14 | $50,000.00 | |
  | Box 17 | $2,976.00 | QPP = (50000−3500)×6.40% |
  | Box 18 | $655.00 | QC EI = 50000×1.31% |
  | Box 22 | $3,600.00 | **仅联邦**预扣（T4 Box 22 只放联邦税）|
  | Box 24 | $50,000.00 | |
  | Box 26 | $50,000.00 | |
  | Box 55 | $247.00 | QPIP = 50000×0.494% |

- **WS RL-1 填法：**

  | Box | 值 | 说明 |
  |---|---:|---|
  | Box A | $50,000.00 | |
  | Box B.A | $2,976.00 | = T4 Box 17 全额（**必填**；WS 自动分出第一附加 $465 进 Line 248）|
  | Box B.B | 留空 | 收入 < YMPE，无 QPP2 |
  | Box E | $4,200.00 | **仅魁省**预扣（RL-1 Box E，独立于 Box 22）|

- **预扣说明（关键）：** Box 22 与 Box E 是**两笔独立**预扣，WS 会**相加**。总预扣 = $3,600 + $4,200 = **$7,800**。
- **引擎结果（已含 RAMQ 药险费 $755）:**
  - netFederalTax: **$3,453.30**（= 基础联邦税 $4,135.69 − abatement $682.39，与 WS 一致）
  - netProvincialTax: **$4,891.16**（魁省 taxable $48,115 ×14% − BPA抵免 $2,599.94 + 药险费 $755）
  - Total tax: **$8,344.46**
  - Abatement: **$682.39**
  - **净结果：欠税约 $544**（总预扣 $7,800 − 总税 $8,344.46）
- **✅ 三方交叉验证（引擎 = TurboTax，WS 漏算 line 248）：**
  - 那 $465 是 QPP **增强供款**（first additional = (50000−3500)×1%）。按 **TP-1 Line 248**（Schedule U / LE-35-V），魁省**居民**可在魁省端扣除这笔，与联邦 line 22215 对应（仅**非居民**不可扣）。
  - **TurboTax 实测确认：** line 248 = **$465**，魁省 net income(275) = **$48,115**，income tax(401) = $6,736.10，line 450 = **$4,891.16**，魁省 balance due(479) = **$691.16** —— 与引擎**逐项分文不差**。

  | | 魁省 net income | 魁省税(450) | 魁省欠 |
  |---|---:|---:|---:|
  | 引擎 | $48,115 | $4,891.16 | $691.16 |
  | TurboTax | $48,115 | $4,891.16 | $691.16 |
  | WS | $48,580 ❌ | $4,956.26 | $756.26 |

  - **WS 魁省 net income = $48,580 漏扣了 $465**（line 248），导致税高 $65。结论：**引擎正确，无需改算法；WS 此处有缺陷。**
  - 合并净结果（联邦退 $146.70 − 魁省欠 $691.16）：引擎 = TurboTax = **净欠 $544.46**；WS 为净欠 $609.56。

- **RRSP 供款变额测试（2026-06-30，与 WS 比对）：**

  | RRSP | 魁省净收入(line 275) | RAMQ 药险费(447) | 结果 | Status |
  |---:|---:|---:|---|---|
  | $0 | $48,115 | $755 | 欠 $544.46 | ✅ |
  | $2,000 | $46,115 | $755 | 欠 $22.31 | ✅ |
  | $2,086 | $46,029 | $755 | ≈ $0（打平） | ✅ |
  | $10,000 | $38,115 | $755 | 退 $2,066 | ✅ |
  | $20,000 | $28,115 | $755 | 退 $4,677 | ✅ |
  | $29,000 | $19,115 | **$0** | 退 $7,800 | ✅（修复后，WS 实测）|
  | $30,000 | $18,115 | **$0** | 退 $7,800 | ✅（修复后，WS 实测）|
  | $33,406 | $14,709 | **$0** | 退 $7,800 | ✅（修复后，WS 实测）|

  - **🐛 RAMQ 药险费收入测试（已修复 2026-06-30）：** 引擎原本对 RAMQ 药险费按**固定 $755** 处理，不论收入。但 Schedule K「情形 32」规定：**无配偶、line 275 ≤ $19,890（2025）→ 药险费 = $0**（甚至无需填 Schedule K）。RRSP $30,000/$33,406 把魁省净收入压到阈值以下，应为 $0，引擎却仍收 $755 → 退税少 $755（$7,045 vs WS $7,800）。
  - **修复：** 新增 `drugInsurancePremiumExemption`（2025 = $19,890，2024 = $18,910）。魁省净收入 ≤ 阈值 → 药险费 $0，否则取最高 $755。**单人结构上是「悬崖」**（豁免阈值与封顶阈值重合：$19,890 − $8,181 = $11,709；夫妻同理 $32,240 − $14,669 = $17,571），故无部分金额区间。引擎仅建模单人（无配偶）。

```json fixture
{
  "id": "QC2",
  "label": "QC 2025 T4 $50K（低收入 abatement）",
  "input": {
    "taxYear": 2025, "province": "QC", "age": 30,
    "isFirstTimeHomeBuyer": false,
    "rrspRoomAvailable": 200000, "fhsaRoomAvailable": 0, "fhsaLifetimeUsed": 0,
    "deductions": { "rrspContribution": 0, "fhsaContribution": 0 },
    "income": { "employment": {
      "gross": 50000, "federalTaxWithheld": 3600, "provincialTaxWithheld": 4200,
      "cppContribution": 2976, "eiPremium": 655,
      "cppPensionableEarnings": 50000, "ppipPremium": 247
    }}
  },
  "points": [
    { "rrsp": 0,     "expect": -544.46, "verified": "WS+TurboTax", "assert": { "provincialDrugPremium": 755 } },
    { "rrsp": 2000,  "expect": -22.31,  "verified": "WS" },
    { "rrsp": 10000, "expect": 2066,    "tol": 1, "verified": "WS（文档记的是整数）" },
    { "rrsp": 20000, "expect": 4677,    "tol": 1, "verified": "WS（文档记的是整数）" },
    { "rrsp": 29000, "expect": 7800,    "verified": "WS", "assert": { "provincialDrugPremium": 0 },
      "disputed": "引擎给 退 $7,723.84（魁省仍有 $76.16 税）。魁省应税 = 50000−29000−465(248)−1420(201) = $19,115 > BPA $18,571，按 14% 算差额正是 $76.16，引擎内部自洽。$30,000/$33,406 两点因为已跌破 BPA、两边都是 $0，分辨不出来 —— $29,000 是本案唯一落在 BPA 与药保豁免线之间的点。待重新读一次 WS 该点的导出确认。" },
    { "rrsp": 30000, "expect": 7800,    "verified": "WS", "assert": { "provincialDrugPremium": 0 } },
    { "rrsp": 33406, "expect": 7800,    "verified": "WS", "assert": { "provincialDrugPremium": 0 } }
  ]
}
```

### QC3: QC 2025 T4 $120K（高收入 abatement + 跨多档）✅

- **Status:** ✅ **PASSED（QPP2 版本，Wealthsimple 实测 2026-07-19）—— 6 个供款点全过：$0 / $2,859 / $4,176 / $10,000 / $30,000 / $35,000。** 含受雇端 QPP2 $396 的完整验证。
  - **✅ 已验证（2026-07-19，Wealthsimple 实测，全部在正确预扣 $32,000 下）：**

    | 场景 | WS | 引擎 |
    |---|---:|---:|
    | RRSP $1,500，无 QPP2 | 补 $801.79 | 补 **$801.79** ✓ 逐行一致 |
    | RRSP $0，无 QPP2 | 补 $1,487 | 补 **$1,487.44** ✓ |
    | RRSP $0，含 QPP2 $396 | 补 $1,306 | 补 **$1,306.43** ✓ |

    逐行核对（RRSP $1,500 那次）：净收入 $117,822｜联邦抵免 $3,277.87｜abatement $2,904.35｜魁省税前 $19,948.98｜药保 $755｜HSF $0。**证明 TICKET-031/033/034/035/036/037 对本案零影响。**
  - **🚨 2026-06-30 那一轮的「PASSED」已作废（2026-07-19 发现）：** 旧记录称 baseline 退 **$12,513**，但该值是**预扣重复计算 bug** 的产物 —— 当时 Box 22 误填了「联邦+省合计 $32,000」，再加 RL-1 Box E $14,000，实际喂进了 **$46,000** 预扣。用 $46,000 复现得 **退 $12,512.56**，与旧值吻合，确认无疑。正确预扣 $32,000 下应为**补 $1,487.44**。
    - **连带作废：** 该轮的 RRSP 变额点（$4,572 / $7K / $10K / $20K / $30K / $43K）**全部无效**，需在正确输入下重测。
    - 同类问题在 QC4/QC6 已修（见「Box 22 仅联邦」说明），QC3 的旧结论此前未回头复核。
  - **⏳ 待测：RRSP 变额**（见下方表格）
- **Tests:** 收入跨 QC 3 个税档（14% / 19% / 24%）+ 大额 abatement + **QPP2（受雇端）**
- **Input:**
  - taxYear: 2025, province: QC, age: 35
  - T4 Box 14: **$120,000**
- **WS T4 填法：**

  | Box | 值 | 说明 |
  |---|---:|---|
  | Box 10 | QC | |
  | Box 14 | $120,000.00 | |
  | Box 17 | $4,339.20 | QPP max（pensionable capped at YMPE）|
  | Box 18 | $860.67 | QC EI max = 65700×1.31% |
  | Box 22 | $18,000.00 | **仅联邦**预扣（省税另见 RL-1 Box E $14,000；合计 $32,000，勿重复填）|
  | Box 24 | $65,700.00 | EI max |
  | Box 26 | $71,300.00 | YMPE cap（收入 > YMPE 时 Box 26 = YMPE）|
  | Box 55 | $484.12 | QPIP = min(120K,98K)×0.494% |

- **WS RL-1 填法：**

  | Box | 值 | 说明 |
  |---|---:|---|
  | Box A | $120,000.00 | |
  | Box B.A | $4,339.20 | = T4 Box 17 全额（封顶；WS 自动分出第一附加 $678 进 Line 248）|
  | Box B.B | 留空 | ⚠️ 仅「不含 QPP2 版本」留空；QPP2 版本填 $396，见下 |
  | Box E | $14,000.00 | **仅魁省**预扣 |

---

#### ✅ QC3 QPP2 验证版（TICKET-030 受雇端）—— PASSED

> **Status:** ✅ **PASSED（Wealthsimple 实测，2026-07-19）** —— 受雇端 QPP2 验证通过，TICKET-030 结案。
>
> | 状态 | WS | 引擎 |
> |---|---:|---:|
> | 不填 Box 17A / B.B | 补 $1,487 | 补 **$1,487.44** ✓ |
> | 填 $396 | 补 **$1,306** | 补 **$1,306.43** ✓ |
>
> 差额 **$181.01** = $396 扣除在该税档的价值。**两个状态都吻合**，说明 QPP2 既被正确接收、也被正确当作扣除处理。

- **⚠️ 踩坑记录（2026-07-19 首次尝试失败的三个原因，重测时照做）：**
  - **必须 T4 Box 17A 与 RL-1 Box B.B 两个都填 $396。** 只填 B.B 会报错 —— WS 对魁省报表做 T4/RL-1 交叉校验，两张表必须配对。
  1. **清掉 WS 里残留的 RRSP 供款。** 上次导出显示 line 20800 / 214 都有 **$1,500**，导致与工具的 $0 baseline 差 $685。要在 Contributions 表里把那一行改成 0 或删掉。
  2. **Box 26 改成 $81,200（YAMPE），不要填 $71,300。** 上次填 YMPE 上限，WS 据此判定「无超过第一上限的收入」，**Box B.B 因而未生效** —— 导出的 line 22215 只有 **$678**（= 第一附加），且 T4/RL-1 表里根本没有 B.B 行。

- **修改后的填法（只列与上表不同处）：**

  | Box | 值 | 说明 |
  |---|---:|---|
  | T4 Box 26 | **$81,200.00** | 改为 YAMPE（原 $71,300）|
  | T4 Box 17A | **$396.00** | QPP2 = ($81,200 − $71,300) × 4% |
  | RL-1 Box B.B | **$396.00** | 同上 |
  | RRSP 供款 | **$0** | 清掉残留的 $1,500 |

- **成功标志：** 导出的联邦 **line 22215 = $1,074**（= 第一附加 $678 + QPP2 $396）。若仍是 $678，说明 B.B 还是没生效，别继续比对。

- **引擎预期值（RRSP $0 + QPP2 $396）：**

  | 项目 | 引擎值 |
  |---|---:|
  | 净收入 / 应税收入 | **$118,926.00** |
  | 联邦税（抵免前）| $21,167.01 |
  | 联邦抵免 | $3,277.87 |
  | 魁省 abatement | $2,951.71 |
  | 联邦税净额 | $14,937.43 |
  | 魁省税（抵免前）| $20,213.94 |
  | 魁省抵免 | $2,599.94 |
  | 药保费（447）| $755.00 |
  | HSF（446）| $0.00（受雇收入不计入基数）|
  | 魁省税净额 | $18,369.00 |
  | 税合计 | $33,306.43 |
  | 预扣合计 | $32,000.00 |
  | **最终应补** | **补 $1,306.43** |

- **✅ 实测结果：WS 补 $1,306 = 引擎 $1,306.43。** 对照无 QPP2 的 $1,487.44，差 $181.01，正是 $396 扣除在该收入档（combined 边际约 45.7%）的价值。

- **✅ RRSP 变额全部通过（Wealthsimple 实测，2026-07-19，配置：预扣 $32,000、Box 26 = $81,200、17A/B.B = $396）**

  | RRSP | 引擎 = WS | 应税收入 | 备注 |
  |---:|---:|---:|---|
  | **$0** | 欠 **$1,306.43** | $118,926 | baseline |
  | **$2,859** | 退 **$0.42** | $116,067 | 补税归零点（优化器推荐值）|
  | **$4,176** | 退 **$602.42** | $114,750 | |
  | **$10,000** | 退 **$2,997.10** | $108,926 | 魁省 24% 档 |
  | **$30,000** | 退 **$10,271.15** | $88,926 | 魁省 19% 档 |
  | **$35,000** | 退 **$12,077.02** | $83,926 | 高供款端 |

  - 全程药保费 **$755 封顶**、HSF **$0**（纯受雇收入），故本组检验的是**跨三个魁省税档的税率、abatement，以及 QPP2 扣除在各供款水平下的稳定性** —— 全部通过。
  - TICKET-037 对本案无影响：收入够高，`max_refund` 仍会用满 room。
- **备注：** Box 26 填 $71,300 还是 $81,200 **对引擎结果无影响**（Box 16/17 的 base/enhanced 拆分本就按 YMPE 封顶，QPP2 单独走 Box 17A）。改它纯粹是为了让 **WS** 接受 B.B 的输入。
- **✅ 工具 UI 已补上该输入框**（2026-07-19）：`StepEmployment` 中，**当 Box 26 > YMPE 时**自动出现「QPP 第二附加供款（Box 17A / RL-1 Box B.B）」，非魁省显示「CPP 第二附加供款（Box 16A）」。此前需用脚本喂引擎，现在界面上可直接输入。

```json fixture
{
  "id": "QC3",
  "label": "QC 2025 T4 $120K（跨三档 + 受雇 QPP2 $396）",
  "input": {
    "taxYear": 2025, "province": "QC", "age": 35,
    "isFirstTimeHomeBuyer": false,
    "rrspRoomAvailable": 200000, "fhsaRoomAvailable": 0, "fhsaLifetimeUsed": 0,
    "deductions": { "rrspContribution": 0, "fhsaContribution": 0 },
    "income": { "employment": {
      "gross": 120000, "federalTaxWithheld": 18000, "provincialTaxWithheld": 14000,
      "cppContribution": 4339.20, "cpp2Contribution": 396, "eiPremium": 860.67,
      "cppPensionableEarnings": 81200, "ppipPremium": 484.12
    }}
  },
  "points": [
    { "rrsp": 0,     "expect": -1306.43,  "verified": "WS", "assert": { "provincialDrugPremium": 755 } },
    { "rrsp": 2859,  "expect": 0.42,      "verified": "WS" },
    { "rrsp": 4176,  "expect": 602.42,    "verified": "WS" },
    { "rrsp": 10000, "expect": 2997.10,   "verified": "WS" },
    { "rrsp": 30000, "expect": 10271.15,  "verified": "WS" },
    { "rrsp": 35000, "expect": 12077.02,  "verified": "WS" }
  ]
}
```

> 另有「不含 QPP2」的变体（Box 17A / B.B 留空）：baseline 应为 **补 $1,487.44**。
> 差额 $181.01 = $396 扣除在该税档的价值。

### QC4: QC 2025 $80K + RRSP $10K（RRSP + abatement 交互）✅

- **Status:** ✅ **PASSED**（TurboTax **逐行**验证，2026-06-30，预扣：联邦 Box 22 = $10,000 + 魁省 Box E = $8,000）
- **Tests:** RRSP 供款减少 taxable income → 联邦基础税降低 → abatement 也跟着降
- **Input:** taxYear 2025 · province QC · age 30 · T4 Box 14 = **$80,000** · RRSP = **$10,000**

- **完整 T4（联邦）填法：**

  | Box | 值 | 说明 |
  |---|---:|---|
  | 10 | QC | 就业省份 |
  | 14 | $80,000.00 | 工资总额 |
  | 16 / 16A / 17A | 留空 | 无 CPP / CPP2 / QPP2 |
  | 17 | $4,339.20 | QPP =（71,300−3,500）×6.40% 封顶 |
  | 18 | $860.67 | QC EI = min(80K, 65,700)×1.31% |
  | 22 | $10,000.00 | **联邦**预扣（只放联邦税）|
  | 24 | $65,700.00 | EI insurable 上限 |
  | 26 | $71,300.00 | QPP pensionable（YMPE 封顶）|
  | 55 | $395.20 | QPIP = 80,000×0.494% |
  | 56 | $80,000.00 | QPIP insurable |

- **完整 RL-1 填法：**

  | Box | 值 | 说明 |
  |---|---:|---|
  | A | $80,000.00 | = Box 14 |
  | B.A | $4,339.20 | = Box 17（基础+第一附加 QPP 合计，**必填**）|
  | B.B | 留空 | 无 QPP2（QPP2 未建模，留空以对齐引擎）|
  | E | $8,000.00 | **魁省**预扣（独立于 Box 22）|
  | G | $71,300.00 | QPP pensionable（YMPE 封顶）|
  | H | $395.20 | QPIP premium（= Box 55）|
  | I | $80,000.00 | QPIP insurable |
  | J | 留空 | 无团体药险 → RAMQ 药险费适用 |

- **RRSP：** Contribution = **$10,000**；2025 RRSP deduction limit 填 ≥ $10,000（测试用 $45,000）。
- **预扣合计：** Box 22 $10,000 + RL-1 Box E $8,000 = **$18,000**。
- **药险问题（TurboTax/WS）：** 「是否有团体/私人药险」选**否**,否则不收 RAMQ 药险费。
- **✅ TurboTax 逐行结果（= 引擎，分文不差）:**

  | TP-1 行 | 项目 | 金额 |
  |---|---|---:|
  | 248 | 增强 QPP 扣除 | $678.00 |
  | 275 | 魁省净收入 | $67,902.00 |
  | 401 | 应税收入税 | $10,238.63 |
  | 399/406 | BPA 抵免 | $2,599.94 |
  | 447 | RAMQ 药险费 | $755.00 |
  | 450 | 魁省税+供款 | $8,393.69 |
  | 451 | 魁省预扣 | $8,000.00 |
  | — | **魁省欠** | **$393.69** |
  | — | **联邦退** | **$3,734.54** |
  | — | **合并净退** | **$3,340.85** |

  - 引擎复算：netFed $6,265.45（abatement $1,238.08）、netProv $8,393.69、合并**净退 $3,340.86** —— 与 TurboTax 一致。
- **⚠️ 旧「引擎自验」值作废：** 原记录 Total tax $13,485.55 / Refund $4,514.45 是 **2026-06-08 旧引擎**的自验值，早于 QPP/药险费等省级细化，已过时。**以 TurboTax 逐行验证的 $3,340.85 为准。**
- **关键验证点:**
  - ① 增强 QPP（line 248 = $678）在魁省端正确扣除 ✓
  - ② RAMQ 药险费收入测试正确（净收入 $67,902 > $19,890 → 收满额 $755）✓
  - ③ Abatement 随 RRSP 下降（$1,238.08）✓
- **多 RRSP 供额自测参考**（引擎值；预扣固定 $18,000；上面 T4/RL-1 不变，只改 RRSP 供款）：

  | RRSP | 净退税(+) / 补税(−) | 备注 |
  |---:|---:|---|
  | $0 | 补 $270.89 | baseline |
  | $750 | ≈ $0 | 补税归零 |
  | $2,000 | 退 $451.46 | |
  | $10,000 | 退 $3,340.85 | ✅ TurboTax 逐行已验 |
  | $15,000 | 退 $5,146.73 | |
  | $20,000 | 退 $6,952.61 | |
  | $21,947 | 退 $7,655.82 | 降一税阶（联邦 57,375 档）|
  | $24,647 | 退 $8,495.72 | 降一税阶（魁省 53,255 档）|
  | $30,000 | 退 $9,893.25 | |
  | $45,000 | 退 $13,809.38 | 满额（退税最大化）|

  > 除 $10,000 外，其余为引擎预测、尚未逐点在 TurboTax 复核（受用量限额中断）。RRSP 属线性扣除、两端算法一致,预期全部吻合。工具第 4 步显示的「退税最大化 / 降一税阶」确切推荐额以工具为准。

```json fixture
{
  "id": "QC4",
  "label": "QC 2025 T4 $80K + RRSP（无 QPP2；Box 26 = YMPE）",
  "input": {
    "taxYear": 2025, "province": "QC", "age": 30,
    "isFirstTimeHomeBuyer": false,
    "rrspRoomAvailable": 45000, "fhsaRoomAvailable": 0, "fhsaLifetimeUsed": 0,
    "deductions": { "rrspContribution": 0, "fhsaContribution": 0 },
    "income": { "employment": {
      "gross": 80000, "federalTaxWithheld": 10000, "provincialTaxWithheld": 8000,
      "cppContribution": 4339.20, "eiPremium": 860.67,
      "cppPensionableEarnings": 71300, "ppipPremium": 395.20
    }}
  },
  "points": [
    { "rrsp": 0,     "expect": -270.89,   "verified": "引擎值（= QC1 去掉 QPP2）" },
    { "rrsp": 2000,  "expect": 451.46,    "verified": "引擎值" },
    { "rrsp": 10000, "expect": 3340.85,   "tol": 0.02, "verified": "TurboTax 逐行" },
    { "rrsp": 15000, "expect": 5146.73,   "verified": "引擎值" },
    { "rrsp": 20000, "expect": 6952.61,   "verified": "引擎值" },
    { "rrsp": 21947, "expect": 7655.82,   "verified": "引擎值" },
    { "rrsp": 24647, "expect": 8495.72,   "verified": "引擎值" },
    { "rrsp": 30000, "expect": 9893.25,   "verified": "引擎值" },
    { "rrsp": 45000, "expect": 13809.38,  "verified": "引擎值" }
  ]
}
```

### QC5: QC 2025 $70K + 合资格股息 $5K（QC DTC 验证）✅

- **Status:** ✅ **PASSED（Wealthsimple 实测 2026-07-19）—— 8 个供款点全过：$0 / $10K / $18,860 / $20K / $30K / $35K / $47K / $50K。** baseline 净退 $502 = Fed refund $2,402 − QC owing $1,900 ≈ 引擎 $502.24 ✓。旧「$1,659.09」stale 值已作废。
- **Tests:** QC 省级合资格 DTC 11.70%。联邦 DTC 照常，省级用 QC 专属税率
- **Input:**
  - taxYear: 2025, province: QC, age: 30
  - T4 Box 14: **$70,000**
  - T5 Box 24(合资格): **$5,000** → gross-up = $6,900（× 1.38）
  - ⚠️ **引擎 vs WS 输入方式不同（易混）：** 引擎(optimizer)输入框**只有 Box 24 = $5,000**，内部自动 gross-up + DTC，**没有也不需要 Box 25 字段**（正确设计）。WS 则需手填 Box 25 = $6,900（因它照抄纸质 slip）。两者结果都是净退 $502 → 证明引擎内部 gross-up 正确。
- **WS T4 填法：**

  | Box | 值 | 说明 |
  |---|---:|---|
  | Box 10 | QC | |
  | Box 14 | $70,000.00 | |
  | Box 17 | $4,256.00 | QPP = (70000−3500)×6.40% |
  | Box 18 | $860.67 | QC EI = min(70K,65700)×1.31% |
  | Box 22 | $9,000.00 | **仅联邦**预扣 |
  | Box 24 | $65,700.00 | |
  | Box 26 | $70,000.00 | |
  | Box 55 | $345.80 | QPIP = 70000×0.494% |

- **WS RL-1 填法：**

  | Box | 值 | 说明 |
  |---|---:|---|
  | Box A | $70,000.00 | |
  | Box B.A | $4,256.00 | = T4 Box 17 全额（WS 自动分出第一附加 $665 进 Line 248）|
  | Box B.B | 留空 | 收入 < YMPE，无 QPP2 |
  | Box E | $7,000.00 | **仅魁省**预扣 |

- **WS T5 / Relevé 3 填法（实测 2026-07-19）：** 入口 **"Dividends, interest, and capital gains" → "T5 / Relevé 3"**（搜 "T5"），**不是** "Capital gains"。
  - **T5：** Box 24（actual）= **$5,000**；Box 25（taxable ×1.38）= **$6,900**（⚠️ **必须手填——WS 不自动 gross-up！**）；Box 26 **留空**。
  - **RL-3：** A1（actual）= **$5,000**；B（taxable）= **$6,900**；其余留空。
  - Box 26（联邦 DTC $1,036.37）与 RL-3 C（魁省 DTC $807.30）**WS 自动算，留空即可**（实测留空结果仍正确）。
  - ⚠️ **Box 25 留空会算错**：空→净退 $2,129（股息未计税）；填 $6,900→净退 $502（正确，对上引擎 $502.24）。
  - **预扣合计 = $16,000（T4 Box 22 联邦 $9,000 + RL-1 Box E 魁省 $7,000）。**
  - ⚠️ **QC5 无资本利得** → "Capital Gains (or Losses)" / T5008 那一屏**整个留空**（别加 disposition）。股息 ≠ 资本利得，两者在 WS 是分开的区。
- **引擎结果（真实引擎，2026-07-19；预扣 $16,000）：**

  | RRSP | 净退税(+)/补税(−) | 备注 |
  |---:|---:|---|
  | $0 | 退 $502.24 | ✅ **WS 实测 $502**（药险费封顶 $755）|
  | **$47,000** | 退 **$14,777.16** | ✅ **WS 实测吻合**（药险费爬坡 $735.98）|
  | **$50,000** | 退 **$15,547.02** | ✅ **WS 实测吻合**（药险费爬坡 $386.12）|
  | 补税归零 | $0 供款 | 已是退税 |
  | 退税最大化 $45,000 | 退 $14,273.50 | 满额 |
  | 降一税阶 $18,860 | 退 $7,314.00 | |
  | 随机 $5,000 | 退 $2,308.12 | |
  | 随机 $15,000 | 退 $5,919.87 | |
  | 随机 $25,000 | 退 $9,052.00 | |

- **关键验证点:**
  - ① QC 合资格 DTC = $6,900 × 11.70% = $807.30（不是 BC 的 12% 或 ON 的 10%）
  - ② Abatement 照常在联邦 DTC 之后计算
  - ③ **交叉验证在 Wealthsimple 做**（TurboTax Free 挡投资收入）

```json fixture
{
  "id": "QC5",
  "label": "QC 2025 T4 $70K + 合资格股息 $5K（QC DTC 11.70%）",
  "input": {
    "taxYear": 2025, "province": "QC", "age": 30,
    "isFirstTimeHomeBuyer": false,
    "rrspRoomAvailable": 200000, "fhsaRoomAvailable": 0, "fhsaLifetimeUsed": 0,
    "deductions": { "rrspContribution": 0, "fhsaContribution": 0 },
    "income": {
      "employment": {
        "gross": 70000, "federalTaxWithheld": 9000, "provincialTaxWithheld": 7000,
        "cppContribution": 4256, "eiPremium": 860.67,
        "cppPensionableEarnings": 70000, "ppipPremium": 345.80
      },
      "investment": { "eligibleDividends": 5000 }
    }
  },
  "points": [
    { "rrsp": 0,     "expect": 502.24,    "verified": "WS", "assert": { "provincialDrugPremium": 755 } },
    { "rrsp": 5000,  "expect": 2308.12,   "verified": "引擎值" },
    { "rrsp": 15000, "expect": 5919.87,   "verified": "引擎值" },
    { "rrsp": 18860, "expect": 7314.00,   "verified": "引擎值" },
    { "rrsp": 25000, "expect": 9052.00,   "verified": "引擎值" },
    { "rrsp": 45000, "expect": 14273.50,  "verified": "引擎值" },
    { "rrsp": 47000, "expect": 14777.16,  "verified": "WS", "assert": { "provincialDrugPremium": 735.98 } },
    { "rrsp": 50000, "expect": 15547.02,  "verified": "WS", "assert": { "provincialDrugPremium": 386.12 } }
  ]
}
```

### QC6: QC **2024** $60K（跨年验证）✅

- **Status:** ✅ **PASSED（Wealthsimple 逐行核对，2026-07-19）—— 7 个供款点全过：$0 / $3,568 / $10K / $20K / $30K / $32K / $35K。** baseline 净退 $1,405.79，两边分毫不差。
  - **WS：** Fed refund **$2,056.90** − QC balance owing **$651.11** = **$1,405.79**；引擎同为 **$1,405.79** ✓
  - **TP-1 逐行全对：** 201 工人扣除 $1,380｜248 QPP·QPIP 扣除 $565｜275·299 净收入·应税 $58,055｜350 BPA $18,056｜399 抵免 $2,527.84｜401 应缴税 $8,441.45｜**447 药险费 $737.50**｜450 $6,651.11｜451 预扣 $6,000｜479 欠 $651.11
  - **过程中揪出 2 个真 bug：**
    - **① 引擎 RAMQ 2024 上限错**：$731 → **$737.50**（RAMQ 费率每年 7/1 调整，报税年度须取两个半年均值：($731+$744)/2）。见 **TICKET-032**（已修）。2025 的 $755 本来就对，故 QC5 一直吻合。
    - **② 本文件 Box 22 表述错**：曾把「联邦+省合计」写进 Box 22，照填会导致省税重复计 $6,000。已改为 **Box 22 仅联邦 $7,000**。
  - **RRSP 各点仍待 WS 验。** 旧「$2,460.61」为 2026-06-08 stale 值，已作废。
- **Tests:** 2024 年 QC 税阶 + QC BPA $18,056 + abatement 16.5%（税率不变）
- **Input:**
  - taxYear: **2024**, province: QC, age: 30
  - T4 Box 14: **$60,000**
- **WS T4 填法：**（⚠️ 记得把 WS 年度切成 **2024**）

  | Box | 值 | 说明 |
  |---|---:|---|
  | Box 10 | QC | |
  | Box 14 | $60,000.00 | |
  | Box 17 | $3,616.00 | QPP 2024 = (60000−3500)×6.40% |
  | Box 18 | $792.00 | QC EI **2024** = 60000×**1.32%** |
  | Box 22 | $7,000.00 | **仅联邦**预扣（省税另见 RL-1 Box E $6,000；合计 $13,000，勿重复填）|
  | Box 24 | $60,000.00 | 2024 EI max = $63,200 > $60K |
  | Box 26 | $60,000.00 | 2024 YMPE = $68,500 > $60K |
  | Box 55 | $296.40 | QPIP 2024 = 60000×0.494% |

- **WS RL-1 填法：**

  | Box | 值 | 说明 |
  |---|---:|---|
  | Box A | $60,000.00 | |
  | Box B.A | $3,616.00 | = T4 Box 17 全额（WS 自动分出第一附加 $565 进 Line 248）|
  | Box B.B | 留空 | 收入 < 2024 YMPE $68,500，无 QPP2 |
  | Box E | $6,000.00 | **仅魁省**预扣 |

- **预扣：** Box 22（联邦）$7,000 + Box E（魁省）$6,000 = **$13,000**。
- **引擎结果（真实引擎，2026-07-19；预扣 $13,000）：**

  | RRSP | 净退税(+)/补税(−) | 备注 |
  |---:|---:|---|
  | $0 | 退 **$1,405.79** | ✅ WS 实测 |
  | 补税归零 | $0 供款 | 已是退税 |
  | 降一税阶 $3,568 | 退 **$2,694.46** | ✅ WS 实测 |
  | $10,000 | 退 **$4,535.90** | ✅ WS 实测 |
  | $20,000 | 退 **$7,188.40** | ✅ WS 实测 |
  | $30,000 | 退 **$9,840.90** | ✅ WS 实测（药险费封顶 $737.50）|
  | $32,000 | 退 **$10,547.89** | ✅ WS 实测（药险费爬坡 $561.01）|
  | $35,000 | 退 **$11,632.69** | ✅ WS 实测（药险费爬坡 $271.96）|
  | 随机 $5,000 | 退 $3,145.90 | 引擎值 |
  | 随机 $15,000 | 退 $5,862.15 | 引擎值 |
  | 随机 $25,000 | 退 $8,514.65 | 引擎值 |
  | 退税最大化 **$39,999** | 退 $13,000.00 | TICKET-037 修复后的新推荐值（旧 $43,730 结果相同，省下 $3,731 额度）；净收入跌破豁免线 → 药险费 $0 |

- **⚠️ RAMQ 药险费爬坡段（TICKET-033，已修）：** 魁省净收入在 **$18,910 ~ 约$27,680** 之间时保费是**逐步爬升**的，不是直接跳满额。对应 RRSP 约 **$30,500 ~ $39,145** 这一段。四个 WS 实测点已写成回归测试（`quebec.test.ts` CASE 6b）。
  - ⚠️ **WS 里 RRSP 供款受 deduction limit 截断**：该 return 的 2024 limit 是 $35,000，填超过会被静默截断（$36,000 会当成 $35,000）。要测更高值需先调高 limit **并**改供款金额那一栏。

- **关键验证点:**
  - ① 2024 用 15% 联邦税率（不是 2025 的 14.5%）
  - ② QC BPA 2024 = $18,056（不是 2025 的 $18,571）
  - ③ QC EI 2024 用 1.32%（不是 2025 的 1.31%）
  - ④ **交叉验证记得用 2024 年度 TurboTax/WS**

```json fixture
{
  "id": "QC6",
  "label": "QC 2024 T4 $60K（跨年验证）",
  "input": {
    "taxYear": 2024, "province": "QC", "age": 30,
    "isFirstTimeHomeBuyer": false,
    "rrspRoomAvailable": 200000, "fhsaRoomAvailable": 0, "fhsaLifetimeUsed": 0,
    "deductions": { "rrspContribution": 0, "fhsaContribution": 0 },
    "income": { "employment": {
      "gross": 60000, "federalTaxWithheld": 7000, "provincialTaxWithheld": 6000,
      "cppContribution": 3616, "eiPremium": 792,
      "cppPensionableEarnings": 60000, "ppipPremium": 296.40
    }}
  },
  "points": [
    { "rrsp": 0,     "expect": 1405.79,   "verified": "WS 逐行", "assert": { "provincialDrugPremium": 737.50 } },
    { "rrsp": 3568,  "expect": 2694.46,   "verified": "WS" },
    { "rrsp": 5000,  "expect": 3145.90,   "verified": "引擎值" },
    { "rrsp": 10000, "expect": 4535.90,   "verified": "WS" },
    { "rrsp": 15000, "expect": 5862.15,   "verified": "引擎值" },
    { "rrsp": 20000, "expect": 7188.40,   "verified": "WS" },
    { "rrsp": 25000, "expect": 8514.65,   "verified": "引擎值" },
    { "rrsp": 30000, "expect": 9840.90,   "verified": "WS", "assert": { "provincialDrugPremium": 737.50 } },
    { "rrsp": 32000, "expect": 10547.89,  "verified": "WS", "assert": { "provincialDrugPremium": 561.01 } },
    { "rrsp": 35000, "expect": 11632.69,  "verified": "WS", "assert": { "provincialDrugPremium": 271.96 } },
    { "rrsp": 39999, "expect": 13000.00,  "verified": "引擎值（TICKET-037 推荐点）", "assert": { "provincialDrugPremium": 0 } }
  ]
}
```

### QC7: QC 2025 纯自雇 $50K（自雇 QPP + QPIP + abatement）✅

- **Status:** ✅ **PASSED（Wealthsimple 逐行核对，2026-07-19）—— 5 个供款点全过：$0 / $5,000 / $20,000 / $30,238 / $35,000。** baseline 应补 $14,315.78，每一行分毫不差。过程中揪出 **3 个引擎 bug**（TICKET-031 第二部分 / TICKET-035 / TICKET-036），详见下方。旧值 $12,784.46 / $13,952.46 / $14,391.46 / $14,364.58 均已作废。
  - **逐行对账（全部一致）：** 联邦 22200 QPP 扣除 $3,441｜22300 QPIP 扣除 $192｜23600 净收入 $46,367｜31000 QPP 抵免 $2,511｜31215 QPIP 抵免 $247｜35000 抵免合计 $2,738.61｜44000 abatement $657.46｜**联邦应补 $3,327.14**
  - 魁省 201 工人扣除 $1,420｜248 QPP+QPIP 扣除 **$3,633**（= $3,441 + $192）｜275 净收入 $44,947｜399 抵免 $2,599.94｜401 税 **$6,292.58**｜439 QPIP $439｜445 QPP $5,952｜**446 HSF $150**｜447 药保 $755｜**魁省应补 $10,988.64**
  - **总计 $3,327.14 + $10,988.64 = $14,315.78** ✓
- **Tests:** 自雇 QPP payable + 自雇 QPIP + QC abatement + 药保费 同时生效（QC 系列最后一个未验案例）
- **Input:**
  - taxYear: **2025**, province: **QC**, age: **30**
  - `income.selfEmployment.netIncome` = **$50,000**
  - 无 T4 / RL-1 / 投资收入 / FHSA；无预扣（`totalTaxWithheld = 0`）
  - baseline RRSP = $0

- **WS 填法（2025）：**

  | 项 | 值 / 操作 |
  |---|---|
  | 报表 | ⚠️ **新建一份 2025 return**——别改现有那份（那是 QC5 的已验数据）|
  | 年度 / 省份 | 2025 / Québec |
  | 收入 | Self-employment → **Business income** → **net income = $50,000** |
  | T4 / RL-1 | **完全不填** |
  | RRSP | baseline 填 $0（deduction limit 记得调到 ≥ $35,000 再测高供款点）|
  | 药物保险问题 | **必须答 "No"**（无私人团体药保）—— 否则 WS 收 $0 保费，两边会差 **$755** |
  | 配偶 | **不要加配偶**（引擎只建模单身；上一份 2025 报表里有第二个人，核对时只能取本人那一列）|

- **引擎预期值（baseline RRSP $0，2026-07-19 重算）：**

  | 项目 | 引擎值 |
  |---|---:|
  | 总收入 | $50,000.00 |
  | 自雇 QPP 可扣除部分（联邦 line 22200+22215）| **$3,441.00**（= 基础半额 $2,511 + 增强 $930）|
  | 自雇 QPIP 可扣除部分（联邦 line 22300）| **$192.00**（= $439 × 43.736%，TICKET-031 第二部分新增）|
  | 净收入 / 应税收入 | **$46,367.00** |
  | 联邦税（抵免前）| $6,751.05 |
  | 联邦抵免 | $2,738.61（含 QPIP 抵免 **$247.00** = $439 × 56.264%，联邦 line 31215）|
  | **魁省 abatement（16.5%）** | **$657.46** |
  | 联邦税净额（abatement 后）| **$3,327.14** |
  | 魁省税（抵免前）| $6,491.38 |
  | 魁省抵免 | $2,599.94（QC 只抵免 BPA）|
  | **魁省药保费（TP-1 line 447）** | **$755.00**（封顶）|
  | 魁省税净额 | **$4,646.44** |
  | 税小计 | $7,973.58 |
  | **QPP payable（自雇）** | **$5,952.00** |
  | **QPIP payable（自雇）** | **$439.00**（= $50,000 × 0.878%）|
  | **最终应补** | **补 $14,364.58** |

  > 核对式：$7,973.58 + $5,952.00 + $439.00 = **$14,364.58**
  > 自雇 QPP 拆解：可供款额 = $50,000 − $3,500 = $46,500；× 12.80% = $5,952。其中**可抵免** $2,511、**可扣除** $3,441。
- **🐛 TICKET-031（QC7 发现）：** 引擎原本没把自雇 QPIP（$50,000×0.878% = **$439**）计入 payable（line 439），只当抵免。已修 payable（欠税 $13,952→$14,391）。**待办：** 依 Revenu Québec，自雇 QPIP 的减免应是 **Line 248 扣除**（非抵免），credit→deduction 微调约 $60 待自雇场景实测后再改。故 QC7 引擎值仍有 ~$60 残差。
- **引擎结果（真实引擎，含 SE QPIP payable 修复，2026-07-19；无预扣）：**

  | RRSP | 净退税(+)/补税(−) | 备注 |
  |---:|---:|---|
  | RRSP | 应补 | 应税收入 | 药保费 | 备注 |
  |---:|---:|---:|---:|---|
  | **$0** | **补 $14,315.78** | $46,367 | $755.00 | ✅ **WS 实测，逐行吻合** |
  | **$5,000** | 补 **$13,010.41** | $41,367 | $755.00 | ✅ WS 实测 |
  | **$20,000** | 补 **$8,737.98** | $26,367 | $398.70 | ✅ WS 实测（药保爬坡段）|
  | **$30,238** | 补 **$6,541.00** | $15,937 | $0.00 | ✅ WS 实测；药保归零但 HSF $150 仍在 |
  | 退税最大化 **$27,480** | 补 $6,541.00 | | $0.00 | TICKET-037 修复后的新推荐值 —— 与 $30,238 结果完全相同，省下 $2,758 额度 |
  | **$35,000** | 补 **$6,541.00** | $15,937 | $0.00 | ✅ WS 实测；已达底，再供无益 |
  | $15,000 | 补 $10,399.66 | $31,367 | $755.00 | 引擎值 |
  | $25,000 | 补 $7,038.38 | $21,367 | $4.47 | 引擎值 |

  > 各点均含 **HSF $150**（TICKET-036）。RRSP 无法抵消 QPP payable $5,952、QPIP $439、HSF $150、以及未跌破门槛前的药保费。
  > ⚠️ 2026-07-19 修 3 个 bug 后数值已更新；$14,391.46 / $14,364.58 等旧值全部作废。
  | 补税归零 | 供满仍补 $6,391 | | | QPP payable 无法被 RRSP 抵消 |
  | 降一税阶 | $0 供款 | | | 已在最低档 |

- **本案揪出的 3 个引擎 bug（均已修并验证）：**
  - **TICKET-031 第二部分：** 自雇 QPIP 减免方向错。正解依 CRA Schedule 10：**43.736% 走扣除**（联邦 line 22300 = $192）、**56.264% 走抵免**（联邦 line 31215 = $247）。该比例正好 = 1 − 雇员费率/自雇费率（1 − 0.494/0.878），故按 config 推导而非硬编。**且 WS 的魁省 line 248 = $3,633 = $3,441 + $192，证实魁省用同一拆分**（此前的不确定性已解决）。
  - **TICKET-035：** 工人扣除（line 201 = $1,420）**漏给自雇收入**——引擎原本卡在 `employmentIncome`，纯自雇者拿不到。多算魁省税 **$198.80**。
  - **TICKET-036：** **完全缺失** 魁省健康服务基金供款（line 446 = **$150**）。少算 $150。
  - 净差原为 $48.80（= −198.80 + 150），修完两边完全一致。

- **关键验证点:**
  - ① **QPP payable $5,952** > CPP payable $5,533.50（对比 BC S5）—— QPP 12.80% > CPP 11.90%
  - ② **SE QPIP $439 已计入 payable**（TICKET-031 第一部分已修）；credit→deduction 方向待修
  - ③ **Abatement $657.46** 在自雇场景下仍正确应用
  - ④ **药保费 $755 封顶**（净收入 $46,559 远超豁免线 $19,890）——WS 那个「团体药保」问题必须答 No
  - ⑤ 应补额高于 BC S5（$11,238）→ QPP 更贵 + 魁省税率更高 + 多一笔药保费
  - ⑥ **$25,000 那个点**会落进药保爬坡段，可同时验证 TICKET-034 的 2025 费率（7.84% / 11.76%）

- **回报格式：** 导出 xlsx（Summary - Federal / Summary - Quebec 两张表）最省事，可逐行核对。

```json fixture
{
  "id": "QC7",
  "label": "QC 2025 纯自雇 $50K（自雇 QPP + QPIP + HSF $150）",
  "input": {
    "taxYear": 2025, "province": "QC", "age": 30,
    "isFirstTimeHomeBuyer": false,
    "rrspRoomAvailable": 200000, "fhsaRoomAvailable": 0, "fhsaLifetimeUsed": 0,
    "deductions": { "rrspContribution": 0, "fhsaContribution": 0 },
    "income": { "selfEmployment": { "netIncome": 50000 } }
  },
  "points": [
    { "rrsp": 0,     "expect": -14315.78, "verified": "WS 逐行", "assert": { "provincialDrugPremium": 755 } },
    { "rrsp": 5000,  "expect": -13010.41, "verified": "WS" },
    { "rrsp": 15000, "expect": -10399.66, "verified": "引擎值" },
    { "rrsp": 20000, "expect": -8737.98,  "verified": "WS", "assert": { "provincialDrugPremium": 398.70 } },
    { "rrsp": 25000, "expect": -7038.38,  "verified": "引擎值", "assert": { "provincialDrugPremium": 4.47 } },
    { "rrsp": 27480, "expect": -6541.00,  "verified": "引擎值（TICKET-037 推荐点）" },
    { "rrsp": 30238, "expect": -6541.00,  "verified": "WS", "assert": { "provincialDrugPremium": 0 } },
    { "rrsp": 35000, "expect": -6541.00,  "verified": "WS", "assert": { "provincialDrugPremium": 0 } }
  ]
}
```

> ⚠️ 上面「引擎预期值」那张表里的 **补 $14,364.58** 是 2026-07-19 修 bug 前的旧值，
> 已被 **$14,315.78** 取代。留在表里是为了保留推导过程，**别拿它当预期值**。

### QC8: QC 2025 纯自雇 $25K（HSF 爬坡段校准）✅

- **Status:** ✅ **PASSED（Wealthsimple 实测，2026-07-19）：应补 $4,359.73，逐行吻合。** 本案成功校准 HSF 门槛（TICKET-036），并在更低收入点二次验证了 2025 药保爬坡费率。
  - **WS line 446 = $51.83** → 反解 **门槛1(2025) = $19,817**（引擎原估 $18,215，已更正）
  - **WS line 447 = $157.04** ✓ 与引擎一致 —— 2025 药保费率 7.84% 在第三个收入点再获验证
  - 其余每一行均一致：22200 $1,591｜22300 $96.00｜23600 $23,313｜31000 $1,161｜31215 $123.50｜35000 $2,524.96｜44000 $141.15｜联邦 $714.28｜201 $1,420｜248 $1,687｜275 $21,893｜401 $3,065.02｜439 $219.50｜445 $2,752｜魁省 $3,645.45
- **建立目的：** QC7（自雇 $50K）只验证了 HSF 的 **$150 平段**，门槛值仍是估计。本案把自雇收入降到 $25,000，让 HSF 基数落进**爬坡段**，用一个点即可反解真实门槛。**顺带**药保费也落在爬坡段（$157.04），二次验证 TICKET-034 的 2025 费率。
- **Input:**
  - taxYear: **2025**, province: **QC**, age: **30**
  - `income.selfEmployment.netIncome` = **$25,000**
  - 无 T4 / RL-1 / 投资收入；无预扣；RRSP = $0
- **WS 填法：** 同 QC7，只把 Business income 从 $50,000 改成 **$25,000**（药保问题仍答 **No**、不要配偶）
- **引擎预期值：**

  | 项目 | 引擎值 | 备注 |
  |---|---:|---|
  | 总收入 | $25,000.00 | |
  | 自雇 QPP 可扣除 | $1,591.00 | = 21,500×5.4% + 21,500×1%×2 |
  | 自雇 QPIP 可扣除（line 22300）| $96.00 | = $219.50 × 43.736% |
  | 联邦净收入 / 应税 | **$23,313.00** | |
  | 联邦抵免 | $2,524.96 | 含 QPIP 抵免 $123.50 |
  | 魁省 abatement | $141.15 | |
  | **联邦应补** | **$714.28** | |
  | 魁省工人扣除（line 201）| $1,420.00 | TICKET-035 |
  | 魁省 line 248 | $1,687.00 | = $1,591 + $96 |
  | 魁省净收入 | **$21,893.00** | |
  | 魁省税（抵免前）| $3,065.02 | |
  | 魁省抵免 | $2,599.94 | |
  | **魁省药保费（447）** | **$157.04** | ⚠️ 爬坡段 = (21,893−19,890)×7.84% |
  | **魁省 HSF（446）** | **$67.85** | ⚠️ **爬坡段 = 1% × (25,000 − 门槛1)**，门槛1 估 $18,215 |
  | 魁省税净额 | $689.97 | |
  | QPP payable（445）| $2,752.00 | = (25,000−3,500)×12.80% |
  | QPIP payable（439）| $219.50 | = 25,000×0.878% |
  | **最终应补** | **补 $4,375.75** | |

  > 核对式：$714.28 + $689.97 + $2,752.00 + $219.50 = **$4,375.75**

- **🎯 校准结果：** WS 给出 **$51.83**（引擎原估 $67.85），反解门槛1 = $25,000 − $5,183 = **$19,817**，已写入 `data/2025/qc.json`。
- **RRSP 供款变额（5 点全部 WS 实测通过）：**

  | RRSP | 应补 | 药保费 | HSF | 备注 |
  |---:|---:|---:|---:|---|
  | **$0** | **补 $4,359.73** | $157.04 | $51.83 | ✅ baseline，逐行吻合 |
  | **$1,500** | 补 **$3,850.52** | $39.44 | $51.83 | ✅ 药保爬坡段 |
  | **$3,000** | 补 **$3,419.47** | $0.00 | $51.83 | ✅ 药保刚归零 |
  | **$5,900** | 补 **$3,023.33** | $0.00 | $51.83 | ✅ **边际收益拐点**（TICKET-037 推荐值）|
  | **$35,000** | 补 **$3,023.33** | $0.00 | $51.83 | ✅ 与 $5,900 完全相同 —— 实测证明拐点之后再供无用 |

  > $35,000 与 $5,900 结果一致，正是 TICKET-037 护栏的实测依据。

- **🔍 本案带出的关键发现：** 校准时曾误改成「净收入」为 HSF 基数（反解出 $18,130，更贴近官方 2026 的 $18,500）。**但 QC7 的 RRSP $30,238 点立刻证伪** —— 那里净收入只剩 $16,129，按净收入算应为 $0，而 WS 实收 $150。**结论：HSF 基数是毛额，RRSP 扣除不减少它。** 已固化为回归测试。
- **关键验证点:**
  - ① **HSF 爬坡段**（唯一目的）
  - ② 药保费 $157.04 —— 在**低于 QC5/QC6 的收入点**二次验证 2025 爬坡费率 7.84%
  - ③ 工人扣除 $1,420 在自雇场景生效（TICKET-035 回归）
  - ④ 自雇 QPP/QPIP 在**低收入**下的比例计算

```json fixture
{
  "id": "QC8",
  "label": "QC 2025 纯自雇 $25K（HSF 爬坡段校准）",
  "input": {
    "taxYear": 2025, "province": "QC", "age": 30,
    "isFirstTimeHomeBuyer": false,
    "rrspRoomAvailable": 200000, "fhsaRoomAvailable": 0, "fhsaLifetimeUsed": 0,
    "deductions": { "rrspContribution": 0, "fhsaContribution": 0 },
    "income": { "selfEmployment": { "netIncome": 25000 } }
  },
  "points": [
    { "rrsp": 0,     "expect": -4359.73, "verified": "WS 逐行", "assert": { "provincialDrugPremium": 157.04 } },
    { "rrsp": 1500,  "expect": -3850.52, "verified": "WS", "assert": { "provincialDrugPremium": 39.44 } },
    { "rrsp": 3000,  "expect": -3419.47, "verified": "WS", "assert": { "provincialDrugPremium": 0 } },
    { "rrsp": 5900,  "expect": -3023.33, "verified": "WS（TICKET-037 拐点）" },
    { "rrsp": 35000, "expect": -3023.33, "verified": "WS（拐点之后再供无用）" }
  ]
}
```

> ⚠️ 上面「引擎预期值」表里的 **补 $4,375.75** 和 HSF **$67.85** 是**校准前的预测值**，
> 已被实测的 $4,359.73 / $51.83 取代。留着是为了说明校准过程。

### QC9: QC 2025 纯自雇 $80K（HSF 第二段 + 自雇 QPP2）✅

- **Status:** ✅ **PASSED（Wealthsimple 实测 2026-07-19，校准后逐行吻合）：应补 $26,959.66。** 首测差 $45.80，全部来自 HSF；据此定案了 HSF 的基数定义与两个门槛（见下），修正后完全一致。
  - **✅ 自雇 QPP2 首次外部验证通过：** line 445 = **$9,374.40**，含 QPP2 **$696** = ($80,000 − $71,300) × 4% × 2。至此 TICKET-030 的**受雇端与自雇端全部验证完毕**。
  - **✅ 联邦侧首测即分毫不差：** 22200 SE QPP 扣除 $5,713.20｜22300 QPIP 扣除 $307.20｜23600 净收入 $73,979.60｜31000 $3,661.20｜31215 $395.20｜35000 $2,926.88｜44000 abatement $1,451.41｜联邦应补 $7,345.03
  - **✅ 魁省侧（修正后）：** 201 $1,420｜248 **$6,020.40**｜275 $72,559.60｜399 $2,599.94｜401 $11,123.57｜439 $702.40｜445 **$9,374.40**｜**446 $259.20**｜447 $755｜魁省应补 $19,614.63
  - **🎯 HSF 定案：** 基数 = **总收入 − 受雇收入 − 自雇供款扣除** = $73,979.60；2025 门槛 **$18,130 / $63,060**。判定依据：两个门槛都是整数，且与官方 2026 值（$18,500 / $64,355）的比值均为 **1.020**，正好一年通胀；而「毛额」读法反解出 $19,817 / $69,080，既非整数又意味着门槛逐年下降。详见 TICKET-036。
  - **✅ RRSP 变额 6 点全过：**

    | RRSP | 引擎 = WS | 应税收入 | 药保 | HSF |
    |---:|---:|---:|---:|---:|
    | **$0** | 补 **$26,959.66** | $73,980 | $755.00 | $259.20 |
    | **$5,000** | 补 **$25,153.78** | $68,980 | $755.00 | $259.20 |
    | **$10,000** | 补 **$23,347.91** | $63,980 | $755.00 | $259.20 |
    | **$16,605** | 补 **$20,962.37** | $57,375 | $755.00 | $259.20 |
    | **$20,000** | 补 **$19,941.04** | $53,980 | $755.00 | $259.20 |
    | **$35,000** | 补 **$16,024.91** | $38,980 | $755.00 | $259.20 |

    > 全程药保封顶、HSF 恒为 $259.20 —— 正因为 **HSF 基数不含 RRSP 扣除**，这组数据反过来又一次印证了模型 C。
- **建立目的：** 一次同时覆盖**三个尚未验证的路径**：
  1. **HSF 门槛2 / 第二段公式**（现有点全在第一段，门槛2 = $64,500 纯属估计）
  2. **自雇 QPP2**（TICKET-030 的自雇分支从未被外部验证；收入需 > YMPE $71,300 才触发）
  3. **区分 HSF 基数定义**（TICKET-036 残留的「毛额」vs「毛额减自雇供款扣除」之争，在第二段会放大差异）
- **Input:**
  - taxYear: **2025**, province: **QC**, age: **30**
  - `income.selfEmployment.netIncome` = **$80,000**
  - 无 T4 / RL-1 / 投资收入；无预扣；RRSP = $0
- **WS 填法：** 同 QC7/QC8，Business income 填 **$80,000**（药保问题答 **No**、不要配偶）
- **引擎预期值：**

  | 项目 | 引擎值 | 备注 |
  |---|---:|---|
  | 总收入 | $80,000.00 | |
  | 联邦净收入 / 应税 | **$73,979.60** | |
  | 联邦税（抵免前）| $11,723.32 | |
  | 联邦抵免 | $2,926.88 | |
  | 魁省 abatement | $1,451.41 | |
  | **联邦应补** | **$7,345.02** | |
  | 魁省税（抵免前）| $11,123.57 | |
  | 魁省抵免 | $2,599.94 | |
  | **药保费（447）** | **$755.00** | 封顶 |
  | **HSF（446）** | **$305.00** | ⚠️ **第二段** = $150 + 1%×($80,000 − $64,500) |
  | 魁省税净额 | $9,583.63 | |
  | **QPP payable（445）** | **$9,374.40** | ⚠️ **含 QPP2 $696.00** = ($80,000−$71,300)×4%×2 |
  | QPIP payable（439）| $702.40 | = $80,000 × 0.878% |
  | **最终应补** | **补 $27,005.46** | |

- **🎯 三个判据的实际结果：**
  - **HSF：** 引擎原预测 $305.00，WS 给出 **$259.20** → 反解定案基数与门槛（见上）。**这正是本案设计时预留的第三个判据生效** —— 差额落在 $20–$60 区间，指向「基数应为毛额减自雇供款扣除」，与预案一致。
  - **QPP2：** WS line 445 = **$9,374.40** ✓ 与引擎完全一致，自雇 QPP2 验证通过。
  - **基数定义：** ✅ 已定案为模型 C。
- **关键验证点:**
  - ① HSF 第二段（$150 + 1% 递增，上限 $1,000）
  - ② **自雇 QPP2 首次外部验证**（收入 $80,000 落在 YMPE $71,300 与 YAMPE $81,200 之间）
  - ③ 药保费在高收入下仍封顶 $755
  - ④ QPIP 在 $80,000 未触及上限 $98,000，按全额计费

```json fixture
{
  "id": "QC9",
  "label": "QC 2025 纯自雇 $80K（HSF 第二段 + 自雇 QPP2）",
  "input": {
    "taxYear": 2025, "province": "QC", "age": 30,
    "isFirstTimeHomeBuyer": false,
    "rrspRoomAvailable": 200000, "fhsaRoomAvailable": 0, "fhsaLifetimeUsed": 0,
    "deductions": { "rrspContribution": 0, "fhsaContribution": 0 },
    "income": { "selfEmployment": { "netIncome": 80000 } }
  },
  "points": [
    { "rrsp": 0,     "expect": -26959.66, "verified": "WS 逐行", "assert": { "provincialDrugPremium": 755 } },
    { "rrsp": 5000,  "expect": -25153.78, "verified": "WS" },
    { "rrsp": 10000, "expect": -23347.91, "verified": "WS" },
    { "rrsp": 16605, "expect": -20962.37, "verified": "WS" },
    { "rrsp": 20000, "expect": -19941.04, "verified": "WS" },
    { "rrsp": 35000, "expect": -16024.91, "verified": "WS" }
  ]
}
```

> ⚠️ 上面「引擎预期值」表里的 **补 $27,005.46** 和 HSF **$305.00** 是**校准前的预测值**，
> 正是靠它与实测 $26,959.66 / $259.20 的差额才反解出 HSF 的基数定义与门槛。

### QC10: 私人药保豁免开关（TICKET-033）✅

- **Status:** ✅ **PASSED（Wealthsimple 实测，2026-07-21）—— A / B / C 三个子场景、勾选与不勾选共 6 个测点全过。** 三个年度/路径的 RAMQ 保费（$755 满额 / $737.50 满额 / $157.04 爬坡段）勾选后均归零，差额与保费金额分毫不差。
  - **⭐ 最有价值的一条是 C**：$157.04 处在**爬坡段**而非封顶值，证明豁免是**短路整个分段计算**，不是把封顶值清零 —— 若实现写成「先算爬坡再判断豁免」，A/B 照样能过，唯独 C 会漏。
  - **WS 行为已确认与引擎一致**：全年一刀切归零，**不**按「未参保月份数」比例计算，因此无需支持按月比例。
- **建立目的：** 验证 `hasPrivateDrugCoverage` 勾选后 RAMQ 药保费归零，且**跨年度、跨计算路径**都成立。这是影响面最广的一个开关 —— 多数受雇者都有雇主团体药保，实际保费应为 $0。
- **设计思路：** 三个子场景**全部复用已验证通过的 case 配置**，只翻转这一个开关。这样任何偏差都只可能来自开关本身，不会与其他变量混淆。
- **工具里在哪：** 「就业收入」页最下方的勾选项「**我有私人处方药保险（如雇主团体计划）**」（仅省份 = Québec 时出现）。
- **WS 对应操作：** 把「Did you have basic prescription drug insurance through a group insurance plan?」从 **No** 改成 **Yes**。

| 子场景 | 基础配置 | 不勾选 | 勾选 | 差额 | Status |
|---|---|---:|---:|---:|---|
| **A** 2025 受雇 $80K | = QC1（含 QPP2 $348）| 欠 $145.20<br>药保 $755.00 | 退 **$609.80**<br>药保 **$0** | **$755.00** | ✅ |
| **B** 2024 受雇 $60K | = QC6 | 退 $1,405.79<br>药保 $737.50 | 退 **$2,143.29**<br>药保 **$0** | **$737.50** | ✅ |
| **C** 2025 自雇 $25K | = QC8 | 欠 $4,359.73<br>药保 $157.04 | 欠 **$4,202.69**<br>药保 **$0** | **$157.04** | ✅ |

#### ⚠️ 完整填表数据（**不要只写「= QCx」** —— 这正是 B 出错的原因）

三个子场景共用同一个 WS return，**切换子场景时每一栏都要改**。下表把关键差异列全，
尤其是两处预扣 —— 它们在三个场景里都不同，最容易忘改。

| 栏位 | A（2025 $80K）| B（2024 $60K）| C（2025 自雇 $25K）|
|---|---:|---:|---:|
| **税年** | 2025 | **2024** | 2025 |
| T4 Box 14 | $80,000.00 | $60,000.00 | — 无 T4 |
| T4 Box 17（QPP）| $4,339.20 | $3,616.00 | — |
| **T4 Box 17A / RL-1 B.B（QPP2）** | **$348.00** | **留空** ⭐ | — |
| T4 Box 18（QC EI）| $860.67 | $792.00 | — |
| **T4 Box 22（联邦预扣）** | **$10,000.00** | **$7,000.00** ⭐ | $0 |
| T4 Box 24 | $65,700.00 | $60,000.00 | — |
| T4 Box 26 | $80,000.00 | $60,000.00 | — |
| T4 Box 55（QPIP）| $395.20 | $296.40 | — |
| **RL-1 Box E（魁省预扣）** | **$8,000.00** | **$6,000.00** ⭐ | $0 |
| T2125 净自雇收入 | — | — | $25,000.00 |

⭐ = **B 与 A 不同、且首测时填错的三栏**。

- **B 为什么 Box 17A / B.B 必须留空：** 2024 年 YMPE = **$68,500**，收入 $60,000 **低于**门槛，
  所以 QPP2 结构上就是 $0。这不是「文件漏写」，是「本来就没有」。
  （引擎侧已验证：即使强行填入任何可能的 QPP2 值，结果也只在 退 $2,211～$2,286 之间，
  完全解释不了 $3,406。所以 Box 17A **不是** B 偏差的原因。）

#### 🔍 B 首测偏差归因（2026-07-21，已解决 ✅）

**结论：工具里的「报税年度」忘了从 2025 改成 2024。非 bug，改回后两侧均吻合。**

首测时不勾选状态：工具 **退 $1,818**，WS **退 $1,406**。把同一份单据数据只改税年跑引擎：

| 税年 | 药保 | 引擎结果 | 药保费 |
|---|---|---:|---:|
| **2024** | 不勾选 | **退 $1,405.79** | $737.50 |
| **2024** | 勾选 | **退 $2,143.29** | $0 |
| 2025 | 不勾选 | 退 $1,817.64 ⭐ | $755.00 |
| 2025 | 勾选 | 退 $2,572.64 | $0 |

⭐ $1,817.64 = 首测那个 $1,818。年度改回 2024 后工具给 **退 $1,406**（不勾选）/
**退 $2,143**（勾选），两侧都与引擎一致，差额 **$737.50** 正是 2024 的 RAMQ 满额。

> ⚠️ 中途曾归因为「WS 端 RL-1 Box E 残留 $8,000」，**该结论已作废**。WS 导出
> （QC10-case2.xlsx）确认 Box 22 = $7,000、Box E = $6,000，与文件完全一致 —— WS 一直是对的。
> **教训：两边的数字都拿到之前，不要断言是哪一边错。** 当时只有工具端的数字就下了结论。

- **同类历史：** D1 首测差 $1,137，原因是「WS 省份未改 BC→ON」；D8 差 $1,557，部分原因是
  Box 26 填错。**同一类错误：跨案例复用同一个 return / 同一份工具状态时，漏改那个不显眼、
  但会推翻全部数字的全局设置。**
- **B 已收尾：** 年度改回 2024 后，不勾选 退 $1,406、勾选 退 $2,143，两侧均与 WS 一致 ✅。

- **关键验证点:**
  - ① **A/B 验跨年度**：2025 满额 $755 与 2024 满额 $737.50 分别归零，证明开关读的是**年度对应**的配置，而非硬编。
  - ② **⭐ C 是本案最有价值的一条**：QC8 的药保费处在**爬坡段**（$157.04），不是封顶值。它验证豁免会**短路整个分段计算**，而不只是把封顶值清零 —— 若实现写成「先算爬坡再判断豁免」也能过 A/B，唯独 C 能抓出来。
  - ③ 非魁省不受影响（引擎单元测试已覆盖，无需外部验证）。
- **备注：** 严格说本案的逻辑很简单（勾了就归零），引擎侧已有 4 条单元测试覆盖。外部验证的价值主要在**确认 WS 的行为一致** —— 例如 WS 是否会按「未参保月份数」按比例计算，而不是全年一刀切。若 WS 给出非零的部分金额，说明需要支持按月比例。A/C 已确认 WS 与引擎一致（全年一刀切，无按月比例）。
```json fixture
{
  "id": "QC10-A", "extends": "QC1",
  "label": "药保豁免 · 2025 受雇 $80K",
  "points": [
    { "rrsp": 0, "label": "不勾选", "override": { "hasPrivateDrugCoverage": false },
      "expect": -145.20, "verified": "WS", "assert": { "provincialDrugPremium": 755 } },
    { "rrsp": 0, "label": "勾选", "override": { "hasPrivateDrugCoverage": true },
      "expect": 609.80, "verified": "WS", "assert": { "provincialDrugPremium": 0 } }
  ]
}
```

```json fixture
{
  "id": "QC10-B", "extends": "QC6",
  "label": "药保豁免 · 2024 受雇 $60K",
  "points": [
    { "rrsp": 0, "label": "不勾选", "override": { "hasPrivateDrugCoverage": false },
      "expect": 1405.79, "verified": "WS", "assert": { "provincialDrugPremium": 737.50 } },
    { "rrsp": 0, "label": "勾选", "override": { "hasPrivateDrugCoverage": true },
      "expect": 2143.29, "verified": "WS", "assert": { "provincialDrugPremium": 0 } }
  ]
}
```

```json fixture
{
  "id": "QC10-C", "extends": "QC8",
  "label": "药保豁免 · 2025 自雇 $25K（爬坡段）",
  "points": [
    { "rrsp": 0, "label": "不勾选", "override": { "hasPrivateDrugCoverage": false },
      "expect": -4359.73, "verified": "WS", "assert": { "provincialDrugPremium": 157.04 } },
    { "rrsp": 0, "label": "勾选", "override": { "hasPrivateDrugCoverage": true },
      "expect": -4202.69, "verified": "WS", "assert": { "provincialDrugPremium": 0 } }
  ]
}
```

- **📌 本案暴露的文档问题（已修）：** 原表只写「= QC1 / = QC6 / = QC8」，把填表数据留在别处。
  测试者在同一个 WS return 上切换子场景时，很自然只改「看得见变了的那几栏」，
  预扣这种跨场景也不同、但不显眼的栏位就漏了。**凡是「复用某个已有 case 的配置」的测试案，
  都要把完整栏位就地列出来，不能只给引用。**

---

## 📂 golden-cases.test.ts 自动回归

> 文件位置:`code/src/lib/tax/__tests__/golden-cases.test.ts`
> 跑法:`cd code && npm test`
> 容差:$5(部分 case $10)

| Case | 场景 | 来源 | 期望 refund / owing | Status |
|---|---|---|---:|---|
| 1 | P0-Yang-2024(ON 真实 CRA) | 真实 assessment | owing $1,085.32 | ✅ Auto |
| 2 | Yang ON 2025 | WS Summary.xlsx | refund $541.09 | ✅ Auto |
| 3 | S1: ON 2025 $50K T4 | WS Test_Summary.xlsx | refund $545.18 | ✅ Auto |
| 4 | S2: ON 2025 $85K + 非产假 EI | WS B.xlsx(Box 7 = 30) | **owing $2,615.91** | ✅ Auto |
| 5 | S5: BC 2025 self-emp $50K | WS Test_Summary.xlsx | owing $11,238 | ✅ Auto |
| 6 | BC 2025 $80K + RRSP $40K | WS 2025 test | refund $9,935 | ✅ Auto |
| 7 | BC 2025 $70K + FHSA $8K + RRSP $35K | WS 2025 test | refund $10,367 | ✅ Auto |
| — | D1–D5: 投资收入 / DTC | `dividend-cases.test.ts` | 见阶段 3 各 case | 🟡 引擎自验 |
| — | D6–D11: 投资收入扩展 | `dividend-cases.test.ts` | 见阶段 3 各 case | ✅ WS |
| — | D12–D14: 收尾补测 | `dividend-cases.test.ts` | 见阶段 3 各 case | ✅ WS |
| — | QC1, QC2, QC3, QC4: abatement+QPP+多档+RRSP | `quebec.test.ts` | 见阶段 4 各 case | ✅ WS/TurboTax（QC2/QC4 含 TurboTax 逐行）|
| — | QC5–QC7: 魁北克 DTC/跨年/自雇 | `quebec.test.ts` | 见阶段 4 各 case | 🟡 引擎自验（待 WS）|
| — | QC10: 私人药保豁免（3 子场景 × 勾选/不勾选）| `quebec.test.ts` | 见阶段 4 QC10 | ✅ WS |

**新加 case 时:** 在 `golden-cases.test.ts` 的 `CASES` 数组里追加 + 跑一次确认通过 + 把这个 .md 文件 status 改为 ✅ Auto。

**D1–D5 升级为 ✅ Auto 的方法:** 先在 WS 比对通过 → 在 `golden-cases.test.ts` 的 `CASES` 数组追加 → 跑 `OUT=/tmp/taxcalc_out node run-dividend-tests.mjs` 确认 → 改 status。

---

## 🛠 怎么用这个文件

**场景 A:** 想验证最近的改动没破坏旧功能
→ `cd code && npm test` → 看 Case 1-5 全通过
→ **再跑 `node check-testcases.mjs`** —— 这一步查的是**本文件里记录的数字**还对不对

---

## 🤖 自动校验：`code/check-testcases.mjs`

> **为什么需要它：** 本文件里的数字写下来那一刻是对的，但引擎一直在改。引擎一改，
> 标着 ✅ 的旧数字就悄悄失效了 —— ✅ 还在，数字已经不对。这在本项目发生过多次：
> QC1 的记录值过期了整整一个月（差 $1,173.59）、QC7 有过四代作废值、QC6 也有过 stale 值。
> 危险在于**它没有症状**：测试挂了你会知道，文档烂掉了你只会在下次跟 WS 比对时，
> 浪费半小时查一个根本不存在的 bug。

```bash
cd code
node check-testcases.mjs              # 编译引擎 + 全量校验
node check-testcases.mjs --skip-build # 复用上次编译（快）
node check-testcases.mjs QC7 QC8      # 只查指定 case
```

退出码 0 = 一致，1 = 有漂移。

**数据从哪来：** 每个 case 下面有一个 ` ```json fixture ` 块。人读的表格照旧保留 ——
那些分析、归因、踩坑记录才是本文件最值钱的部分，不该被机器格式挤掉。机读块只负责
「输入 + 预期值」这一小块可验证的事实。

**字段：**

| 字段 | 说明 |
|---|---|
| `id` / `label` | 唯一标识与人读名称 |
| `extends` | 复用另一个 fixture 的输入（QC10 用它复用 QC1/QC6/QC8）|
| `input` | 完整 `TaxInput`；配合 `extends` 时只写差异部分 |
| `points[].rrsp` | 该测点的 RRSP 供款额 |
| `points[].expect` | 预期 `refundOrOwing`（**正 = 退税，负 = 补税**）|
| `points[].override` | 该测点对 input 的临时覆盖（如 `hasPrivateDrugCoverage`）|
| `points[].assert` | 额外断言的引擎字段（如 `provincialDrugPremium`）|
| `points[].verified` | 来源：`WS` / `TurboTax` / `引擎值` —— **漂移时靠它判断该信哪边** |
| `points[].tol` | 容差，默认 $0.01（文档记整数的点用 1）|
| `points[].disputed` | 已查过但没定论的悬案：仍会报出来，但不算失败 |

**漂移了怎么判断是哪边的问题：**

- 来源是 **WS / TurboTax** 的点漂了 → 大概率是**引擎回归**，先查最近改了什么
- 来源是 **引擎值** 的点漂了 → 大概率是**文档过期**，确认引擎改动是有意的之后更新数字
- **一整个 case 全漂** → 先看配置（税年、省份、预扣）是不是写错了

**为什么有 `disputed` 这个逃生舱：** 一个永远红着的检查很快就会被无视，那比没有检查更糟。
查过但没结论的点标成 disputed，它照样每次都打印出来，但不会把整个校验拖成红色。

**场景 B:** 想新加一个测试 case
→ 在 WS 跑一遍记下数字 → 在阶段 1 或阶段 2 区加一条记录 → 决定要不要也加到 golden-cases.test.ts

**场景 C:** 测了一个 case 数字不对
→ 把 WS Summary 导出 xlsx 发给 Claude → 让 Claude 反推哪一行 line by line 差异 → 可能是 bug(开新 ticket)或者 WS quirk(像 S2 那样)

**场景 D:** 想测优化器 3 种策略
→ 用 T4(BC $80K + $22K RRSP)这种"baseline 是 owing"的 case,切策略看推荐
→ Zero out tax owing / Maximize refund / Drop one tax bracket 应该给不同推荐

---

## 📜 测试历史

| 日期 | 谁 | 测了什么 | 发现 / 修复 |
|---|---|---|---|
| 2026-05-15 | Amy | P0-Yang-2024 | 真实 CRA $1,085.32 vs 工具 $1,085.34 → $0.02 精度,P0 baseline |
| 2026-05-17 | Amy | Yang ON 2025 | WS $541.09 vs 工具 $388 → 发现 4 个 bug:2025 14.5% / CPP overpayment / Box 26 / T5 利息 UI(TICKET-014/015) |
| 2026-05-17 | Amy | S1-S5 第一轮 | S1 差 $23 → 发现 LIFT(TICKET-016);S2 差 $918 → 发现 EI clawback 公式错(TICKET-017);S5 差 $5,533 → 发现自雇 CPP payable 漏(TICKET-018) |
| 2026-05-17 | Amy | S2 第二轮(WS A + B) | A 仍 $1,561,B 是 $2,616 → 发现 clawback 双重入账漏(TICKET-020) |
| 2026-05-17 | Amy | S2 第三轮 | TICKET-020 修复后 工具 $2,616 = WS B,完美对齐 ✅ |
| 2026-05-17 | Amy | zero_owing 策略 UI | 发现 "$1 refund" 应显示 "$0 owing" → TICKET-021 (snap-to-0 + 加测试防回归) |
| 2026-05-17 | Amy | InteractiveScenario + ComparisonTable | 发现 3 处 UI 不一致(Your scenario $1, Recommended $0 红色, Comparison $1)→ TICKET-022 (snapNearZero helper 统一处理) |
| 2026-05-25 | Amy | S6-S9 重测(2025 税年) | S6/S7 直接通过 ✅。S8/S9 之前差异原因查明：WS 误设 2024 税年。2025 重测 S8/S9 全通过 ✅，含大量供款金额测试全部通过 ✅ |
| 2026-05-26 | Amy | T1-T4 供款场景 | T1/T2(ON)全通过 ✅。T3/T4(BC)在高额供款下失败 → 发现 BC basic tax reduction(Schedule BC line 6103)未实现(TICKET-023)。修复后 T3/T4 全通过 ✅ |
| 2026-05-27 | Claude | D1–D5 投资收入设计 + 引擎自验 | 实现股息税收抵免(DTC)+ UI 字段；38 项引擎断言全通过 🟡；待 WS 比对升为 ✅ |
| 2026-05-27 | Amy | D1 WS 比对 | ON 省对齐后 baseline owing $967 ✅；RRSP $3,260/$5K/$10K/$18,860/$20K/$43K 全通过 ✅。初次差 $1,137 原因：WS 省份未改 BC→ON，非 bug |
| 2026-05-27 | Amy | D2 WS 比对 | 发现 BC 非合资格 DTC 税率错误（2.5164% → 1.96%）。修复后 WS $403 vs 工具 $402.55 → $0.45 精度 ✅ |
| 2026-06-06 | Amy | D3/D4/D5 WS 比对 | D3 发现两个 bug（ON surtax 顺序 + DTC 税率过期 → TICKET-025）。D4/D5 baseline ✅。D5 RRSP 变额发现 BC Sales Tax Credit 缺失 → TICKET-026。全部修复并回归通过 |
| 2026-06-06 | Claude | D6–D11 设计 + 引擎自验 | 6 个新 case 覆盖：surtax+合资格DTC(D6)、LIFT交互(D7)、EI clawback被投资收入触发(D8)、四种投资收入并存(D9)、自雇+DTC(D10)、BPA phase-out极限(D11)。引擎断言全通过 🔵 待 WS 比对 |
| 2026-06-07 | Amy+Claude | D6/D7/D8 WS 比对 | D6 ✅ D7 ✅。D8 差异 $1,557（WS owing $2,780 vs 工具 $4,337）→ 查出**两个问题**: ① EI clawback threshold 错误 $79,000→$82,125（TICKET-027: 2024 年值误用为 2025）; ② Amy 填 T4 Box 26 = $45,000（应填 $71,300 YMPE）导致 CPP overpayment 虚高。修正 threshold 后 engine 与 WS 完全吻合（$2,780.08）。2024 年 threshold 也一并修正 $76,875→$79,000。80 项断言全通过 ✅ |
| 2026-06-07 | Amy | D8(复测)/D9/D10/D11 WS 比对 | D8 修正 Box 26 后 7 项全过 ✅。D9(四种投资收入) 7 项全过 ✅。D10(BC 自雇+DTC) 6 项全过 ✅。D11(ON BPA phase-out+surtax 极限) 7 项全过 ✅ |
| 2026-06-07 | Amy+Claude | D12 WS 比对 | baseline($0) + 高额RRSP($43K) 通过；中间档($15K/$20K/$30K)差异 $159/$409/$651 → 查出 **LIFT credit 误发放给自雇收入**（TICKET-028）。修正 `calculator.ts` LIFT 参数为 `employmentIncome` 后与 WS 完全吻合。100/100 断言通过 ✅ |
| 2026-06-07 | Amy | D12(复测)/D13/D14 WS 比对 | D12 修正 LIFT 后全过 ✅。D13(产假 EI 免 clawback) 7 项全过 ✅。D14(BC 高收入) 7 项全过 ✅。**D12-D14 收尾补测全部完成 ✅** |
| 2026-06-08 | Claude | QC1–QC7 魁北克省 + QPP/QPIP | 新增阶段 4 + QPP/QPIP/QC-EI 实现：QPP 费率 6.40%（vs CPP 5.95%）、QPIP 0.494%、QC-EI 1.31%。引擎+测试全面更新，284 项断言全通过。test-cases.md 添加 WS T4+RL-1 填表指南 🟡。待 WS 比对升为 ✅ |
| 2026-07-21 | Amy+Claude | QC10 药保豁免开关 WS 比对 | **A/B/C × 勾选/不勾选 共 6 个测点全过 ✅，QC10 结案。** 三档保费（$755 / $737.50 / $157.04 爬坡段）勾选后均归零；WS 确认为全年一刀切，不按月比例。中途 B 曾差 $412 → **根因是工具里「报税年度」忘了从 2025 改到 2024**（引擎跑 2025+不勾选 = 退 $1,817.64，正好对上首测的 $1,818），非 bug。Box 17A 被排除（2024 $60K < YMPE $68,500，QPP2 结构上为 $0）。⚠️ 期间曾在只有工具端数字的情况下误判为「WS 端 Box E 残留 $8,000」，拿到 WS 导出后推翻——**教训：两边数字都拿到之前不要断言是哪边错** |
