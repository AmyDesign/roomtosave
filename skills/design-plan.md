# RRSP / FHSA 避税计算工具 — 设计方案

本文档描述 Web App 的整体设计，包括技术栈、架构、数据模型、UI/UX 流程、和部署策略。

---

## 1. 产品定位

**目标用户**：在加拿大有收入的个人（工薪族、自雇人士、有投资收入者）。
**核心价值**：用户输入收入数据 → 工具自动计算应往 RRSP / FHSA 放多少钱 → 给出退税金额和优化建议。
**差异化**：相比通用税务计算器，本工具聚焦"如何配置 RRSP / FHSA 让退税最大化"。

---

## 2. 技术栈建议

### 2.1 推荐方案（轻量、易部署、纯前端）

| 层 | 技术 |
|---|---|
| 前端框架 | **Next.js 14+ (App Router)** + TypeScript |
| UI 库 | Tailwind CSS + shadcn/ui |
| 图表 | Recharts 或 Chart.js |
| 表单/校验 | React Hook Form + Zod |
| 状态管理 | Zustand（轻量）或 React Context |
| 计算引擎 | 纯 TypeScript，无后端 |
| 部署 | Vercel / Cloudflare Pages |
| 分析 | Plausible / PostHog（隐私友好） |

**理由**：税务数据敏感，**纯前端计算**避免传输用户隐私；Next.js 静态导出后部署便宜；shadcn/ui 组件可定制。

### 2.2 进阶方案（如需保存历史、多年对比、账号体系）

| 层 | 技术 |
|---|---|
| 后端 | Next.js API Routes 或独立 Node/Python 服务 |
| 数据库 | Supabase / PostgreSQL |
| 认证 | Supabase Auth / Clerk |
| 加密 | 客户端加密 + 服务端只存密文 |

**注意**：一旦涉及保存用户税务数据，需考虑 PIPEDA 合规（加拿大隐私法）。

---

## 3. 系统架构

```
┌──────────────────────────────────────────────┐
│            浏览器（React App）                │
│  ┌────────────────────────────────────────┐  │
│  │  Input Forms（多步表单 / Wizard）       │  │
│  └─────────────────┬──────────────────────┘  │
│                    │                          │
│  ┌─────────────────▼──────────────────────┐  │
│  │   Tax Calculation Engine（TS）         │  │
│  │   ├─ income-classifier.ts              │  │
│  │   ├─ federal-tax.ts                    │  │
│  │   ├─ provincial-tax.ts                 │  │
│  │   ├─ credits.ts                        │  │
│  │   ├─ clawbacks.ts                      │  │
│  │   └─ optimizer.ts                      │  │
│  └─────────────────┬──────────────────────┘  │
│                    │                          │
│  ┌─────────────────▼──────────────────────┐  │
│  │   Results Display                      │  │
│  │   ├─ 推荐供款方案                      │  │
│  │   ├─ 退税对比                          │  │
│  │   ├─ 敏感性图表                        │  │
│  │   └─ 详细分解                          │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │   Tax Data Config（JSON，按年度版本）   │  │
│  │   ├─ federal-2025.json                 │  │
│  │   ├─ bc-2025.json                      │  │
│  │   ├─ ontario-2025.json                 │  │
│  │   └─ ...                               │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

---

## 4. 数据模型

### 4.1 用户输入（TaxInput）

**P0 实际实现的形状**（见 `src/lib/tax/types.ts`）。注意：T4 扣税拆为 `federalTaxWithheld` 和 `provincialTaxWithheld`；CPP 增强部分自动从 Box 16 推导，不需要用户输入。

```typescript
type TaxYear = 2024 | 2025;  // P0 支持两年

interface TaxInput {
  // 基础信息
  taxYear: TaxYear;
  province: ProvinceCode;       // P0: 'BC' | 'ON' | 'QC'；P1: 全 13 个省/地区
  age: number;
  isFirstTimeHomeBuyer: boolean;

  // 额度信息
  rrspRoomAvailable: number;
  fhsaRoomAvailable: number;
  fhsaLifetimeUsed: number;

  // 收入
  income: IncomeInput;
  // 扣除项
  deductions: DeductionsInput;
}

interface EmploymentIncome {
  gross: number;                  // T4 Box 14
  federalTaxWithheld: number;     // T4 Box 22 中联邦部分
  provincialTaxWithheld: number;  // T4 Box 22 中省部分
  cppContribution: number;        // T4 Box 16（含基础 + 增强，工具自动拆分）
  eiPremium: number;              // T4 Box 18
}

interface IncomeInput {
  employment?: EmploymentIncome;
  // P1 扩展位
  selfEmployment?: { netIncome: number };
  benefits?: { ei?: ...; cpp?: number; oas?: number; pension?: number };
  investment?: { interest?, eligibleDividends?, nonEligibleDividends?,
                 foreignDividends?, capitalGains?, capitalLosses? };
  rental?: { netIncome: number };
  other?: number;
}

interface DeductionsInput {
  rrspContribution: number;       // 用户当年抵扣
  fhsaContribution: number;
  // P1 扩展位
  unionDues?: number;
  childcareExpenses?: number;
  movingExpenses?: number;
  capitalLossCarryforward?: number;
  other?: number;
}
```

**未在 TaxInput 中暴露的偏好（P0 决策）：** 推荐策略目前**写死为"补税归零"**（见 calculation-methodology.md §6.1）；P1 会加 `preferences.recommendationStrategy: 'zero-owing' | 'max-refund' | 'drop-to-bracket'`。用户在结果页通过**滑块**自由调节供款金额（不需要写在 TaxInput 里）。

### 4.2 计算结果（OptimizationResult）

**P0 实际实现的形状**：

```typescript
type RecommendationStrategy =
  | "already_refund"  // 不供款已退税 → 推荐 $0
  | "zero_owing"      // 通过供款让补税=0（默认 happy path）
  | "room_capped"     // 用尽额度仍欠 → 推荐 = totalRoom
  | "no_room";        // 欠税但无可用额度

interface OptimizationResult {
  baseline: TaxBreakdown;       // 无供款时
  optimized: TaxBreakdown;      // 推荐方案
  recommendation: {
    fhsaContribution: number;
    rrspContribution: number;
    totalContribution: number;
    expectedRefund: number;     // 正=退税，负=补税
    taxSaved: number;
    strategy: RecommendationStrategy;
    rationale: RationaleItem[]; // i18n key + 插值变量
  };
  /** 可用额度（供互动调节器/slider 使用） */
  room: {
    total: number;
    fhsa: number;
    rrsp: number;
  };
  /** 敏感性数据：不同供款额对应的退税，用于画图 */
  sensitivity: Array<{
    totalContribution: number;
    refund: number;
    marginalRate: number;
  }>;
  warnings: Warning[];          // { level, key, vars } — 含 OAS/RRSP/FHSA/BPA 等提醒
}

interface TaxBreakdown {
  totalIncome: number;
  netIncome: number;             // = totalIncome − deductions − CPP 增强自动扣除
  taxableIncome: number;
  // 联邦
  federalTaxBeforeCredits: number;
  federalCredits: number;
  netFederalTax: number;
  // 省
  provincialTaxBeforeCredits: number;
  provincialCredits: number;
  provincialSurtax: number;          // 仅 Ontario
  provincialHealthPremium: number;   // 仅 Ontario (OHP)
  federalAbatement: number;          // 仅 Quebec（16.5% 联邦减免）
  netProvincialTax: number;
  // 汇总
  totalTax: number;
  totalTaxWithheld: number;
  refundOrOwing: number;             // 正=退税，负=补税
  effectiveRate: number;
  marginalRate: number;
}

interface RationaleItem {
  key: string;                   // i18n key 如 "rationale_strategy_zero_owing"
  vars?: Record<string, number | string>;
}

interface Warning {
  level: "info" | "warning" | "error";
  key: string;
  vars?: Record<string, number | string>;
}
```

**辅助函数（暴露给 UI 互动调节器）：**
- `calculateScenario(input, totalContribution, fhsaRoomActual?, rrspRoom?)` → 给定供款总额，返回完整 TaxBreakdown
- `splitContribution(total, fhsaRoom, rrspRoom, isFirstTimeHomeBuyer)` → 按 FHSA 优先规则拆分

### 4.3 税表数据（年度配置）

**P0 实际形状**（见 `src/lib/tax/types.ts`）：

```typescript
interface FederalTaxConfig {
  year: TaxYear;
  brackets: Array<{ upTo: number; rate: number }>;   // upTo: Infinity 表示最高档
  bpa: {
    base: number;
    phaseOutStart?: number;
    phaseOutEnd?: number;
    minimum?: number;
  };
  canadaEmploymentAmount: number;
  rrspMaxLimit: number;
  fhsaAnnualLimit: number;
  fhsaLifetimeLimit: number;
  rrspOvercontributionAllowance: number;
  eiClawbackThreshold: number;       // P1 使用
  oasClawbackThreshold: number;      // P1 使用
  dividendGrossUp: { eligible: number; nonEligible: number };
  dividendCreditRate: { eligible: number; nonEligible: number };
  // CPP 拆分用
  cppBaseRate: number;               // 0.0495
  cppEnhancedRate: number;           // 0.01
  cppBasicExemption: number;         // 3500
}

interface ProvincialTaxConfig {
  year: TaxYear;
  code: ProvinceCode;
  nameEn: string;
  nameZh: string;
  brackets: Array<{ upTo: number; rate: number }>;
  bpa: { base: number; ... };
  employmentAmount?: number;
  surtaxes?: Array<{ threshold: number; rate: number }>;    // 仅 ON
  healthPremium?: HealthPremiumSegment[];                    // 仅 ON (OHP)
  federalAbatementRate?: number;                             // 仅 QC（0.165）
  dividendCreditRate?: { eligible: number; nonEligible: number };
}

interface HealthPremiumSegment {
  upTo: number;                      // Infinity 表示最高段
  flat?: number;                     // 扁平金额
  base?: number; rate?: number; from?: number; max?: number;  // 线性桥接段
}
```

**目录布局：**
```
src/lib/tax/data/
├── 2024/
│   ├── federal.json
│   ├── bc.json
│   ├── ontario.json
│   └── qc.json
├── 2025/
│   ├── federal.json
│   ├── bc.json
│   ├── ontario.json
│   └── qc.json
└── index.ts        // 注册中心，normalize null → Infinity
```

**加新年只需：** 新建 `data/{year}/` JSON 文件 + `data/index.ts` 注册 + `types.ts` 把 `TaxYear` 加上该年。

---

## 5. UI/UX 流程

### 5.1 整体流程（Wizard 多步表单）

**P0 实际实现**（4 步，更精简；其他收入与偏好挪到 P1）：

```
[Step 1: 基础信息 (basic)]
   ↓ 税务年度（2024/2025）、省份（BC/ON）、年龄、首次购房者
[Step 2: 工作收入 (employment)]
   ↓ T4 Box 14/22(联邦)/22(省)/16/18
[Step 3: 额度 (room)]
   ↓ RRSP 可用额度、FHSA 可用额度、FHSA 终身已用
[Step 4: 结果页 (results)]
   ├─ 推荐方案卡片（FHSA $X + RRSP $Y → 退税/补税 $Z + strategy 标签）
   ├─ 🎯 互动调节器（滑块 + 数字输入 + 推荐方案 vs 用户方案双栏对比）
   ├─ 对比表（baseline vs optimized）
   ├─ 推荐理由（rationale 列表 + 警告）
   └─ 返回修改 / 重新开始按钮
```

**P1 计划新增 Step：** 其他收入（EI/自雇/投资）+ 用户偏好（推荐策略切换器）。

### 5.2 关键交互设计

**渐进披露**：默认只显示工资收入字段；"我还有其他收入"按钮展开 EI/投资等区块，避免新手被吓退。

**实时计算**：从 Step 2 开始，用户每改一个数字，右侧/底部即显示当前退税预估，不需点"计算"按钮。

**说明气泡**：每个字段旁有 "?" 图标，悬停或点击显示加拿大税法解释（例如"什么是 Earned Income？"）。

**互动调节器（P0 已实现）**：结果页下方有 `InteractiveScenario` 组件 —
- 滑块（step=$50）+ 精确数字输入框双向联动
- 左栏永远显示"推荐方案"（补税归零），右栏实时显示"你的方案"
- 对比显示：总供款、FHSA/RRSP 分配、退税或补税、边际税率、剩余额度
- "恢复推荐值"按钮
- 实现细节：`calculateScenario(input, totalContribution)` 实时重算完整 TaxBreakdown，毫秒级响应

**警告系统**：
- 黄色：接近 OAS clawback、RRSP 额度即将用满、FHSA 终身上限剩余少
- 红色：超额供款风险、收入降到 BPA 以下浪费额度

### 5.3 移动端
- Mobile-first 设计
- 多步表单在手机上更友好
- 图表自动适配竖屏

---

## 6. 计算引擎模块设计

**P0 实际目录结构**：

```
src/lib/tax/
├── index.ts                    // barrel export
├── types.ts                    // TaxInput / TaxBreakdown / OptimizationResult 等
├── calculator.ts               // 主入口 calculateTax()
├── income.ts                   // 收入聚合 + CPP 基础/增强拆分 + 股息 gross-up + 资本利得
├── deductions.ts               // RRSP/FHSA/其他扣除求和
├── federal-tax.ts              // 联邦税阶计算 + BPA phase-out
├── provincial-tax.ts           // 省税阶 + Ontario surtax + OHP + LIFT + BC Sales Tax Credit
├── credits.ts                  // 联邦/省非退还抵免（CPP 基础 + 股息 DTC）
├── clawbacks.ts                // EI clawback（P1 新增，TICKET-013/017/027）
├── optimizer.ts                // 推荐算法 + 互动 helper (calculateScenario, splitContribution)
├── __tests__/
│   ├── optimizer.test.ts       // 真实用户对账测试 + strategy 覆盖
│   ├── golden-cases.test.ts    // P0 黄金对账
│   ├── dividend-cases.test.ts  // D 系列投资收入测试（D6-D14）
│   ├── clawbacks-selfemp.test.ts // 自雇 + EI clawback 交叉测试
│   ├── quebec.test.ts          // Quebec 税阶 + abatement 测试
│   └── debug_s8_s9.test.ts     // 调试用
└── data/
    ├── index.ts                // 注册中心 + normalize
    ├── 2024/
    │   ├── federal.json
    │   ├── bc.json
    │   ├── ontario.json
    │   └── qc.json
    └── 2025/
        ├── federal.json
        ├── bc.json
        ├── ontario.json
        └── qc.json
```

**P1 已完成模块：** `clawbacks.ts`（EI clawback）、投资收入（股息 gross-up + DTC + 资本利得 inclusion 已内置于 income.ts / credits.ts）、自雇 CPP 双份计算、Ontario LIFT Credit。**待做：** `validators.ts`（Zod input schema）、Foreign Tax Credit、OAS Clawback。

**测试策略**：
- 主单元测试在 `optimizer.test.ts` — 覆盖 4 种 strategy + OHP 各区段 + FHSA 优先 + 单调性
- **黄金对账测试** ⭐：用真实用户的 T4 + 实际补税金额做端到端校准。已通过 2024 ON case：$67,983 收入 → $1,085.34 vs 实际 $1,085.32（差 $0.02）
- **D 系列投资收入对账** ⭐：15 个 test case（D6–D14），覆盖合资格/非合资格股息、资本利得、EI clawback、自雇 CPP、产假 EI、跨省（ON/BC）等场景，全部通过 WealthSimple Tax 对账验证。独立测试运行器 `run-dividend-tests.mjs`（508 行，100/100 断言通过）
- **Bug 修复验证**：TICKET-024（BC 非合资格 DTC）、TICKET-025（ON surtax/DTC 顺序）、TICKET-026（BC Sales Tax Credit）、TICKET-027（EI clawback 门槛）、TICKET-028（LIFT 自雇排除）均已通过 WS 对账确认

---

## 7. 税表数据更新策略

加拿大税法每年 12 月底/1 月初公布新数字。工具需要：

1. **JSON 配置文件按年度分离**，新年只需添加 `data/2026/` 目录
2. **CI/CD 自动检查**：每年 1 月触发 GitHub Action，提醒维护者更新
3. **用户端显示当前数据版本**：例如"基于 2025-12-15 CRA 数据"
4. **历史数据保留**：用户可选过去几年来回溯计算

---

## 8. 隐私与合规

- **不上传任何用户数据**（MVP 阶段纯前端）
- **明确的隐私声明**：首页和结果页都告知"数据只在你的浏览器里"
- **不放 Google Analytics**：用 Plausible 或自托管 Umami
- **PIPEDA 合规免责**：声明本工具非税务专业建议，建议复杂情况咨询 CPA
- **可选**：用 IndexedDB 本地保存历史输入，方便用户对比

---

## 9. 国际化

- **中英双语**：第一阶段必须支持，因为目标用户中有大量华人移民
- **简繁体切换**
- **未来**：法语（Quebec 居民必需）、Punjabi、Filipino

技术实现：next-intl 或 react-i18next。

---

## 10. 部署与运维

### MVP 阶段
- **Vercel** 静态导出，免费层够用
- 域名 + Cloudflare CDN
- 错误监控：Sentry 免费层

### 成长阶段
- 如果加用户账号体系：Vercel + Supabase
- 全球 CDN：Cloudflare Workers
- 监控：Better Stack / Datadog

---

## 11. 开发里程碑

### 11.1 已完成

| 阶段 | 状态 | 内容 |
|---|---|---|
| Phase 0：调研与原型 | ✅ 完成 | 税法细节确认、技术栈选型（Next.js + TS + Zustand） |
| Phase 1：MVP (= P0) | ✅ 完成 | 工资 T4 + RRSP/FHSA + 2024/2025 + BC/ON + OHP + CPP 拆分 + 互动调节器；真实用户对账精度 $0.02（TICKET-003 到 TICKET-009） |
| Phase 2 早期：P1 核心 | 🟢 进行中 | TICKET-010 推荐策略切换器 + TICKET-011 中文回填 + TICKET-012 NumberInput + TICKET-029 Quebec 省支持（税阶 + abatement + DTC）均已完成 |
| Phase 2 中期：投资收入 + 多收入 | 🟢 进行中 | 投资收入（合资格/非合资格股息 gross-up + DTC + 资本利得 50% inclusion）✅；EI 福利 + EI clawback ✅（TICKET-013/017/027）；自雇 CPP 双份 ✅（TICKET-018）；Ontario LIFT Credit ✅（TICKET-016/028）；BC Sales Tax Credit ✅（TICKET-026）；D6–D14 全部通过 WS 对账 |

### 11.2 未来路线图（按里程碑分阶段交付）

**核心思路：** 不等所有功能都做完才上线。每个里程碑结束都是一个"可发布"的节点，先收用户反馈，再调下一阶段重点。

#### 🎯 里程碑 1 — P1 MVP 上线（目标：当前起 ~2-3 个月）

可以让真实用户试用的最小完整版本：

- **多收入类型**
  - ✅ 投资收入：利息 / 加拿大合资格股息（gross-up + DTC）/ 非合资格股息 / 资本利得（50% inclusion）
  - ✅ EI 福利（含 EI clawback，TICKET-027 修复门槛）
  - ✅ 自雇 / 合同收入（含自付 CPP 全额 + TICKET-028 LIFT 排除）
- **省份扩展 — 高频省份**：Alberta、Saskatchewan、Manitoba、Nova Scotia（覆盖加拿大约 90% 人口）
- **详细分解 UI**（"对账视图"）：把算法每一步展开给用户看（"联邦税 $0–$57,375 @ 15% = $8,606.25" 这种逐行），降低对账负担、增加可信度
- **部署 + 隐私基础**：Vercel 免费层、域名、HTTPS、隐私政策、服务条款页面
- **错误监控**：Sentry 免费层接入
- ✅ **黄金对账测试集**：15 组 WealthSimple Tax 验证场景（D6–D14 投资收入 + P0 原有），100/100 断言通过

**🟡 决策检查点 1（里程碑 1 上线后）：** 收 5–10 个目标用户的真实反馈，回答三个问题：

1. 用了之后是否改变了 RRSP / FHSA 决策？
2. 他们之前怎么决定（拍脑袋 / Wealthsimple Tax / 会计师）？
3. 还差什么功能？

根据反馈决定里程碑 2 的重点。

#### 🎯 里程碑 2 — P1 完整 + P2 关键（目标：里程碑 1 起 ~2-3 个月）

- **省份扩展 — 剩余**：New Brunswick、PEI、Newfoundland and Labrador、Yukon、NWT、Nunavut
- **Quebec 支持**：~~独立税阶 + Quebec Abatement（16.5%）~~ ✅ TICKET-029 已完成（税阶 + abatement + DTC）；~~QPP vs CPP 完整建模~~ ✅ 已完成（QPP/QPIP/魁省 EI + 增强 QPP 的 Line 248 扣除，QC1/QC2 已 WS+TurboTax 验证）；剩余：QPP2 第二附加（TICKET-030）+ 法语界面
- **配偶联合优化**（P2 但价值高）：两人收入差大时推荐最优 RRSP 分配
- **Spousal RRSP** 推荐
- **扣除项**：工会会费、专业会费、托儿费、搬家费用、资本亏损结转、慈善捐款
- **退休金 + OAS Clawback**：CPP、OAS、公司养老金、OAS 回缴计算
- **结果增强**：敏感性图表、税阶可视化、警告系统完善（OAS clawback / RRSP 超额 / FHSA 上限 / BPA）
- **PDF 导出**：结果页可下载为 PDF
- **Earned Income 智能计算**：自动推算 + 提示新增 RRSP 额度
- **UX 完善**：字段帮助气泡、渐进披露折叠区块、IndexedDB 表单本地保存

**🟡 决策检查点 2（里程碑 2 上线后）：** 评估剩余 P2 功能（HBP / LLP / 多年规划 / 抵免抵扣类）每一项对用户的实际价值，决定哪些做、哪些延后或不做。

#### 🎯 里程碑 3 — 完全收官（目标：里程碑 2 起 ~1-2 个月）

- **剩余 P2 功能**（根据决策检查点 2 的结论挑选）：
  - HBP（Home Buyers' Plan）模拟
  - LLP（Lifelong Learning Plan）模拟
  - 多年规划（3–5 年期 RRSP/FHSA 路径）
  - RRSP 抵扣延后（"今年供款，明年抵扣"）
  - 税收优惠抵免：Canada Workers Benefit、Climate Action Incentive、GST/HST Credit、CCB 估算、Tuition Tax Credit、Disability Tax Credit、Medical Expense Tax Credit
  - 对比功能（多方案 / 省份对比）
- **非功能性收尾**：性能调优（Lighthouse > 90）、WCAG 2.1 AA 可访问性、单元测试覆盖率 > 80%、CI/CD（GitHub Actions）
- **可选**：用户账号体系（注册 / Magic Link 登录 / 多年数据保存 / 端到端加密）—— 取决于用户反馈是否真的需要

### 11.3 时间估算

按"每周投入小时数"换算到 P2 完整收官的大致用时：

| 你这边每周投入 | 大致用时（到里程碑 3 完成） |
|---|---|
| 5 小时/周 | 8–14 个月 |
| 10 小时/周 | 5–9 个月 |
| 20 小时/周 | 3–5 个月 |
| 40 小时/周 | 1.5–3 个月 |

**瓶颈通常在用户侧**：Wealthsimple Tax 对账数据准备、产品决策、CRA 文档查证、真实用户反馈收集。Claude 写代码的部分相对固定。

### 11.4 年度维护

里程碑 3 收官后，进入持续维护阶段：

- **每年 12 月–1 月**：CRA 公布次年税表数据后 1–2 周内更新（新建 `data/{year}/` 目录 + 注册 + 回归测试）
- **每年 1 次**：跑黄金对账测试集（用最新 Wealthsimple Tax 数据）确认无回归
- **用户反馈迭代**：bug 修复 + 小范围功能增强按 ticket 排期

### 11.5 当前节点

P0 已完成 + 里程碑 1 核心计算引擎部分大幅推进。

**已完成（里程碑 1 计算引擎）：**
- TICKET-010/011/012（策略切换器、中文回填、NumberInput）
- TICKET-013/015/016/017/018（EI + 自雇 + 利息 + LIFT + clawback 公式）
- TICKET-024/025/026（BC/ON 股息 DTC 修正 + surtax 顺序 + BC Sales Tax Credit）
- TICKET-027（EI clawback 门槛修正 $79K→$82,125）
- TICKET-028（LIFT 自雇排除）
- TICKET-029（Quebec 税阶 + abatement + DTC）
- D6–D14 投资收入测试全部通过 WS 对账

**下一步建议：** 省份扩展（AB/SK/MB/NS）+ 详细分解 UI + 部署基础，完成里程碑 1 剩余项。

---

## 12. 风险与对策

| 风险 | 对策 |
|---|---|
| 税法计算错误导致用户依赖错误数据 | 强制免责声明 + 用 CRA 案例做回归测试 |
| 年度数据未及时更新 | 自动化提醒 + 用户端显示数据版本 |
| 用户输入错误（如 RRSP 额度填错） | 校验逻辑 + 链接到 CRA My Account 教程 |
| Quebec 税制独特 | TICKET-029 已实现核心支持（税阶 + abatement + DTC）；QPP/QPIP/魁省 EI 及增强 QPP 的 TP-1 Line 248 扣除已建模并经 WS+TurboTax 验证；仅余 QPP2 第二附加（TICKET-030） |
| 复杂边界情况（高净值、信托等） | 检测到复杂情况时引导用户咨询专业人士 |
