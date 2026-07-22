# 真实测试路径

## 结论

要接飞书，但不要第一步就只测飞书。正确顺序是：

1. 先测 Agent 是否能用样例数据做出正确判断。
2. 再用真实表格替换样例数据。
3. 再接飞书机器人跑“发起任务 -> 追问 -> 回写结果”。
4. 最后接一个外部平台，满足比赛硬性要求。

这样做的原因是：飞书只是入口和协同载体，真正得分的是 Agent 能不能理解电商数据、发现问题、给出可执行动作。

## 阶段 1：本地样例数据测试

当前可测：

- 打开 `http://localhost:3001/agent`。
- 检查 Agent 是否讲清楚本周销售、订单、转化、广告、库存和退款/退货变化。
- 检查商品问题诊断是否合理。
- 检查下周行动清单是否能直接执行。

也可以用一条命令做本地核心冒烟：

```bash
npx pnpm@10.13.1 run agent:smoke
```

通过标准：

- 页面不报错。
- 输出不是术语堆砌，而是人话解释。
- 每个建议都有原因和第一步。

## 阶段 2：真实表格测试

当前已经可以在 `/agent` 首页的“真实数据导入工作台”测试：

- 上传或粘贴经营数据 CSV/TSV/Markdown 表格。
- 上传或粘贴竞品数据 CSV/TSV/Markdown 表格。
- 点击“演示样例”可恢复 Shopify 演示数据。
- 点击“平台表头样例”可测试 `商品访客数`、`支付买家数`、`商品支付金额`、`退款成功金额` 这类平台导出字段。
- 查看字段识别结果。
- 查看缺失字段追问。
- 生成基于导入数据的复盘和飞书回写文本。
- 展开“飞书文档 Markdown”，检查是否能直接沉淀成周报。

也可以直接调本地 API：

```bash
curl -X POST http://localhost:3001/api/agent/analyze \
  -H "Content-Type: application/json" \
  -d '{"metricsCsv":"week,product_name,orders,revenue,units_sold,refund_orders,refund_amount\nprevious,黑杯,10,500,12,1,30\ncurrent,黑杯,8,420,9,2,80","store":{"storeName":"测试店铺"}}'
```

API 会返回 `analysis`、`feishuReply` 和 `markdownReport`。
其中 `workSession` 会告诉前端或飞书：当前还缺什么、下一句应该问用户什么、Agent 接下来能不能继续跑。

页面健康检查也可以自动跑一遍，专门确认导航页面不会再把原始 Prisma/DATABASE_URL 错误露给用户：

```bash
npx pnpm@10.13.1 run smoke:web
```

如果本地不是 `3001` 端口，可以指定：

```bash
SMOKE_BASE_URL=http://localhost:3000 npx pnpm@10.13.1 run smoke:web
```

通过标准：

- 字段缺失时，Agent 会追问，不会硬编。
- 字段名称不同也能映射，例如“GMV/销售额/revenue”都能识别。
- 退款字段也能映射，例如“refund_orders/returns/退款单数”和“refund_amount/退款金额”都能识别。
- CSV、TSV、Markdown 表格，以及从 Excel/飞书表格直接复制出来的制表符数据都能识别。
- 没有 `week` 列但有 `date/start_date/开始日期` 时，Agent 会用日期判断最近两期。
- 如果表里有三周或更多周期，Agent 会自动选择最近两期作为上周和本周。
- 输出仍然是小白可读的自然语言。
- 返回的 `workSession.nextQuestion` 能直接作为 Agent 追问用户的下一句话。
- `smoke:web` 里所有导航页面返回 200，并且不出现原始数据库配置错误。

本地飞书 worker 也可以读取 CSV/TSV/Markdown 表格文件。`.env` 示例：

```bash
ECOMMERCE_STORE_NAME="我的店铺"
ECOMMERCE_PLATFORM="Shopify"
ECOMMERCE_MARKET="美国"
ECOMMERCE_CATEGORY="旅行杯"
ECOMMERCE_WEEKLY_METRICS_CSV="data/samples/aurora-cup-weekly-metrics.csv"
ECOMMERCE_COMPETITORS_CSV="data/samples/aurora-cup-competitors.csv"
```

如果不配置经营表路径，飞书 worker 会使用样例店铺回复；配置后会按“当前导入数据”回复。

## 阶段 3：飞书机器人测试

飞书需要测试三件事：

1. 任务入口：用户在飞书群里发起“帮我看这周经营情况”。
2. 结果回写：Agent 把复盘结果发回飞书群或写入文档。
3. 迁移能力：旧机器人可以迁到新机器人，保留回滚方案。

创建飞书应用后先准备：

- App ID
- App Secret
- Encrypt Key
- Verification Token
- 默认群 chat ID
- 结果文档 document ID 或多维表格 bitable ID

这些只能放 `.env` 或加密配置，不能提交 Git。

### 当前优先测试法：长连接

本地第一轮不要用 Webhook 请求地址，先用飞书“长连接”。

原因：

- 本机 `localhost` 不是公网 HTTPS，飞书服务器不能直接回调。
- 长连接可以在本地收事件，不需要内网穿透或临时部署。
- 适合比赛前快速验证“用户在飞书发消息 -> Agent 思考 -> 回飞书”。

当前已接入的本地命令：

```bash
npx pnpm@10.13.1 run feishu:doctor
pnpm run feishu:worker
```

先跑 `feishu:doctor` 检查 `.env` 和本地经营表路径；通过后再跑 `feishu:worker` 建立长连接。
本地 worker 会忽略机器人自己发出的消息、去重同一个 message ID，并在复盘生成失败时回复一段可理解的兜底提示，避免用户只看到程序错误。

运行前只在本机 `.env` 填：

```bash
FEISHU_APP_ID="cli_xxx"
FEISHU_APP_SECRET="只放本机，不提交"
FEISHU_EVENT_SUBSCRIPTION_MODE="long_connection"
```

飞书开放平台后台需要配置：

1. 应用能力：开启机器人。
2. 权限管理：至少开通 `im:message:send_as_bot`。
3. 事件与回调：订阅方式选择长连接。
4. 事件与回调：添加 `im.message.receive_v1`，也就是“接收消息 v2.0”。
5. 根据飞书提示补齐接收单聊或群聊 @ 机器人消息所需权限。

测试话术：

- `帮我看本周经营情况`
- `我需要准备什么数据`
- `先看库存风险`
- `这周先保利润`
- `广告怎么看`
- `退款退货怎么看`
- `这周先降低退款/退货`
- `竞品怎么看`
- `怎么用`

也可以直接在飞书里粘贴一小段经营 CSV/TSV/Markdown 表格：

```csv
week,product_name,orders,revenue,units_sold,refund_orders,refund_amount
previous,黑杯,10,500,12,1,30
current,黑杯,8,420,9,2,80
```

第一版会用样例店铺回复，验证闭环后再把输入换成真实表格。

## 阶段 4：外部平台测试

至少接一个外部平台。优先级：

1. 表格上传：最稳，适合现场降级。
2. Shopify：贴近当前演示店铺。
3. 公开竞品商品页：适合展示竞品动态。
4. Google Analytics 或广告平台：适合展示流量和广告回本。

比赛现场建议同时保留样例数据和真实接入，防止网络或权限问题影响演示。
