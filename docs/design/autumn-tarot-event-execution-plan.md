# 秋日塔罗活动发布清单

## 最小交付

- `/tarot`：Email + 名字、口味、实体牌第一轮、完整虚拟牌阵第二轮。
- 同一活动内以 Email 去重 attendee，并保证两轮酒品不同。
- 两轮解读使用 server-side OpenAI 或 OpenRouter structured output；生产不允许 deterministic 解读。
- 保存活动数据，但不将真实来宾资料写入 fixture 或 seed。

## Staging 前置配置

1. 将 additive Tarot migrations 应用到 staging。
2. 通过受保护的运营流程写入 `events` 的活动记录和 `event_drink_catalog` 的实际酒品。
3. Railway staging 设置 `SUPABASE_SERVICE_ROLE_KEY`、`MODEL_PROVIDER=openrouter`、`MODEL_NAME` 与 `OPENROUTER_API_KEY`。
4. 不运行 seed，也不将活动来宾名单提交到 Git。

## 验收

1. 新人可用 Email + 名字进入并保存口味。
2. 实体牌得到真实 AI 解读和第一杯酒。
3. 虚拟牌阵得到真实 AI 解读和第二杯不同的酒。
4. 同一 Email 重进后仍指向同一 attendee，不能拿到重复酒。
5. `/health`、`/ready` 和 Tarot API 在 Railway staging 正常工作，且浏览器 bundle 不含服务端 secret。
