# 用户回来后的必要确认清单

这份清单只放需要用户亲自做或确认的动作。其他能本地完成的研发、测试、文档和 Git 版本管理由 Codex 先完成。

## 飞书

飞书后台当前状态已记录在 `docs/feishu-app-status.md`。确认到的应用是 `A 组电商运营 Agent`，App ID 是 `cli_aaea1dbb6ee1dd10`，机器人能力和 `im.message.receive_v1` 长连接事件已经存在，当前主要缺 App Secret、本地 `.env` 和发布确认。

1. 先确认本地代码和基础能力：

```bash
git pull
npx pnpm@10.13.1 install
npx pnpm@10.13.1 run agent:smoke
```

2. 打开本地页面：

```bash
npx pnpm@10.13.1 exec next dev -p 3001
```

然后访问 `http://localhost:3001/agent`。

3. 在飞书开放平台确认应用：`A 组电商运营 Agent`。
4. 在“凭证与基础信息”复制 App Secret。
5. 只在本机 `.env` 填：

```bash
FEISHU_APP_ID="cli_aaea1dbb6ee1dd10"
FEISHU_APP_SECRET="不要提交，只放本机"
```

6. 先做飞书配置和本地数据体检：

```bash
npx pnpm@10.13.1 run feishu:doctor
```

即使 App Secret 还没填，doctor 也会先检查本地经营表路径和字段是否可分析。

7. 确认 App Secret 和本地经营表配置没问题后，再启动 worker：

```bash
npx pnpm@10.13.1 run feishu:worker
```

8. 在飞书给机器人发单聊：

```text
帮我看本周经营情况
```

9. 如果 worker 已连接但机器人没有回复，在飞书后台创建版本并发布。页面提示“应用发布后，当前配置方可生效”，这一步需要用户确认。

## 真实数据

可以先不整理成完美模板。最小 CSV/TSV/Markdown 表格：

```csv
week,product_name,sku,orders,revenue,units_sold,gross_profit,refund_orders,refund_amount
previous,黑杯,CUP-BLACK,10,500,12,180,1,30
current,黑杯,CUP-BLACK,8,420,9,90,2,80
```

回到 `/agent` 页，先填本周目标，再把经营表粘贴进“真实数据导入工作台”并点击“生成复盘”。

如果手里是平台导出的多周期表，不需要手工裁成两周。Agent 会自动选择最近两期，并在导入报告里说明。没有 `week` 列也没关系，有 `date/start_date/开始日期` 就能判断周期。也可以直接从 Excel、飞书表格或 Google Sheets 复制表格粘贴进工作台。

## 需要决策

- 第一版真实测试先用单聊机器人，还是拉进群聊。
- 结果沉淀到飞书群消息、飞书文档，还是多维表格。
- 真实店铺数据是否允许进入本地 `.env` 指定的经营表文件路径。
- 后续是否接 Shopify、广告平台或表格上传作为外部平台。
