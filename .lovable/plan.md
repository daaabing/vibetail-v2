# Menu Onboarding & Drink Matching — Sunday MVP

按你的确认收紧到最小可用链路：Merchant 通过 SQL 后台手动创建；DCP 迁移到新架构并 301；游戏输出加结构化字段并顺便优化正面文案；PDF/图片识别、Duplicate、多语言编辑、Advanced UI 全部延后。

## 目标端到端链路（唯一必须跑通的）
1. 我用 SQL 建一个 Merchant + 一个私密管理 token（bcrypt 哈希）
2. Merchant 打开 `/manage/:privateToken`，创建 Menu、手动加饮品、勾选启用游戏、Preview、Publish
3. 生成 `/m/:merchantSlug/:menuSlug` 公开 URL + QR
4. 用户扫码 → 21+ 确认 → 现有 Vibetail 游戏（保留所有问题/交互）→ 正面显示现有心情结果 → 点击卡片翻面 → 背面显示匹配的真实 Menu Drink
5. Sold out 立即生效；PostHog 事件带 merchant/menu/game 上下文

## 架构分层
- **Game Layer**: `src/lib/games/registry.ts`，注册现有 Vibetail 游戏（`vibetail-mood`, v1）
- **Recommendation Layer**: `src/lib/recommendation/engine.ts`，纯函数 `matchMenu(profile, menuItems) → { itemId, score, breakdown, reason }`，权重集中 `weights.ts`
- **Menu Layer**: Supabase 表 + `src/lib/menu/*.functions.ts` server functions

三者互不耦合。未来新游戏只需注册 + 输出 `MatchProfile`。

## 数据库 migration（一次性）
新表（全部 `GRANT SELECT,INSERT,UPDATE,DELETE ... TO service_role`；公开读的 `menus`/`menu_versions`/`menu_items` view 走 anon SELECT with published-only policy）：

- `merchants` (id, slug UNIQUE, name, logo_url, cover_image_url, short_intro, is_active, timestamps)
- `merchant_access_tokens` (id, merchant_id, token_hash, revoked_at, created_at) — token 用 bcrypt/scrypt 哈希，不明文
- `menus` (id, merchant_id, slug, name, status enum draft|published|paused, enabled_game_ids text[], game_display_order text[], published_version_id, timestamps) — UNIQUE(merchant_id, slug)
- `menu_items` (id, menu_id, name, description, ingredients text[], image_url, alcoholic bool, base_spirit, flavor_tags text[], mood_tags text[], dimensions jsonb, allergens text[], recommendation_priority int default 0, availability_status enum active|sold_out|hidden, original_language, translations jsonb, timestamps) — 无价格字段
- `menu_versions` (id, menu_id, version_number, snapshot jsonb, published_at)
- `game_sessions` (id, anonymous_session_id, merchant_id, menu_id, menu_version_id, game_id, game_version, is_preview bool, created_at)
- `game_results` (id, game_session_id, display_result jsonb, match_profile jsonb, created_at)
- `recommendations` (id, game_result_id, menu_id, menu_version_id, matched_menu_item_id, score numeric, score_breakdown jsonb, recommendation_reason text, no_match_reason text, created_at)

RLS：所有表默认拒绝；公开读只针对已发布 menu snapshot 通过 server function 曝光，anon 直连仅限 `merchants(is_active=true)` 和 `menus(status='published')` 的公开字段。管理写全部走 server function + token 校验，不给 anon 直接 write。

## Routes（TanStack Start）
- `src/routes/index.tsx`：改为「Vibetail 游戏大厅」，列出 registry 中 active 游戏（当前只有 Vibetail Mood）
- `src/routes/games.$gameSlug.tsx`：普通游戏模式（现有 landing/mood-input/result 复用，无 menu context）
- `src/routes/m.$merchantSlug.$menuSlug.tsx`：Menu 落地页（Logo/名称/介绍/21+ gate/游戏选择或单一 CTA）
- `src/routes/m.$merchantSlug.$menuSlug.play.$gameSlug.tsx`：带 menu context 的游戏（同样复用现有组件，注入 `menuContext` prop）
- `src/routes/manage.$privateToken.tsx`：Merchant 管理首页（Menu 列表 + Edit/Preview/QR/Pause）
- `src/routes/manage.$privateToken.menu.$menuId.tsx`：Menu 编辑（Basic / Enabled Games / Drinks / Preview / Publish）
- 兼容 301：`src/routes/restaurants.double-chicken-please.tsx` 保留，改为 `throw redirect({ to: '/m/$merchantSlug/$menuSlug', ...})`；`src/routes/restaurant.$id.tsx` 同理

DCP 迁移：写一个 seed migration 把当前 `dcp-menu.ts` 硬编码菜单塞进 `merchants`（slug=`double-chicken-please`）+ `menus`（slug=`main`）+ `menu_items` + 一个 published `menu_versions`。删除 `api/match-dcp-cocktail`，改走统一 recommendation engine。

## Server Functions（`src/lib/**/*.functions.ts`）
- `menu/public.functions.ts`：`getPublishedMenu({merchantSlug, menuSlug})` — 匿名可调，读 published version snapshot
- `menu/manage.functions.ts`：所有写操作，入参含 `privateToken`，内部 bcrypt 验证 → 返回 merchantId；`createMenu` / `updateMenu` / `upsertMenuItem` / `setAvailability` / `publishMenu` / `pauseMenu` / `setEnabledGames`
- `game/session.functions.ts`：`recordGameSession`, `recordGameResult`（写 game_sessions/game_results，preview_mode 标记）
- `recommendation/match.functions.ts`：`matchAndPersist({gameResultId, menuId})` → 跑 engine → 写 recommendations → 返回 matched item；`refreshIfStale({recommendationId})` 处理 sold_out/version 变更

管理入口保护：token 明文只在 URL；服务器每次调用都 bcrypt.compare。前端在 `manage.$privateToken` 的 client-only loader 里做一次 `verifyToken` server fn，通过后把 merchantId 放进 route context 供子组件使用。不写入 localStorage。

## MatchProfile & 生成
扩展 `src/routes/api/generate-cocktail.ts` 的 AI schema，新增：
```
matchProfile: {
  moodTags: string[], flavorTags: string[],
  dimensions: { sweetness, acidity, bitterness, body, strength }, // 0-1
  preferredBaseSpirits: string[],
  alcoholPreference: 'alcoholic'|'non_alcoholic'|'either',
  exclusions: { allergens, ingredients, baseSpirits }
}
```
正面卡片继续用现有 `cocktail_name / tastes_like / ingredients / recipe / roast` 字段——顺便按你答复微调文案 tone，但不改布局。

## Recommendation Engine
纯函数 + 权重表：
```
flavorTagMatch 0.30, moodTagMatch 0.25, dimensionSimilarity 0.20,
baseSpiritMatch 0.10, alcoholPreferenceMatch 0.10, merchantPriorityBoost 0.05
```
- Hard filters: availability≠active、alcohol 冲突、allergens/ingredients/baseSpirits 命中 → 直接排除
- 相似度：tags 用 Jaccard；dimensions 用 1 − avg(|Δ|)
- Priority boost 只在 top-3 打平（top1 − top2 < 0.05）时轻度分流
- 推荐理由：模板拼接命中的 top-2 维度，不再调 AI
- 无匹配：返回 `noMatchReason='all_filtered'`，背面显示「当前菜单里暂时没有符合你偏好的饮品」

## 卡片翻面（餐厅模式）
`ResultCardScreen` 增加可选 `menuMatch` prop：有则背面渲染真实 drink（名/图/配料/描述/推荐理由/Show this screen to the bar），无则保持现有背面。点击翻面时 fire `recommendation_revealed`。

## 无酒精处理 & 21+ Gate
Menu 落地页 loader 读 snapshot：若有 alcoholic=true 且 active 的饮品，显示一次性 21+ 确认（sessionStorage key = menuId）。全无则跳过。

## PostHog
在 `src/lib/analytics.ts` 加辅助 `trackMenuEvent(name, ctx)`，自动合并 merchant/menu/version/game/session/result/recommendation/preview_mode 上下文。新增事件：`menu_landing_viewed / age_gate_viewed / age_gate_confirmed / game_selected / game_started / game_completed / menu_match_generated / recommendation_revealed / no_eligible_menu_item / match_restarted / menu_unavailable_viewed`。Preview 模式全部带 `preview_mode:true`。

## 明确不做（这次）
PDF/图片 AI 提取、Merchant 注册/登录、Duplicate、多语言编辑 UI、Advanced score breakdown UI、图片上传（先只支持贴 URL）、饮品价格、AI 假饮品图、下单/支付/核销。管理 UI 走最朴素表单，不做拖拽排序（用 number input 控制顺序）。

## 交付清单
1. supabase migration（含 seed DCP）
2. Server functions 模块（menu/public, menu/manage, game/session, recommendation/match）
3. Recommendation engine + 权重文件 + 单元覆盖思路
4. Routes：大厅 `/`、`/games/$slug`、`/m/$merchant/$menu`、`/m/$merchant/$menu/play/$game`、`/manage/$token`、`/manage/$token/menu/$menuId`；DCP 老 URL 301
5. `ResultCardScreen` 增加 menuMatch 背面
6. AI schema 扩 matchProfile
7. PostHog `trackMenuEvent` + 事件接入
8. 本地测试步骤 + 周日现场操作 SOP + 已知 fallback（无图片上传/无 PDF 识别）

## 需要你在批准后配合
- 告诉我第一个 Merchant 的 name/slug/简介，我在 migration 里 seed 好并给你私密管理 URL
- 是否需要在 `/` 大厅里保留现有 landing 视觉（我打算沿用，只加一个「Play」按钮 → `/games/vibetail-mood`）

批准后我进 build 模式开工。
