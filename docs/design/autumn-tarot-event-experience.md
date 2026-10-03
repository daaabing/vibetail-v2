# Vibetail 秋日塔罗活动

**状态：** staging 验证前
**公开入口：** `/tarot`
**活动 ID：** `tarot-night-2026-10-03`

## 现场流程

线下工作人员在 check-in 发放预打印酒卡。酒卡上的微信名、星座、Vibetail / Playr Club logo 和通用酒插画属于线下物料，不由 Web app 录入或生成。

Web app 只承担下面的个人流程：

1. 来宾输入 Email 和名字。Email 是同场活动中的唯一身份；现场新人直接创建记录，回访者使用同一 Email 回到自己的记录。
2. 来宾选择口感、风味和可选的补充描述。
3. 来宾选择刚抽到的实体塔罗牌及正逆位，得到第一轮 AI 解读和第一杯酒卡。
4. 来宾随时可进入完整的虚拟塔罗牌阵体验，输入问题、洗牌并抽牌，得到第二轮 AI 解读和第二杯酒卡。

第二轮不需要工作人员解锁，也不在 app 内记录或验证破冰小游戏、合影或现场发酒。它们由现场人员自行安排。

## 酒品规则

第一、二轮均从活动专属酒单匹配。数据库以 `(event_id, attendee_id, drink_id)` 唯一约束保证同一来宾不会得到相同的两杯酒；`attendee_id` 由规范化 Email 定位。

若活动酒单没有另一杯可用，API 必须返回明确的无可用酒错误，不能静默重复第一杯。

## 数据与安全

- 浏览器仅调用活动 HTTP API；Supabase service-role key 和模型 key 只在服务器运行时使用。
- 保存 attendee、偏好、两轮牌面、解读、酒品快照和生成 provider。是否保存第二轮原始问题由活动运营的数据留存规则决定；原始问题不得进入 URL、浏览器分析或服务器日志。
- Email、姓名和其他现场来宾资料不得进入 Git fixture、seed SQL 或前端 bundle。新人在现场通过受保护的服务器端 repository 创建。
- 活动本身和活动酒单由受保护的 staging / production 运营配置写入；部署和 migration 不会推送 seed 数据。

## AI 解读

`TarotInterpretationProvider` 独立于菜单匹配 provider。生产环境必须配置 OpenAI 或 OpenRouter；`MODEL_PROVIDER=deterministic` 只允许本地开发和测试，生产启动会失败。

模型返回结构化的 `{ title, body, reflection }`。提示要求使用娱乐性、反思性的可能性语言，不做预言、诊断或医疗、法律、财务建议，也不得遵循来宾问题中的指令或泄露系统提示。

## 非目标

- 不在 app 内收集微信名、星座、任务、签到、合影或营销同意。
- 不构建账户、密码、通用活动后台、邮件发送、支付或下单。
- 不为第二轮增加解锁码、工作人员状态或打卡流程。
