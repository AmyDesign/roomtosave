# RRSP / FHSA 避税计算工具 — 计算方法文档

本文档详细说明工具背后的所有计算逻辑，包括加拿大税制基础、各类收入的处理方式、特殊情况、以及优化算法。

---

## 1. 加拿大税制基础

加拿大个人所得税采用**联邦税 + 省/地区税**两层叠加，且都使用**累进税率（marginal tax rate）**。

> **工具现状：** P0 同时支持 **2024** 和 **2025** 报税年度的税表（用户在 Wizard 第一步可选）。下面列出两年的关键税阶；更全数字见附录 A。

### 1.1 联邦税阶

**2024 报税年度**

| 应税收入范围 | 边际税率 |
|---|---|
| $0 – $55,867 | 15% |
| $55,867 – $111,733 | 20.5% |
| $111,733 – $173,205 | 26% |
| $173,205 – $246,752 | 29% |
| $246,752 以上 | 33% |

**2025 报税年度**

| 应税收入范围 | 边际税率 |
|---|---|
| $0 – $57,375 | 15% |
| $57,375 – $114,750 | 20.5% |
| $114,750 – $177,882 | 26% |
| $177,882 – $253,414 | 29% |
| $253,414 以上 | 33% |

### 1.2 省/地区税阶

每个省/地区有自己的税阶表，工具需内置以下省份/地区的税表：

- BC、Alberta、Saskatchewan、Manitoba、Ontario、Quebec、New Brunswick、Nova Scotia、PEI、Newfoundland and Labrador
- Yukon、Northwest Territories、Nunavut

**注意**：Quebec 报税系统独立，联邦税有 16.5% 的 Quebec abatement，工具需特殊处理（详见 §1.8）。

**Quebec 2025 税阶**

| 应税收入范围 | 边际税率 |
|---|---|
| $0 – $53,255 | 14% |
| $53,255 – $106,495 | 19% |
| $106,495 – $129,590 | 24% |
| $129,590 以上 | 25.75% |

**Quebec 2024 税阶**

| 应税收入范围 | 边际税率 |
|---|---|
| $0 – $51,780 | 14% |
| $51,780 – $103,545 | 19% |
| $103,545 – $126,000 | 24% |
| $126,000 以上 | 25.75% |

### 1.3 Basic Personal Amount (BPA)

- **联邦 BPA**：2024 = $15,705；2025 = $16,129（高收入者有 phase-out，BPA 减少到 2024 $14,156 / 2025 $14,538，phase-out 区间约 $173K–$246K（2024）/ $178K–$253K（2025））
- **省 BPA**：各省不同，例如 BC 2025 = $12,932 / 2024 = $12,580；Ontario 2025 = $12,747 / 2024 = $12,399；Quebec 2025 = $18,571 / 2024 = $18,056（远高于其他省份）

BPA 通过 **non-refundable tax credit** 形式抵免，公式：
```
联邦 BPA 抵免 = BPA × 15%
省 BPA 抵免 = 省 BPA × 省最低税率
```

### 1.4 Ontario Health Premium (OHP)

**Ontario 居民特有**的省级附加税，跟所得税并列加在 T1 上。名字叫"premium"但本质是税，跟 OHIP 全民医保**没关系**。

**按"应税收入"分段征收（2024 和 2025 表相同）：**

| Taxable Income | OHP |
|---|---|
| $0 – $20,000 | $0 |
| $20,000 – $25,000 | 6% × (income − $20,000)，最多 $300 |
| $25,000 – $36,000 | $300 |
| $36,000 – $38,500 | $300 + 6% × (income − $36,000)，最多 $450 |
| $38,500 – $48,000 | $450 |
| $48,000 – $48,600 | $450 + 25% × (income − $48,000)，最多 $600 |
| $48,600 – $72,000 | $600 |
| $72,000 – $72,600 | $600 + 25% × (income − $72,000)，最多 $750 |
| $72,600 – $200,000 | $750 |
| $200,000 – $200,600 | $750 + 25% × (income − $200,000)，最多 $900 |
| $200,600 以上 | $900 |

**关键性质：**
- **不可被非退还抵免抵消**（BPA 等抵免只作用于所得税部分，对 OHP 无效）
- **不可被 surtax 计算**（OHP 不参与 Ontario surtax 的计算基数）
- 因此应在所得税 + 抵免 + surtax 全部算完之后**直接加上**

### 1.5 Ontario Surtax

Ontario 特有的二级附加税，**针对的是"减去抵免后的省所得税"**（不针对 OHP）：

| 基础省税超过 | 附加率 |
|---|---|
| 2024: $5,554 / 2025: $5,710 | 20% |
| 2024: $7,108 / 2025: $7,307 | 36%（在 20% 之上累加） |

例：基础省税 $8,000，surtax = (8000 − 5554) × 20% + (8000 − 7108) × 36% = $489.20 + $321.12 = $810.32（2024）

> **关键计算顺序规则（TICKET-025）：Surtax 必须在股息税收抵免（DTC）扣除之前计算。**
>
> 根据 **Ontario Taxation Act, 2007, s.19.1**（2014 年起生效）的规定：「the Ontario surtax... will be calculated before deducting dividend tax credits」—— surtax 的计算基数是「省所得税 − 基础非退还抵免（BPA / CPP / EI / employment amount 等）− BC-style basic tax reduction」，**不能再减去 DTC**。正确的算税顺序是：
> ```
> 1. provincialTaxAfterBaseCredits = 省税 − 基础非退还抵免（不含 DTC）
> 2. basicTaxReduction = ...（基于上面的余额）
> 3. provincialTaxAfterBasicReduction = provincialTaxAfterBaseCredits − basicTaxReduction
> 4. surtax = calculateSurtax(provincialTaxAfterBasicReduction)        ← 用这个基数算 surtax
> 5. provincialTaxAfterSurtaxAndDTC = provincialTaxAfterBasicReduction + surtax − dividendTaxCredit   ← DTC 在 surtax 加上去之后才扣
> ```
> **常见错误**：把 DTC 和其他非退还抵免混在一起，一次性从省税里减掉，再用减完的余额算 surtax —— 这样会把 surtax 的计算基数算小了，导致 surtax 被低估。
>
> **触发条件**：只有当用户「应纳税所得额跨过 surtax 门槛（基础省税 > $5,710 / $5,554）」**且**「同时申报股息收入（有非零 DTC）」时，这个顺序错误才会产生实际数字差异；否则两种算法在代数上等价。这正是为什么 D1（应税收入未跨门槛）、D2/D4（无 surtax 或 DTC=0）测不出这个 bug，而 D3（ON $90K + 股息，刚好跨过门槛）才暴露出约 $20 的 surtax 缺口。

### 1.6 BC Sales Tax Credit（退还性省级抵免）

**仅 BC 居民**适用的退还性（refundable）省级抵免，通过 **Form BC479** 申报，最终汇总到 **T1 line 47900「Provincial or territorial refundable credits」**。

**单身报税公式：**
```
信用额度 = max(0, $75 − 2% × max(0, 净收入 − $15,000))
```
即：净收入 ≤ $15,000 时为满额 $75；落在 $15,000–$18,750 区间按净收入每超出 $1、减少 $0.02 的比例线性递减；净收入 ≥ $18,750 时完全归零。

**关键性质（与 LIFT / Basic Tax Reduction 等不可退还抵免的本质区别）：**
- **退还性（refundable）**：无论当期省所得税是否已经为零，该信用都会**直接计入退税**（或用来抵减欠税），不受「只能把税降到零、不能为负」的限制
- 因此在计算引擎里必须把它加进 `refundOrOwing`，**绝不能**从 `netProvincialTax` 里扣减

> **配偶变体（未建模）**：官方规则中已婚/同居纳税人适用不同的门槛和金额（额外 +$75，家庭净收入门槛改为 $18,000），但本引擎目前没有「配偶/婚姻状态」概念，因此只实现了单身公式。

来源：[gov.bc.ca — Sales tax credit](https://www2.gov.bc.ca/gov/content/taxes/income-taxes/personal/credits/sales-tax)（官方注明该参数 "for 2013 and later years" 保持不变）

> **易错点（TICKET-026）：** 这个抵免的覆盖面非常窄——只有当净收入恰好落在约 $15,000–$18,750 这个区间时才会产生非零金额，且单笔最高也只有 $75。D1–D4 的测试场景净收入都远高于这个区间，完全覆盖不到；D5 由于测试了大额 RRSP 供款（把净收入压低到了这个区间），才第一次暴露出这个完全缺失的抵免——表现为「供款额超过某个临界点后，工具算出的退税突然在 $7,000 处 plateau，比 WS 实际值低 $52–$75，且无论再增加多少供款都不再变化」。
>
> **架构陷阱（值得所有未来贡献者警惕）**：在 `data/index.ts` 里，`ProvincialTaxConfig` 对象是**手动按字段名逐个从 raw JSON「搬运」过去的**（不是整体 `{ ...raw }` spread）。这意味着：在 `bc.json` 里加了 `salesTaxCredit` 字段，并**不代表**引擎就会用到它——必须同时在 `data/index.ts` 的 BC 配置块（2024、2025 各一处）里手动补一行 `salesTaxCredit: bcXXXX.salesTaxCredit`。漏掉这一步不会有任何报错：`config.salesTaxCredit` 会静默解析成 `undefined`，`calculateRefundableSalesTaxCredit` 内的 `if (!c) return 0;` 守卫会让它安安静静地算出 0。这正是本次实现过程中第一轮验证「公式和 JSON 配置都明明是对的，算出来却全是 $0」的真正原因。同样的坑将来在改动 `liftCredit` / `surtaxes` / `healthPremium` 等字段时也可能复现，需特别留意。
>
> **CRA 整数舍入惯例**：T1 表格/附表（含 Form BC479）上填报的金额按「四舍五入到最接近的整数美元」处理——例如净收入为 $16,129 时，原始公式算出 $52.42，但 WS 报告为整数 **$52**。引擎必须对最终结果套一层 `Math.round()`，否则会在 phase-out 区间内产生几毛钱的误差，无法跟 WS 精确匹配到分。

### 1.7 Ontario LIFT Credit（低收入个人和家庭税收抵免）

**Ontario 居民特有**的不可退还省级税收抵免（Low-income Individuals and Families Tax Credit），用于减轻低收入工薪族的 Ontario 所得税负担。

**资格条件（TICKET-028 修正）：**
- **仅限 T4 工资收入（employment income）≥ $3,000**
- **自雇收入不符合资格** — 即使自雇净收入很高，如果没有 T4 工资收入 ≥ $3,000，则 LIFT = $0
- 这是因为 LIFT 的政策目标是减轻低收入"雇员"的税负，不适用于自雇人士

**计算公式（单身，2024/2025）：**
```
基础 LIFT = min($875, 省所得税余额)
Phase-out = 5% × max(0, 净收入 − $32,500)
LIFT Credit = max(0, 基础 LIFT − Phase-out)
```
即：净收入 ≤ $32,500 时满额（最高 $875 或当期省税，取较小）；净收入在 $32,500–$50,000 区间线性递减；净收入 ≥ $50,000 时完全归零。

**关键性质：**
- **不可退还（non-refundable）**：只能把省所得税降到零，不能为负
- 在 surtax + DTC 之后、OHP 之前计算
- **不影响 OHP**：OHP 在 LIFT 之后单独加上

**计算顺序（在 Step 8 中的位置）：**
```
1. provincialTaxAfterBaseCredits = 省税 − 基础非退还抵免（不含 DTC）
2. basicTaxReduction（如适用）
3. surtax = calculateSurtax(provincialTaxAfterBasicReduction)
4. provincialTaxAfterSurtaxAndDTC = ... + surtax − DTC
5. LIFT Credit = calculateLIFT(netIncome, employmentIncome, config)  ← 在这里
6. provincialAfterLift = max(0, provincialTaxAfterSurtaxAndDTC − LIFT)
7. OHP（如适用）
8. netProvincialTax = provincialAfterLift + OHP
```

> **TICKET-028 修复记录：** 引擎原先把 `earnedIncome`（含自雇净收入）传给 `calculateLIFT`，导致自雇人士也能获得 LIFT 抵免。修复为传 `employmentIncome`（仅 T4 工资收入）。影响：ON 自雇者在 RRSP 供款 $15K/$20K/$30K 时分别多算了 $159/$409/$651 的抵免。

### 1.8 Quebec Federal Abatement（联邦减免 16.5%）

（原 §1.7，因插入 LIFT 章节后重编号为 §1.8）

Quebec 居民在联邦税上享有 **16.5% 的减免（Quebec Abatement）**，对应 T1 line 44000。

**背景：** Quebec 是加拿大唯一自行管理省所得税和多项社会计划的省份（通过 Revenu Québec 而非 CRA 征收省税），联邦政府因此给予联邦税减免作为补偿。

**计算公式：**
```
Quebec Abatement = Basic Federal Tax × 16.5%
Net Federal Tax = Basic Federal Tax − Quebec Abatement
```

其中 `Basic Federal Tax` = Gross Federal Tax − Non-refundable Credits（即 Step 7 中减去抵免后的联邦税）。

**对边际税率的影响：**
```
联邦边际税率（QC 居民）= 联邦标准边际税率 × (1 − 0.165) = 联邦标准边际税率 × 0.835
```
例如：联邦第 2 档 20.5%，QC 居民实际联邦边际 = 20.5% × 0.835 = 17.12%。加上 QC 省第 2 档 19%，合计边际 = 36.12%。

**QPP 建模（已实现）：** QC 居民改用 QPP（Quebec Pension Plan），员工费率 6.40%（基础 5.40% + 第一附加 1.00%），高于 CPP 的 5.95%；并叠加 QPIP（0.494%）与魁省专属 EI 费率。详见 §2.1.1 与 test-cases QC1–QC7。

**增强 QPP 在魁省端的扣除（TP-1 Line 248）：** 第一附加 QPP 供款（1%）除了联邦 line 22215 扣除外，对**魁省居民**还可在 **TP-1 Line 248**（经 Schedule U）从魁省净收入中扣除（仅**非居民**不可扣）。引擎对此自动处理——`taxableIncome` 已减去增强供款，魁省应税收入由同一 `taxableIncome` 派生，因此联邦、魁省两端都正确反映了这笔扣除。**WS 比对注意：** WS 的 Line 248 只读 **RL-1 Box B.A**（≠ T4 Box 17），Box B 留空会漏算（QC2 实测踩坑，详见 test-cases）。**第二附加 QPP（QPP2，RL-1 Box B.B）暂不建模**，列为 P1。

### 1.9 Quebec RAMQ 药险费（TP-1 Line 447，Schedule K）

无团体药险的魁省居民须缴 **RAMQ 处方药保险费**（TP-1 line 447），并入 `netProvincialTax`。这是一笔**按收入测试**的费用，**不是固定值**：

```
若 魁省净收入(line 275) ≤ 豁免阈值  → 药险费 = $0
否则                                → 药险费 = 最高额（封顶）
```

- **单人豁免阈值（Schedule K 情形 32）：** 2025 = **$19,890**，2024 = **$18,910**（line 275 ≤ 此值则无需缴、甚至无需填 Schedule K）。
- **最高额（报税年度）：** 2025 = **$755**，2024 = **$737.50**。
  - ⚠️ **RAMQ 费率每年 7 月 1 日调整**，一个报税年度跨两个费率期，故年度上限取两个半年的**均值**：
    - 2024 = ($731 [2023-07~2024-06] + $744 [2024-07~2025-06]) / 2 = **$737.50**
    - 2025 = ($744 + $766 [2025-07~2026-06]) / 2 = **$755.00**
  - 2026-07-19：原 2024 误填 $731（只取上半年那档），经 Wealthsimple 实测更正为 $737.50。
- **分段爬坡（2026-07-19 修，TICKET-034）：** 超过豁免线后保费**不是**直接跳满额，而是分两段爬升再封顶：
  - `保费 = min(上限, 超出额前 $5,000 × rate1 + 余额 × rate2)`
  - **2025：** 豁免线 $19,890、rate1 = **7.84%**、rate2 = **11.76%**、上限 $755 → 封顶点约净收入 **$27,977**。（两者皆整数且 rate2 = 1.5 × rate1，**大概率即法定费率**）
  - **2024：** 豁免线 $18,910、rate1 = **6.56115%**、rate2 = **10.86003%**、上限 $737.50 → 封顶点约净收入 **$27,680**
  - 爬坡区间外（低于豁免线、或高于封顶点）引擎本就正确，此 bug 只影响区间内
  - ⚠️ **费率为 Wealthsimple 实测反解，非法定公布值**（官方只公布上限）。2025 解出整数、可信度高；**2024 解出碎数（比值 1.655 而非 1.5），结构上可疑**——四个实测点精确命中，但点间形状可能有几元误差，日后拿到法定费率应替换。
- **为什么是「悬崖」而非渐进：** Schedule K 的渐进区间恰好与豁免阈值重合（单人：$19,890 − $8,181 封顶门槛 = $11,709 基础扣减；夫妻：$32,240 − $14,669 = $17,571），所以单人没有部分金额区间——要么 $0，要么封顶。
- **引擎实现：** 配置项 `drugInsurancePremium`（最高额）+ `drugInsurancePremiumExemption`（豁免阈值），在 `calculator.ts` 以 `provincialTaxableIncome`（= line 275）做测试。**引擎仅建模单人（无配偶）。**
- **踩坑（已修复 2026-06-30）：** 原实现按固定 $755 计，高 RRSP 把净收入压到阈值下时仍误收 $755 → 退税少 $755（QC2 RRSP $30K/$33,406）。

---

## 2. 收入分类与计算

### 2.1 工资收入（T4 Employment Income）
- 100% 计入 Total Income
- 雇主已扣 CPP / EI / 联邦税 / 省税（见 T4 Box 14 / 16 / 18 / 22）
- 计入 RRSP **Earned Income**

#### 2.1.1 CPP 贡献拆分（2019+ 改革后）

T4 Box 16 显示的 CPP 总贡献金额，**必须拆分为两部分**：

| 部分 | 比例 | 税务处理 | T1 表对应行 |
|---|---|---|---|
| **基础 CPP**（Base） | 4.95% × (pensionable − $3,500) | 非退还抵免 | line 30800 |
| **增强 CPP / CPP1**（Enhanced） | 1% × (pensionable − $3,500) | **净收入扣除** | line 22215 |
| **CPP2**（仅 YMPE 以上，Box 16A） | 4% × (earnings − YMPE) 到 YAMPE 上限 | **净收入扣除** | line 22215 |

**拆分公式（从 Box 16 反推）：**
```
基础占比 = baseRate / (baseRate + enhancedRate) = 4.95 / 5.95 ≈ 83.19%
增强占比 = enhancedRate / (baseRate + enhancedRate) = 1 / 5.95 ≈ 16.81%

基础部分 = Box 16 × 83.19%
增强部分 = Box 16 × 16.81%
```

**为什么这样设计：** 2019 年 CPP 改革引入增强 CPP，让劳动者后期养老金更高。但这部分供款是**强制储蓄性质**，所以税法上把它当作扣除（类似 RRSP 供款）而不是抵免。

**对税额的影响：** 在边际税率 30% 的用户身上，$1 增强 CPP **当扣除省 $0.30**，**当抵免只省 $0.15**。一年差 $80–$115 量级。

**P0 当前实现：** 拆分基础和增强部分自动从 Box 16 推导；**暂不支持 Box 16A (CPP2) 输入**（仅高收入用户触发，待 P1）。

### 2.2 EI 福利（T4E）
- 100% 计入应税收入
- **EI Clawback（回缴）**：
  - 净收入 > $82,125（2025 = 1.25 × MIE $65,700，每年调整）时触发
  - 回缴金额 = min(EI 总额, 净收入超出门槛部分) × 30%
  - **例外**：产假/陪产 EI（Maternity / Parental EI）**不需要回缴**
- EI 预扣税通常偏低，需要在计算中注意
- **不计入** RRSP Earned Income

### 2.3 自雇/合同收入（T2125）
- 净收入（毛收入 − 业务支出）100% 计入应税收入
- 无预扣税
- **需自行缴双倍 CPP**（雇主+雇员两部分），税务处理如下：
  - **雇主等额基础部分 + 全部增强部分** → 净收入扣除（line 22200）
  - **雇员基础部分** → 非退还抵免（line 31000，同 T4 雇员的 line 30800）
  - CPP 应缴总额（payable）计入欠税公式（refundOrOwing 减项）
- 计入 RRSP Earned Income
- **不符合 Ontario LIFT Credit**（TICKET-028）— LIFT 要求 T4 employment income ≥ $3,000，自雇收入不算

### 2.4 投资收入

#### 2.4.1 利息收入（Interest）
- 100% 计入应税收入
- 来源：GIC、储蓄账户、债券等
- **不计入** RRSP Earned Income

#### 2.4.2 加拿大合资格股息（Eligible Dividends）
- 计入应税收入 = 实际股息 × **1.38（gross-up）**
- 联邦 Dividend Tax Credit = 计入金额 × **15.0198%**
- 省 Dividend Tax Credit：各省不同（如 BC 约 12%，Ontario 约 10%）
- **不计入** RRSP Earned Income

#### 2.4.3 加拿大非合资格股息（Non-eligible Dividends）
- 计入应税收入 = 实际股息 × **1.15（gross-up）**
- 联邦 Dividend Tax Credit = 计入金额 × **9.0301%**
- 省 Dividend Tax Credit：各省不同，**以已 gross-up 的金额为基数**

| 省份 | 合资格 DTC 率 | 非合资格 DTC 率 | 生效年份 |
|---|---|---|---|
| BC | 12.0% | **1.96%** | 合资格 2019+；非合资格 2019+（BC 2017 年把 small business 税率降到 2% 后调整） |
| Ontario | 10.0% | **2.9863%**（2020–2026）；2018/2019 = 3.2863%；2027+ = 1.9863% | 合资格 2019+；非合资格按年份分段，见下方易错点 |
| Quebec | **11.70%** | **3.42%** | 基于 grossed-up 金额（同 BC/ON），2024–2025 相同 |

> **易错点（TICKET-024）：** BC 非合资格 DTC 是 1.96%，远低于联邦 9.0301%，也低于 ON 的非合资格税率。曾被错误地写成 2.5164%（可能误用了其他省份或旧年份的数字）。
>
> **易错点（TICKET-025）：** Ontario 非合资格 DTC 税率**逐年变化**，不是一个固定数字 —— 2018/2019 是 3.2863%，**2020–2026 降到 2.9863%**，2027 起再降到 1.9863%。曾把 2018/2019 的旧税率（3.2863%）一直沿用到 2024/2025 年配置文件里，导致 DTC 被高估、税被少算约 $0.3 个百分点 × grossed-up 金额。来源：[TaxTips.ca Ontario Dividend Tax Credit](https://www.taxtips.ca/ontax/dividend-tax-credit.htm)。**更新年度数据时务必去源头核对当年的具体税率，不能想当然复用上一年的数字。**

- **不计入** RRSP Earned Income

#### 2.4.4 外国股息（含美股）
- 100% 计入应税收入（按汇率换算成 CAD）
- **无** Canadian Dividend Tax Credit
- 可申报 **Foreign Tax Credit**（对方国家预扣税，如美股 W-8BEN 后通常 15%）
- 注意：放在 TFSA / FHSA 里的美股股息会被预扣 15% 且**无法**通过 Foreign Tax Credit 拿回；放在 RRSP 里的美股股息根据 Canada-US Tax Treaty **免预扣**

#### 2.4.5 资本利得（Capital Gains）
- **50% 计入应税收入**（inclusion rate，2025 维持 50%；此前 2024 财政预算提议高于 $250K 部分调至 66.67%，目前已暂停/取消）
- 计算公式：
  ```
  应税资本利得 = (售价 − 买入成本 − 交易费用) × 50%
  ```
- **资本亏损**：只能抵消资本利得，**不能**抵其他收入
- 资本亏损结转：可往前 3 年、往后无限期

#### 2.4.6 出租房收入（T776）
- 净租金（租金 − 利息、地税、维修、保险、物业管理费等）100% 计入
- 计入 RRSP Earned Income

### 2.5 退休金/政府福利
- **CPP / QPP**：100% 计入，不计入 Earned Income
- **OAS**：100% 计入；**OAS Clawback** 在净收入 > 约 $93,454（2025）时触发，回缴 15% × 超出部分
- **公司养老金（Pension）**：100% 计入
- **RRSP 取款**：100% 计入应税收入（除非通过 HBP / LLP 借款）

### 2.6 其他
- **奖学金 / 助学金**：全日制学生通常免税；非全日制有限额
- **TFSA 取款**：免税，不计入
- **FHSA 合资格取款（买首套房）**：免税，不计入

---

## 3. RRSP 规则详解

### 3.1 供款额度

```
本年 RRSP 额度 = min(上一年 Earned Income × 18%, 当年最高限额) + 历年累积未使用额度 − 当年 Pension Adjustment
```

- **2025 最高限额**：$32,490
- **Earned Income** 包括：工资、自雇净收入、出租净收入、版税、部分赡养费等
- **Earned Income 不包括**：投资收入、EI、CPP、OAS、退休金等
- **Pension Adjustment (PA)**：参加公司养老金计划的用户，T4 Box 52 显示，要从额度中扣除
- 准确额度以 CRA Notice of Assessment 上的数字为准

### 3.2 供款时间窗
- 一个税务年度的供款截止日 = 次年的前 60 天（通常 3 月 1 日）
- 即：2025 年 1 月 1 日 – 2026 年 3 月 1 日的供款，都可在 2025 年报税时抵扣

### 3.3 抵扣的灵活性
- 供款 ≠ 立即抵扣：可以"供款先放着，未来高税阶年份再抵扣"
- 工具应允许用户选择"全部抵扣"或"部分抵扣，余下结转"

### 3.4 超额供款
- 终身可超额 $2,000 不罚款
- 超过 $2,000 部分，每月罚款 1%

### 3.5 Spousal RRSP（配偶 RRSP）
- 高收入配偶可往低收入配偶名下的 RRSP 供款，用自己的额度抵扣
- 取款时按取款人（低收入方）税率交税
- **3 年归属规则**：供款后 3 个公历年内取款，会被算回供款人的收入

### 3.6 HBP（Home Buyers' Plan）
- 首次购房者可从 RRSP 借出最多 **$60,000**（2024 年起从 $35,000 提高）
- 借出后 15 年内分期还回（第 2 年开始还）
- 不还的部分计入当年应税收入

---

## 4. FHSA 规则详解

### 4.1 资格
- 加拿大税务居民
- 年龄 18+（部分省 19+）
- **首次购房者**：当年和过去 4 个公历年都未住过本人或配偶名下的自住房产

### 4.2 供款限额
- 年额度：**$8,000**
- 终身额度：**$40,000**
- **结转规则**：当年未用完，最多可结转 **$8,000** 到下一年（不是无限累积）
  - 例：年 1 放 $5,000，年 2 额度 = $8,000 + $3,000 = $11,000
  - 例：年 1 放 $0，年 2 额度 = $8,000 + $8,000 = $16,000；年 3 没用，年 4 = $8,000 + $8,000 = $16,000（封顶，不是 $24,000）
- **账户必须先开户才开始累积额度**

### 4.3 抵扣
- 供款抵扣应税收入，机制同 RRSP
- 也可"供款先放、未来再抵扣"

### 4.4 取款
- **合资格取款（首套房）**：免税、不计入收入
- **非合资格取款**：100% 计入应税收入，按普通税率交
- 账户最多保持 **15 年** 或到 71 岁，到期未取款可无税转入 RRSP（不占 RRSP 额度）

### 4.5 与 HBP 同时使用
- 2023 之后，HBP 和 FHSA 可同时使用购买同一首套房

---

## 5. 税额计算流程

### Step 1: 计算 Total Income
```
Total Income = 工资
             + EI 福利
             + 自雇净收入
             + 利息收入
             + 合资格股息 × 1.38
             + 非合资格股息 × 1.15
             + 外国股息（CAD）
             + 应税资本利得（资本利得净额 × 50%）
             + 出租净收入
             + CPP/OAS/Pension
             + 其他应税收入
```

### Step 2: 计算扣除项得 Net Income
```
Net Income = Total Income
           − RRSP 当年抵扣
           − FHSA 当年抵扣
           − CPP 增强部分（line 22215，从 Box 16 拆出的 1/5.95 部分）
           − CPP2（Box 16A，line 22215，P1 实现）
           − 工会会费 / 专业会费
           − 托儿费（Childcare Expenses）
           − 搬家费用（如符合条件）
           − 其他扣除
           + EI Clawback（如适用）
```

**关键提醒：** CPP 增强部分扣除是**自动应用**的（基于用户填的 Box 16），用户不需要手动输入。

### Step 3: 计算 OAS Clawback（如适用）
```
若 Net Income > $93,454：
    OAS Clawback = min(已领 OAS, (Net Income − $93,454) × 15%)
    从应得 OAS 中扣除
```

### Step 4: 计算 Taxable Income
```
Taxable Income = Net Income
               − 资本亏损结转
               − 其他可结转扣除
```

### Step 5: 计算 Gross Federal Tax（按累进税阶分段）
```
Gross Federal Tax = Σ(每个税阶内收入 × 该税阶税率)
```

### Step 6: 计算 Non-refundable Tax Credits
```
Federal Credits = (BPA + CPP 基础部分（仅 4.95% 部分）+ EI premiums + Canada Employment Amount + 其他) × 15%
                + Dividend Tax Credit（已 gross-up 的股息 × 15.0198% 或 9.0301%）
```

**注意：** CPP 抵免**只算 base 部分**（Box 16 × 83.19%）。Enhanced 部分（1% / 16.81%）已在 Step 2 作为扣除处理，不能重复算抵免。

### Step 7: 计算 Net Federal Tax
```
Basic Federal Tax = max(0, Gross Federal Tax − Federal Credits − Foreign Tax Credit)

# Quebec 居民特殊处理（§1.8）
If province == QC:
    Quebec Abatement = Basic Federal Tax × 16.5%
    Net Federal Tax = Basic Federal Tax − Quebec Abatement
Else:
    Net Federal Tax = Basic Federal Tax
```

### Step 8: 计算 Provincial Tax
```
Gross Provincial Tax = Σ(税阶分段计算)
Provincial Tax After Base Credits = max(0, Gross Provincial Tax − Provincial Credits（不含 DTC）)
Basic Tax Reduction = ...（如适用，基于上面的余额）
Provincial Tax After Basic Reduction = max(0, Provincial Tax After Base Credits − Basic Tax Reduction)

# Ontario 特有
Surtax = Σ(每档 Provincial Tax After Basic Reduction 超过门槛 × surtax 率)  # 仅 ON（§1.5）
Provincial Tax After Surtax And DTC = max(0, Provincial Tax After Basic Reduction + Surtax − DTC)

# Ontario LIFT Credit（§1.7，TICKET-028：仅 T4 employment income ≥ $3,000 才适用）
LIFT = calculateLIFT(netIncome, employmentIncome, config)  # 自雇收入不符合资格
Provincial After LIFT = max(0, Provincial Tax After Surtax And DTC − LIFT)

OHP = lookup(taxable income, Ontario Health Premium 分段表)  # 仅 ON（§1.4）

Net Provincial Tax = Provincial After LIFT + OHP
```

**Provincial Credits 用基础 CPP（同联邦）：**
```
Provincial Credits = (省 BPA + CPP 基础部分 + EI premiums + 省 employment amount 如有) × 省最低税率
```

**OHP 不可被抵免抵消** — 即使省抵免大于基础省税，OHP 仍然要交。

### Step 9: 计算总税额和退税
```
Total Tax = Net Federal Tax + Net Provincial Tax
退税/欠税 = 总预扣税 + CPP 多缴退还 + 退还性省级抵免（如 BC Sales Tax Credit, T1 line 47900）
           − Total Tax − CPP 应缴部分 − 回缴项（OAS / EI clawback）
```

> **退还性省级抵免（TICKET-026）**：例如 BC Sales Tax Credit（详见 §1.6）属于"退还性"（refundable）抵免——它不参与 `Net Provincial Tax` 的计算（不像 LIFT / Basic Tax Reduction 那样只能把税降到零），而是和 `cppOverpayment` 一样，在最后一步直接计入退税公式 `refundOrOwing`，与省所得税是否已经为零无关。

---

## 6. 优化算法

### 6.1 默认策略：补税归零（Tax-Owed-Zero）

**P0 默认目标：** 推荐让 **total tax owed = withheld tax**（即 refundOrOwing ≈ 0），而**不是**"最大化退税"或"用尽 RRSP/FHSA 额度"。

**理由：**
- 不让用户给 CRA 多打"零利息贷款"（最大化退税）
- 不强制用尽额度（保留未来年份灵活性，未来高税阶年抵扣价值更高）
- "year-end 不补税" 是大多数用户最关心的可预期结果

**P1 计划：** 增加策略切换器，让用户在三种推荐目标间切换（补税归零 / 退税最大化 / 降到下一个税阶）。

### 6.2 算法（伪代码）

```python
def optimize(input):
    # 1. 计算基准（无供款）
    baseline = calculate_tax(input, rrsp=0, fhsa=0)
    total_room = rrsp_room + (fhsa_room if is_first_time_home_buyer else 0)
    
    # 2. 选 strategy
    if baseline.refund_or_owing >= 0:
        # Case 1: 已经退税，不需要供款
        recommendation = 0
        strategy = "already_refund"
    elif total_room <= 0:
        # 欠税但没有额度
        recommendation = 0
        strategy = "no_room"
    else:
        # 3. 检查用尽额度是否够
        max_room_result = calculate_tax(input, total=total_room)
        if max_room_result.refund_or_owing < 0:
            # Case 2: 用尽额度仍欠 → cap at room
            recommendation = total_room
            strategy = "room_capped"
        else:
            # Case 3: 二分搜索找最小供款使 refund_or_owing >= 0
            recommendation = binary_search_zero_owing(input, 0, total_room)
            strategy = "zero_owing"
    
    # 4. 分配 FHSA / RRSP（FHSA 优先 — 首次购房者）
    if is_first_time_home_buyer:
        fhsa = min(recommendation, fhsa_room)
        rrsp = min(recommendation - fhsa, rrsp_room)
    else:
        fhsa = 0
        rrsp = min(recommendation, rrsp_room)
    
    return { fhsa, rrsp, strategy, ... }
```

**二分搜索 `find_zero_owing`**：因为 `refundOrOwing` 关于 contribution 是**单调递增**（多供款 → 应税收入↓ → 税↓ → 退税↑），可以用二分搜索在 [0, totalRoom] 找最小 contribution 使 refundOrOwing >= 0。精度 $0.50，最多 60 次迭代。

### 6.3 互动调节器（TICKET-005）

除了默认推荐方案，结果页提供**滑块 + 数字输入双向联动**，用户可以自定义任何 contribution 金额（$0 到 available room），实时看到对应的退税/补税/边际税率/剩余额度。左侧固定显示推荐方案，右侧实时显示用户方案，方便对比。

底层用 `calculateScenario(input, totalContribution)` 函数，每次重算完整 TaxBreakdown。

### 6.4 边界约束（仍然适用）

- **不要把应税收入降到 BPA 以下** — 多出抵扣浪费（算法在每个 strategy 内都会检查）
- **不超过 available room** — `splitContribution` 自动 cap
- **不超过 FHSA 终身上限** — `fhsaRoomActual = min(本年额度, 终身剩余)`
- **检测超额供款风险** — `>额度 + $2,000` 会触发警告

### 6.5 优先级规则
1. **首次购房者**：先填 FHSA（双重免税：供款抵扣 + 合资格取款免税）
2. **非首次购房者**：只用 RRSP
3. **预期未来收入更高**：考虑保留部分 RRSP 额度，未来高税阶年份再抵扣（P1 增加策略切换器后可显式选择）
4. **预期未来收入更低（如退休/转行）**：尽量当年抵扣

---

## 7. 特殊情况清单

| 情况 | 处理方式 |
|---|---|
| 领了 EI | 计入应税收入；若净收入 > $82,125（2025）触发 clawback（产假 EI 除外）（TICKET-027 修正门槛） |
| 自雇 | 净收入计入 Earned Income；交双倍 CPP；通常欠税多；**不符合 Ontario LIFT**（TICKET-028） |
| 持有美股 | 股息 100% 计入；申报 Foreign Tax Credit；提醒 RRSP 放美股免预扣 |
| 卖股票赚钱 | 资本利得 × 50% 计入 |
| 卖股票亏损 | 只能抵资本利得，不抵其他收入；可结转 |
| Quebec 居民 | 单独算 Quebec 税；联邦税享 16.5% abatement |
| 配偶收入差异大 | 提示 Spousal RRSP 选项 |
| 准备买首套房 | FHSA 优先，HBP 可同时用 |
| 学生 / 低收入 | 提示当年不抵扣，结转到高收入年 |
| 高收入（>$177K） | BPA 有 phase-out；提醒 OAS 未来 clawback |
| 已参加公司 Pension | 提醒 RRSP 额度受 PA 影响，需查 CRA Notice |
| 当年搬家、新生儿、医疗大支出 | 提示对应扣除/抵免，不属本工具但应链接说明 |

---

## 8. 已知限制与免责

- 本工具为**估算**，最终税额以 CRA 评估为准
- 不处理：信托收入、海外资产申报（T1135）、加密货币、特定行业（农业、渔业）扣除
- 税法每年变化，需有"年度数据更新"机制
- 建议用户咨询 CPA 或 RCFP 做高级税务筹划

---

## 附录 A：关键数字

| 项目 | 2024 | 2025 |
|---|---|---|
| 联邦 BPA（base） | $15,705 | $16,129 |
| 联邦 BPA（phase-out 起点） | $173,205 | $177,882 |
| 联邦 BPA（phase-out 终点 → 最小值） | $246,752 → $14,156 | $253,414 → $14,538 |
| Canada Employment Amount | $1,433 | $1,471 |
| RRSP 最高限额 | $31,560 | $32,490 |
| FHSA 年限额 | $8,000 | $8,000 |
| FHSA 终身限额 | $40,000 | $40,000 |
| HBP 最高借款额 | $60,000 | $60,000 |
| EI Clawback 门槛 | $79,000 | $82,125 |
| OAS Clawback 门槛 | ~$90,997 | ~$93,454 |
| BC BPA | $12,580 | $12,932 |
| Ontario BPA | $12,399 | $12,747 |
| Quebec BPA | $18,056 | $18,571 |
| Quebec Abatement 率 | 16.5% | 16.5% |
| Ontario Surtax 门槛（20%） | $5,554 | $5,710 |
| Ontario Surtax 门槛（36%，累加） | $7,108 | $7,307 |
| CPP 基础税率 | 4.95% | 4.95% |
| CPP 增强税率（CPP1） | 1% | 1% |
| CPP 基本豁免额 | $3,500 | $3,500 |
| CPP YMPE（CPP 上限） | $68,500 | $71,300 |
| CPP YAMPE（CPP2 上限） | $73,200 | $81,200 |

**全年不变项：**
| 项目 | 数值 |
|---|---|
| 资本利得 Inclusion Rate | 50% |
| 合资格股息 Gross-up | 1.38 |
| 非合资格股息 Gross-up | 1.15 |
| 联邦合资格股息抵免率 | 15.0198% |
| 联邦非合资格股息抵免率 | 9.0301% |
| BC 合资格 DTC（省级，of grossed-up） | 12.0%（2019+） |
| BC 非合资格 DTC（省级，of grossed-up） | **1.96%**（2019+；TICKET-024 修复） |
| Ontario 合资格 DTC（省级，of grossed-up） | 10.0%（2019+） |
| Ontario 非合资格 DTC（省级，of grossed-up） | **2.9863%**（2020–2026；2018/2019 = 3.2863%，2027+ = 1.9863%；TICKET-025 修复） |
| Quebec 合资格 DTC（省级，of grossed-up） | 11.70%（2024–2025） |
| Quebec 非合资格 DTC（省级，of grossed-up） | 3.42%（2024–2025） |
| BC Sales Tax Credit（退还性，Form BC479 → T1 line 47900） | 单身：满额 **$75**；净收入 > $15,000 部分每 $1 减 $0.02；净收入 ≥ $18,750 完全归零；按整数美元四舍五入（TICKET-026 新增，2013 年至今参数未变） |

**Ontario Health Premium 分段表：** 2024 和 2025 相同，见 §1.4。

*这些数字每年由 CRA 调整，工具通过 `src/lib/tax/data/{year}/` 下的 JSON 配置管理，便于年度更新。每加一年只需新增一个目录 + 在 `data/index.ts` 注册。*
