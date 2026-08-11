# 当前系统状态

最后核对：2026-08-10（Railway staging 上线与 OpenAI adapter 实现后）

本文记录仓库中**已经真实实现的能力**、**当前本地运行模式**以及**尚未接入的后端能力**。它用于避免把“已有 contract 或 adapter”误认为“已经连接生产服务”。如实现或部署状态改变，应同步更新本文。

## 结论

当前系统不是静态前端。它有真实的 Node/Express 后端、HTTP API、服务层、repository boundary、服务端匹配校验和最小管理写入流程。

但当前默认运行链路是：

```text
React browser
  → Express HTTP API
  → RestaurantService / ManagementService
  → 内存 FixtureRestaurantRepository
  → DeterministicMatchingProvider
```

因此，当前可以称为“已上线的真实 API 后端 + 已验证的旧 Supabase public read + 可切换 OpenAI adapter”。Railway staging 目前仍选择 deterministic provider，因为尚未配置 OpenAI API key；所以不能称为“完整 Supabase management + 已连接真实 AI 的生产后端”。fixture 数据和 fixture 管理修改只存在于当前服务进程内，重启服务后会恢复。

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
  → preview/copy restaurant-specific URL
  → availability 修改立即影响公开匹配结果
```

其他已完成页面：

- `/restaurants`：active bar 列表和 published menus；
- `/restaurants/:merchantSlug`：酒吧详情和专属菜单入口；
- `/health`、`/ready`：基础服务端健康接口；
- loading、error、empty、no-active、provider failure 等状态；
- desktop/mobile responsive；
- Landing 基础 metadata。

## 已经完成的后端能力

### Web/API

- Node/Express 服务端 composition root；
- Zod 请求、响应和环境变量校验；
- versioned `/v1` restaurant、global match 和 management API；
- 结构化错误模型；
- public client 与 management client 分离；
- server-only secret boundary；
- production client/server build。

### Restaurant 与 matching

- `RestaurantRepository` 和 `RestaurantService`；
- active merchant、published menu、published version、item availability 过滤；
- Global Match 和 restaurant-specific match 共享 preference、matching、验证及 canonicalization；
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

### Fixture 与验证

- 两个 active demo restaurants；
- published/draft、active/sold-out/hidden 等覆盖；
- local-only fixture management tokens；
- lint、strict typecheck、unit/integration tests、production build；
- client bundle secret scan 和 Lovable dependency/runtime scan。

## 当前运行配置

仓库默认配置为：

```text
RESTAURANT_REPOSITORY=fixture
MODEL_PROVIDER=deterministic
SANDBOX_PROVIDER=local
```

当前工作区已在 gitignored `.env` 中配置旧 Supabase 的 URL 和 publishable key。Railway 项目 `vibetail-staging` / 环境 `staging` 已部署到 `https://vibetailweb-production.up.railway.app`，真实浏览器和公网 smoke 已验证 Landing、Global Match、restaurant directory、Double Chicken Please deep link、restaurant-specific match、`/health` 和 `/ready`。没有配置 service-role key，因此真实 management API 安全返回 `503`，未执行数据库写入。OpenAI adapter 已实现但没有 API key，staging 仍使用 deterministic；PostHog、FC 和 E2B 仍未连接。

本地 fixture management token 是公开测试字符串，不是生产凭证。fixture repository 在服务端内存中可变，用于验证管理修改会影响匹配；重启 dev server 会恢复 `fixtures/restaurant/menus.json`。

## 已有边界，但尚未真正接入

| 能力 | 仓库中已有 | 当前没有完成 |
| --- | --- | --- |
| Supabase public read | `SupabaseRestaurantRepository`、generated database types | 已在 Railway staging 验证 2 个 published menus 和完整 public matching 流程；生产切换未执行 |
| Supabase management write | server-only `SupabaseManagementRepository` | 未对 staging/production 执行写入，未验证真实 token/schema/RLS 兼容性 |
| PostHog | `POSTHOG_KEY`、`POSTHOG_HOST` env schema | 没有 SDK、初始化、事件 taxonomy 或任何 `capture` 调用 |
| Remote AI | OpenAI Responses API + Structured Outputs adapter、mock contract tests、web composition switch | staging 尚无 API key，仍运行 deterministic；没有真实调用验收、usage/cost telemetry，Vertex/Gemini/Alibaba 尚未实现 |
| Agent worker | workspace、contracts、env validation、provider-neutral boundaries | 没有 Agent state machine、durable run store、queue、checkpoint、approval execution 或实际 worker loop |
| Alibaba FC Sandbox | interface、config type、provider package skeleton | 没有 FC SDK、真实 execute/hibernate/wake/resume、SLS/trace 证据 |
| E2B | interface、config type、provider package skeleton | 没有 live adapter 或 provider parity tests |

“已有 adapter”只代表代码边界已经准备好，并不代表外部服务已经连接或已通过真实环境验收。

## 尚未添加的后端与生产能力

### 数据与身份

- 旧 Supabase service-role management 连接；
- staging 数据库验收；
- 在 schema 变更后持续重新生成 Supabase types；
- 审核后的 additive migration；
- Supabase Auth；
- merchant membership 和 RBAC；
- 多成员、角色、邀请和完整权限；
- durable persistence；当前 fixture 修改重启即丢失。

### AI 与 matching provider

- 为 staging 配置 OpenAI API key 并完成真实远程 AI 调用验收；
- provider-specific timeout/retry/usage/cost telemetry；
- 真实模型 structured-output contract tests；
- production rate limiting 和 spend guardrails。

当前 staging 的 deterministic matcher 是规则评分器，不是大模型。它会从允许的候选 item 中选择一个 ID 并生成模板化解释。OpenAI adapter 已能通过 Responses API Structured Outputs 返回严格的 `matchedItemId + whyThisMatch`，但没有 key 时不会启用。系统不会让 AI 自由生成酒名、价格、配料或不存在的 menu item。

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
- Landing → Global Match → Restaurant → Result 漏斗事件；
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
restaurant_opened
restaurant_match_completed / restaurant_match_failed
management_opened
menu_published
item_availability_changed
```

事件不得包含 private token、Authorization、cookie、service role、完整 prompt、原始自由文本偏好或其他敏感数据。PostHog 失败不能阻塞匹配和管理主流程。

## 明确未发生的操作

- 没有修改旧 repository；
- 已连接旧 Supabase 做 publishable-key 只读验证，没有执行 management 或其他数据库写入；
- 没有执行 production migration 或 seed；
- 已实现 OpenAI adapter，但没有配置 API key，因此没有发生真实远程 AI 调用；
- 没有发送 PostHog 事件；
- 已部署 Railway staging；没有切换 DNS 或修改 `vibetail.com`；
- 没有迁移 Lovable dependency。
