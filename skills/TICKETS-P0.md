# Tax Calculator — Tickets (P0 归档)

> P0 阶段（MVP）的 ticket 归档。新 ticket 请加到 `TICKETS-P1.md`。
> 本文件保留供回溯与对账，默认不再改动。
> **范围说明：** 本文件只记录"有问题需要改"的内容；新功能/范围决策记录在 `feature-list.md`。

---

## 怎么添加 ticket（参考模板）

> 这里只是格式说明，新 ticket 请加到 `TICKETS-P1.md`。

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
**编号规则：** 顺序递增，不复用（TICKET-003, TICKET-004...）

---

## 🔵 Active

> P0 已收官，无 Active ticket。新问题（包括 P0 回归）请加到 `TICKETS-P1.md`。

---

## ✅ Done

<details>
<summary>点击展开 / 折叠（P0 共 7 个已完成 ticket）</summary>

### TICKET-003: RRSP contribution Recommendation 不应该推荐使用完所有的额度
- **Status:** Done
- **Completed:** 2026-05-15
- **Description (原):** By default，系统应该首先推荐补税额为 0 的方案，不应该用尽所有的 available RRSP room。
- **改动内容：**
  - `src/lib/tax/optimizer.ts` 重写为"补税归零（Tax-Owed-Zero）"默认策略
  - 处理 4 种情况：`already_refund`（已退税 → 推荐 $0）/ `zero_owing`（二分搜索找到让补税=0 的最小供款）/ `room_capped`（用尽额度仍欠 → 推荐 = totalRoom）/ `no_room`（无额度可用）
  - 暴露 `OptimizationResult.room`（total/fhsa/rrsp）供 slider 使用
  - 新增 i18n keys：`rationale_strategy_already_refund` / `rationale_strategy_zero_owing` / `rationale_strategy_room_capped` / `rationale_strategy_no_room` / `rationale_try_slider`（中英双语）
- **验证：** 烟测通过 — Case 3（$80K 收入 $12K 扣税）推荐 $6465 让 owing 从 $1822.90 降到 $0.23

### TICKET-004: Employment Income 和 Contribution 字段允许 0
- **Status:** Done
- **Completed:** 2026-05-15
- **Description:** 自雇 / 新移民 / 学生场景下需要把 Employment Income、RRSP room、FHSA room 等字段当 0 是合法值，而不是"空白"。
- **改动内容：** 把表单验证从 `> 0` 改为 `>= 0`，影响 `StepEmployment.tsx` / `StepRoom.tsx` / `StepBasicInfo.tsx` 的输入组件；`useFormStore` 初始值统一为 0。

### TICKET-005: 互动调节器（滑块 + 数字输入框）
- **Status:** Done
- **Completed:** 2026-05-15
- **Description:** 结果页提供供款金额滑块，实时看到不同供款对应的退税。
- **改动内容：**
  - `InteractiveScenario.tsx` 新组件 — 滑块 + 数字 input 双向联动（step=$50），实时调用 `calculateScenario()`
  - 双栏对比（推荐 vs 你的方案）；"恢复推荐值"按钮
  - 新增 i18n：`interactive.*` 整个 namespace

### TICKET-006: Ontario Health Premium (OHP)
- **Status:** Done
- **Completed:** 2026-05-15
- **Description:** ON 用户的省税里漏算了 OHP，真实对账时偏低 $300–$900。
- **改动内容：**
  - `ontario.json` 加 `healthPremium` 分段表（11 段，$0–$900）
  - `provincial-tax.ts` 加 `calculateHealthPremium()`
  - `calculator.ts` 把 OHP 加进 `netProvincialTax`（不可被抵免抵消）
  - `TaxBreakdown` 加 `provincialHealthPremium` 字段

### TICKET-007: CPP 增强部分拆分（基础部分抵免 / 增强部分扣除）
- **Status:** Done
- **Completed:** 2026-05-15
- **Description:** 2019+ CPP 改革后，Box 16 包含 4.95% 基础（line 30800 抵免）+ 1% 增强（line 22215 扣除）。原本全当抵免，导致税额偏低 ~$80–$115。
- **改动内容：**
  - `income.ts` 按 4.95/5.95 比例把 Box 16 拆为 `cppContributionBase` 和 `cppContributionEnhanced`
  - `credits.ts` 只用 base 部分算抵免
  - `calculator.ts` 增强部分作 line 22215 扣除从 netIncome 减
  - `federal.json` 加 `cppBaseRate` / `cppEnhancedRate` / `cppBasicExemption`

### TICKET-008: 2024 税表支持
- **Status:** Done
- **Completed:** 2026-05-15
- **Description:** 5 月之前用户可能还在补报上一年税，需要支持 2024。
- **改动内容：**
  - `src/lib/tax/data/2024/` 加 `federal.json` / `bc.json` / `ontario.json`
  - `TaxYear` 类型 = `2024 | 2025`
  - `data/index.ts` 注册 2024
- **验证：** 真实用户对账 — 2024 ON $67,983.35 → 应用算出 $1,085.34 vs 实际 $1,085.32（差 $0.02 ✓）

### TICKET-009: "预期补税"动态 label
- **Status:** Done
- **Completed:** 2026-05-15
- **Description:** 当 expectedRefund 为负数时，UI 上 label 应该显示"预期补税"而不是"预期退税 -$XXX"。
- **改动内容：** `RecommendationCard.tsx` 按 `roundedRefund > 0 ? expectedRefund : expectedOwing` 切换 label；tone 配色对应。

</details>

---

## 维护说明

- 本文件不再增删 ticket。
- 新发现的 P0 回归问题如果出现（例如 OHP 又算错了），仍然把 ticket 加到 `TICKETS-P1.md`，在 description 里标"P0 回归"。
- 想看 P0 范围决策记录，见 `feature-list.md` 中的 Scope Decisions 区。
