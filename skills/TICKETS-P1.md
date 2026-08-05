# Tax Calculator — Tickets (P1)

> P1 阶段的 ticket 跟踪。在 **Active** 区添加新 ticket，Claude 处理完会移到 **Done**（默认折叠）。
> **范围说明：** 本文件只记录"有问题需要改"或"P1 范围内的新功能 ticket"；新功能范围决策记录在 `feature-list.md`。
> P0 历史归档见 `TICKETS-P0.md`。

---

## 怎么添加 ticket

复制下面模板，粘到 **🔵 Active** 区域：

```markdown
### TICKET-XXX: 简短标题
- **Status:** Todo
- **Description:**
  - 在哪里发现的：文件 / 页面 / 功能
  - 期望行为 vs 实际行为
  - 复现步骤（如果是 bug）
  - 其他备注（截图链接、相关 ticket 等）
```

**Status 可选值：** `Todo` / `In Progress` / `Done` / `Blocked`
**编号规则：** 顺序递增，不复用。P1 从 TICKET-010 开始。

---

## 🔵 Active

> 待处理 + 进行中的 ticket。Claude 按 ID 顺序处理；如要插队，把优先项放最上面并说明。

### TICKET-028: ON LIFT credit 误用于自雇收入（应仅限 T4 就业收入）
- **Status:** Done
- **Completed:** 2026-06-07
- **发现方式:** D12 WS 对账（ON 纯自雇 $60K + 非合资格股息 $5K）。高额 RRSP 供款($15K/$20K/$30K)时出现差异：WS 高于工具 $159/$409/$651。差额精确等于引擎错误发放的 LIFT credit。
- **根本原因:** `calculator.ts` 调用 `calculateLIFT()` 时传入 `incomeBreak.earnedIncome`（含自雇），但 ON LIFT 明确要求"employment income as shown on your T4 slips" ≥ $3,000。纯自雇人员不满足 LIFT 资格。
- **改动内容:** `calculator.ts` 第92行：将 LIFT 的 `earnedIncome` 参数从 `incomeBreak.earnedIncome`（含 SE）改为 `incomeBreak.employmentIncome`（仅 T4）。
- **影响范围:** ON 省 + 纯自雇或低 T4（< $3,000）+ RRSP 供款后 net income 落在 LIFT 生效区间（$32,500–$50,000）。典型场景：自由职业者用大额 RRSP 压低 net income 时，工具多给了不应有的 LIFT（最多 $875）。T4 就业者不受影响。
- **验证:** 修正后 D12 三档差异 ($159/$409/$651) 全部消除，与 WS 分文不差。D7（T4 $45K, LIFT=$63.75）回归正常。100/100 引擎断言通过 ✓

### TICKET-029: Quebec 省支持（税阶 + abatement + DTC）
- **Status:** Done
- **Completed:** 2026-06-08
- **Description:**
  - 新增 Quebec 省完整税务计算支持（2024 + 2025 两年）
  - **实现内容：**
    - QC 4 档省税阶（14% / 19% / 24% / 25.75%）
    - QC BPA（2025: $18,571 / 2024: $18,056）
    - 联邦 Quebec Abatement（16.5%）：Basic Federal Tax × 16.5% 减免（T1 line 44000）
    - QC 省级股息税收抵免（合资格 11.70%、非合资格 3.42%，基于 grossed-up 金额）
    - 边际税率调整：联邦边际 × 0.835 + QC 省边际
  - **改动文件：**
    - `src/lib/tax/data/2024/qc.json` — 新建，QC 2024 税务数据
    - `src/lib/tax/data/2025/qc.json` — 新建，QC 2025 税务数据
    - `src/lib/tax/data/index.ts` — 注册 QC 2024/2025 配置
    - `src/lib/tax/types.ts` — `ProvincialTaxConfig` 加 `federalAbatementRate?: number`；`TaxBreakdown` 加 `federalAbatement: number`
    - `src/lib/tax/calculator.ts` — 实现 abatement 逻辑 + 调整边际税率
    - `src/i18n/messages.ts` — 添加 QC 省名（en/zh）
    - `src/lib/tax/__tests__/quebec.test.ts` — 新建，13 项测试断言
  - **更新（2026-06-08）：** QPP/QPIP/魁省 EI 已完整建模（QPP 6.40%、QPIP 0.494%、QC EI 1.31%），并实现增强 QPP 在 TP-1 Line 248 的魁省端扣除。**已知限制收窄为仅 QPP2（第二附加）未建模**（见新 TICKET 下方）。
  - **WS 比对（2026-06-30）：** QC1（$80K + RRSP 变额）、QC2（$50K + RRSP 变额）已与 WS + TurboTax 三方对齐。**踩坑记录：** WS 的 Line 248 只读 RL-1 **Box B.A**（= T4 Box 17 全额），不读 T4 Box 17 本身；Box B 留空会漏算增强扣除。QC3–QC7 待 WS 比对。
  - **🐛 修复（2026-06-30）：RAMQ 药险费收入测试。** 原 `drugInsurancePremium` 按固定 $755 计，不论收入。改为收入测试：魁省净收入（line 275）≤ 豁免阈值（2025 $19,890 / 2024 $18,910）→ $0，否则封顶（$755 / $731）。新增配置 `drugInsurancePremiumExemption`。单人结构上是悬崖（豁免阈值 = 封顶门槛）。改动文件：`types.ts`、`calculator.ts`、`data/2024|2025/qc.json`、`data/index.ts`。验证：QC2 RRSP $0/$2K/$2,086/$10K/$20K/$30K/$33,406 全部与 WS 对齐。
  - **验证：** 编译后 Node.js 运行 .test.ts 断言全通过。tsc --noEmit 通过。3 省（BC/ON/QC）跨省对比验证 abatement 仅对 QC 生效。

### TICKET-030: QPP2 / CPP2（第二附加供款）输入与扣除 ✅ 已完成
- **状态：** ✅ **引擎 + UI 均已完成，并经 Wealthsimple 实测验证**（2026-07-19）
- **✅ 受雇端实测（QC3，$120K，2025）：**

  | 状态 | WS | 引擎 |
  |---|---:|---:|
  | 不填 Box 17A / B.B | 补 $1,487 | 补 $1,487.44 ✓ |
  | 填 **$396** | 补 **$1,306** | 补 **$1,306.43** ✓ |

  差额 **$181.01** = $396 扣除在该税档（combined 边际约 45.7%）的价值。**两个状态都吻合，受雇端 QPP2 验证通过。**
- **✅ UI 已补齐（原待办项）：** `StepEmployment.tsx` 增加输入框，**仅当 Box 26 可计养老金收入 > YMPE 时显示**（低于第一上限时真实单据上该框本就是空的）。魁省显示「QPP 第二附加供款（Box 17A / RL-1 Box B.B）」，非魁省显示「CPP 第二附加供款（Box 16A）」，中英帮助文案齐备。
- **参数（已核实）：** YAMPE **2024 = $73,200 / 2025 = $81,200**；费率 **4%**（自雇 8%）。上限供款：受雇 **2024 $188 / 2025 $396**，自雇翻倍。CPP 与 QPP 数值相同，故存在联邦 config 供两者共用。
- **税务处理：** CPP2/QPP2 **全额可扣除**（联邦 line 22215 / TP-1 line 248），**不可抵免**——与基础供款（可抵免）不同。
- **实现：**
  - `types.ts`：`FederalTaxConfig` 增 `cppYAMPE` / `cpp2Rate`；`EmploymentIncome` 增 `cpp2Contribution?`（T4 Box 16A/17A、RL-1 Box B.B）。
  - `data/{2024,2025}/federal.json` + `data/index.ts`：填入并接线。
  - `income.ts`：新增 `calculateCpp2()`；受雇端把 `cpp2Contribution` 计入 `cppContributionEnhanced`（扣除桶），**不碰抵免基数**；自雇端按双倍费率自动计算。
- **⚠️ 设计取舍（重要）：** 受雇端**不从 gross 自动推算** CPP2，只认 slip 上的 `cpp2Contribution`，缺省为 0。
  - **理由：** QC1/QC3/QC4 当初是在 WS 里**留空 Box B.B/17A** 与引擎对齐并通过验证的。若改成自动推算，这三个已验基准会全部失效、需重测。真实 T4 在超过 YMPE 时必定带 Box 16A/17A，故要求显式输入是合理的。
  - **代价：** 走 UI 的用户若不填该框，高收入会**少扣** CPP2（2025 最多 $396 的扣除）。
  - **若要改为自动推算：** 把 `income.ts` 里 `emp.cpp2Contribution ?? 0` 换回 `?? calculateCpp2(pensionable, federalConfig, false)`，然后**必须重测 QC1/QC3/QC4**（在 WS 里填上 Box B.B）。
- **📌 2026-07-19 首次验证尝试失败（非引擎问题，是 WS 输入没进去）——排查过程留档：**
  - **坑 1：** WS 报表里残留了 **$1,500 RRSP 供款**（line 20800/214），与工具的 $0 baseline 相差 $685。喂同样输入后引擎 = WS = **补 $801.79**，分毫不差——**证明引擎无误**。
  - **坑 2：** **Box B.B 未生效**。导出的 line 22215 只有 **$678**（= 第一附加 $678，无 QPP2），T4/RL-1 表里也没有 B.B 行。推测因 **Box 26 填了 $71,300（YMPE）**，WS 据此判定无超过第一上限的收入，拒绝接受 QPP2。
  - **解决方法（已验证有效）：** Box 26 改 **$81,200（YAMPE）**、**T4 Box 17A 与 RL-1 Box B.B 两个都填 $396**（只填 B.B 会因 T4/RL-1 交叉校验不一致而报错）、RRSP 清 **0**。
  - **结果：** WS 补 $1,306，引擎 $1,306.43 ✓ 验证通过。
  - **教训：** WS 会交叉校验 T4 与 RL-1，QPP2 必须两张表配对填写；且 Box 26 若填 YMPE 上限，WS 会判定无第二段收入而拒收 B.B。
- **回归测试：** `quebec.test.ts` "QPP2 / CPP2"（不自动推算 / 可扣除性 / 自雇双倍 / 低于 YMPE 不触发）。

### TICKET-031: 自雇 QPIP（魁省父母保险）未计入 payable 🐛
- **状态：** 🔧 修复中（2026-07-19，QC7 测试发现）
- **Bug：** 引擎对自雇的 QC 居民计算了 QPIP 保费（`calculateSelfEmploymentQpip` = 净收入 × 0.878%），但只把它当作**非退还抵免**（并入 `ppipPremium`），**未加入 `refundOrOwing` 的 payable**。自雇 QPIP 与自雇 QPP 一样，是报税时须**缴纳**的一笔（TP-1），因此引擎的欠税**少算了这一笔**。
- **影响：** 仅**纯自雇的 QC 居民**（QC7）。$50K 自雇 → 少算 QPIP payable = 50,000 × 0.878% = **$439**，引擎欠税比 TurboTax 低 ~$439。受雇 QPIP（T4 Box 55）是雇主已代扣，只作抵免、**不**是 payable，故此修复只针对自雇部分。
- **修复（第一部分，已完成 2026-07-19）：** `income.ts` 新增 `selfEmploymentQpipPayable`（= 自雇 QPIP），`calculator.ts` 在 `refundOrOwing` 中与 `cppPayable` 一并扣减。改动：`income.ts`、`calculator.ts`、`types.ts`。重编译后 QC7 欠税 $13,952.46 → **$14,391.46**（+$439）。
- **✅ 第二部分（2026-07-19 已修）：** 自雇 QPIP 的税务减免不是「全额抵免」，而是**拆成扣除 + 抵免**。依 **CRA Schedule 10**：
  - **联邦 line 22300（扣除）= 保费 × 43.736%** → $439 × 43.736% = **$192.00**
  - **联邦 line 31215（抵免）= 保费 × 56.264%** → **$247.00**
  - 关键洞察：**43.736% 不是魔数**，它正好 = 1 − `qpipEmployeeRate`/`qpipSelfEmployedRate` = 1 − 0.494/0.878。即「雇员那半」可抵免、「雇主那半」可扣除，与自雇 QPP 的处理完全对称。故代码**从 config 推导**该比例，费率变了也不会失效。
  - **改动：** `income.ts` 新增 `selfEmploymentQpipDeduction` 并按上述比例拆分（原先全额进 `ppipPremium`）；`calculator.ts` 把它并入 `deductionsBeforeSBR`。
  - **效果：** QC7 baseline 净收入 $46,559 → **$46,367**（−$192）；应补 $14,391.46 → **$14,364.58**（−$26.88）。降幅全部来自魁省侧（$192 × 14%），联邦侧净额不变——因为该收入落在联邦最低档 14.5%，而抵免率同为 14.5%，扣除与抵免等价。
- **⚠️ 残留不确定性（待 QC7 实测）：** 43.736% 是**联邦** Schedule 10 的规定。**魁省 TP-1 line 248 是否同比例、还是全额 $439 可扣，未找到权威来源。** 引擎现两边共用同一拆分。判据：若 WS 魁省侧比引擎少收 **~$34.58**（= $247 × 14%），则魁省为全额扣除，需给魁省单独的扣除额。

### TICKET-037: 优化器推荐超过实际拐点，浪费供款额度 ✅ 已修
- **状态：** ✅ **已修复**（2026-07-19）— 用户在 QC8 上发现
- **修复方式：** `optimizer.ts` 新增 `findDiminishingReturnPoint()`，对 `refundOrOwing` 做二分搜索找出「达到同样结果的最小供款额」，并在 `optimize()` 里**对所有策略统一施加**（放在 solver 之后、`splitContribution` 之前，因此将来新增策略也自动受保护）。被收窄时策略标记为 `diminishing_returns_capped`，配套中英文案说明剩余部分是 CPP/QPP、EI、QPIP、健康供款等无法用扣除减少的项目。
- **效果（税额零变化，仅推荐值收窄）：**

  | Case | 修复前推荐 | 修复后 | 结果 | 省下额度 |
  |---|---:|---:|---|---:|
  | QC8 自雇 $25K（max_refund）| $7,184 | **$5,900** | 同为补 $3,023.33 | $1,284 |
  | QC8 自雇 $25K（zero_owing）| 全部 room | **$5,900** | 同上 | 可达 $94,100 |
  | QC7 自雇 $50K | $30,238 | **$27,480** | 同为补 $6,541.00 | $2,758 |
  | QC6 2024 $60K | $43,730 | **$39,999** | 同为退 $13,000.00 | $3,731 |
  | QC4 / QC5 / ON | 用满 room | **不变** | — | 护栏未误伤 |

- **验证：** 全部 WS 已验证点（QC4–QC8 共 17 个）税额**零变化**；全项目类型检查通过。
- **回归测试：** `optimizer.test.ts` "边际收益归零护栏"（拐点稳定 / 结果等同供满 room / 少供会变差即没砍过头 / 受雇场景不误伤）。
- **补充说明：** 二分搜索收敛到分（`hi - lo > 0.01`），否则不同策略的起始上界会导致推荐值相差 $1。

---

<details><summary>原始问题记录</summary>

- **发现时状态：** 待办（P1）— 2026-07-19 用户在 QC8 上发现
- **场景：** QC8（自雇 $25,000，room $35,000）。用户问「为什么退税最大化只推荐七千多，room 还剩三万多没用？」——查下去发现推荐的**七千多本身也超了**。
- **Bug A —— `max_refund` 的 BPA 封顶算漏了其他抵免：**
  - 现规则：供到**应税收入 = 联邦 BPA** 为止 → $23,313 − $16,129 = **$7,184**（`strategy: "max_refund_bpa_capped"`）
  - 实际拐点：联邦税在 **RRSP $5,900** 就已归零。因为抵免基数不止 BPA，还有 **QPP 抵免 $1,161 + QPIP 抵免 $123.50 = $1,284.50**
  - 实跑：$5,900 与 $7,184 的应补**同为 $3,023.33**，后 $1,284 供款**省 $0**
  - **正确封顶应是** `联邦抵免总额 ÷ 最低档税率`（本例 $2,524.96 ÷ 14.5% = $17,413.5 应税收入），而非单看 BPA。差额正好 = 非 BPA 的抵免基数。
- **Bug B（更严重）—— `zero_owing` 在无法归零时推荐用光全部 room：**
  - 该 case 永远归不了零（QPP payable 等无法被 RRSP 抵消），策略 fall through 到 `room_capped`，于是**推荐把 room 全部供满**。测到 room = $100,000 它就推荐 $100,000，而 $5,900 之后**收益完全为零**。
  - 这是**有害建议**：白白永久消耗供款额度。应改为「取 min(room, 边际收益归零的点)」。
- **根因共性：** 两个策略都没有「边际收益为零就停」的通用护栏。建议加一个统一的 `findDiminishingReturnPoint()`，所有策略的推荐值都先过这一层。
- **影响面：** 任何「RRSP 无法把应补降到零」的情形——**自雇者尤其典型**（QPP/QPIP/HSF 均不可抵扣），低收入受雇者也会遇到。
- **不影响正确性：** 税额计算本身没错，纯粹是推荐值不够优。已验证的 QC1–QC8 税额结论不受影响。

</details>
- **状态：** ✅ **已修并经 Wealthsimple QC7 验证**（2026-07-19）
- **Bug：** `calculator.ts` 把工人扣除的上限卡在 `incomeBreak.employmentIncome`。纯自雇者 `employmentIncome = 0` → **完全拿不到这笔扣除**。
- **正解：** 「déduction pour travailleur」的基数是**合资格工作收入 = 受雇收入 + 自雇净收入**。WS 实测：纯自雇 $50,000 照样拿满 **$1,420**（2025）。
- **影响：** 自雇的魁省居民被多算魁省税 = 扣除额 × 魁省税率。QC7 实测多算 **$198.80**（$1,420 × 14%）。收入越高影响越大（19%/24% 档）。
- **修复：** 改用 `incomeBreak.earnedIncome`（= 受雇 gross + 自雇净收入，语义正好对应）。
- **验证：** QC7 魁省 line 275 = $44,947、line 401 = **$6,292.58**，与 WS 分毫不差。

### TICKET-036: 缺魁省健康服务基金供款（TP-1 line 446）🐛 ✅ 已修
- **状态：** ✅ **已修并经 Wealthsimple QC7 验证**（2026-07-19）
- **Bug：** 引擎完全没有 line 446（Schedule F），自雇/投资收入者**少算**这笔供款。
- **规则：** 基数 = **总收入 − 受雇收入**（受雇收入已源头扣缴，不计入）。分段：
  - 基数 ≤ 门槛1 → **$0**
  - 门槛1 < 基数 ≤ 门槛2 → `min($150, 1% × (基数 − 门槛1))`
  - 基数 > 门槛2 → `min($1,000, $150 + 1% × (基数 − 门槛2))`
- **✅ 已用 QC8 校准门槛（2026-07-19）：** 自雇 $25,000 → WS line 446 = **$51.83** → 反解 **门槛1(2025) = $25,000 − $5,183 = $19,817**。
- **🔍 基数定义的关键证据（差点搞错）：** 曾一度改成「净收入」为基数（因为反解出的 $18,130 更接近官方公布的 2026 门槛 $18,500）。**但 QC7 的 RRSP $30,238 那个点证伪了它** —— 该点净收入只剩 $16,129，低于任何合理门槛，若按净收入算 HSF 应为 $0，而 **WS 实收 $150**。故**基数是毛额（总收入 − 受雇收入），RRSP 等扣除不减少它**。已写成回归测试。
- **为何不影响既有案例：** QC1~QC4/QC6 纯受雇 → 基数 $0；QC5 基数仅股息 $6,900 < 门槛1 → $0。**均与 WS 一致**（QC5 的 WS 汇总确实没有 line 446）。
- **✅ 基数定义与两个门槛均已由 QC9 定案（2026-07-19）：** 自雇 $80,000 的 WS line 446 = **$259.20**，用它区分了此前并存的两种读法：

  | 模型 | 基数 | 反解 门槛1 | 反解 门槛2 |
  |---|---|---:|---:|
  | A 毛额 | $80,000 | $19,817 | $69,080 |
  | **C 毛额减自雇供款扣除** ✅ | **$73,979.60** | **$18,130** | **$63,060** |

  - **判定依据（两条独立证据同向）：** ① 模型 C 的两个门槛**都是整数**，模型 A 的 $19,817 不是；② 与官方公布的 2026 值（$18,500 / $64,355）相比，C 的比值为 **1.0204 / 1.0205** —— 两者几乎完全一致，正好是一年的通胀调整；模型 A 则意味着门槛**逐年下降** 6.6%，不合常理。
  - **最终实现：** 基数 = **总收入 − 受雇收入 − 自雇供款扣除**（= TP-1 line 248 中归属于自雇的部分）。**RRSP 等一般性扣除不减少基数** —— 此点由 QC7 @ RRSP $30,238 独立证明（净收入已跌到 $16,129，WS 仍收满 $150）。
  - **2025 门槛：** $18,130 / $63,060（均已实测校准）。
  - **⚠️ 2024 门槛（$17,765 / $61,800）仍为按 2.04% 通胀反推的估计**，无 2024 自雇实测点。影响面小（需 2024 年度 + 自雇/投资收入且落在爬坡段）。
- **实现细节：** `income.ts` 新增 `selfEmploymentContributionDeduction` 单独累计自雇供款扣除（QPP base + enhanced + CPP2 + QPIP 可扣部分），供 HSF 基数使用；不能直接用 `netIncome`，否则 RRSP 会错误地减少基数。

### TICKET-032: RAMQ 2024 保费上限值错误（$731 → $737.50）✅ 已修
- **状态：** ✅ **已修复并经 Wealthsimple 实测逐行验证**（2026-07-19，QC6 发现）
- **Bug：** `data/2024/qc.json` 的 `drugInsurancePremium` 填了 **$731** —— 那是 **2023-07-01~2024-06-30** 费率期的上限，**不是 2024 报税年度**的值。
- **根因（重要）：** **RAMQ 费率每年 7 月 1 日调整**，一个报税年度横跨两个费率期，年度上限须取两个半年的**均值**：
  - 2024 = ($731 + $744) / 2 = **$737.50** ← 原填 $731，错
  - 2025 = ($744 + $766) / 2 = **$755.00** ← 本来就对，所以 QC5 一直吻合
- **影响：** 仅 2024 年度 QC 用户，少算 **$6.50**。
- **修复：** `data/2024/qc.json` → `"drugInsurancePremium": 737.50`。重编译后 QC6 baseline 退 $1,412.29 → **$1,405.79**，与 WS（Fed refund $2,056.90 − QC owing $651.11）**分毫不差**；魁省 line 450 也精确对上 **$6,651.11**。
- **教训：** 凡**年中调整**的费率（RAMQ 保费等）在 config 里都必须存**报税年度均值**，不可直接抄官网当期费率。其余年中调整项应一并复查。

### TICKET-034: RAMQ 保费「过线即满额」应改为分段爬坡 ✅ 已修
- **状态：** ✅ **已修复并经 Wealthsimple 四点实测校准**（2026-07-19，QC6 RRSP $35,000 发现）
- **Bug：** `calculator.ts` 原本只要 QC 净收入 > 豁免线就直接收**满额**保费（悬崖式）。真实 Schedule K 是**分两段费率爬坡后才封顶**。
- **影响：** 净收入落在 **$18,910 ~ 约$27,680**（2024）区间时高估保费，最多高估 **$465**。对 RRSP 优化器影响尤其大——**优化器推荐的供款额很容易正好把收入压进这个区间**。
- **实测校准点（WS 2024，同一张 QC6 slip，仅改 RRSP 扣除额）：**

  | RRSP | line 275 | 超出豁免线 | WS line 447 |
  |---:|---:|---:|---:|
  | 0 | 58,055 | 39,145 | 737.50（封顶）|
  | 30,000 | 28,055 | 9,145 | 737.50（封顶）|
  | 32,000 | 26,055 | 7,145 | **561.01**（第二段）|
  | 35,000 | 23,055 | 4,145 | **271.96**（第一段）|

- **修复：** `types.ts` 增 `drugInsurancePremiumRate1/Rate2/Tier1Band`；`calculator.ts` 改为 `min(max, 前$5,000×rate1 + 余额×rate2)`；`data/2024/qc.json` 填入校准值 rate1 = **6.56115%**、rate2 = **10.86003%**、band = $5,000。四点**全部精确吻合到分**。
- **✅ 2025 也已校准**（2026-07-19，QC5 报表两点）：

  | RRSP | line 275 | 超出 $19,890 | WS line 447 |
  |---:|---:|---:|---:|
  | 47,000 | 27,815 | 7,925 | **735.98**（第二段）|
  | 50,000 | 24,815 | 4,925 | **386.12**（第一段）|

  - 解出 rate1 = **7.84%**、rate2 = **11.76%**，且 **rate2 = 1.5 × rate1**，两者都是整数 → **几乎可确定是法定费率**。封顶点在净收入约 **$27,977**。
  - 对比之下 2024 反解出的 6.56115% / 10.86003%（比值 1.655）是碎数，**结构上可疑**——很可能 2024 的有效曲线因 7/1 费率切换而变成多折线，两段模型只是近似。**2024 的四个实测点仍精确命中，但点与点之间的形状可能有几元误差。** 若日后拿到 2024 法定费率应替换。
- **⚠️ 费率为实测反解，非法定公布值。** Revenu Québec / RAMQ 官网只公布保费上限，不公布分段百分比。
- **回归测试：** `quebec.test.ts` CASE 6b（2024 四点 + 豁免线归零 + 单调性/不超上限）、CASE 5b（2025 两点 + baseline 封顶）。

### TICKET-033: RAMQ 药物保险费缺少「已有私人保险」豁免开关 ✅ 已修
- **状态：** ✅ **已修复**（2026-07-19）— 分析 QC6 时发现（**并非** QC6 差异的原因）
- **Bug：** 引擎只要 QC 省应税收入 > 豁免线就无条件收保费，**没有任何输入可表达「本人已有私人（雇主）药物保险」**——现实中有私保者 RAMQ 保费 = **$0**（TP-1 Schedule K；WS 对应问题为 "Did you have basic prescription drug insurance through a group insurance plan?"）。
- **影响：** 受雇且有雇主药险的用户被**多算最高 $755/年**。这是影响面最广的一个——多数受雇者都有团体药保。（QC6/QC5 测试中用户答 "No"（无私保），保费本就该收，故不影响既有验证结论。）
- **修复：**
  - `types.ts`：`TaxInput` 增 `hasPrivateDrugCoverage?: boolean`，默认 `false`（= 公共 RAMQ 承保，收费），与 Schedule K 默认假设一致。
  - `calculator.ts`：为 true 时 `drugMax = 0`，保费直接归零（不受收入影响）。
  - `useFormStore.ts`：initialData 加该字段。
  - `StepBasicInfo.tsx`：**仅当省份 = QC 时**显示勾选项；`messages.ts` 加中英文案。
- **验证：** QC5 baseline 勾选前净退 $502.24 → 勾选后 **$1,257.24**，差额正好 **$755.00**；不传该字段时行为不变（无回归）；非魁省勾选无副作用。
- **回归测试：** `quebec.test.ts` "private drug coverage exemption"（收费/豁免/默认/非魁省 四条）。

### TICKET-038: T4 Box 22 被拆成两栏且都标「22」，用户可能把同一笔钱填两遍
- **状态：** ✅ **已修复**（2026-08-05）— 用户测试 Step 2 时发现
- **Bug：** 非魁省的 T4 卡片上同时有「已扣联邦税 (Box 22)」和「已扣省税 (Box 22)」两栏，徽章都是 22。看起来像标错了，实际上两个数字都没错——**T4 的 Box 22「Income tax deducted」本来就是联邦 + 省税的合计，魁省以外根本没有单独的省税框**（[CRA T4 slip](https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/tax-slips/understand-your-tax-slips/t4-slips/t4-statement-remuneration-paid.html)）。问题是把一个框拆成两栏呈现，用户很可能把 Box 22 全额在两栏各填一遍，导致预扣税翻倍、退税虚高。
- **修复：**
  - `StepEmployment.tsx`：非魁省只渲染一栏「已扣所得税 (Box 22)」。该栏**读**取 `federalTaxWithheld + provincialTaxWithheld` 之和，**写**回时全额进 `federalTaxWithheld` 并把 `provincialTaxWithheld` 清零——旧存档或从魁省切过来的残留值都会正确显示为总额，首次编辑即归一，不会凭空少一笔。
  - `useFormStore.ts`：sampleData 的 7000/3600 归并为 10600/0，总额不变，示例数据形状与新 UI 一致。
  - `messages.ts`：删除 `provincialTaxWithheld` / `provincialTaxWithheldHelp`（非魁省版），新增 `incomeTaxDeducted` + `Hint` + `Help`。
  - 字段计数 `t4Count` 改为 `5 + (isQC ? 1 : 0) + (hasCpp2 ? 1 : 0)`。
- **魁省不受影响：** QC 的 T4 Box 22 确实只含联邦税，省税在 RL-1 Box E，所以魁省保持双栏结构不动。
- **引擎无变化：** `calculator.ts` 一直是 `federalTaxWithheld + provincialTaxWithheld` 求和，合并前后计算结果完全相同。
- **验证：** 服务端渲染 ON / QC 两套界面逐字段比对——ON 只有一个 22 且显示 11000（= 7000 + 4000 折叠值），QC 保持 T4 Box 22 + Box 55 + RL-1 Box E + B.B 共 7 项。tsc 0 error。

### TICKET-039: Other income 各栏丢失框号；无框号的栏输入框未左对齐
- **状态：** ✅ **已修复**（2026-08-05）— 用户测试时发现「这几个框我不知道该填什么」
- **Bug（两个）：**
  1. `amountField()` 调了 `splitBoxRef(rawLabel)` 拿到框号，却只用了 `.name`，**把 `boxNo` 直接丢弃**。于是标签里的「(T5 Box 13)」被剥掉，徽章也不渲染，框号信息整个消失。T4 卡片走的是 `slipField()`，有传 `boxNo`，所以只有 Other income 受影响。
  2. `splitBoxRef` 用 `tag.replace(/Box\s*/gi,"").split("/")[0]` 解析，遇到「T5 Box 13」会得出 `"T5 13"`——5 个字符塞不进 54px 徽章。
- **修复：**
  - `splitBoxRef` 改为 `tag.match(/Box\s*([A-Za-z0-9.]+)/i)?.[1]`，只取第一个框号：「T5 Box 13」→ `13`，「Box 17A / RL-1 Box B.B」→ `17A`，「Schedule 3」「T2125」→ 无框号（不臆造）。
  - `amountField` 把 `boxNo` 传给 `BoxField`。现在 EI 14 / 22、利息 13、合格股息 24、非合格股息 10 都有徽章。
  - **无框号的字段**（自雇两栏、资本利得、资本损失）先试过留等宽占位对齐，用户实测后要求改为**输入框占满整列**、左边缘与标签和提示文字齐平；`reserveBox` 逻辑随之删除。
- **为什么资本利得没有框号：** 它是 Schedule 3 的汇总数，可由 T5 框 18（资本利得股息）、T3 框 21、T5008 及自行出售记录合并而来，标任何单一框号都会误导。这一点已写进该栏的长解释。
- **验证：** 渲染检查逐字段打印徽章——4 个 `full`（无徽章、全宽），其余带正确框号，无重复。

### TICKET-040: 字段说明藏在 hover tooltip 里，等于不存在
- **状态：** ✅ **已修复**（2026-08-05）— 用户以第一用户身份测试时反馈「我自己都不会填，那用户也不会填」
- **根本原因（回归）：** 早期的 `FieldRow.tsx` 把 help 渲染成标签下方一行常驻小字（`<p className="text-label text-ink-muted mt-0.5">`）。改版换成 `BoxField` 后，同一个 `help` 变成了 `title={help}` ——浏览器原生 tooltip：需悬停约 1 秒才出现、鼠标移开即消失、**触摸屏完全无法触发**。这一页写了 12 条说明文案，改版后一条都看不见。`FieldRow.tsx` 至今仍在仓库里（标注 SUPERSEDED、无人引用），是这次定位问题的直接证据。
- **修复 —— 说明分两层：**
  - **`hint`（常驻）**：每个输入框下方一行灰字，只回答「这个数从哪张单据的哪个框抄」和「没有就留 0」。共 25 条，中英双语。
  - **`help`（按需）**：原有长解释全部保留，改由标签旁一个 `<button>` 圆形「?」触发，就地展开。带 `aria-expanded` / `aria-controls`，触摸、键盘、读屏均可用。
  - `CollapsibleCard.tsx` 的 `CollapsibleRow` 新增 `subtitle`，**折叠状态下也显示**，让用户在展开前就知道这一节是否与自己有关（例：「今年领过失业金才填——失业、病假、产假或育儿假。Service Canada 会寄给你一张 T4E 单据」）。
- **文案依据：** 每条 hint 涉及的框号 / 行号均已向 CRA 官方页面核实——[T5](https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/tax-slips/understand-your-tax-slips/t5-slips/t5-statement-investment-income-slip-information-individuals.html)（框 10/11/12、13、18、24/25/26）、[T4E](https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/tax-slips/understand-your-tax-slips/t4-slips/t4e-statement-employment-insurance-other-benefits.html)（框 14、22）、[T2125 Part 5](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/report-business-income-expenses/completing-form-t2125/net-income-loss-section-form-t2125.html)（line 9946）、[T5008](https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/tax-slips/understand-your-tax-slips/t5-slips/t5008-statement-securities-transactions-slip-information-individuals.html)。
  - 顺带在合格 / 非合格股息的 hint 里写明「框 25、26 不用管，我们会算」——回应用户对 Wealthsimple 逐框抄写界面的疑问：WS 是正式报税产品需原样上报，本工具只收实际金额、自行做上调与抵免。
- **验证：** 渲染检查确认 ON / QC 每个字段的 hint 均已输出（无一条 MISSING）；新增 `__keys_check.ts` 校验 i18n 中英 key 对齐——191 : 191，无缺失、无空串。

### TICKET-041: 自雇净收入要求用户自己做减法
- **状态：** ✅ **已修复**（2026-08-05）— 修 TICKET-040 时顺带发现
- **问题：** 「自雇净收入」一栏要求用户自行计算 `总收入 − 经营支出` 后填入。这是全页唯一要求用户做算术的地方，与产品原则「用户不需要做任何计算」冲突，且算错无从校验。
- **修复：**
  - `types.ts`：`IncomeInput.selfEmployment` 由 `{ netIncome }` 扩展为 `{ netIncome, grossIncome?, expenses? }`。`netIncome`（T2125 line 9946）仍是引擎唯一读取的字段；另两个只为让存档重新打开时两栏都还在。
  - `StepEmployment.tsx`：改收「生意收进来的钱」+「经营支出」两栏，下方以 sunken 条实时显示算出的净收入。支出大于收入时追加一句说明，讲清经营亏损是允许的、会相应减少总收入。
  - **向后兼容：** 旧存档只有 `netIncome` 时，回退显示为「总收入 = netIncome、支出 = 0」，净额不变，不丢数据。
- **引擎无变化：** `income.ts` / `calculator.ts` 读的仍是 `netIncome`；`calculateSelfEmploymentCpp` 对 `netIncome <= 0` 已有 early return，亏损场景无需额外处理。
- **验证：** 渲染检查确认旧形状 `{ netIncome: 12000 }` 正确迁移为 总收入 12000 / 支出 0 / 净额 12000。

### TICKET-042: header 滚动时消失
- **状态：** ✅ **已完成**（2026-08-05）— 用户要求
- **改动：** `page.tsx` 的 `<header>` 加 `sticky top-0 z-40`。
  - 用 `sticky` 而非 `fixed`：元素仍在文档流内，下方 `<main>` 无需补偿性 padding，首屏也不会有内容被压在栏下。
  - 背景 `bg-surface` 不透明 + `border-b border-line`，内容滚过时分隔清晰。
  - 小屏 `py-5 → py-3`：固定栏全程占用视口，原 84px 在手机上过重。
  - 全站唯一 z-index（`Progress` 的圆点是自身层叠上下文内的 `z-10`），无冲突；`html`/`body` 及祖先均无 `overflow` 裁剪，`sticky` 生效。
- **未做：** 进度条仍随页面滚动（用户明确表示这轮不改）。

---

## ✅ Done（新增）

### TICKET-027: EI clawback threshold 配置错误（2024/2025 均差一年）
- **Status:** Done
- **Completed:** 2026-06-07
- **发现方式:** D8 WS 对账（ON $75K + EI $6K + cap gains $12K）。WS owing $2,780 vs 工具 $4,337，差 $1,557。分析 WS 导出后发现 EI clawback = $1,338 vs 工具 $1,800。逆推 $1,338 / 0.30 = $4,460 excess → threshold = $82,125，而非配置中的 $79,000。
- **根本原因:** `federal.json` 中 `eiClawbackThreshold` 的值落后一年。EI clawback threshold = 1.25 × 当年 Maximum Insurable Earnings (MIE)：
  - 2023: MIE=$61,500 → threshold=$76,875
  - 2024: MIE=$63,200 → threshold=$79,000（我们错填了 $76,875）
  - 2025: MIE=$65,700 → threshold=$82,125（我们错填了 $79,000）
- **改动内容:**
  - `data/2025/federal.json`: `eiClawbackThreshold` 79000 → **82125**
  - `data/2024/federal.json`: `eiClawbackThreshold` 76875 → **79000**
  - `clawbacks.ts`: 注释中的 threshold 数值更新
  - `dividend-cases.test.ts` + `run-dividend-tests.mjs`: D9 (CASE 9) 期望值更新（clawback $1,800→$1,259.10, noCap clawback $396.60→$0, owing $4,337.46→$3,956.94）
  - `clawbacks-selfemp.test.ts`: 注释中的 threshold 数值更新（断言值不变，因为测试输入远超 threshold）
  - `test-cases.md`: D8 期望值及说明全面更新
- **影响范围:** 任何有 EI 收入且 net income 在旧/新 threshold 之间（$79,000–$82,125）的用户，clawback 被多算。净收入远高于 $82,125 且 EI ≤ excess 的用户不受影响（如 D3: $90K+$8K EI, clawback 仍为 $2,400）
- **验证:** 修正后 engine 输出与 WS 完全吻合（$2,780.08，分文不差）。80/80 引擎断言全通过 ✓

### TICKET-026: BC Sales Tax Credit（退税性省级抵免）完全未实现 — 缺口约 $52–75
- **Status:** Done
- **Completed:** 2026-06-06
- **发现方式:** D5 WS 对账中，用户在大额 RRSP 供款（≥$33,406）时报告退税出现差异："$33,406: WS-refund $7,052，工具-refund $7,000" / "$35,000 / $41,000 / $43,000: WS-refund $7,075，工具-refund $7,000"。先用引擎探针证明 $7,000 的"平台期"在当前公式下数学上正确（一旦 `totalTax` 归零，`refundOrOwing` 不可能超过 `totalTaxWithheld + cppOverpayment`，这是公式的硬上限，不是 bug）；随后请用户上传 WS 详细分解 `Test D5-35000_Summary.xlsx`，在其中发现 **T1 line 47900 "Provincial or territorial refundable credits" = $75** — 正是缺失的那一块，且 `Total refundable credits = $7,000(预扣) + $75 = $7,075 = Refund` 完全对得上。
- **根本原因:** 引擎完全没有实现 **BC Sales Tax Credit**（通过 Form BC479 申报、退税性、汇总在 T1 line 47900 "Provincial or territorial refundable credits"）。这是一个仅在净收入很低（约 $15,000–$18,750 区间）时才会出现的 BC 省退税性抵免，因此此前所有测试用例的收入水平都没有触发它：
  - 单身报税者最高 **$75**（配偶/同居伴侣可再加 $75，且改用家庭净收入 $18,000 门槛 — 本引擎完全不建模婚姻状态，故该分支未实现）
  - 净收入超过 **$15,000** 后，按超出部分的 **2%** 逐步递减，至净收入 ≥ $18,750 时完全归零
  - 来源：[gov.bc.ca — Sales tax credit](https://www2.gov.bc.ca/gov/content/taxes/income-taxes/personal/credits/sales-tax)（"For 2013 and later years, you can claim up to $75 for yourself... reduced by 2% of your net income over $15,000"）
  - 用 **11 个 WS 数据点**（对应 contribution $0 ~ $43,000，净收入 $6,535 ~ $49,535）反推验证公式 `credit = max(0, $75 − 2% × max(0, 净收入 − $15,000))`，**11/11 完全吻合，0 误差**（详见验证小节）
- **改动内容:**
  - `types.ts`：新增 `RefundableCreditConfig` 接口（`maxAmount` / `phaseOutStart` / `phaseOutRate`）；`ProvincialTaxConfig` 加 `salesTaxCredit?: RefundableCreditConfig`；`TaxBreakdown` 加 `provincialRefundableCredits: number`
  - `provincial-tax.ts`：新增 `calculateRefundableSalesTaxCredit()` — 单身公式 `max(0, maxAmount − phaseOutRate × max(0, netIncome − phaseOutStart))`，并按 **CRA 整数取整惯例**（税表/附表上的金额一律四舍五入到整数美元）用 `Math.round()` 取整 — WS 在原始值 $52.42 处显示整数 $52，加入取整后吻合
  - `data/2025/bc.json` + `data/2024/bc.json`：加 `salesTaxCredit: { maxAmount: 75, phaseOutStart: 15000, phaseOutRate: 0.02 }`；`_salesTaxCreditSource` 注明来源、单身公式、未建模配偶分支、并标注 2024 年参数是按"2013 年起未变"推断套用、未独立用 2024 WS 数据验证（仅 2025 经过实证）
  - `data/index.ts`：BC 2024 / 2025 的 config 构建处补传 `salesTaxCredit: bcXXXX.salesTaxCredit`字段 — **这里发现了一个容易踩的坑**：`bc.json` 里加了字段不代表引擎会用到，因为 `data/index.ts` 是按字段名手动逐个搬运 raw JSON → `ProvincialTaxConfig` 的（不是整体 spread），漏传一个字段会导致 `config.salesTaxCredit` 永远是 `undefined`、credit 永远算出 0 而不报错（**第一轮验证探针就因此返回 0，排查后才定位到这一层**）。这个模式同样适用于 `liftCredit` / `surtaxes` / `healthPremium` 等字段，未来加新字段时务必检查 `data/index.ts` 里有没有同步搬运
  - `calculator.ts`：新增「8. 退税性省级抵免」步骤，计算 `provincialRefundableCredits`，并加入 `refundOrOwing` 公式（与 `cppOverpayment` 同级地位 — **退税性**抵免不像 LIFT / basicTaxReduction 那样只能把省税"抵减到零为止"，而是直接计入最终退税/补税金额，必须放在 `refundOrOwing = totalTaxWithheld + cppOverpayment + provincialRefundableCredits − totalTax − ...` 里，绝不能放进 `netProvincialTax` 的减项链）
- **影响范围:**
  - 仅影响 **BC 省 + 净收入落在约 $15,000–$18,750 区间** 的用户（典型场景：低收入人群，或用大额 RRSP/FHSA 供款把净收入压得很低的中高收入人群——D5 正是后者）
    - 净收入 < $15,000：缺口固定为 **$75**（已验证：contribution $35,000 / $41,000 / $43,000 三档）
    - 净收入介于 $15,000–$18,750：缺口按比例递减（已验证：contribution $33,406 档，净收入 $16,129 → 缺口 $52）
    - 净收入 ≥ $18,750：缺口 = $0，**完全不受影响**（已验证：contribution $0 / $1,200 / $19,800 / $20,000 等低供款档，此前用户报告的"Passed"不变）
  - **ON 等没有配置 `salesTaxCredit` 的省份完全不受影响** —— `config.salesTaxCredit` 为 `undefined` 时 `calculateRefundableSalesTaxCredit` 直接返回 0，是纯粹的 no-op，已用 ON 案例回归验证 `provincialRefundableCredits = 0` 且 `refundOrOwing` 数值不变
  - 修复方向：工具之前对落在该净收入区间的 BC 用户**少退**了这笔退税性抵免（最多 $75），导致显示退税比 WS/CRA 实际偏低。修复后准确，与 WS 完全一致
  - **范围很窄**：只在净收入恰好落在 ~$3,750 宽的窗口内才会触发，多数正常收入水平的用户不会遇到——这也是为什么 D1-D4 + 此前所有 BC 测试都未暴露这个缺口
- **验证:**
  - **公式反推**：用 11 个 WS 报告的 contribution→refund 数据点（$0/$1,200/$19,800/$20,000/$33,406/$35,000/$41,000/$43,000，覆盖净收入 $6,535–$49,535 全区间），代入 `max(0, $75 − 2%×max(0, netIncome−$15,000))` 逐一验证：**11/11 与 WS 完全吻合，0 误差**（脚本 `/tmp/bc_credit_check.py`）
  - **关键数据点**（来自上传的 `Test D5-35000_Summary.xlsx`，T1 line 47900）：contribution=$35,000 → 净收入 $14,535 → WS 显示信用 $75.00，`Total refundable credits = $7,075 = $7,000(预扣) + $75`，`Refund = $7,075`，与公式预测 $75.00 分毫不差
  - **修复后编译引擎重算**（`/tmp/d5_verify.mjs`，针对编译后的 `calculator.js`）：
    - contribution=$33,406（净收入 $16,129）→ 工具 `salesTaxCredit=$52.00`，`refund=$7,052.00` vs WS `$7,052` ✓ **完全吻合**（原始值 $52.42 经 `Math.round` 取整后与 WS 整数显示一致）
    - contribution=$35,000/$41,000/$43,000（净收入 $14,535/$8,535/$6,535，均 < $15,000）→ 工具 `salesTaxCredit=$75.00`，`refund=$7,075.00` vs WS `$7,075` ✓ **三档全部分文不差**
  - **边界连续性检查**：净收入 = $18,750.00 时 `salesTaxCredit` 恰好归零（理论上 $75 − 2%×$3,750 = $0）；$18,535 时 = $4.00（$75 − 2%×$3,535 = $4.30 → round → $4），与公式平滑过渡，无跳变
  - **ON 回归检查**：ON 2025 案例下 `provincialRefundableCredits = 0`，`refundOrOwing` 数值与修复前完全相同，证明对无该抵免的省份零副作用 ✓
  - **低净收入 BC 档位回归**（contribution $0/$1,200/$19,800/$20,000，净收入均 ≥ $29,535 > $18,750）：`salesTaxCredit = $0.00`，`refundOrOwing` 与修复前完全相同——此前用户报告的 "Passed" 结果不受影响、不会变成 "Failed" ✓
  - `run-dividend-tests.mjs` 全量回归：**38/38 assertions passed ✓**（exit code 0）
  - TypeScript 编译 **0 errors** ✓

### TICKET-025: ON surtax 计算顺序错误 + 非合资格股息 DTC 税率过期（2 个 bug 叠加，共 ~$33）
- **Status:** Done
- **Completed:** 2026-06-06
- **发现方式:** D3 WS 对账（ON 2025 T4 $90K + 非合资格股息 $3K + 资本利得 $10K）。用户报告 "WS-owing $2692，工具-owing $2659"，差 ~$33。上传 `Test D3_Summary.xlsx` 提供 WS 精确值核对：netProvincialTax = $6,597.20，owing = $2,691.56。
- **根本原因（两个独立 bug 叠加）:**
  1. **ON 非合资格股息 DTC 税率过期** — `ontario.json`（2024 + 2025）里 `dividendCreditRate.nonEligible = 0.032863`（3.2863%）是 **2018/2019 年的旧税率**。根据 [TaxTips.ca Ontario Dividend Tax Credit](https://www.taxtips.ca/ontax/dividend-tax-credit.htm)，**2020–2026 年正确税率是 2.9863%**（2027 年起降到 1.9863%）。单独修这个把差距从 $33.02 缩到 $20.60。
  2. **ON surtax 计算顺序错误** — 引擎之前在算 surtax 时，用的税基已经被股息税收抵免（DTC）减过了。根据 **Ontario Taxation Act, 2007, s.19.1**（2014 年起生效）："the Ontario surtax... will be calculated before deducting dividend tax credits" — surtax 必须在 DTC 抵扣**之前**算，DTC 应该在 surtax 加上去之**后**才扣。引擎把 DTC 错误地併入了 surtax 的计算基础，导致凡是**收入跨过 ON surtax 门槛（2025 = 应纳税额 > $5,710）且同时申报股息**的用户，surtax 被低估。
  - 通过 monkey-patch 拦截编译后 JS 模块的中间值 + 手动模拟两种假设，定位到这两个 bug；两个一起修复后引擎输出与 WS 完全一致（精度 $0.0036，本质上是分文不差）。
- **改动内容:**
  - `data/2024/ontario.json` + `data/2025/ontario.json`：`dividendCreditRate.nonEligible` 0.032863 → **0.029863**；加 `_dividendCreditSource` 注明来源和历史税率
  - `calculator.ts`：重构第 7 步税务计算流程 —
    - 新增 `provincialCredits.baseAmount`（仅 BPA/CPP/EI/employment amount 等基础抵免，不含 DTC）vs `provincialCredits.dividendTaxCredit`（单独的 DTC 部分）
    - surtax 现在基于 `provincialTaxAfterBasicReduction`（= 税前 − baseAmount − basicTaxReduction）计算，**不再**包含 DTC 的影响
    - DTC 改为在 `surtax` 加上去**之后**才扣：`provincialTaxAfterSurtaxAndDTC = max(0, provincialTaxAfterBasicReduction + surtax − dividendTaxCredit)`
    - 加了详细代码注释引用 Ontario Taxation Act 2007 s.19.1
  - `dividend-cases.test.ts` + `run-dividend-tests.mjs`：更新 CASE 2（D3 的孪生 case，eiPremium 略有不同）和 CASE 3（D2 的孪生 case，BC 无 surtax 故不受此修复影响但仍需更新 TICKET-024 后的正确预期值）的硬编码期望值
- **影响范围:**
  - **DTC 税率修正**：影响所有 ON 省 + 有非合资格股息的用户（税率被高估了 0.3 个百分点，DTC 略微多算 → 工具之前少算了一点点税）
  - **Surtax 顺序修正**：只影响 **ON 省 + 应纳税额超过 surtax 门槛（2025: $5,710 / 2024: $5,554）+ 同时有股息收入** 的用户。门槛对应的应税收入大约在 $7-8 万以上（视收入结构而定）。
    - 不跨过 surtax 门槛的 ON 用户（如 D1 $70K elig div、D4 投资收入 only case）不受影响
    - BC 等无 surtax 的省份完全不受影响（D2、CASE 3 验证：netProvincialTax 在修复前后完全相同）
    - 没有股息收入的用户不受影响（DTC = 0，两个改动都是 no-op）
  - **修复方向**：工具之前对这类用户**少算了** surtax + 多算了 DTC 减免，导致 owing 比 CRA 实际偏低约 $33。修复后准确，与 Wealthsimple Tax 完全一致。
- **验证:**
  - D3（ON $90K + 非合资格股息 $3K + 资本利得 $10K）：netProvincialTax 工具 $6,596.41 vs WS $6,597.20（差 $0.79，主因 eiPremium 输入差异）；用 WS 原始 eiPremium=1090.62 重算后 netProvincialTax = $6,597.20 vs WS $6,597.20 → **精确到 $0.0036，分文不差** ✓；owing $2,691.56 = WS $2,691.56 ✓
  - D2 / BC 孪生 case：netProvincialTax 在 surtax 顺序修复前后完全相同（$2,086.56），证明 BC 无 surtax 不受影响 ✓
  - D1（ON $70K + 合资格股息 $5K，应税收入未跨 surtax 门槛）：不受影响 ✓
  - 数学论证：当税基没有触发 `Math.max(0, ...)` 的不同 clamp 行为时，"先减 baseAmount 再加 surtax 再减 DTC" 与"先减全部 credits 再加 surtax" 在代数上等价；只有当 surtax 门槛恰好落在两种计算方式产生的不同税基之间时才会出现差异 — 这正是 D3 触发而 D1/D2/D4 不触发的原因
  - `run-dividend-tests.mjs` 全量回归：**38/38 assertions passed ✓**（exit code 0）
  - TypeScript 编译 0 errors ✓

### TICKET-024: BC 非合资格股息 DTC 税率错误（2.5164% → 1.96%）
- **Status:** Done
- **Completed:** 2026-05-27
- **发现方式:** D2 WS 对账（BC 2025 T4 $60K + 合资格 $8K + 非合资格 $2K）。WS refund $403，工具 $415，差 $12。反推 BC 非合资格 DTC：工具 $57.88 vs WS 反推 $45.08 → 税率 2.5164% vs 1.96%。
- **根本原因:**
  - `bc.json`（2024 + 2025）里 `dividendCreditRate.nonEligible = 0.025164` 是**错的**。
  - BC 非合资格 DTC 的正确税率自 **2019 年起为 1.96%**（基础：15% gross-up × 15% 的 BC 税率系数 = 1.96% of grossed-up taxable amount）。
  - BC 2017 年把 small business 税率从 2.5% 降到 2%，对应 DTC 从 2.18% 降到 1.96%；2019 年以后未再变动。
  - 来源：[TaxTips.ca BC Dividend Tax Credit](https://www.taxtips.ca/bctax/dividend-tax-credit.htm)
  - 2.5164% 这个数字的来源不明（可能是某年 ON/Alberta 的税率被误用）。
- **改动内容:**
  - `data/2024/bc.json`：`dividendCreditRate.nonEligible` 0.025164 → **0.0196**
  - `data/2025/bc.json`：`dividendCreditRate.nonEligible` 0.025164 → **0.0196**
  - `calculation-methodology.md`：§2.4.3 + 附录 A 加入 BC/ON 的具体 DTC 税率
- **影响范围:**
  - 只影响**BC 省**用户且有**非合资格股息**的场景
  - 合资格股息（D1 ✅）不受影响；ON 省用户不受影响；无股息用户不受影响
  - 修复方向：工具之前**多算了** BC 非合资格 DTC（税收优惠高估），用户看到的 refund 比 CRA 实际会稍高。修复后准确。
- **验证:**
  - 修复后 D2（BC T4 $60K + elig $8K + non-elig $2K）：工具 $402.55 vs WS $403 → **$0.45 精度** ✓
  - D1（BC T4 $70K + elig $5K，无非合资格）：工具 $170.54 vs WS $170.53 → **$0.01 精度**，不受影响 ✓
  - Golden cases（BC $80K+RRSP、BC $70K+FHSA+RRSP、BC self-emp）：均无股息，完全不受影响 ✓
  - TypeScript 编译 0 errors ✓

---

## 📅 Backlog（P2 依赖）

> 已识别但要等更早的 P2 块完成才能动手的 ticket。占位记录，避免遗忘。
> 真正开做时从这里移到 Active 区。

### TICKET-019: 多 T4 支持 + EI overpayment (Box 24) — P2 依赖
- **Status:** Blocked（等 P2 多 T4 / 多收入源支持启动）
- **Description:**
  - 触发点：测试 S1-S5 时发现 WS 有 T4 Box 24（EI insurable earnings）字段，我们工具没有。
  - 单 T4 用户基本不受影响（Box 18 = 实际缴的 EI = 抵免基数 = 跟 WS 一致）。
  - **真正受影响的是多 T4 用户**（年中换工作 / 兼职 / 同时多份雇佣）。每个雇主独立扣 EI 直到自己的年度 max，多雇主加起来可能超过年度 insurable max（2025 = $65,700），多缴部分需要算 line 45000 EI overpayment 退还。
- **改动范围（开做时参考）：**
  - 数据：`federal.json` 加 `eiInsurableMax`（2024 = $63,200, 2025 = $65,700）+ `eiRate`（2024 = 0.0166, 2025 = 0.0164）
  - 类型：`EmploymentIncome` 加 `eiInsurableEarnings?: number`（Box 24，可选；默认 = min(Box 14, eiInsurableMax)）
  - 引擎：`income.ts` 加 EI overpayment 计算（跟当前 CPP overpayment 完全对称）— `requiredEI = eiRate × min(insurableEarnings, eiInsurableMax)`；`overpayment = max(0, Box18 − requiredEI)`
  - `TaxBreakdown` 加 `eiOverpayment` 字段，跟 `cppOverpayment` 一样作 refundable credit 加进 refundOrOwing
  - UI：StepEmployment 加 Box 24 输入（默认 = Box 14）
  - 多 T4：本身是更大的工作量 — `EmploymentIncome[]` 改成数组；aggregateIncome 对每个 T4 单独算 CPP / EI overpayment 再汇总
- **预期触发：** 多 T4 用户 / 一年内跨雇主 / 一个高收入用户 + 一个兼职。单 T4 用户无影响。
- **跟 TICKET-014 对称：** TICKET-014 解决了 CPP overpayment（基于 Box 26），TICKET-019 是 EI 那一半。一起做完，CPP + EI overpayment 概念才完整。

---

## ✅ Done

<details>
<summary>点击展开 / 折叠（P1 共 13 个已完成 ticket）</summary>

### TICKET-023: BC basic tax reduction (Schedule BC line 6103)
- **Status:** Done
- **Completed:** 2026-05-26
- **Description (原):** T3/T4 供款测试发现 — BC 用户大额 RRSP/FHSA 供款后 net income 落入低收入区（< $40,807），WS 退税比工具多 $52–$457。逐点反推确认：差额 = BC basic tax reduction，一个 BC 专属省级非退还抵免，工具完全未实现。
- **根本原因:** BC Schedule BC line 6103（BC basic tax reduction）— 非退还，公式 `max(0, maxAmount − phaseOutRate × max(0, netIncome − phaseOutStart))`，再 cap 在实际 BC 省税上。2025 参数：max=$562, start=$25,020, rate=3.56%, 归零点≈$40,807。2024 参数：max=$521, start=$21,418, rate=3.56%, 归零点≈$36,053。
- **改动内容：**
  - `types.ts`：新增 `BasicTaxReductionConfig` interface；`ProvincialTaxConfig` 加 `basicTaxReduction?` 字段；`TaxBreakdown` 加 `provincialBasicTaxReduction` 字段
  - `provincial-tax.ts`：新增 `calculateBasicTaxReduction(taxAfterCredits, netIncome, config)` 函数
  - `calculator.ts`：在 standard credits 之后、surtax 之前插入 BC tax reduction；`surtax` 改为基于 `provincialTaxAfterBasicReduction` 计算；返回值加 `provincialBasicTaxReduction`
  - `data/index.ts`：BC 2024/2025 配置传入 `basicTaxReduction`
  - `data/2025/bc.json`：加 `basicTaxReduction: {maxAmount:562, phaseOutStart:25020, phaseOutRate:0.0356}`
  - `data/2024/bc.json`：加 `basicTaxReduction: {maxAmount:521, phaseOutStart:21418, phaseOutRate:0.0356}`
- **验证：** T3 $30K/$40K/$43K、T4 $40K/$43K 全部与 WS 精确对齐（$0 差异）；S5/S6（BC 高收入，net income > $40,807）不受影响。

### TICKET-022: UI 各处统一 snap 小残值 + 颜色逻辑
- **Status:** Done
- **Completed:** 2026-05-17
- **Description (原):** TICKET-021 修了 RecommendationCard 的 "$1 refund" 问题, 但用户测试时发现还有 3 处类似 UX bug:
  1. **Your scenario panel** 显示 "Refund $1"(实际残值 $0.5+,小但被 formatCAD 进位)
  2. **Recommended panel** 显示 "Owing $0" 用了**红色**(应该绿色,因为 $0 是 zero_owing 策略的成功结果)
  3. **ComparisonTable** "With recommendation" 列 refund/owing 行显示 "$1"(同 1)
- **根因:** UI 各处独立处理小残值 + 没解耦 label vs color 逻辑。
- **改动内容：**
  - **`utils.ts`**：新增 `snapNearZero(amount, threshold = 1)` helper — `|amount| < threshold` 时返回 `0`,否则原样返回。集中处理"显示零"的语义。
  - **`InteractiveScenario.tsx` ScenarioPanel**：
    - 应用 `snapNearZero` 到 `refundOrOwing` → 修复问题 1
    - 解耦 label 和 color:label 用 `> 0`("Refund" vs "Owing"),color 用 `>= 0`(零也算绿)→ 修复问题 2
  - **`ComparisonTable.tsx`**：refundOrOwing 行 baseline + optimized 都 `snapNearZero` → 修复问题 3
- **设计原则:**
  - 数据层(`TaxBreakdown.refundOrOwing` 引擎返回值)保持**精确不变**
  - 显示层(formatCAD 前)snap 小残值,保证 UI 一致
  - label 跟 color 解耦:`$0` 标签是 "Owing"(跟 zero_owing 策略名一致),但颜色绿(目标达成)
- **影响范围:** 只影响 UI 显示。引擎计算 / 测试 / API 都不变。
- **跟 TICKET-021 关系:** 021 在 optimizer 层 snap `recommendation.expectedRefund`,022 在 UI 层 snap 各处显示。两者互补 — 021 保证 RecommendationCard 行为对,022 把同样体验扩到 InteractiveScenario + ComparisonTable。

### TICKET-021: zero_owing 策略下 $1 refund UX bug
- **Status:** Done
- **Completed:** 2026-05-17
- **Description (原):** 用户切到 "Zero out tax owing" 策略,推荐供款 $7,368,UI 显示 "Expected refund $1"。跟策略名 "Zero out" 矛盾,应该显示 $0 (Expected tax owing)。
- **根因:** `findContributionForZeroOwing` 用 `Math.ceil` 把供款向上取整到整数美元 → 让 `optimized.refundOrOwing` 落在 (0, $1) 的小残值 → `formatCAD` 的 `maximumFractionDigits: 0` 把 $0.50+ 四舍五入显示成 "$1"。
- **改动内容：**
  - `optimizer.ts`: 在 return 前加 snap-to-0 逻辑 — `strategy === "zero_owing" && rawRefund > 0 && rawRefund < 1` 时把 `recommendation.expectedRefund` 设为 0,否则照常 round
  - `optimizer.test.ts`: 加新测试 "TICKET-021: zero_owing 策略下 expectedRefund 必须 snap 到 0" 防回归
- **设计原则:** **只影响 UI 显示字段** `recommendation.expectedRefund`。`optimized.refundOrOwing` (TaxBreakdown 里的精确值) 保持不变,所以 ComparisonTable 和 InteractiveScenario 仍显示精确值。
- **教训:** 之前误判另一个会话的 snap-to-0 修复是 bug 一起回滚了,这一次连测试都加好防止再被回滚。

### TICKET-020: EI clawback 双重入账（line 23500 + 42200）
- **Status:** Done
- **Completed:** 2026-05-17
- **Description (原):** 用户用 WS B.xlsx 验证 S2 时发现 — WS 报 owing $2,616, 工具 $1,116, 差 $1,500 = clawback 金额. 反推 WS Summary 显示 EI clawback **同时出现在 line 23500 (deduction) 和 line 42200 (payable)**. 我们之前只做了 deduction (从 netIncome 减), 完全漏了 payable 端 (line 42200 加进 Total payable). 这意味着所有"非产假 EI + 净收入 > $79K" 的用户, 我们都少算了 ~$1500 的 owing.
- **改动内容：**
  - `types.ts`：`TaxBreakdown` 加 `clawbacksPayable: number` 字段 (= clawbacks.total, EI + 未来 OAS clawback 合计)
  - `calculator.ts`：`refundOrOwing = totalTaxWithheld + cppOverpayment − totalTax − cppPayable − clawbacksPayable`. 新增的 −clawbacksPayable 对应 CRA T1 line 42200.
  - `golden-cases.test.ts`：
    - Case 4 (S2) 期望从 `refundOrOwing: -1116` 改为 `-2615.91`(WS B 数字),加 `clawbacksPayable: 1500` 断言
    - 其他 4 个 case 加 `clawbacksPayable: 0`(没 EI clawback)
    - 测试循环加 `clawbacksPayable` 断言
- **算法说明：** CRA T1 表上 SBR 的"双重入账"机制:
  - **Line 23500 (deduction):** 从 total income 减,得到 net income — 降低应税收入 → 降低其他税 (net effect ≈ −clawback × marginal_rate)
  - **Line 42200 (payable):** 加进 Total payable — 实际还款 (net effect = +clawback)
  - **净增加 owing = clawback × (1 − marginal_rate)** ≈ $1,500 × 70% ≈ $1,050(S2 验证: WS A $1,561 → WS B $2,616 差 $1,055 ✓)
- **WS xlsx 对照（S2）：**
  - **WS A**（T4E Box 7 未设）：line 23500 缺 / line 42200 缺 → 不触发 clawback → owing $1,561
  - **WS B**（T4E Box 7 = 30）：line 23500 = $1,500 / line 42200 = $1,500 → owing $2,616
  - **修复后工具**：clawback $1,500 双重入账 → owing $2,616 ✓ 跟 WS B 一致
- **影响范围：**
  - 仅"非产假 EI 福利 + netIncomeBeforeSBR > $79,000"的用户; 普通工薪族 / 产假领 EI / 低收入 EI 用户都不受影响
  - OAS clawback (P2 启用时) 复用同一个双重入账机制
- **遗留教训：** 之前我（Claude）下了一个错误判断："工具 $1,116 才是 CRA-correct, WS 漏算 clawback"。WS B 的证据反过来证明我错了。Lesson learned: 当 WS 给的数字反复对不上,**优先怀疑自己漏了 CRA 机制**,不是怀疑 WS 错。

### TICKET-013: P1 EI 福利 + 自雇收入支持
- **Status:** Done
- **Completed:** 2026-05-17（S1-S5 Wealthsimple Tax 对账 4 个 testable 全过；S3 因 WS 不让标 parental 跳过）
- **Description (原):** feature-list.md → P1 → 多收入类型支持。覆盖加拿大产假 / 陪产 / 失业 / 自雇 / 合同工 / freelancer 等场景。在 Step 2 底部加渐进披露的"我还有其他收入"折叠区。
- **改动内容：**
  - **数据：** `data/2024/federal.json` 加 `cppYMPE: 68500`；`data/2025/federal.json` 加 `cppYMPE: 71300`
  - **类型：** `types.ts` 的 `FederalTaxConfig` 加 `cppYMPE: number` 字段
  - **新增 `clawbacks.ts`**：`calculateClawbacks()` 函数实现 EI clawback (line 23500/SBR)；输入用 `netIncomeBeforeSBR` 避免循环依赖；产假/陪产假完全豁免；为 P2 OAS clawback 预留接口
  - **`income.ts`**：加 `calculateSelfEmploymentCpp()` — 自雇 CPP 自动算（双份基础 9.9% + 双份增强 2%，pensionable cap 在 `cppYMPE − cppBasicExemption`）；EI 福利 100% 计入 `totalIncome`，预扣税加 `federalTaxWithheld`
  - **`calculator.ts`**：流程加 SBR：算 `netIncomeBeforeSBR` → `calculateClawbacks` → `netIncome`
  - **`useFormStore.ts`**：加 `updateIncome(patch)` 通用方法；version bump 2 → 3
  - **`StepEmployment.tsx`**：底部加 Checkbox "我还有其他收入"（默认收起；首次进入若 store 里已有数据则展开）；展开后子区块 — EI 福利 / 自雇收入
  - **`messages.ts`**：新增 `otherIncome.*` namespace 中英双语
  - **新增 `__tests__/clawbacks-selfemp.test.ts`**：15+ 测试
- **后续修复（独立 ticket）：** TICKET-017 修了 EI clawback 公式（`0.3×min` vs `min(...,0.3×)`）；TICKET-018 加了自雇 CPP payable 进 refundOrOwing
- **验证（2026-05-17, Wealthsimple Tax 对账）：**
  - S1 (ON 2025 T4 $50K)：refund $545 ✓
  - S2 (ON 2025 T4 + EI 高收入)：工具 owing $1,116 vs WS owing $1,561。差 $445 = WS 没应用 clawback（Box 7 没设）；我们的算法按 CRA Federal Worksheet Part 2 EI 公式正确
  - S3 (parental EI)：WS 不让标 parental → skipped
  - S4 (ON 2025 T4 + T5 利息)：refund $816 ✓ exact match
  - S5 (BC 2025 self-emp)：owing $11,238 ✓
  - golden-cases.test.ts 全 5 个 case 通过

### TICKET-018: 自雇 CPP payable 加进 refundOrOwing
- **Status:** Done
- **Completed:** 2026-05-17
- **Description (原):** S5 测试发现 — WS owing $11,238, 工具 owing $5,705, 差 $5,533 ≈ 我们算的自雇总 CPP $5,533.50。自雇者必须在报税时一次性补缴双份 CPP (雇员 + 雇主 = 9.9% 基础 + 2% 增强), CRA 把这部分加在 line 43500 (Total payable) 里, 我们工具完全漏算了。
- **改动内容：**
  - `types.ts`：`TaxBreakdown` 加 `cppPayable: number` 字段（独立于 totalTax 显示, 透明）
  - `income.ts`：`IncomeBreakdown` 加 `selfEmploymentCppPayable: number`；自雇分支里赋值 = `seCpp.totalContribution`（即 pensionable × 11.9% 全部）；T4 工资分支保持 0
  - `calculator.ts`：`refundOrOwing = totalTaxWithheld + cppOverpayment − totalTax − cppPayable`；返回值带上 `cppPayable`
- **算法说明：** 自雇 CPP 总应缴 = pensionable × (2 × 4.95% + 2 × 1%) = pensionable × 11.9%。其中一半的基础部分进 line 30800 抵免, 另一半进 line 22200 扣除, 全部增强部分进 line 22215 扣除 — 但这些只影响 *所得税额*。实际的 *CPP 应缴现金* 仍要全额补给 CRA，作 line 43500 一部分。
- **验证：** golden-cases.test.ts Case 5 (BC 2025 self-emp $50K) 期望 owing ≈ $11,238 (含 $5,533.5 cppPayable) 通过即说明修复正确。

### TICKET-017: 修 EI clawback 公式
- **Status:** Done
- **Completed:** 2026-05-17
- **Description (原):** S2 测试发现差 $918。我们的公式 `min(eiAmount, 0.30 × excess)` 数学上不等价于 CRA 规定的 `0.30 × min(eiAmount, excess)`。当 EI < 0.30 × excess 时两者一致；当 EI > 0.30 × excess 时旧公式严重高估 clawback。
- **改动内容：**
  - `clawbacks.ts`：`ei = Math.min(eiAmount, 0.30 * excess)` → `ei = 0.30 * Math.min(eiAmount, excess)`（一行修）
  - `clawbacks-selfemp.test.ts`：之前的几个测试硬编码了错误公式的期望值（6300 / 5000 / 5400），全部改成正确公式的期望值（3000 / 1500 / 2400）
- **算法说明：** CRA Federal Worksheet 23500 步骤：
  1. Line 1 = 非产假 EI（T4E Box 15）
  2. Line 2 = net income before SBR
  3. Line 3 = max(0, Line 2 − $79,000)
  4. Line 4 = 30% × Line 1
  5. Line 5 = 30% × Line 3
  6. **SBR = lesser of Line 4 and Line 5** = 0.30 × min(EI, excess)
- **验证：** golden-cases.test.ts Case 4 (ON 2025 $90K 含 $5K 非产假 EI) 期望 clawback $1,500, owing $1,116 通过即说明修复正确。
- **注：** WS S2 报 owing $1,561 是因为 WS 没应用 clawback（用户可能没在 T4E 设 Box 7 repayment rate）。我们工具按 CRA 公式正确计算后得 $1,116 — 这是真正符合 CRA assessment 的数字。用户要让 WS 一致，需要在 T4E 输入时设 Box 7 = 30。

### TICKET-016: Ontario LIFT Credit
- **Status:** Done
- **Completed:** 2026-05-17
- **Description (原):** S1 测试发现差 $23.25 in ON tax。反向推导：$23.25 = $875 − 5% × ($49,535 − $32,500) — 完美匹配 Ontario LIFT Credit（低收入个人和家庭税收抵免）公式。我们的工具完全没实现这个 ON 专属抵免。
- **改动内容：**
  - `data/2024/ontario.json` + `data/2025/ontario.json`：加 `liftCredit` 配置（max $875, phaseOutStart $32,500, phaseOutRate 5%, minEarnedIncome $3,000）
  - `types.ts`：新增 `LIFTConfig` interface；`ProvincialTaxConfig.liftCredit?` 字段；`TaxBreakdown.provincialLiftCredit` 字段（供 UI 透明显示）
  - `provincial-tax.ts`：新增 `calculateLIFT()` 函数 — 检查 earnedIncome ≥ minEarnedIncome 后，按 `max(0, max − rate × max(0, netIncome − start))` 算
  - `calculator.ts`：在 surtax 之后 OHP 之前应用 LIFT — `provincialAfterLift = max(0, provincialTaxAfterCredits + surtax − liftCredit)`；OHP 仍然加在最后
  - `data/index.ts`：buildProvincialConfig 加载 `liftCredit`（这次别忘了 — 上次 cppYMPE 漏接导致 NaN 灾难）
- **算法说明：**
  - LIFT phase out 终点 = $32,500 + $875/0.05 = $50,000 — 净收入超 $50K 完全 phase out
  - 仅 ON；其他省份 `liftCredit` 配置为 undefined → `calculateLIFT` 返回 0
- **简化说明（P1 限制）：**
  - 只支持单身 / 无 dependents 计算
  - 完整 LIFT 还有：spouse / common-law partner 加成（max 翻倍到 $1,750）+ adjusted family net income 做 phase-out — 这跟配偶联合优化是同一个 P2 主题
- **验证：** golden-cases.test.ts Case 3 (ON 2025 T4 $50K) 期望 refund $545.18 (含 LIFT $23.25 抵免) 通过即说明修复正确。

### TICKET-015: P1 T5 利息收入 UI 字段
- **Status:** Done
- **Completed:** 2026-05-17
- **Description (原):** Yang 2025 对账时发现 — 引擎层 `income.investment.interest` 一直支持,但 UI 里没有任何字段让用户输入,所以漏算了 $223.46 利息(及类似数据)。
- **改动内容：**
  - `StepEmployment.tsx`：在"其他收入"折叠区第 3 个子区加 **投资收入 (T5)** section,目前只有"利息收入 (T5 Box 13)"字段;dropdown / 资本利得等留给后续完整投资模块
  - `i18n/messages.ts`：加 `otherIncome.investment.{section,interest,interestHelp,note}` 中英双语;note 文案说明股息 / 资本利得后续会加
  - `useFormStore.updateIncome`：复用 TICKET-013 加的通用方法,直接 `updateIncome({ investment: {...} })`,折叠区取消勾选时把 investment 一并清空避免脏数据
- **验证：** Yang 2025 黄金对账(`golden-cases.test.ts` Case 2)断言 `totalIncome === 62,145.62`,含 $223.46 利息 → 通过即说明 UI 字段正确传到引擎。

### TICKET-014: CPP overpayment + Box 26 输入 + 2025 联邦税率修正
- **Status:** Done
- **Completed:** 2026-05-17
- **Description (原):** Yang 2025 对账(WS $541.09 vs 工具 $388)反推出三个 bug 一并修复:
  1. **2025 联邦第 1 档税率错误** — 加拿大 2025 年中产减税: 7 月 1 日起 15% → 14%,全年加权 14.5%。我们 `federal.json` 仍是 15%。
  2. **CPP 拆分用 Box 16 比例算,没考虑 overpayment** — 当用户跨工作 / Box 16 超过 5.95% × pensionable 时,多缴部分应作 line 44800 退还,不算抵免或扣除。
  3. **没 Box 26 输入** — 拿不到 pensionable earnings,无法做正确的 CPP 反推。
- **改动内容：**
  - **数据：** `data/2025/federal.json` 第 1 档 `0.15 → 0.145`(JSON 注释里写了来源 + 2026 应改为 14%)
  - **类型：** `types.ts` 的 `EmploymentIncome` 加 `cppPensionableEarnings?: number`(Box 26,可选);`TaxBreakdown` 加 `cppOverpayment: number`
  - **`income.ts`**：抽出 `splitT4CppContribution(box16, pensionable, config)`,逻辑:
    - 用 `min(pensionable, cppYMPE) − cppBasicExemption` 算 contribution base
    - `requiredBase = base × 4.95%`,`requiredEnhanced = base × 1%`
    - 若 `Box16 ≤ requiredTotal` → 按 4.95/5.95 比例分配实际缴的(无 overpayment;常见无换工作场景)
    - 若 `Box16 > requiredTotal` → 用 required 值,多出来的 `Box16 − requiredTotal` 作 `cppOverpayment`
    - `IncomeBreakdown` 加 `cppOverpayment` 字段
    - 默认 `pensionable = gross`(用户没填 Box 26 时;向后兼容老数据)
  - **`calculator.ts`**：`refundOrOwing = totalTaxWithheld + cppOverpayment − totalTax`;返回值加 `cppOverpayment` 字段供 UI 显示
  - **`StepEmployment.tsx`**：T4 字段网格里加 Box 26 输入(默认显示 = gross),`updateIncomeEmployment({ cppPensionableEarnings: n })`
  - **i18n**：`employment.{cppPensionable,cppPensionableHelp}` 中英双语,help 文案解释 Box 26 通常等于 Box 14 但偶尔不同(未满 18 / 超过 70 / 部分时段免除)
  - **测试：** 新增 `golden-cases.test.ts` 黄金对账测试集(替代分散的硬编码 case),容差 $5;Case 1 = P0 ON 2024 $67,983.35 补税 $1,085.32(回归保护);Case 2 = Yang ON 2025 退税 $541.09(本 ticket 的 trigger)
  - **optimizer.test.ts**：drop_bracket 测试从 `22.7%` 改为 `22.2%`(因为联邦 14.5% + BC 7.7%)
- **影响：**
  - 所有 **2025 用户**联邦税重算(税额下降约 0.5% × 第 1 档应税);2024 / P0 黄金对账精度 $0.02 保持不变
  - Box 16 多缴的用户现在会看到 `cppOverpayment > 0` 多退一笔(常见跨工作场景)
  - 老 store 数据没 Box 26 字段 → 默认 = gross,行为等同 P0(没引入新错误)
- **验证：** 黄金对账测试集 Case 2 (Yang ON 2025) 退税 $541.09 通过(容差 $5);Case 1 (P0 ON 2024) 补税 $1,085.32 仍通过(回归保护)

### TICKET-010: P1 推荐策略切换器（zero_owing / max_refund / drop_bracket）
- **Status:** Done
- **Completed:** 2026-05-16
- **Description (原):** feature-list.md → P1 → 推荐策略增强。让用户在结果页用 segmented control 切换 3 种推荐目标，切换后实时重算供款金额、退税、rationale。
- **改动内容：**
  - `types.ts`：新增 `StrategyPreference = "zero_owing" | "max_refund" | "drop_bracket"`；扩展 `RecommendationStrategy` 结果标签集（含 `max_refund_bpa_capped` / `drop_bracket_capped` / `already_lowest_bracket`）；`OptimizationResult.recommendation` 加 `preference` 字段。
  - `optimizer.ts`：拆出 `solveZeroOwing` / `solveMaxRefund` / `solveDropBracket` 三个求解器；`optimize()` 接受 `OptimizeOptions { strategy? }`，默认 `zero_owing` 保持 P0 行为；新增 `bracketBoundaries()` 取联邦 + 省税阶并集；`buildRationale` 按新策略标签分支文案。
  - `useFormStore.ts`：加 `strategy` 持久化字段（version bump 1 → 2），`setStrategy()` action。
  - `StrategySwitcher.tsx`：新组件 — segmented control（3 选项），radio role + aria-checked，当前策略下方显示一句话说明。
  - `RecommendationCard.tsx`：右上角加策略标签 chip。
  - `InteractiveScenario.tsx`：左栏副标题改为按 `result.recommendation.preference` 动态切换。
  - `StepResults.tsx`：把 StrategySwitcher 放在最上方，`optimize(data, { strategy })` 传入偏好。
  - `messages.ts`：新增 `strategy.*` / `interactive.recommendedSubtitle.*` / 5 个 `rationale_strategy_max_refund*` & `_drop_bracket*` & `_already_lowest_bracket` key（中英双语）。
  - `__tests__/optimizer.test.ts`：新增 10+ 测试覆盖 max_refund / drop_bracket / 边界 / 默认偏好回退 / 策略对比性。
- **算法：**
  - `max_refund`：用尽 `totalRoom`，但若推过 federal BPA 则在 BPA 边界停下（`floor(baseline.taxableIncome - federalBPA)`），标签 `max_refund_bpa_capped`。
  - `drop_bracket`：收集 federal + provincial 所有税阶上限并集，找严格小于 `baseline.taxableIncome` 的最大边界 = target，contribution = `ceil(taxableIncome - target)`；若 > totalRoom → `drop_bracket_capped`；若没有更低边界 → `already_lowest_bracket`。RRSP/FHSA 1:1 减 taxableIncome，所以代数求解而非二分搜索。
- **验证：** 用户本地 `npm test` 通过 + UI 三策略切换正常。**待用户用 Wealthsimple Tax 对账具体数字**（ON 2024 $67,983.35 + drop_bracket 推荐供款 $11,472，期望 marginal 从 ~29.65% 降到 ~24.15%）。如对账偏差 > 0.5%，开新 follow-up ticket。

### TICKET-011: 中文丢失
- **Status:** Done
- **Completed:** 2026-05-16
- **Description (原):** 用户切换到中文之后不显示中文。原因是改 TICKET-010 时遇到 bash mount sync 问题，中途用 `tr -d` 处理 NUL 填充字节，反而把 mount 截断的内容写回 Windows，把 `src/i18n/messages.ts` 里 `zh` locale 的中文文案改成了英文占位。
- **改动内容：**
  - `src/i18n/messages.ts` 的 `messages.zh` 整个对象重新翻译回中文，包含 app / wizard / basic / employment / room / results / comparison / interactive / strategy / rationale / warning / provinces 全部 namespace
  - 保留了所有 `${vars}` 插值占位符（如 `${refund}` / `${total}` / `${baselineOwing}` / `{oldRate}` 等）
  - 与英文版语义一一对应；UI 切换"中文"时所有字段、按钮、推荐理由、警告文案均显示中文
- **验证：** Read 工具确认 zh block 内中文完整；待用户本地 `npm run dev` 切换中文复测。

### TICKET-012: Input box 里的 0 有问题
- **Status:** Done
- **Completed:** 2026-05-16
- **Description (原):** Step 2 / 3 的数字输入框默认显示 `0`，但用户点击 input box 之后输入数字之前这个 `0` 不消失：1) 直接输入会显示 `0xxx`（如 `05000`）；2) 选中 `0` 按删除键删不掉（被默认值卡住）。
- **改动内容：**
  - **新增 `src/components/ui/NumberInput.tsx`**：内部用 string 状态跟踪显示值（与父级 number prop 解耦）。
    - **聚焦**：若当前显示为 `0`，自动清空为 `""`，让用户直接键入
    - **失焦**：若显示为空或非数字，回填 `0` 并 `onValueChange(0)`；否则用 `Number()` 规范化（如 `0005` → `5`）
    - **变更**：把原始 string 存进内部 displayed state，允许聚焦时显示空字符串；同时把解析后的数字传给父级
    - **外部同步**：父级 value 变化时（非聚焦状态下）同步显示文本
  - 替换 4 处 `<Input type="number">` 调用：
    - `StepEmployment.tsx`（gross / federalTaxWithheld / provincialTaxWithheld / cppContribution / eiPremium 共 5 字段，通过 `moneyInput()` helper）
    - `StepRoom.tsx`（rrspRoomAvailable / fhsaRoomAvailable / fhsaLifetimeUsed 共 3 字段）
    - `StepBasicInfo.tsx`（age 字段）
    - `InteractiveScenario.tsx`（slider 旁边的精确数字输入框）
  - 接口从 `value={n} onChange={(e) => ...Number(e.target.value)...}` 简化为 `value={n} onValueChange={(n) => ...}`
- **验证：** 待用户本地 `npm run dev` 验证 — 进入 Step 2 / 3，点击任意数字输入框确认 `0` 立刻消失；输入 `5000` 应直接显示 `5000` 而非 `05000`；选中 `0` 按删除键确认能清空。

</details>
