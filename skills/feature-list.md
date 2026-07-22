# RRSP / FHSA 避税计算工具 — 功能清单

按优先级分为 **MVP（P0）**、**P1**、**P2**、**未来想法**。

---

## 范围决策记录（Scope Decisions）

记录关于"什么进 P0、什么推迟"的关键决策与理由，避免后期反复讨论。

### 2026-05-15 — 储蓄账户利息收入推迟到 P1

**决策：** P0 不处理储蓄账户利息收入（interest income），整套投资收益归入 P1。

**理由：**
1. **加拿大税制特殊性** — TFSA 内的利息完全免税且不报税；非注册账户的利息按 marginal rate 全额征税并发 T5；RRSP 内延税。直接加一个"利息"字段，用户不一定能正确区分账户类型，反而容易算错。
2. **投资收益必须打包做** — 加拿大对三种投资收益处理完全不同（利息 100% 计入；eligible dividends 需 gross-up + dividend tax credit；capital gains 50% inclusion）。只做利息会让结果对"真正有投资的用户"依然错误，反而误导。
3. **目标用户画像未定** — 在用户画像清楚之前加这个字段是赌用户类型。学生 / 新工作人群基本无应税利息；高收入人群有的话也不止利息。
4. **P0 应聚焦通用必备项** — 工资（T4）+ 联邦税 + 省税（BC/Ontario）+ 基础抵免（BPA、CPP/EI）+ RRSP/FHSA 推荐 这一条主线对所有加拿大纳税人都成立，先做扎实。

**对应位置：** P1 → 多收入类型支持 → 投资收入 → 利息（见下方）

### 2026-05-15 — RRSP/FHSA 推荐默认策略：补税归零（Tax-Owed-Zero）

**决策：** P0 推荐算法默认目标是让 **补税额 = 0**（让 total tax owed = withheld tax），而不是"最大化退税"或"用尽 RRSP/FHSA 额度"。

**具体行为：**
1. **如果不供款就已有退税**（withheld > total tax owed）→ 推荐供款 `$0`，并显示已有的退税金额
2. **如果"补税=0"所需供款 > available room** → 推荐供款 = available room（cap 在上限）
3. **正常情况** → 推荐让 total tax owed 刚好等于已扣 tax 的供款额

**理由：**
1. **保守稳健** — 不鼓励给 CRA 多打"零利息贷款"（最大化退税），也不强制用尽额度（保留未来灵活性）。
2. **可预期性** — "year-end 不补税" 是大多数用户最关心的默认结果。
3. **配套互动调节** — 想最大化退税 / 用完额度的用户可以通过 P0 的滑块自行调整（见 P0 → 输出 → 互动调节器）。

**P1 增强：** 增加策略切换器，让用户在"补税归零 / 退税最大化 / 降到下一个税阶"之间切换（见 P1 → 推荐策略增强）。

**对应位置：** P0 → 优化算法 + 输出；P1 → 推荐策略增强

### 2026-05-15 — 所有数字输入字段必须允许 0

**决策：** P0 阶段所有数字输入字段（Employment Income、各类 Contribution Room、FHSA、CPP/EI 等）**必须接受 `0` 作为合法值**。

**理由：**
- 自雇者可能没有 T4 工资 → Employment Income = 0
- 新移民第一年没有 RRSP available room → RRSP Room = 0
- 学生 / 失业者可能没有 earned income
- FHSA 未开户用户的终身已用额度 = 0

**对应位置：** P0 → 输入 → 输入验证规则

### 2026-05-15 — Ontario Health Premium (OHP) 进入 P0

**决策：** P0 必须计算 Ontario Health Premium，作为 Ontario 用户净省税的一部分。

**背景：** 真实用户对账时发现，不计 OHP 时 ON 用户补税估算偏低 $300–$900。OHP 虽叫"premium"但本质是省级附加税，跟所得税并列加在 T1 上，不可被抵免抵消。

**实现：** `ontario.json` 加 `healthPremium` 分段表（11 段），`provincial-tax.ts` 加 `calculateHealthPremium` 函数，`calculator.ts` 加进 `netProvincialTax`。

**对应位置：** P0 → 计算引擎 → 省累进税计算（BC + Ontario，含 OHP）

### 2026-05-15 — CPP 增强部分作为净收入扣除，不是抵免

**决策：** P0 把 T4 Box 16 CPP 按 4.95/5.95 比例拆分：基础部分（4.95%）作非退还抵免（line 30800），增强部分（CPP1，1%）作净收入扣除（line 22215）。

**背景：** 2019 年 CPP 改革后引入"增强 CPP"。CRA 规则明确：
- 基础部分（4.95% × pensionable earnings）→ line 30800 抵免
- 增强部分（1% × pensionable earnings）→ line 22215 扣除
- CPP2（Box 16A, 4%, 仅 YMPE 以上）→ line 22215 扣除（P0 暂不支持 Box 16A 输入）

把全部 CPP 当抵免会导致税额偏低约 $80–$115（取决于边际税率）。

**对应位置：** P0 → 计算引擎 → CPP 抵免拆分 + CPP 增强扣除

### 2026-05-15 — P0 同时支持 2024 + 2025 税表

**决策：** P0 至少支持最近两年税表（2024 + 2025），允许用户用历史数据对账。

**理由：**
1. **对账验证** — 用户用历史 T4 + 真实补税金额能直接验证应用准确性
2. **支持去年报税场景** — 5 月之前用户可能还在补报上一年税
3. **每年只需新增一个 JSON 文件** — 维护成本低

**实现：** `data/2024/` 目录下含 `federal.json` / `bc.json` / `ontario.json`，`TaxYear` 类型 = `2024 | 2025`，`data/index.ts` 注册两年配置。

**对应位置：** P0 → 输入 → 选择税务年度（2024 或 2025）

---

## P0 — MVP 必备功能

目标：用户能完成"输入工资 → 得到 RRSP/FHSA 推荐方案 → 看到退税金额"的核心流程。

### 输入

> **输入验证规则（必备）：** 所有数字输入字段必须允许 `0` 作为合法值。包括 Employment Income、RRSP/FHSA Available Room、FHSA 终身已用额度、CPP、EI、已扣联邦/省税等。验证逻辑用 `>= 0`，禁止把 `0` 当作"空值/未填写"。

- [x] 选择税务年度（**支持 2024 + 2025**，默认当前年）
- [ ] 选择省份/地区（MVP 至少支持 BC + Ontario + Quebec）
- [ ] 输入年龄
- [ ] 标记是否首次购房者
- [ ] **工资收入输入**：T4 总工资、已扣联邦税、已扣省税、CPP、EI
- [ ] **RRSP 可用额度输入**（手动从 CRA Notice 填写）
- [ ] **FHSA 可用额度输入**（手动填写，含本年额度 + 结转）
- [ ] **FHSA 终身已用额度**

### 计算引擎

- [x] 联邦累进税计算
- [x] 省累进税计算（BC + Ontario + Quebec）
- [x] **Ontario surtax**（20% over base / 36% over upper）
- [x] **Ontario Health Premium (OHP)** — 按应税收入分段（$0–$900），不可被抵免抵消
- [x] Basic Personal Amount 抵免（联邦 + 省，含联邦高收入 phase-out）
- [x] **CPP 抵免（仅基础部分 4.95%）** — 按 4.95/5.95 比例从 Box 16 拆出
- [x] **CPP 增强扣除（CPP1, 1%）** — 从净收入里减（line 22215）
- [x] EI premium 抵免
- [x] Canada Employment Amount 抵免（联邦）
- [x] 边际税率与有效税率计算
- [ ] **CPP2 / QPP2 (Box 16A / 17A，RL-1 Box B.B) 输入与扣除** — 仅高收入触发（>YMPE $68,500/2024, $71,300/2025），P0 暂跳过（P1 = TICKET-030）

### 优化算法

- [ ] **默认推荐策略：补税归零（Tax-Owed-Zero）** — 推荐供款额使 total tax owed = withheld tax（见 Scope Decision 2026-05-15）
  - [ ] 边界 1：不供款已有退税 → 推荐 `$0`，显示已有退税金额
  - [ ] 边界 2：所需供款 > available room → 推荐 = available room（cap 在上限）
- [ ] FHSA 优先（首次购房者）
- [ ] 检测"会降到 BPA 以下"并停止推荐
- [ ] 检测超额供款风险（>额度 + $2,000）

> 注：原"降到下一个税阶"策略已挪到 P1 推荐策略增强，作为切换器选项之一。

### 输出

- [ ] 推荐 FHSA / RRSP 供款金额（按默认策略：补税归零）
- [ ] 预期退税金额 / 补税金额
- [ ] 节省税款金额
- [ ] 对比表：不供款 vs 推荐方案
- [ ] 简短解释（"为什么推荐这个金额"）

#### 互动调节器（用户自定义场景）

- [ ] **供款金额滑块（slider）**：范围 `$0` 到 available room
- [ ] **精确数字输入框**：与滑块双向联动（任一变化另一同步）
- [ ] **实时计算**：用户改动供款 → 退税/补税/有效税率/剩余 room 实时更新
- [ ] **方案对比 panel**：推荐方案 vs 用户自定义方案并排显示
- [ ] 默认显示推荐方案；用户调节后保留"重置到推荐值"按钮

### 基础 UI

- [ ] 多步表单（Wizard）
- [ ] 移动端响应式
- [ ] 中英文切换
- [ ] 免责声明（首页 + 结果页）

---

## P1 — 短期内重要功能

目标：覆盖大多数加拿大纳税人的收入场景。

### 多收入类型支持

- [x] **EI 福利**：金额、是否产假/陪产、已扣税 — TICKET-013 (2026-05-16)
- [x] **EI Clawback** 计算（非产假 EI） — TICKET-013 + TICKET-017 (公式修复, 2026-05-17) + **TICKET-027**（门槛修正：2024=$79,000, 2025=$82,125 = 1.25×MIE，2026-06-07）
- [x] **自雇/合同收入**：净收入、自付 CPP（双份自动算） — TICKET-013 + TICKET-018 (CPP payable 加入 owing, 2026-05-17)
- [x] **Ontario LIFT Credit**（低收入个人和家庭税收抵免，单身版本） — TICKET-016 (2026-05-17) + **TICKET-028**（修复：仅 T4 employment income ≥ $3,000 才适用，自雇不符合，2026-06-07）
- [x] **投资收入**（核心已完成，D6–D14 全部通过 WS 对账）：
  - [x] 利息 — TICKET-015 (2026-05-17, UI 已暴露,引擎一直支持)
  - [x] 加拿大合资格股息（含 gross-up 1.38 + 联邦/省 DTC） — D6/D7/D8/D10/D13/D14 验证通过
  - [x] 加拿大非合资格股息（含 gross-up 1.15 + 联邦/省 DTC） — D9/D12 验证通过；TICKET-024 修正 BC DTC 率、TICKET-025 修正 ON surtax/DTC 顺序
  - [ ] 外国股息（含 Foreign Tax Credit）
  - [x] 资本利得（50% inclusion） — D11/D14 验证通过
  - [ ] 资本亏损（抵消利得 + 结转）
- [ ] **出租房净收入**
- [ ] **退休金**：CPP、OAS、公司养老金
- [ ] **OAS Clawback** 计算

### 扣除项

- [ ] 工会会费 / 专业会费
- [ ] 托儿费
- [ ] 搬家费用
- [ ] 资本亏损结转
- [ ] 慈善捐款（联邦 + 省抵免）

### 省份扩展

- [ ] Alberta
- [ ] Saskatchewan
- [ ] Manitoba
- [ ] Nova Scotia
- [ ] New Brunswick
- [ ] PEI
- [ ] Newfoundland and Labrador
- [ ] Yukon、NWT、Nunavut

### Earned Income 智能计算

- [ ] 自动从输入推算 Earned Income（区分计入 vs 不计入）
- [ ] 提示用户"你今年新产生的 RRSP 额度约 $X"

### 推荐策略增强

- [x] **策略切换器**（TICKET-010 — 2026-05-16，代码就位待本地验收）：用户在三种推荐目标间切换
  - [x] 补税归零（P0 默认；保持向后兼容）
  - [x] 退税最大化（用尽 available room，但推过 federal BPA 则在 BPA 边界停下，标签 `max_refund_bpa_capped`）
  - [x] 降到下一个税阶（找让 combined marginal 降一档的最小供款；不够则 `drop_bracket_capped`；已最低则 `already_lowest_bracket`）
- [x] 切换策略时实时重算推荐供款额（useMemo 依赖 strategy）
- [x] 在结果页明确显示当前选用的策略名称 + 一句话解释（RecommendationCard chip + StrategySwitcher 描述）

### 结果增强

- [ ] **敏感性图表**：横轴供款额，纵轴退税，标出推荐点
- [ ] **税阶可视化**：用条形图显示收入分布在各税阶的部分
- [ ] **详细分解面板**：展示每一步税额来源
- [ ] **警告系统**：
  - [ ] 接近 OAS clawback
  - [ ] RRSP 超额风险
  - [ ] FHSA 终身上限剩余少
  - [ ] 当年抵扣会降到 BPA 以下
- [ ] **PDF 导出**：结果页可下载为 PDF

### UX

- [ ] 字段旁说明气泡 / 帮助链接
- [ ] "渐进披露"折叠区块
- [ ] 表单数据本地保存（IndexedDB），刷新不丢

> 注：原"实时计算（边输入边更新结果）"已提升至 P0（见 P0 → 输出 → 互动调节器）。

---

## P2 — 中期增强功能

目标：支持复杂场景与高级用户。

### Quebec 支持

- [x] Quebec 税阶 + 抵免 — 2026-06-08（4 档税率 14%/19%/24%/25.75% + QC BPA $18,571/$18,056）
- [x] Quebec Abatement（16.5%）— 2026-06-08（联邦基础税 × 16.5% 减免，含边际税率调整）
- [x] Quebec 股息税收抵免（合资格 11.70%、非合资格 3.42%）— 2026-06-08
- [x] QPP / QPIP / 魁省 EI 费率建模 — 2026-06-08（QPP 6.40% vs CPP 5.95%、QPIP 0.494%、QC EI 1.31%；含增强 QPP 在 TP-1 Line 248 的魁省端扣除）。QC1/QC2 已 WS+TurboTax 验证（2026-06-30）
- [x] RAMQ 药险费按收入测试（TP-1 Line 447 / Schedule K）— 2026-06-30（单人豁免阈值 2025 $19,890 / 2024 $18,910，以下为 $0，以上封顶 $755 / $737.50）。修复了原「固定 $755」bug；2026-07-19 再修 2024 上限 $731 → **$737.50**（RAMQ 费率 7/1 调整，年度取两半年均值），经 WS 实测逐行吻合
- [ ] **QPP2（第二附加，RL-1 Box B.B / T4 Box 17A）** — 仅收入 > YMPE 触发，暂不建模（P1，与 CPP2 同批）
- [ ] 法语界面

### 高级税务功能

- [ ] **多 T4 / 多收入源支持** — 年中换工作 / 兼职 / 多雇主场景；含 EI overpayment（line 45000，T4 Box 24）— TICKET-019 已 backlog
- [ ] **Spousal RRSP** 推荐（配偶收入差异大时）
- [ ] **配偶联合优化**：两人输入数据，工具推荐最优分配
- [ ] **HBP（Home Buyers' Plan）模拟**
- [ ] **LLP（Lifelong Learning Plan）模拟**
- [ ] **RRSP 抵扣延后**："今年供款，明年抵扣"
- [ ] **多年规划**：3-5 年期 RRSP/FHSA 路径

### 税收优惠抵免

- [ ] Canada Workers Benefit（CWB）
- [ ] Climate Action Incentive
- [ ] GST/HST Credit
- [ ] Canada Child Benefit（CCB）估算
- [ ] Tuition Tax Credit（学费抵免）
- [ ] Disability Tax Credit
- [ ] Medical Expense Tax Credit

### 用户账号体系（可选）

- [ ] 注册/登录（Email + Magic Link）
- [ ] 多年数据保存与对比
- [ ] 端到端加密（客户端加密后存云端）

### 对比功能

- [ ] **不同方案对比**：用户自定义多个方案并排比较
- [ ] **省份对比**：如果用户考虑搬省，对比税负差异

---

## 未来想法（探索性）

### AI / 智能化

- [ ] **自然语言输入**："我去年工资 8 万，今年想买房，怎么放钱？"
- [ ] **OCR T4 上传**：拍照自动提取数字
- [ ] **CRA My Account 集成**（如果 CRA 开放 API）

### 教育内容

- [ ] **税务知识库**：内置文章解释 RRSP/FHSA/TFSA 区别
- [ ] **互动教程**：新手向导，边输入边学
- [ ] **常见误区**：如"FHSA 取出来要交税吗？"

### 拓展账户

- [ ] **TFSA 优化**（虽然不抵税，但用于综合规划）
- [ ] **RESP**（子女教育储蓄）规划
- [ ] **RDSP**（残障人士储蓄）规划

### 投资集成

- [ ] 链接 Wealthsimple / Questrade API（OAuth 只读）
- [ ] 自动读取股息、利息、资本利得
- [ ] 投资税务效率建议（哪些资产放哪类账户）

### 社区与变现

- [ ] **CPA / 财务顾问转介**：复杂情况一键预约
- [ ] **付费 Pro 版**：多年规划、PDF 报告、配偶联合优化
- [ ] **B2B 版本**：给会计师事务所内部使用

### 移动 App

- [ ] iOS / Android 原生 App
- [ ] 提醒功能（"RRSP 截止日还有 30 天"）

---

## 非功能性需求

### 性能
- [ ] 首屏加载 < 2 秒
- [ ] 计算响应 < 100ms
- [ ] Lighthouse 分数 > 90

### 兼容性
- [ ] Chrome、Safari、Firefox、Edge 最新两个版本
- [ ] iOS Safari、Chrome Mobile
- [ ] 屏幕 320px – 4K

### 安全与隐私
- [ ] HTTPS 强制
- [ ] CSP 头部
- [ ] 不收集 PII（MVP 阶段）
- [ ] 隐私政策与服务条款页面

### 可访问性
- [ ] WCAG 2.1 AA 级
- [ ] 键盘可操作
- [ ] 屏幕阅读器友好
- [ ] 颜色对比度 ≥ 4.5:1

### 监控
- [ ] 错误监控（Sentry）
- [ ] 性能监控（Web Vitals）
- [ ] 隐私友好的使用分析（Plausible）

### 维护
- [ ] 税法数据按年度版本管理
- [ ] 单元测试覆盖率 > 80%（计算引擎）
- [ ] 用 CRA 官方案例做回归测试
- [ ] 自动化 CI/CD
