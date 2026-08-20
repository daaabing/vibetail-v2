# 当前系统状态

最后核对：2026-08-20（schema 合并为单文件、移除远程/共享 Supabase 项目的叙事后）

本文记录仓库中**已经真实实现的能力**、**当前本地运行模式**以及**尚未接入的后端能力**。它用于避免把“已有 contract 或 adapter”误认为“已经连接生产服务”。如实现或部署状态改变，应同步更新本文。

## 结论

当前系统不是静态前端。它有真实的 Node/Express 后端、HTTP API、服务层、repository boundary、服务端匹配校验和最小管理写入流程。

当前运行链路是：

```text
React browser
  → Express HTTP API
  → VenueService / ManagementService
  → SupabaseVenueRepository（Supabase：本地栈是唯一数据库）
  → DeterministicMatchingProvider（本地默认；staging 为 OpenRouter）
```

数据层只有这一条 Supabase 路径：内存 fixture 模式已移除，`fixtures/venue/menus.json` 现在是 `scripts/generate-seed.mjs` 的 seed 数据源，由 `supabase db reset` 连同迁移一起写入数据库。因此，当前可以称为“已上线的真实 API 后端 + 已验证的 Supabase public read + 已连接 OpenRouter 的 staging AI matching”。Railway staging 当前选择 `openrouter`，并已完成 Global Match 与 venue-specific match 的真实模型调用验收；它仍不能称为“完整的生产后端”。本地数据持久化在本地栈中，`pnpm db:reset`（以及每次 `pnpm test`）会从 seed 重置。

## 已经完成的产品链路

以下链路已实现，并通过自动化测试和真实浏览器验收：

```text
Landing /
  → Global Match /match
  → 从全部符合条件的酒吧和菜单中推荐 merchant + menu + item
  → 进入 /m/:merchantSlug/:menuSlug
  → 在单一酒吧/菜单范围内再次匹配
```

以及：

```text
Bar Management /manage/:privateToken
  → 编辑 merchant
  → 创建/编辑 menu 和 menu item
  → active / sold_out / hidden
  → draft / publish
  → preview/copy venue-specific URL
  → availability 修改立即影响公开匹配结果
```

其他已完成页面：

- `/venues`：active bar 列表和 published menus；
- `/venues/:merchantSlug`：酒吧详情和专属菜单入口；
- `/health`、`/ready`：基础服务端健康接口；
- loading、error、empty、no-active、provider failure 等状态；
- desktop/mobile responsive；
- Landing 基础 metadata。

## 已经完成的后端能力

### Web/API

- Node/Express 服务端 composition root；
- Zod 请求、响应和环境变量校验；
- versioned `/v1` venue、global match 和 management API；
- 结构化错误模型；
- public client 与 management client 分离；
- server-only secret boundary；
- production client/server build。

### Venue 与 matching

- `VenueRepository` 和 `VenueService`；
- active merchant、published menu、published version、item availability 过滤；
- Global Match 和 venue-specific match 共享 preference、matching、验证及 canonicalization；
- model/provider 只允许返回 `matchedItemId + whyThisMatch`；
- provider 返回结果后重新验证 menu ownership 和当前 availability；
- item 名称、价格、描述、配料等事实来自 repository，而不是由模型生成；
- unknown、cross-menu、sold-out、hidden 或 stale ID fail closed。

### Management

- `ManagementService` 和 `ManagementRepository`；
- 服务端 token 验证与 merchant ownership 推导；
- merchant/menu/item 的最小 CRUD；
- publish 时要求至少一个 active item；
- availability 修改即时影响 public/matching read；
- token 不进入 API path、response、结构化日志或 analytics；
- 管理页使用 `noindex,nofollow` 和 `no-referrer`。

### Venue backend（manage v2）

- 账号名登录（MVP 无密码；opaque session token 仅存 sha256，客户端存 localStorage）；
- venue 创建（name/address/venue type，复用 `merchants` 表模型）；
- drink library：venue 级独立实体，一个 drink 可挂多个 menu，编辑全量传播，删除时提示引用菜单并级联移除；
- AI 生成 drink 信息（flavor tags / base spirit / strength / recommendation note），`DrinkInfoProvider` 三实现（deterministic/openai/openrouter），仅作为可编辑草稿建议；
- menu 由 library drinks 派生（`menu_drinks` join，item id = drink id）；draft/published/archived 状态；publish 自动 archive 之前的 published menu；
- 稳定消费者入口 `/m/:venueSlug` 始终解析当前 published menu，QR code（服务端 `qrcode` SVG）编码该 URL；
- 事件闭环：menu view beacon、match event（best-effort，绝不影响匹配成功）、1–5 星 feedback（matchId 为能力凭证，`UNIQUE(match_id)` 幂等）；
- dashboard 聚合（today/7d/30d）：usage、matches、feedback 均值、top drinks、recent comments；
- Supabase 侧：本地栈是唯一数据库，schema 全部在 `infra/supabase/migrations/0000_schema.sql`，由 `supabase db reset` 重放；无 service-role key 时管理端 503 fail closed，公共事件降级为 no-op；
- 旧 `/manage/:token` 私链流保持原样，作为过渡期兼容层。

### Seed 数据与验证

- seed 源为 `fixtures/venue/menus.json`，经 `scripts/generate-seed.mjs` 确定性生成 `infra/supabase/seed.sql`；
- 三个 active demo venues（含 drink-backed 的 `vibetail-taproom` 与 `Demo Bar` 账号、种子 match/feedback 事件）；
- published/draft、active/sold-out/hidden 等覆盖；
- 公开的 legacy management 测试 token（seed 只存 SHA-256 哈希）；
- 全部测试直连本地 Supabase 栈，`pnpm test` 自动 regenerate seed 并 `db reset`；
- lint、strict typecheck、unit/integration tests、production build；
- client bundle secret scan 和 Lovable dependency/runtime scan。

## 当前运行配置

仓库默认配置为：

```text
MODEL_PROVIDER=deterministic
SANDBOX_PROVIDER=local
```

数据层没有开关：venue 数据始终走 Supabase。本地开发需先 `pnpm db:start`，再把 `pnpm db:status` 输出的 `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SERVICE_ROLE_KEY` 填入 `.env`；测试不读 `.env`，由 vitest globalSetup 自动注入本地栈凭证。

本地工作区的 gitignored `.env` 指向本地 Supabase 栈。Railway 项目 `vibetail-staging` / 环境 `staging` 已部署到 `https://vibetailweb-production.up.railway.app`，真实浏览器和公网 smoke 已验证 Landing、Global Match、venue directory、Double Chicken Please deep link、venue-specific match、`/health` 和 `/ready`。没有配置 service-role key，因此真实 management API 安全返回 `503`，未执行数据库写入。Railway 已配置 server-only OpenRouter key、`MODEL_PROVIDER=openrouter` 和 `MODEL_NAME=openai/gpt-5-mini`；真实 Global Match 返回约 4.2 秒，页面端 venue-specific match 也成功显示非模板 AI 文案。PostHog、FC 和 E2B 仍未连接。

本地 legacy management token 是公开测试字符串，不是生产凭证。本地数据持久化在本地 Supabase 栈中，管理修改会立即影响匹配并在重启 dev server 后保留；`pnpm db:reset` 会从 `fixtures/venue/menus.json` 重新生成 seed 并重置数据库。

## 已有边界，但尚未真正接入

| 能力 | 仓库中已有 | 当前没有完成 |
| --- | --- | --- |
| Supabase public read | `SupabaseVenueRepository`、generated database types | 已在 Railway staging 验证 2 个 published menus 和完整 public matching 流程 |
| Supabase management write | server-only `SupabaseManagementRepository`（本地栈上已被完整测试套件覆盖） | 未对任何持久化部署执行写入；线上只跑 public read |
| PostHog | `POSTHOG_KEY`、`POSTHOG_HOST` env schema | 没有 SDK、初始化、事件 taxonomy 或任何 `capture` 调用 |
| Remote AI | OpenRouter Chat Completions + Structured Outputs、direct OpenAI Responses adapter、mock contract tests、web composition switch | Railway staging 已使用 `openai/gpt-5-mini` 完成真实 Global/venue match 验收；仍缺 usage/cost telemetry、rate limit、spend guardrails，Vertex/direct Gemini/Alibaba 尚未实现 |
| Agent worker | workspace、contracts、env validation、provider-neutral boundaries | 没有 Agent state machine、durable run store、queue、checkpoint、approval execution 或实际 worker loop |
| Alibaba FC Sandbox | interface、config type、provider package skeleton | 没有 FC SDK、真实 execute/hibernate/wake/resume、SLS/trace 证据 |
| E2B | interface、config type、provider package skeleton | 没有 live adapter 或 provider parity tests |

“已有 adapter”只代表代码边界已经准备好，并不代表外部服务已经连接或已通过真实环境验收。

## 尚未添加的后端与生产能力

### 数据与身份

- 任何持久化部署的数据库（当前本地栈是唯一数据库）；
- 在 schema 变更后持续重新生成 Supabase types；
- 若将来出现持久化部署，冻结 `0000_schema.sql` 为 baseline 后的增量 migration；
- Supabase Auth；
- merchant membership 和 RBAC；
- 多成员、角色、邀请和完整权限。

### AI 与 matching provider

- 增加 OpenRouter usage、latency 和 cost telemetry；
- provider-specific timeout/retry/usage/cost telemetry；
- 真实模型 structured-output contract tests；
- production rate limiting 和 spend guardrails。

当前 staging 使用 OpenRouter 的 `openai/gpt-5-mini`，通过 OpenAI-compatible Chat Completions + Structured Outputs 返回严格的 `matchedItemId + whyThisMatch`；direct OpenAI Responses adapter 和本地 deterministic fallback 仍保留。系统不会让 AI 自由生成酒名、价格、配料或不存在的 menu item。

接入真实 AI 后仍必须保持：

```text
preferences + server-built allowlist
  → remote model
  → matchedItemId + whyThisMatch
  → server revalidation
  → repository canonical facts
```

### Analytics 与 observability

- PostHog SDK 和初始化；
- Landing → Global Match → Venue → Result 漏斗事件；
- management 安全事件；
- consent/privacy 策略；
- server traces、metrics、alerting 和 SLS integration；
- `/ready` 已执行真实 repository 探测；仍缺少持续 uptime monitoring、traces、metrics 和 alerts。

### Agent、Sandbox 与运维

- Agent durable workflow；
- FC/E2B 实际执行；
- hibernation、wake、resume；
- approval/idempotency 执行链；
- 自动化 promotion/deployment pipeline；当前 Railway staging 由 GitHub 分支部署；
- Alibaba production resources；
- `staging.vibetail.com` 和 `vibetail.com` DNS；
- billing、team management、advanced analytics、custom domain、完整 CMS。

## Supabase 后续接入顺序

1. 已使用 publishable credentials 验证 public read；
2. 对照旧 schema、RLS、`published_version_id` 和 token hash 格式；
3. 运行 active/inactive、published/draft、sold-out/hidden、cross-menu 的真实数据测试；
4. 获取明确授权的 server-only staging credential；
5. 使用专门测试 merchant 验证最小 management write，并准备可恢复数据；
6. 完成 staging 浏览器验收后，才讨论生产切换；
7. 全程不自动 replay 旧 migrations/seeds，不修改 DNS。

## PostHog 接入前的建议范围

先只实现新的产品漏斗：

```text
landing_view
match_started
global_match_completed / global_match_failed
venue_opened
venue_match_completed / venue_match_failed
management_opened
menu_published
item_availability_changed
```

事件不得包含 private token、Authorization、cookie、service role、完整 prompt、原始自由文本偏好或其他敏感数据。PostHog 失败不能阻塞匹配和管理主流程。

## 明确未发生的操作

- 没有修改旧 repository；
- 已连接旧 Supabase 做 publishable-key 只读验证，没有执行 management 或其他数据库写入；
- 没有执行 production migration 或 seed；
- Railway staging 已配置 OpenRouter 并完成真实远程 AI 调用；key 只存在于 Railway server variables，未进入仓库或 browser bundle；
- 没有发送 PostHog 事件；
- 已部署 Railway staging；没有切换 DNS 或修改 `vibetail.com`；
- 没有迁移 Lovable dependency。
