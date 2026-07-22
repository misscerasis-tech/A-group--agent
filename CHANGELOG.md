# Changelog

所有重要变更都会记录在本文件中。

## [Unreleased]

### Added

- 增加电商 KPI 统一词典，页面和飞书共用同一套指标解释。
- 增加小白工作步骤 `workSession`，用于提示用户下一步要补什么、Agent 接下来会做什么。
- `/api/agent/analyze` 增加 `workSession` 返回值。

## [v0.1.4-goal-aware-feishu-replies] - 2026-07-22

### Added

- 飞书回复增加保利润、保销量、广告、竞品四类目标型运营问答。

## [v0.1.3-weekly-report-output] - 2026-07-22

### Added

- 增加飞书文档可沉淀的周报 Markdown 生成器。
- `/api/agent/analyze` 增加 `markdownReport` 返回值。
- 真实数据导入工作台增加“飞书文档 Markdown”输出。

## [v0.1.2-data-import-workbench] - 2026-07-22

### Added

- 增加真实数据导入工作台，支持上传或粘贴经营 CSV 与竞品 CSV。
- 增加 CSV 字段别名识别，支持中英文字段、上周/本周识别、缺失字段追问。
- 增加成本、毛利和毛利率风险判断。
- 增加 `/api/agent/analyze`，支持通过 API 输入 CSV 并返回复盘结果。
- 飞书 worker 支持读取本地 CSV、直接分析飞书粘贴的 CSV，并优先回复原消息。
- 增加用户回来后的必要确认清单。

## [v0.1.1-feishu-long-connection] - 2026-07-22

### Added

- 增加飞书长连接 worker。
- 增加飞书机器人消息回复、样例复盘和数据准备回复。
- 增加飞书事件处理测试。

## [v0.1.0-a-group-ecommerce-agent] - 2026-07-22

### Added

- 建立 A 组小白电商运营 Agent 独立项目。
- 增加 `/agent` 演示页，模拟飞书任务入口、数据完整度检查、经营复盘、竞品解释、行动清单和飞书回写。
- 增加电商经营分析的纯 TypeScript 逻辑、样例数据和测试。
- 增加演示店铺假设、样例经营 CSV、真实竞品来源记录。
- 增加飞书机器人迁移能力设计、迁移计划生成、脱敏输出和测试。
- 增加 GitHub 分支、Tag、发布和回滚流程文档。
- 增加真实测试路径文档。

### Changed

- 将应用入口、导航、元信息和环境变量样例调整为 A 组电商运营 Agent。
- 将导航页面改为不依赖数据库的演示态，避免未配置 DATABASE_URL 时出现 Prisma 错误。
