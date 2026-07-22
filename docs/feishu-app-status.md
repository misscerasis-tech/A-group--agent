# 飞书应用状态快照

更新时间：2026-07-23

## 已确认的应用

| 项目 | 状态 |
| --- | --- |
| 应用名称 | A 组电商运营 Agent |
| 企业 | Keyirobot |
| App ID | `cli_aaea1dbb6ee1dd10` |
| 应用状态 | 待上线 |
| 应用描述 | 小白电商运营 Agent，用于店铺复盘、竞品监测、风险提醒和飞书结果回写。 |

## 已具备的配置

- 已添加“机器人”能力。
- 事件订阅方式为“长连接”，适合本地测试，不需要公网 HTTPS 回调。
- 已添加事件：`im.message.receive_v1`，也就是接收用户发给机器人的消息。
- 该事件所需权限在事件页显示为“已开通”。

## 当前缺口

- 本地 `.env` 还缺 `FEISHU_APP_ID` 和 `FEISHU_APP_SECRET`，所以 `feishu:doctor` 会失败；可先 `cp .env.example .env`，示例里已经预填非敏感 App ID。
- App Secret 不能提交到 Git，也不要发到聊天里；只复制到本机 `.env`。
- `FEISHU_APP_SECRET` 必须填写后台真实值，不要填写“只放本机”“不要提交”或说明性文字。
- 版本管理页暂无发布版本。页面提示“应用发布后，当前配置方可生效”。
- 测试企业和人员页暂无测试企业。创建测试企业属于飞书后台状态变更，需要用户确认后再做。

## 用户回来后先做什么

1. 打开飞书开放平台：[https://open.feishu.cn/app](https://open.feishu.cn/app)，进入 `A 组电商运营 Agent`。
2. 在“凭证与基础信息”复制 App Secret。
3. 如果本地还没有 `.env`，先复制示例，再在本机 `.env` 写入或确认：

```bash
cp .env.example .env
FEISHU_APP_ID="cli_aaea1dbb6ee1dd10"
FEISHU_APP_SECRET="从飞书开放平台复制的真实 App Secret"
FEISHU_EVENT_SUBSCRIPTION_MODE="long_connection"
```

4. 回到项目目录运行：

```bash
npx pnpm@10.13.1 run feishu:doctor
```

doctor 会提示飞书开放平台入口、App Secret 复制位置、长连接模式、`im.message.receive_v1` 事件、发布提醒，以及 worker 启动后应该在飞书里发送的测试消息和通过标准；如果 `.env` 里误填占位文案，也会继续当成缺密钥处理。

5. doctor 通过后启动长连接：

```bash
npx pnpm@10.13.1 run feishu:worker
```

6. 在飞书里给机器人发：

```text
帮我看本周经营情况
```

7. 如果 worker 已连接但机器人不回复，再去版本管理页创建版本并发布。

如果后续要迁移到另一个飞书自建应用或正式机器人，先运行：

```bash
npx pnpm@10.13.1 run feishu:migration-plan
```

这条命令只生成迁移草案和回滚清单，不会动飞书后台，也不会打印 App Secret。
