# A 组小白电商运营 Agent

这是 A 组“运营增长及创新创意 Agent”赛题的独立仓库。项目目标是做一个飞书驱动的电商运营 Agent，让不懂电商指标的新手也能完成店铺复盘、问题诊断、竞品观察和下周行动安排。

## 产品定位

用户不需要会看复杂数据大盘，只需要把店铺数据、商品数据、库存数据、广告数据或竞品链接交给 Agent。Agent 会：

- 主动追问缺失信息。
- 自动识别数据完整度。
- 分析销量、订单、转化、广告回本、库存和竞品压力。
- 用自然语言解释“发生了什么、为什么、先做什么”。
- 输出下周行动清单。
- 结果回写飞书群、文档或待办。

## 当前原型

本地启动后打开：

```bash
http://localhost:3000/agent
```

当前演示假设：

- 店铺：Aurora Cup 独立站
- 平台：Shopify
- 市场：美国
- 类目：智能温控/温显旅行杯
- 目标：同时看销量、利润、广告回本、库存风险和竞品压力

## 关键文档

- `docs/a-group-user-prep.md`：用户需要准备什么。
- `docs/a-group-mvp.md`：MVP 范围和评分映射。
- `docs/a-group-data-contract.md`：Agent 第一版能理解的数据结构。
- `docs/a-group-demo-assumptions.md`：演示店铺、样例数据和真实竞品来源。
- `docs/a-group-demo-script.md`：现场演示脚本。
- `docs/feishu-connector-migration.md`：飞书机器人迁移能力设计。
- `docs/github-versioning.md`：GitHub、Tag 和回滚流程。
- `docs/testing-plan.md`：真实测试路径。

## 样例数据

- `data/samples/aurora-cup-weekly-metrics.csv`
- `data/samples/aurora-cup-competitors.csv`

样例数据用于演示 Agent 工作流，不代表真实经营结果。拿到真实数据后优先替换样例数据，同时保留样例作为现场演示降级。

## 本地开发

前置条件：

- Node.js
- pnpm。若本机没有全局 pnpm，可使用 `npx pnpm@10.13.1 ...`

安装依赖：

```bash
npx pnpm@10.13.1 install
```

启动 Web：

```bash
npx pnpm@10.13.1 run dev
```

质量检查：

```bash
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vitest run
./node_modules/.bin/eslint .
```

## 飞书与凭证

飞书是任务入口和结果输出，不是业务数据底座。禁止提交：

- `.env`
- Feishu App Secret
- Feishu Encrypt Key
- Feishu Verification Token
- chat ID
- document ID
- bitable ID
- 平台 OAuth token

真实配置只放 `.env`、部署平台环境变量或未来的加密配置中。

## 版本回滚

每个可演示版本必须有 commit 和 tag。当前计划的第一版 tag：

```bash
v0.1.0-a-group-ecommerce-agent
```

回滚时优先从 Git tag 或 GitHub commit 重新部署，不在生产环境手工改文件。
