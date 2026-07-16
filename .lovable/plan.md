# Vibetail 两幕调酒流程重构方案

把当前 `MoodInputScreen.tsx` 里"问卷式"的一大页拆成两幕沉浸式体验，酒瓶成为全程视觉与反馈中心。**后端 API、结果卡、餐厅菜单匹配、analytics 事件封装全部沿用**，只重写前端交互层。

---

## 一、范围界定

**会改动的文件**
- `src/components/screens/MoodInputScreen.tsx` — 拆成两幕 + 过场
- `src/components/moodtail/GlassVessel.tsx` — 扩展 props：`fillLevel / hue / bubbles / density / edgeSoftness`，并暴露"原料落入"动画方法
- `src/components/moodtail/BottomNav.tsx` — 在此流程内隐藏（通过路由判断或 prop）
- `src/lib/i18n.tsx` — 新增两幕文案 key（中/英）
- `src/lib/analytics.ts` — 新增 8 个事件（vibe_quick_selected 等）
- 新增 `src/components/moodtail/vibeflow/` 目录，拆出小组件（见下）

**不会改动**
- `src/routes/api/generate-cocktail.ts`、`src/routes/api/menu-match.ts`
- `src/components/screens/ResultCardScreen.tsx` 与翻卡逻辑
- `src/lib/dcp-menu.ts`、`src/lib/menu/*`、`restaurant-ctx.ts`
- Supabase schema、`cocktails-store.ts` 输出结构
- Landing / Gallery / Auth / 结果卡分享逻辑

---

## 二、组件拆分

新增到 `src/components/moodtail/vibeflow/`：

| 组件 | 职责 |
|---|---|
| `FlowProgress.tsx` | 两个液滴形进度点，无 "Step 01/02" 文案 |
| `InteractiveBottle.tsx` | 包装 `GlassVessel`，接收当前 vibe/sensory state 并映射成液位、颜色、气泡、粘度、边缘柔度 |
| `FloatingVibeOptions.tsx` | 5–7 个漂浮 vibe pill，围绕瓶身，选中后向瓶口飞入 |
| `CustomVibeSheet.tsx` | 底部展开输入区（radix Dialog + `vaul` 风格；若无 vaul 就用现有 Sheet） |
| `SensoryControl.tsx` | 单条双向 slider（清爽↔浓郁 等），带端点点击 |
| `DrinkStrengthControl.tsx` | 慢慢喝 ↔ 来点狠的 单轴（映射 long/short） |
| `BaseSpiritPreferenceSheet.tsx` | 折叠入口 + 展开列表（受菜单约束） |
| `ReferenceDrinkInput.tsx` | "+ 我脑子里已经有一杯酒" 折叠输入 |
| `GenerationTransition.tsx` | 过场：瓶塞盖下 + 摇晃 + 混合 |
| `vibeFlowMapping.ts` | 三向感官值 → 现有 flavor tags / long-short 的纯函数 |

---

## 三、状态与后端映射

新增前端 state（不上库）：
```ts
sensoryFreshRich: number       // 0–100，默认 50
sensorySoftBold: number        // 0–100，默认 50
sensoryFamiliarUnexpected: number
hasCustomizedFlavor: boolean
interactionStage: "vibe" | "transition" | "sensory" | "generating"
```

提交前 `vibeFlowMapping.ts` 把它们折叠回**现有** payload：
- 三向 slider → 2–4 个 flavor tags（既有中文枚举），例：
  - fresh<40 → 加 `酸/气泡/柑橘/干型` 中 2 个
  - rich>60 → 加 `酒感/泥土/烟熏/苦` 中 2 个
  - soft>60 → `甜/奶感/果香/花香`；bold<40 → `辣/苦/烟熏`
  - familiar>60 → `甜/果香/柑橘`；unexpected<40 → `草本/花香/泥土`
- 若 `hasCustomizedFlavor` 为 true，用户手选 flavors 覆盖上面
- 强度轴 → `drinkLength: "long" | "short"`
- 基酒空 → 不传（后端已支持"自动")

**API schema 不变**，`generate-cocktail` / `menu-match` 收到的 JSON 结构一致。

---

## 四、第一幕：Vibe

进入即隐藏 `BottomNav`（通过 `MoodInputScreen` 挂 `data-flow="vibe"` + BottomNav 内路由判断跳过，或直接在两个路由不渲染）。

结构：
```
[← 返回]     [◉ ○]  FlowProgress
       "把你现在的状态，倒进来。"
        选一个最像的，或者随便写一句。

        ┌───────────────┐
        │  Interactive  │  瓶身占屏高 34%
        │    Bottle     │  初始几乎空、微光呼吸
        └───────────────┘

     ⌜ 暧昧局 ⌟   ⌜ 拼酒局 ⌟
   ⌜ 成年人的崩溃 ⌟   ⌜ 出来见世面 ⌟
     ⌜ 今天全靠氛围感 ⌟  ⌜ 人间清醒 ⌟
              ⌜ 随机来一个 ⌟

   还是你自己说：今天到底怎么了？ ›

                       [ 继续调味 ]  ← 选后出现
```

交互：
- 点 pill → pill 缩小飞向瓶口 → 瓶内液位 +18%，色调由 vibe → hue LUT，气泡涌一次
- 已选 pill 保持高亮，其他 opacity 0.45，可再点切换
- 副标题变成本地预设反馈句（`vibe → response` 映射，无 AI 调用）
- 自定义入口点击 → bottom sheet；提交后播放"文字落入"动画，跳过 pill 高亮
- 未选/未输入前隐藏底部 CTA；选定后 CTA `继续调味` fade-in

---

## 五、过场（0.9s）

- pill/文本余像收进瓶口
- 瓶身左右晃 1 次（±4°）
- 液面重新聚色形成第一层
- 中央短暂显示 `收到。现在给它一点味道。`
- 第二幕控件从底部滑入

---

## 六、第二幕：Sensory

结构（默认一屏内可见）：
```
[← 返回]    [○ ◉]
       "想把它调成什么感觉？"
         凭直觉选，不用懂酒。

        ┌───────────────┐
        │  Bottle 保留   │  瓶高降到 24%
        │  已有颜色      │
        └───────────────┘

  清爽 ●━━━━━━━━━━ 浓郁
  柔和 ━━━●━━━━━━ 刺激
  熟悉 ━━━━━●━━━━ 意外

   现在的感觉：清爽、柔和，带一点意外。

   › 我想自己选具体味道
   › 今晚想慢慢喝，还是来点狠的？
   › 基酒交给我们 · 我有偏好
   › ＋ 我脑子里已经有一杯酒

   ────────────────────────
   [   这杯交给你了   ]  sticky
```

滑动时 `InteractiveBottle` 实时响应：
- fresh↔rich：色相 & 液体粘度
- soft↔bold：边缘柔度 / 加入细颗粒
- familiar↔unexpected：单色 vs 分层渐变

摘要句由 sensory state 拼合本地词汇生成。

三个 accordion（可选精细口味 / 强度 / 基酒 / 参考酒）默认全部收起。基酒展开时若 `restaurantCtx` 存在，则只列菜单允许 spirits；只剩 1 种时整块隐藏。

---

## 七、CTA 与生成

- 未动过 sensory：`这杯交给你了`；动过：`按这个感觉调一杯`
- 点击 → 禁用 → `GenerationTransition`（瓶塞落下、晃动 700ms）→ 调用现有 `generateCocktail` / `matchMenu`
- Loading 文案轮换（i18n）：`正在读懂你的状态… / 正在挑选合适的风味… / 正在把崩溃调得顺口一点…`，仅当有 `menuId` 时插入 `正在匹配今晚的菜单…`

---

## 八、Analytics

复用现有 `track()`。新增事件（payload 都带 `restaurant_id? menu_id? session_id`）：
`vibe_quick_selected`, `vibe_custom_submitted`(不带原文，只 length), `vibe_ingredient_animation_completed`, `sensory_control_changed`(control_name/value), `detailed_flavors_expanded`, `base_spirit_preference_opened`, `reference_drink_expanded`, `drink_generation_started`.

---

## 九、可访问与响应式

- 375 / 390 / 430 全部一屏检查
- `prefers-reduced-motion`：所有位移动画退化成 opacity + 微 scale，过场缩到 200ms
- CTA 使用 `pb-[calc(env(safe-area-inset-bottom)+16px)]`
- Sheet 打开时 body 锁滚，键盘弹起用 `visualViewport` 抬升
- 桌面：`max-w-[520px] mx-auto`

---

## 十、实施顺序

1. 抽 `vibeFlowMapping.ts` + 扩 `GlassVessel` props（不破坏现调用）
2. 建 `vibeflow/` 组件骨架
3. 用新组件在 `MoodInputScreen` 内替换第一幕，跑通选 vibe → 瓶反馈
4. 加过场 + 第二幕
5. 接回现有 submit 路径 + analytics
6. 隐藏 `BottomNav` in-flow
7. 逐宽度、reduced-motion、餐厅菜单三种场景回归

完成后向你展示新的 `/mood-input` 两幕效果，`ResultCardScreen` 与后端契约完全不动。
