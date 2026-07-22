# 用户回来后的必要确认清单

这份清单只放需要用户亲自做或确认的动作。其他能本地完成的研发、测试、文档和 Git 版本管理由 Codex 先完成。

## 飞书

1. 在飞书开放平台确认应用：`A 组电商运营 Agent`。
2. 在“凭证与基础信息”复制 App Secret。
3. 只在本机 `.env` 填：

```bash
FEISHU_APP_ID="cli_aaea1dbb6ee1dd10"
FEISHU_APP_SECRET="不要提交，只放本机"
```

4. 启动本地长连接：

```bash
npx pnpm@10.13.1 run feishu:worker
```

5. 在飞书给机器人发单聊：

```text
帮我看本周经营情况
```

6. 如果 worker 已连接但机器人没有回复，在飞书后台创建版本并发布。页面提示“应用发布后，当前配置方可生效”，这一步需要用户确认。

## 真实数据

可以先不整理成完美模板。最小 CSV：

```csv
week,product_name,sku,orders,revenue,units_sold,gross_profit
previous,黑杯,CUP-BLACK,10,500,12,180
current,黑杯,CUP-BLACK,8,420,9,90
```

回到 `/agent` 页，把 CSV 粘贴进“真实数据导入工作台”并点击“生成复盘”。

## 需要决策

- 第一版真实测试先用单聊机器人，还是拉进群聊。
- 结果沉淀到飞书群消息、飞书文档，还是多维表格。
- 真实店铺数据是否允许进入本地 `.env` 指定的 CSV 文件路径。
- 后续是否接 Shopify、广告平台或表格上传作为外部平台。
