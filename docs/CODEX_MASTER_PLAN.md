你现在位于一个全新的 Vibetail 长期产品 repository。

你的任务是在这个新 repo 中搭建 Vibetail 的长期架构，并完成 8 月 22 日 Hackathon Demo 所需的 MVP。

请不要把旧 Lovable repository 整体迁移过来。旧 repo 是只读 reference，但为了保证 Demo 进度，第一阶段允许临时复用旧 UI 和旧 restaurant flow。新的 UI 和 restaurant flow 正在由另外两位开发者并行开发，后续会迁入并替换临时实现。

当前最重要的工作是：

1. 建立新的、完全脱离 Lovable 的 repository；
2. 临时跑通旧 restaurant UI 和旧 restaurant flow；
3. 建设新的 restaurant backend boundary；
4. 建设 Agent backend；
5. 接入 Alibaba AgentRun / FC Sandbox；
6. 支持 approval、hibernate、wake、resume；
7. 保证未来可以切换到 E2B、Vertex AI 或其他 provider；
8. 为另外两位开发者后续替换 UI 和 restaurant flow 留出稳定边界。

目标日期：8 月 22 日 Hackathon Demo。

除非缺少必须的外部凭证，否则不要因为非关键问题停下来询问。采用合理默认值，把假设记录在文档里，并持续实现和验证，不要只输出计划。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
一、已经确定的项目决策
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

以下决策已经确定，不需要重新讨论：

1. 创建并使用全新的长期 repository。
2. 旧 Lovable repo 保持为 reference、rollback 和历史记录。
3. 从现在开始，新 repo 是长期产品的 source of truth。
4. 第一阶段允许临时复用旧 UI 和旧 restaurant flow。
5. 新 UI 和新 restaurant flow 由另外两位开发者并行开发，后续迁入新 repo。
6. 当前不要重新设计 restaurant UI，不要重复实现他们正在做的工作。
7. 继续使用现有的 Supabase project，但应用代码必须通过新的边界访问。
8. 继续使用 PostHog。
9. Lovable Cloud、Lovable AI Gateway 和 Lovable packages 不再作为新系统依赖。
10. 当前 MVP 不需要 AI 生图。
11. Gemini 生图相关代码不迁移。
12. Hackathon 使用 Alibaba AgentRun / FC Sandbox。
13. 长期 sandbox provider 不能锁死在 Alibaba，必须支持 E2B 或其他 provider。
14. 长期模型可能使用 Vertex AI、Gemini、OpenAI、Alibaba model 或其他 provider。
15. 模型和 sandbox 都必须通过 provider adapter 使用。
16. 部署可以优先兼容 Railway，但业务代码不能依赖 Railway 私有能力。
17. 当前不要切换 vibetail.com DNS。
18. Demo 可以先使用新的临时公开 URL。
19. 未经用户明确授权，不执行生产数据库 migration、生产 deployment 或域名切换。
20. Agent workflow state 必须存在 sandbox 之外，不能只存在内存或 sandbox session 中。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
二、产品目标
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Vibetail MVP 包含两个主要 vertical：

A. Restaurant experience

用户：

1. 打开餐厅专属 URL；
2. 查看餐厅上下文；
3. 输入 mood、口味和偏好；
4. 系统从该餐厅真实且当前可用的 menu item 中选择一个推荐；
5. 用户看到推荐 item 和匹配理由。

Canonical route：

/m/:merchantSlug/:menuSlug

第一阶段可以复用旧 UI 和旧 restaurant flow，但数据访问、matching 和模型调用必须通过新架构。

B. Agent experience

用户：

1. 提交一个 restaurant experience 或 build brief；
2. Agent 在隔离 sandbox 中执行真实代码、测试和 build；
3. Agent 到达 publish 或高风险步骤时请求 human approval；
4. Sandbox 在等待期间 hibernate；
5. 用户批准后通过事件唤醒 workflow；
6. Agent resume 并继续执行；
7. 用户看到状态、日志、trace、artifact 和最终结果。

产品一句话暂定为：

“Vibetail helps restaurants turn a guest’s mood into a personalized real-menu recommendation, while an AI agent safely builds and operates the experience inside an isolated, resumable sandbox.”

将这句话放入 Demo 文档，但不要把它硬编码到不合适的产品页面中。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
三、旧 repository reference
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

旧 repository 的绝对路径：

/Users/wanghan/Desktop/projects/vibetail

Reference commit：

602b08d

把旧 repo 当成只读 reference：

- 不修改；
- 不格式化；
- 不提交；
- 不删除；
- 不在旧 repo 中继续开发新 MVP。

如果无法读取该目录，请明确告诉用户需要把旧 repo 加入 workspace/readable roots。不要猜测文件内容。

首先完整阅读：

1. /Users/wanghan/Desktop/projects/vibetail/docs/MIGRATION_FROM_LOVABLE.md
2. /Users/wanghan/Desktop/projects/vibetail/docs/ARCHITECTURE.md

Hackathon handbook：

/Users/wanghan/Library/Containers/com.tencent.xinWeChat/Data/Library/Application Support/com.tencent.xinWeChat/2.0b4.0.9/1a5795da88ada2e2922dc75c53820033/Message/MessageTemp/c4dfb5651115bbe74927ad1b171b1d8d/File/Alibaba Cloud FC Sandbox · Hackathon Handbook (1-page A4, EN).pdf

使用 PDF 阅读工具完整读取 handbook 的所有页面，不要根据文件名假设它只有一页。

阅读完成后，在新 repo 中创建：

docs/architecture/reference-audit.md

该文件必须记录：

- 哪些旧文件仅用于提取业务知识；
- 哪些旧文件允许临时迁移；
- 哪些逻辑必须重写；
- 哪些内容明确不迁移；
- 哪些临时 UI 将来需要被删除。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
四、允许临时迁移的旧 UI 和 restaurant flow
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

为了尽快完成 Demo，可以从旧 repo 选择性复制 restaurant experience 所需文件。

优先检查：

- src/routes/m.$merchantSlug.$menuSlug.tsx
- src/components/screens/MoodInputScreen.tsx
- src/components/screens/ResultCardScreen.tsx
- src/lib/mood-config.ts
- src/lib/i18n.tsx
- src/lib/matching/types.ts
- src/lib/vibe-examples.ts
- src/lib/vibe-cloud.ts
- src/lib/vibeflow.ts
- src/lib/menu/public.functions.ts

允许迁移：

- restaurant route；
- mood/preferences 输入 UI；
- result UI；
- loading、error、retry、empty state；
- UI 直接依赖的必要基础组件；
- 必要 CSS、font、theme 和 visual assets；
- 中英文 restaurant 文案；
- restaurant flow 所需的类型和配置；
- 已验证的 mobile interaction；
- 旧 flow 中有价值的匹配概念。

只复制 restaurant vertical 当前真正需要的文件。不要为了方便直接复制整个 src 目录。

复制之后：

- 修复 imports；
- 删除 Lovable dependency；
- 删除无关 feature；
- 保持现有 UI 基本可运行；
- 不进行大规模视觉重构；
- 不把临时 UI 当成长期 architecture。

临时 restaurant UI 应明确隔离，例如：

apps/web/src/features/restaurant-legacy/
  components/
  routes/
  adapters/
  styles/

或者根据所选框架采用等价目录。

在目录 README 或代码注释中注明：

TEMPORARY LEGACY RESTAURANT UI
This feature will be replaced by the new restaurant frontend.
Do not add backend or domain logic here.

临时代码只能包含 view、interaction 和 adapter，不能包含：

- Supabase service-role access；
- 模型 SDK；
- FC Sandbox SDK；
- Agent workflow；
- provider-specific backend code；
- production secrets；
- 核心匹配验证逻辑。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
五、旧 repo 中需要提取的业务知识
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A. Public restaurant/menu behavior

重点阅读：

- src/routes/m.$merchantSlug.$menuSlug.tsx
- src/lib/menu/public.functions.ts
- src/lib/matching/types.ts

提取：

- canonical route 语义；
- merchant lookup；
- menu lookup；
- published menu 判断；
- published_version_id；
- merchant inactive；
- menu unpublished；
- menu not found；
- empty menu；
- sold-out 状态；
- loading/error/retry；
- language；
- SEO 和 canonical metadata；
- PublicMenu 和 PublicMenuItem 的必要字段。

不要把旧 data fetching 原样散落到新 UI 中。把它改造成新的 typed service/API。

B. Restaurant matching

重点阅读：

- src/routes/api/menu-match.ts
- src/lib/mood-config.ts
- src/lib/vibe-examples.ts
- src/lib/vibe-cloud.ts
- src/lib/vibeflow.ts

提取：

- mood、flavor、occasion、preference 的业务概念；
- 已验证有效的 prompt constraint；
- 中英文品牌语气；
- recommendation explanation 的表达方式；
- loading 和失败体验。

不要复制：

- Lovable AI Gateway 调用；
- 基于自由文本 item name 的不安全匹配；
- 旧的复杂游戏输出；
- 旧 session/game architecture；
- 旧 provider-specific request；
- 旧 cocktail image generation。

新的模型结构化输出至少为：

{
  "matchedItemId": "uuid",
  "whyThisMatch": "string"
}

服务端必须验证：

- matchedItemId 位于本次请求提供给模型的 allowlist；
- item 属于当前 merchant；
- item 属于当前 menu；
- item 当前 availability_status = active；
- item 没有被隐藏或售罄；
- 最终名称、description、ingredients、image、allergens 等事实来自数据库；
- 模型不能创造或覆盖菜单事实。

C. Existing analytics

阅读：

- src/lib/analytics.ts

只提取：

- PostHog host；
- 现有 event naming convention；
- restaurant funnel 中有价值的事件。

新 repo 必须使用环境变量配置 PostHog，不复制旧的硬编码 production hostname 逻辑。

建议事件：

- restaurant_menu_viewed
- preference_started
- preference_submitted
- recommendation_requested
- recommendation_returned
- recommendation_failed
- agent_run_created
- agent_run_waiting_approval
- agent_run_hibernated
- agent_run_resumed
- agent_run_completed
- agent_run_failed

不要将以下内容发送到 PostHog：

- secret；
- 完整 system prompt；
- service-role key；
- sandbox credential；
- 完整隐私输入；
- 未脱敏日志。

D. Optional reference

仅在确有需要时阅读：

- src/lib/menu/manage.functions.ts
- src/routes/manage.$privateToken.tsx
- src/lib/dcp-menu.ts

这些文件可以用于理解内部菜单管理和 fixture，但当前不迁移完整 admin backend。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
六、明确禁止迁移的内容
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

新 repo 不得包含或依赖：

- src/integrations/lovable/
- @lovable.dev/*
- .lovable/
- Lovable Vite plugin
- Lovable runtime
- Lovable AI Gateway
- ai.gateway.lovable.dev
- LOVABLE_API_KEY
- 旧 Lovable build configuration
- 旧 repository 的完整 package.json
- 旧 repository 的 lockfile
- generate-cocktail.ts
- generate-cocktail-image.ts
- Gemini 生图流程
- gallery
- save poster
- print poster
- newsletter
- 与 Demo 无关的旧 marketing 页面
- 与 restaurant MVP 无关的旧 games
- restaurant-ctx 旧 abstraction
- games registry 旧 abstraction
- 无关 auth 页面
- 无关管理后台

如果旧 restaurant component 直接 import 这些模块：

1. 不要把相关模块复制过来；
2. 创建新的兼容 adapter；
3. 或者移除当前 Demo 不需要的交互；
4. 保持 restaurant 核心路径可运行。

完成后必须通过代码搜索证明：

- 没有 @lovable.dev dependency；
- 没有 ai.gateway.lovable.dev；
- 没有 LOVABLE_API_KEY；
- runtime 不向 Lovable domain 发请求。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
七、现有 Supabase reference
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

重点阅读：

- supabase/migrations/20260715031925_a9455233-9170-4862-9cb2-c1a18db39c33.sql
- supabase/migrations/20260715051355_b888bf20-9d6c-41e6-83b4-5a18f457221d.sql
- supabase/migrations/20260719045844_18f5ee44-ea78-46e5-b17f-0f7507b276ad.sql
- src/integrations/supabase/types.ts
- supabase/config.toml

重点理解：

- merchants
- menus
- menu_items
- menu_versions
- menu_status
- menu_item_availability
- published_version_id
- game_sessions
- game_results
- recommendations
- RLS policies
- service role policy
- menu_file_url
- menu_file_type

现阶段继续使用现有 Supabase project。

但必须遵守：

- 不把生产数据库复制成第二套 source of truth；
- 不自动 replay 旧 migrations；
- 不重新运行旧 seed；
- 不自动修改 production RLS；
- 不破坏已有 merchant/menu/item 数据；
- 新 repo 中重新生成 Supabase types；
- 不手工复制 generated types 作为长期方案；
- browser 只能使用 publishable/anon key；
- service role key 只能存在于 server/worker；
- client bundle 不得出现 service role key；
- 未经批准不执行 production migration。

检查旧 RLS 是否可能允许访问 hidden 或 sold_out item。

即使旧 RLS 允许读取，新 restaurant matching API 也必须在服务端过滤：

availability_status = active

如果需要改 RLS：

- 在新 repo 中生成 additive migration；
- 写明原因、风险和 rollback；
- 不自动应用到 production；
- 等用户 review 和授权。

如果暂时没有 Supabase credentials：

- 使用 deterministic fixture；
- 保持相同 repository interface；
- 不让缺少 credentials 阻塞本地 build 和 tests。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
八、新 repository 目标结构
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

建立清晰但不过度设计的 monorepo。

建议结构：

apps/
  web/
  agent-worker/

packages/
  contracts/
  restaurant-core/
  agent-core/
  sandbox-runtime/
  provider-fc/
  provider-e2b/
  model-providers/
  observability/

infra/
  railway/
  alibaba-fc/

fixtures/
  restaurant/
  agent-runs/

docs/
  architecture/
  demo/
  operations/

如果为了 Demo 需要简化运行单元，可以先部署为：

- 一个 web/API service；
- 一个 agent worker。

但代码边界必须允许以后拆分。

技术要求：

- 选择一个 package manager；
- 生成全新的 lockfile；
- TypeScript strict mode；
- runtime schema validation；
- lint；
- typecheck；
- unit tests；
- integration tests；
- production build；
- CI；
- env validation；
- health/readiness endpoint；
- structured logging。

Frontend 可以继续使用 TanStack Start + React，但必须使用新 repo 的 first-party configuration，不能复制 Lovable build plugin。

部署必须兼容标准 Node/container runtime。可以提供 Railway-compatible Dockerfile 或配置，但不要把 domain logic 写进 Railway-specific code。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
九、稳定的 Restaurant contract
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

在 packages/contracts 中建立稳定 contract，供当前 legacy UI、未来新 UI 和 backend 共同使用。

至少包含：

- RestaurantSummary
- RestaurantMenu
- RestaurantMenuItem
- RestaurantPreferences
- RestaurantMatchRequest
- RestaurantMatchResult
- RestaurantError
- AgentRun
- AgentRunEvent
- AgentApprovalRequest

Restaurant client interface 至少包含：

- getPublishedMenu(merchantSlug, menuSlug)
- matchItem(merchantSlug, menuSlug, preferences)

Restaurant core 至少包含：

- getPublishedRestaurantMenu(merchantSlug, menuSlug)
- matchRestaurantItem(input)
- validateMatchedItem(menuId, matchedItemId)
- canonicalizeRecommendation(item, modelExplanation)

API 至少提供：

- GET /v1/restaurants/:merchantSlug/menus/:menuSlug
- POST /v1/restaurants/:merchantSlug/menus/:menuSlug/match

用户页面保留：

- /m/:merchantSlug/:menuSlug

临时旧 UI 只能依赖 RestaurantClient 或 API contract。

UI 不允许直接调用：

- Supabase service role；
- Model SDK；
- Lovable Gateway；
- FC Sandbox；
- E2B；
- provider-specific endpoint。

如果旧 ResultCardScreen 依赖旧 response shape，在 API client 或 legacy adapter 中添加 temporary compatibility mapper：

new canonical response
→ legacy UI response

不要为了兼容旧 UI 污染长期 domain contract。

在 mapper 上写清楚：

- 临时用途；
- 删除条件；
- 对应的新 UI owner；
- 哪些 legacy fields 将来不会保留。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
十、并行开发和代码 ownership
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

另外两位开发者正在分别实现：

- 新 UI；
- 新 restaurant flow。

因此必须减少未来 merge conflict。

在以下文件中记录 ownership：

docs/architecture/integration-boundaries.md

建议边界：

apps/web/src/features/restaurant-legacy/
- 临时 restaurant UI；
- 后续允许被整体删除；
- 当前不要放 domain logic。

apps/web/src/features/agent/
- Agent UI；
- 不应被 restaurant UI 替换影响。

packages/contracts/
- 共享稳定 contract；
- 修改需要兼容现有 consumer。

packages/restaurant-core/
- menu、matching、validation；
- 不包含 React UI。

packages/agent-core/
- Agent workflow 和 state machine；
- 不依赖 restaurant component。

packages/sandbox-runtime/
- provider-neutral sandbox interface。

packages/provider-fc/
- Alibaba FC implementation。

packages/provider-e2b/
- E2B-compatible implementation。

apps/agent-worker/
- worker execution；
- 不依赖 UI implementation。

未来新 UI 和新 restaurant flow 应该只需要：

- 替换 restaurant-legacy feature；
- 继续使用 packages/contracts；
- 继续调用相同 API；
- 不修改 agent backend；
- 不修改 sandbox provider；
- 不直接修改 Supabase access boundary。

不要主动重做另外两位开发者正在开发的 UI 或 restaurant flow。

当前只修复临时旧 UI 中的：

- build blocker；
- Lovable dependency；
- API compatibility；
- security issue；
- 核心 mobile flow blocker；
- accessibility blocker；
- deployment blocker。

不要对临时 UI 做大规模视觉重构。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
十一、Model Provider architecture
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

创建 ModelProvider abstraction。

未来可能接入：

- Vertex AI
- Gemini
- OpenAI
- Alibaba models
- 其他 provider

Restaurant matching 和 Agent reasoning 不能依赖某一个模型 SDK。

模型调用要求：

- structured output；
- runtime schema validation；
- timeout；
- retry policy；
- trace ID；
- provider metadata；
- model metadata；
- safe logging；
- invalid output fail closed。

Restaurant matching provider 只能返回选择和解释。

模型不能决定：

- item 是否存在；
- item 是否 active；
- item name；
- price；
- ingredients；
- allergens；
- image；
- menu ownership。

这些事实必须从数据库 canonical record 返回。

当前 MVP 不需要 AI 生图。

不要迁移旧 Gemini 生图调用。

如果以后重新增加生图功能，应使用单独接口：

ImageProvider

例如：

- VertexImageProvider
- GeminiImageProvider
- OpenAIImageProvider

但本次不要实现，除非完成核心 Demo 后还有明确需求。

如果缺少真实模型 credentials：

- 实现 deterministic local matching provider；
- 保证完整 restaurant flow 可以运行；
- 为真实 provider 保留 adapter；
- tests 不依赖外部模型稳定性。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
十二、Sandbox Provider architecture
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

创建 provider-neutral SandboxProvider interface。

至少提供：

- create()
- execute()
- writeFiles()
- hibernate()
- resume()
- terminate()

建议同时提供：

- readFiles()
- getStatus()
- getLogs()
- uploadArtifact()
- checkpoint()

Provider 必须报告 capabilities，例如：

{
  "hibernation": true,
  "persistentFilesystem": true,
  "networkIsolation": true
}

实现：

1. Alibaba FC Sandbox adapter；
2. E2B-compatible adapter 或完整可测试 scaffold；
3. local deterministic sandbox provider，用于本地测试；
4. provider contract tests。

业务代码不能直接 import FC SDK。

只允许 packages/provider-fc import FC-specific SDK/API。

业务代码通过 SandboxProvider 使用 sandbox。

环境变量建议：

- APP_URL
- NODE_ENV
- SUPABASE_URL
- SUPABASE_PUBLISHABLE_KEY
- SUPABASE_SERVICE_ROLE_KEY
- POSTHOG_KEY
- POSTHOG_HOST
- MODEL_PROVIDER
- SANDBOX_PROVIDER
- FC_SANDBOX_ENDPOINT
- FC_SANDBOX_API_KEY
- E2B_ENDPOINT
- E2B_API_KEY
- LOG_LEVEL

所有环境变量必须：

- 启动时验证；
- 区分 public/server-only；
- 提供 .env.example；
- 不提交真实 secret；
- 不在日志中打印 secret。

Sandbox 内不得注入：

- production Supabase service role；
- 不需要的模型 key；
- deployment credential；
- DNS credential；
- GitHub write token；
- 其他高权限 secret。

如果 Agent 确实需要凭证，必须使用最小权限和任务级 scoped credential。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
十三、Agent workflow
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

实现一个真实、可复现、适合 Hackathon Demo 的 Agent workflow。

建议 Demo scenario：

1. 用户输入 restaurant experience/build brief；
2. API 创建 agent run；
3. worker 创建 FC Sandbox；
4. worker 将 deterministic fixture 或 project 文件写入 sandbox；
5. Agent 执行真实代码、工具、测试或 build；
6. 保存日志、artifact metadata 和 trace；
7. 到达 publish 或高风险步骤；
8. workflow 进入 waiting_for_approval；
9. 将 workflow checkpoint 写入 Supabase；
10. hibernate FC Sandbox；
11. 用户通过 UI/API approve；
12. approval event 唤醒 workflow；
13. resume sandbox/session；
14. 继续执行 test/build/preview；
15. 完成并展示 artifact、日志、trace、耗时和结果。

Agent run 状态至少包含：

- queued
- provisioning
- running
- waiting_for_approval
- hibernating
- hibernated
- resuming
- completed
- failed
- cancelled

不要用持续运行或持续 polling 假装 sandbox hibernation。

可以使用前端 polling 显示状态，但底层 workflow resume 必须来自：

- 持久化状态；
- approval event；
- webhook/event/queue；
- 明确的 wake/resume 操作。

Agent API 至少提供：

- POST /v1/agent-runs
- GET /v1/agent-runs/:id
- POST /v1/agent-runs/:id/approve
- POST /v1/agent-runs/:id/cancel
- GET /v1/agent-runs/:id/events

Approval 必须幂等。

重复 approval 不能：

- 重复执行 build；
- 重复 publish；
- 创建多个 resume；
- 重复产生副作用。

高风险操作必须要求 approval，例如：

- production deploy；
- DNS 修改；
- vibetail.com domain cutover；
- production database migration；
- secret 修改；
- destructive file/database operation；
- 对外发送消息；
- 产生明显费用的任务。

未经用户明确授权，Demo workflow 不执行真正的 production publish。可以生成 preview、artifact 或模拟安全 publish target。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
十四、Agent state persistence
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Agent workflow 的唯一状态不能存放在：

- Node 内存；
- browser；
- sandbox process；
- local filesystem；
- 单个 worker instance。

在 Supabase 中设计 additive schema。

先创建 migration 文件供 review，不自动应用到 production。

建议 agent_runs：

- id
- status
- provider
- provider_session_id
- current_step
- input
- result
- checkpoint
- approval_required
- approval_version
- approved_at
- trace_id
- artifact_url
- error_code
- error_message
- retry_count
- started_at
- completed_at
- created_at
- updated_at

建议 agent_run_events：

- id
- agent_run_id
- event_type
- payload
- idempotency_key
- trace_id
- created_at

必要时增加：

agent_approvals：

- id
- agent_run_id
- decision
- requested_at
- decided_at
- decided_by
- idempotency_key

agent_run_artifacts：

- id
- agent_run_id
- artifact_type
- storage_path
- metadata
- created_at

系统必须能够在 sandbox 丢失后：

1. 读取 checkpoint；
2. 创建新 sandbox；
3. 恢复必要文件和上下文；
4. 从最后一个安全 step 继续；
5. 避免重复已完成副作用。

对于不支持 hibernation 的 provider，fallback：

checkpoint
→ terminate
→ recreate
→ restore
→ continue

但 FC Hackathon path 必须展示 FC 的真实 hibernate/wake 能力。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
十五、Hackathon 要求
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

根据 handbook 实现并准备证据。

核心要求包括：

- 真实业务场景；
- Agent 实际执行代码或工具；
- 使用 AgentRun + FC Sandbox；
- 稳定、可复现；
- 展示 elasticity；
- 展示 compute/network/storage isolation；
- 展示 stateful session；
- 展示 hibernate；
- 展示 external-event wake；
- 展示 resume 后继续同一个 workflow；
- 展示日志、trace、metrics 和 alerting；
- 使用或集成 Alibaba SLS 等要求的 observability；
- 展示 FC 与 E2B 的兼容或 provider parity；
- 用同一 fixture 和 workflow 验证 endpoint/provider 切换；
- 量化 hibernation 对成本或运行时间的节省；
- 准备一个真实 debugging story；
- 提供无需登录的 public URL；
- 准备 3 分钟 Demo；
- 准备 WHO + WHAT + WHY NOW 的一句话表达。

Demo 必须有 deterministic fixture。

外部模型或外部网络失败时，不能让核心 sandbox lifecycle Demo 完全失效。

提供 Demo mode，但不要伪造关键能力。

允许 fallback 的部分：

- restaurant matching 使用 deterministic provider；
- Agent reasoning 使用 deterministic plan fixture；
- 外部菜单使用本地 fixture；
- PostHog failure 不阻塞主流程。

不能伪造的部分：

- sandbox 中实际命令执行；
- hibernate；
- wake；
- resume；
- approval lifecycle；
- 状态持久化；
- trace/log evidence。

需要记录：

- sandbox active duration；
- hibernated duration；
- resume latency；
- build duration；
- estimated always-on duration；
- estimated compute saved。

明确标注哪些数字是实际测量，哪些是推算。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
十六、Agent frontend
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

旧 restaurant UI 可以临时复用，但 Agent frontend 需要在新 repo 中实现。

至少包括：

1. Agent demo entry；
2. 创建 run 的表单；
3. run status；
4. step timeline；
5. logs；
6. waiting approval 状态；
7. approve/cancel；
8. hibernated 状态；
9. resuming 状态；
10. completed result；
11. artifact/preview link；
12. error 和 retry；
13. 最小 internal run inspector。

要求：

- responsive；
- accessible；
- 清晰显示状态；
- approval 不能误触；
- 重复点击必须安全；
- 不在 browser 保存 secret；
- Demo public path 无需登录；
- internal/debug 信息避免暴露敏感数据。

不要为了 Agent 页面创建复杂 design system。使用简单、高质量、容易替换的 UI。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
十七、PostHog 与可观测性
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PostHog 用于产品 analytics。

Structured logs、traces、metrics 用于系统 observability。

不要混淆两者。

所有 Agent run 应包含统一 trace_id，并传播到：

- API request；
- agent run；
- worker；
- sandbox session；
- provider call；
- event；
- artifact；
- error log。

Structured log 至少包含：

- timestamp
- level
- service
- trace_id
- agent_run_id
- provider
- sandbox_session_id
- step
- event
- duration_ms
- error_code

不能记录：

- API key；
- authorization header；
- Supabase service role；
- 完整 secret；
- 未脱敏用户数据；
- sandbox credential。

提供：

- health endpoint；
- readiness endpoint；
- basic metrics；
- failure alert strategy；
- SLS integration documentation；
- 本地 fallback logging。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
十八、测试要求
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Restaurant tests：

- active merchant + published menu 正常；
- inactive merchant 不可访问；
- unpublished menu 不可访问；
- menu not found；
- empty menu；
- 只有 active item 进入模型 allowlist；
- sold_out item 不可推荐；
- hidden item 不可推荐；
- provider 返回未知 ID 时 fail closed；
- provider 返回其他 menu item ID 时 fail closed；
- canonical facts 来自数据库；
- bilingual input 正常；
- legacy compatibility mapper 正常；
- /m/:merchantSlug/:menuSlug 可运行；
- legacy UI 不直接依赖 Lovable。

Agent tests：

- create run；
- valid state transitions；
- invalid state transition 被拒绝；
- sandbox provider contract；
- execute 真实命令；
- file write/read；
- checkpoint；
- waiting approval；
- hibernate；
- approval 幂等；
- wake；
- resume；
- cancel；
- timeout；
- provider failure；
- sandbox 丢失后的 restore；
- retry 不重复副作用；
- FC/E2B fixture parity；
- artifact metadata；
- trace propagation。

Security/build tests：

- client bundle 不包含 service role key；
- 没有 @lovable.dev；
- 没有 ai.gateway.lovable.dev；
- 没有 LOVABLE_API_KEY；
- 没有提交真实 secret；
- typecheck 通过；
- lint 通过；
- unit tests 通过；
- integration tests 通过；
- production build 通过；
- health endpoint 正常；
- env 缺失时给出明确错误；
- local deterministic mode 可以启动。

如果真实 FC 或 Supabase credentials 不可用：

- 不要声称真实集成已经通过；
- 运行 local provider tests；
- 明确列出还需要验证的 integration；
- 保持 adapter 和 contract 可测试。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
十九、实施阶段
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase 1：Reference audit 和 repo foundation

- 阅读指定 docs、代码和 PDF；
- 创建 reference-audit.md；
- 创建 target architecture；
- 创建 integration boundaries；
- 创建 provider boundaries；
- 建立 monorepo；
- 配置 package manager；
- 配置 TypeScript；
- 配置 lint/typecheck/test；
- 配置 CI；
- 配置 env validation；
- 创建 README 和 .env.example。

Phase 2：临时 Restaurant vertical slice

- 选择性迁入旧 restaurant UI；
- 隔离到 restaurant-legacy；
- 移除 Lovable dependency；
- 建立 packages/contracts；
- 建立 RestaurantClient；
- 建立 Supabase restaurant repository；
- 建立 fixture repository；
- 建立 matching service；
- 建立 deterministic model provider；
- 建立 legacy compatibility mapper；
- 跑通完整 restaurant route；
- 添加 tests。

当前不要重新设计新 UI。

Phase 3：Agent foundation

- Agent state machine；
- Agent API；
- Agent worker；
- local sandbox provider；
- SandboxProvider interface；
- persistence schema；
- approval；
- idempotency；
- checkpoint/recovery；
- Agent frontend；
- structured logs。

Phase 4：Alibaba FC Hackathon integration

- FC Sandbox adapter；
- AgentRun integration；
-真实 execute；
- hibernate；
- external event wake；
- resume；
- SLS/log/trace/metrics；
- artifact；
- failure recovery；
- timing/cost evidence。

Phase 5：Provider portability

- E2B-compatible adapter；
- provider contract test；
- same fixture parity；
- fallback checkpoint/recreate/restore；
- provider selection through environment config。

Phase 6：接收新 UI 和新 restaurant flow

当另外两位开发者的代码准备好后：

- 检查是否只依赖稳定 contracts；
- 把新 restaurant feature 迁入 apps/web；
- 不允许新 UI 直接访问 service role 或 provider SDK；
- 保持 API contract；
- 替换 restaurant-legacy；
- 运行 regression tests；
- 删除 compatibility mapper 中不再需要的字段；
- 删除 restaurant-legacy；
- 不影响 Agent backend 和 sandbox packages。

不要在他们的代码到达之前猜测或重复开发其视觉和 interaction。

Phase 7：Demo hardening 和 deploy readiness

- public demo URL；
- Railway-compatible deployment；
- health/readiness；
- deterministic demo data；
- reset demo state；
- Demo runbook；
- 3-minute script；
- failure fallback；
- release checklist；
- security review；
- domain cutover plan。

当前不切换 vibetail.com。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
二十、必须创建的文档
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

创建：

- README.md
- .env.example
- docs/architecture/reference-audit.md
- docs/architecture/target-architecture.md
- docs/architecture/integration-boundaries.md
- docs/architecture/provider-boundaries.md
- docs/architecture/data-flow.md
- docs/demo/hackathon-requirements.md
- docs/demo/demo-script.md
- docs/demo/demo-runbook.md
- docs/demo/failure-fallbacks.md
- docs/operations/deployment.md
- docs/operations/environment-variables.md
- docs/operations/domain-cutover.md
- docs/operations/production-migration-checklist.md

reference-audit.md 必须对旧文件逐项标记：

- Temporary port
- Extract knowledge only
- Rewrite
- Defer
- Do not port

target-architecture.md 必须说明：

- 为什么使用新 repo；
- 为什么临时复用旧 UI；
- 哪些部分会被另外两位开发者替换；
- Restaurant、Agent、Sandbox、Model、Supabase 的边界；
- Demo 架构与长期架构的关系。

integration-boundaries.md 必须明确：

- 各目录 ownership；
- 哪些 contract 是稳定边界；
- 新 UI 如何替换旧 UI；
- 新 restaurant flow 如何接入；
- 哪些目录不应跨团队修改；
- 如何减少 merge conflict。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
二十一、工作规则
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. 先检查新 repo 当前状态，不覆盖用户已有内容。
2. 旧 repo 只读。
3. 使用小而清晰的 commits。
4. 不把无关重构混进核心工作。
5. 不提交 secrets。
6. 不执行生产数据库 migration。
7. 不执行 vibetail.com DNS 修改。
8. 不执行未授权 production deployment。
9. 不声称未验证的 provider integration 已完成。
10. 每完成一个阶段运行相关 tests。
11. 汇报实际执行并通过的命令。
12. 清楚记录缺少的 credentials。
13. 优先保证可运行 vertical slice。
14. 不过度设计。
15. 但不能为了 Demo 把 domain logic 写进 UI。
16. 临时 legacy code 必须容易删除。
17. 长期 backend 和 Agent architecture 必须从第一天保持 provider-neutral。
18. 如果 workspace 中存在 AGENTS.md 或其他 repository instructions，先阅读并遵守。
19. 使用 apply_patch 或安全编辑方式修改文件。
20. 不删除或覆盖用户已有改动。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
二十二、立即开始执行
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

不要只返回一个高层计划。

按以下顺序立即开始：

1. 检查新 repo 文件和 git 状态；
2. 查找并阅读 repository instructions；
3. 阅读旧 repo 的 migration/architecture docs；
4. 阅读 Hackathon PDF；
5. 检查列出的旧 restaurant 文件；
6. 创建 reference-audit.md；
7. 创建 target architecture 和 integration boundaries；
8. 建立新 monorepo foundation；
9. 定义 packages/contracts；
10. 选择性迁入并隔离旧 restaurant UI；
11. 移除 Lovable dependency；
12. 用新 RestaurantClient/API 跑通旧 restaurant flow；
13. 添加 tests；
14. 然后开始 Agent foundation。

如果任务规模无法在单次执行中全部完成：

- 优先完成一个可运行、可测试的阶段；
- 保持工作区一致；
- 明确报告已完成内容；
- 明确报告下一阶段；
- 不留下明知无法 build 的状态。

第一阶段 Definition of Done：

- 新 repo 可以独立 install；
- 新 repo 可以独立 build；
- 新 repo 可以独立 test；
- /m/:merchantSlug/:menuSlug 可运行；
- 临时旧 UI 已隔离；
- restaurant flow 不经过 Lovable；
- 本地 fixture 模式可运行；
- Supabase adapter 已建立；
- Agent contracts 和 sandbox boundary 已建立；
- repository 中没有 Lovable runtime dependency；
- 旧 repo 不再是运行时依赖；
- 文档明确说明未来如何替换新 UI 和新 restaurant flow。
