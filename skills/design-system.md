# 设计系统 — 克制极简（v6）

2026-07-20 定稿并落到真实代码。本文档是唯一的视觉规范来源；改样式前先读这里，
改完之后回来更新这里。

设计稿存档在 `design/employment-page-v*.html`，最终版是 `employment-page-v6.html`。

---

## 1. 核心原则

**三种颜色，三种职责。** 这条是整套设计的地基：

| 颜色           | token                       | 职责                       |
| ------------ | --------------------------- | ------------------------ |
| 墨色 `#1F1D1B` | `--accent`                  | **结构**：卡片标题栏、主按钮、focus 环 |
| 蓝色 `#2563EB` | `--prog`                    | **位置 + 品牌**：进度条、结果页滑块、页头 logo 标记 |
| 绿 / 红        | `--positive` / `--negative` | **结果**：退税 / 补税那一个数字      |

墨色是无彩色，永远不抢注意力；正因为如此，蓝色或绿色一出现就自动读作「信息」
而不是「装饰」。**每加一处颜色，就稀释一次这个效果**——所以加颜色之前要先问
它属于上面哪一类。

> 2026-07-21 蓝色的职责扩了一次：原来只给进度条，现在还包括**结果页的滑块**和
> **页头的 logo 标记**。滑块是自洽的——它和进度条一样是「一条刻度上的位置」；
> logo 是新增的第四种职责（品牌标识），刻意只此一处。
> 这两处之外的地方要用蓝色，先回来改这张表。

**只有浅色模式。** 这是白天用的报税工具，深色模式是刻意不做的。

**中性色偏暖，不用纯灰。** 整页尺度上纯灰读起来冷、像医院，而暖灰不花钱。

---

## 2. Tokens

全部定义在 `code/src/app/globals.css` 的 `:root`，通过 `tailwind.config.ts`
映射成 Tailwind class。**永远不要在组件里写死颜色**——改色只应该有一个地方。

```
表面   --page #F7F6F4   --surface #FFF   --surface-sunken #F3F1EE
文字   --text #1F1D1B   --text-secondary #5F5A54   --text-muted #948E86
分隔线 --line #E6E3DE   --line-strong #D4D0C9
墨色   --accent #1F1D1B --accent-hover #3D3934 --accent-bg #EBE8E4
角标   --badge-bg #F2F0EC --badge-line #E0DBD4 --badge-ink #4A453E
进度   --prog #2563EB   --prog-track #DFE5EC
语义   --positive #0F6E56  --negative #A32D2D  --warning-bg/-text
```

**文字只有三级**（`text` / `text-secondary` / `text-muted`）。第四级会让层级
失效——如果觉得需要第四级，通常是布局的问题，不是颜色的问题。

### 字号：封闭的七级

`micro 11 / label 13 / body 14 / amount 16 / title 17 / display 24 / hero 38`

超出这七级就是错误。`hero` 只服务一个东西：结果页的退税/补税金额，
也就是整个工具存在的理由。

> ⚠️ 这些自定义字号名**必须**在 `code/src/lib/utils.ts` 里注册给 tailwind-merge。
> 不注册的话它会把 `text-body` 当成颜色类，然后「解决冲突」把前面真正的
> `text-white` 吃掉——主按钮就会变成深底深字。踩过一次，见 TICKET 记录。

### 圆角

卡片 `9px`（`rounded-card`），控件 `6px`（`rounded-control`）。没有第三种。

---

## 3. 尺寸

参考 Wealthsimple 的表单密度定的：

- 控件高度 **54px**（≤640px 降到 50px）——所有输入框、下拉框、角标统一
- 角标（box number）**54×54px**，紧挨输入框左侧
- 卡片内边距 **20px / 18px**
- 页面 wrap 最大宽度 **960px**

控件高度由 `ui/BoxField.tsx` 里的 `Field` 独占管理。新字段一律经过 `Field`，
这是让不同时间写的四个页面看起来像同一个产品的唯一可靠办法。

---

## 4. 组件

| 组件 | 文件 | 用途 |
|---|---|---|
| `CollapsibleCard` | `ui/CollapsibleCard.tsx` | 页面上的一个区块：深色标题栏 + 可折叠正文 |
| `CollapsibleRow` | 同上 | 卡片**内部**的可选小节，安静版，同一套交互 |
| `Field` | `ui/BoxField.tsx` | 标签 + 控件行的骨架，所有字段的基类 |
| `BoxField` | 同上 | 一个金额（`$` 前缀、右对齐、tabular） |
| `PlainNumberField` | 同上 | 非金额数字（年龄），**左对齐**，免得读成金额 |
| `SelectField` | 同上 | 下拉框，高度与其他控件一致 |
| `BoxGrid` | 同上 | 两列**竖读**网格，保持 slip 上的 box 号顺序 |
| `FieldGrid` | 同上 | 普通行读网格，非 slip 页面用 |
| `Progress` | `ui/Progress.tsx` | 进度条，输入页上唯一的彩色元素 |
| `Button` | `ui/Button.tsx` | primary / secondary / ghost |
| `Mark` | `common/Logo.tsx` | 品牌标记（见下）|

### 品牌标记

一个装了一部分的容器 —— **空的那部分才是重点**。工具里所有数字都在回答
「我还剩多少额度」，所以标记说的是这个，不是「钱」。用 `$` 会掉进全加拿大
报税/贷款服务共用的那个符号池，而那正是名字费了七轮才躲开的地方。

只有两个元素（一个外框、一块填充），所以缩小后还活得下来。填充用显式 path 而
不是 clipPath，这样重复渲染时没有 id 冲突，也能直接粘进 favicon 或 OG 图。
颜色走 `currentColor`，深底反白不用第二份。

含义全在 `Logo.tsx` 顶部那两个常量里：

- `STROKE = 2.2` —— 外框粗细。低于 2 在 favicon 尺寸下会散
- `FILL_TOP = 12.8` —— 填充起点（框体 y 跨 1.2–22.8），**越大填得越少**，当前 ≈ 46%

> 初版是 `2.9 / 13.2`，一半以上面积是实色，读起来像一个挖了个槽的蓝方块 ——
> 唯独没说出「这里还有空间」。把边收细、填充线下移到 15.0 后留白占了主导；
> 后来又提到 12.8（≈46%）让它更扎实、但没到正好一半（正好一半会像通用的
> 对比度／深色模式图标）。要再调只动这两个数。
>
> ⚠️ **标记方向仍未定稿。** 方形容器是暂定，还比过球形容器和玻璃瓶（波纹水面
> 版）两个方向；`FILL_TOP = 12.8` 是在方形容器上定的，换形状要重调。

**已废弃**（无引用，文件顶部有 SUPERSEDED 注释，可删）：
`Card.tsx`、`Label.tsx`、`Select.tsx`、`FieldRow.tsx`、`CollapsibleSection.tsx`。
项目没有版本控制，所以留着而不是直接删；写新代码时不要用它们。

### 为什么 BoxGrid 是竖读的

T4 的 box 号是 14 → 16/17 → 16A/17A → 18 → 22 → 26 → 55。行读的两列网格会走成
14 → 22，再折回 17——这恰好是抄单据时**唯一不会走**的顺序。所以用
`grid-auto-flow: column`，左列读到底再读右列。≤640px 塌成一列，DOM 顺序本来就是
连续的，所以号码顺序自动保持。

---

## 5. 响应式

断点写在 `globals.css`，进度条尺寸由 `--prog-step` 一个变量驱动，
连接线的负 margin 是从它算出来的（`calc()`）。硬编码那些 margin 的话，
每次改尺寸线都会从圆点上错开。

| 宽度 | 变化 |
|---|---|
| ≤900 / ≤760px | 进度条步宽收窄 |
| ≤640px | 网格塌成一列；控件降到 50px；进度条隐藏副标题；hero 降到 display |
| ≤560px | 策略切换器塌成一列 |
| ≤520px | 推荐卡的三个统计数字改成「标签 — 数值」左右排 |
| ≤400px | 进度条步宽再收 |

验证方法：把页面用 `<iframe width="390">` 装起来截图，比改浏览器窗口可靠
（窗口有最小宽度，`resize_window` 不一定真的生效）。同时用 JS 断言
`scrollWidth === clientWidth` 确认没有横向溢出。

---

## 6. 页面结构

四页统一：`h1`（display）+ 一行副标题（body / secondary）+ 若干
`CollapsibleCard` + 底部导航按钮行（`space-y-3.5`）。

**结果页的顺序是刻意的**：答案 → 改变答案的控件 → 演算过程。

1. `RecommendationCard` — 退税/补税，hero 字号，整页唯一的饱和色
2. `StrategySwitcher` — 分段控件，不是三张卡片（这是「同一份数据的三种看法」）
3. `InteractiveScenario` — 滑块 + 双方案对比
4. `Rationale` — 警告**默认展开**（埋起来是这页唯一可能让人赔钱的地方）
5. `ComparisonTable` — 默认折叠

信任工具的人看完第一张卡就可以走；不信的人可以一直读到逐行对比。

---

## 7. 一些踩过的坑

- **零值显示成空**：`NumberInput` 把 `0` 渲染成空字符串 + `0.00` placeholder。
  报税表上「没填」和「填 0」是一个意思，满屏字面量 `0` 会盖住真正填了的数字。
- **标签重复**：i18n 字符串形如 `QPIP premium (Box 55)`。`splitParen()` 保留
  整个括号内容（给区块标题用），`splitBoxRef()` 缩短到能塞进 54px 角标
  （给字段标签用）。用错会出现「Self-employment income (T2125) T2125」。
- **CPP2 字段消失**：不要用 `pensionable > YMPE` 之类的条件去隐藏 Box 17A /
  B.B。只要该年度有 CPP2 就常驻显示。
- **FHSA 不适用时**：不要渲染两个灰掉的输入框让用户猜为什么，直接一句话说明。
