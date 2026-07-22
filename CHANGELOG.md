# Changelog

所有重要变更都会记录在本文件中。

## [v0.1.92-beginner-copyable-next-step] - 2026-07-23

### Added

- “我现在做什么”工作会话在没有经营表或缺关键字段时，直接返回可复制的最小经营数据表。
- `/agent` 工作台的 Agent 接手步骤会展示这张最小表并提供复制按钮，降低小白补数门槛。

## [v0.1.91-competitor-evidence-notes] - 2026-07-23

### Added

- 竞品分析增加来源、观察日期和价格备注口径，提醒用户竞品价是观察快照，不是实时价格。
- 竞品模板、数据契约、用户准备清单和飞书追问增加 `price_note` / 价格备注字段，帮助记录券后价、无库存、无 featured offer 或历史价等边界。

### Changed

- 首页竞品卡不再残留固定美元符号，并展示来源日期与价格备注。
- Aurora Cup 演示竞品优先使用 Ember、Nextmug 和 VSITOO 官方商品页，Amazon 低价替代品明确标注价格可信边界。

## [v0.1.90-readme-latest-capabilities] - 2026-07-23

### Changed

- README 同步最新能力：网页复制模板、API `tableTemplates`、币种中立金额展示、飞书会话补充表合并和 `.env` 数据补表合并。

## [v0.1.89-currency-neutral-display] - 2026-07-23

### Changed

- Agent 分析、飞书回复、Markdown 周报和网页金额卡片不再默认加 `$`，改为按原表金额单位展示。
- 广告回本文案改成“每花 1 个金额单位带回多少成交”，避免用户导入人民币、欧元或其他币种时被美元符号误导。
- KPI 指南和文档补充说明：Agent 解析币种符号，但不自动做币种换算。

## [v0.1.88-api-table-templates] - 2026-07-23

### Added

- 新增共享数据表模板模块，网页复制模板和 API 返回模板共用同一份 CSV。
- `/api/agent/analyze` 在成功、缺参和缺字段响应里都返回 `tableTemplates`，方便外部入口把模板直接给小白用户填数。
- API smoke 和真实测试文档覆盖 `tableTemplates` 返回。

## [v0.1.87-ui-copy-table-templates] - 2026-07-23

### Added

- `/agent` 真实数据导入工作台的经营、竞品、广告、库存/成本、用户声音表头增加“复制模板”按钮。
- 页面 smoke 检查模板入口，用户返回清单说明如何把模板复制到 Excel、飞书表格或聊天里改成真实数据。

## [v0.1.86-feishu-env-context-tables] - 2026-07-23

### Added

- 飞书 worker 从 `.env` 读取本地经营表时保留原始表格上下文，后续在飞书里粘贴广告、库存/成本、用户声音或竞品补充表可以继续合并。
- 新增可复用的飞书表格上下文构建函数，并用单测覆盖 `.env` 导入数据加飞书补充表的合并路径。
- 真实测试文档说明 `.env` 数据和飞书会话补充表可以合并。

## [v0.1.85-feishu-auxiliary-table-merge] - 2026-07-23

### Added

- 飞书同一会话支持先粘贴经营表，再继续粘贴广告、库存/成本、用户声音或竞品补充表并合并复盘。
- 飞书表格识别区分经营表和广告表，避免把只有 `ad_revenue/ROAS/ACOS` 的广告表误当成经营表。
- 长连接 worker、Agent smoke、飞书单测、真实测试文档和用户返回清单覆盖补充表合并流程。

## [v0.1.84-fee-aware-profit] - 2026-07-23

### Added

- 周度经营表和订单明细支持平台佣金、支付手续费、物流/履约费和其他可变成本字段。
- 没有明确毛利但有商品成本时，Agent 会把这些费用折进派生毛利；已有平台毛利时不会重复扣费。
- 报表、首页样例、CSV 模板、数据契约、KPI 指南、单测和 Agent smoke 覆盖费用感知利润口径。

## [v0.1.83-customer-voice-privacy-warning] - 2026-07-23

### Added

- 用户声音/售后评价表也会识别买家姓名、电话、邮箱和地址等个人信息字段，并提醒这些字段不会参与经营复盘。
- CSV 单测、Agent smoke、数据契约和用户返回清单覆盖用户声音隐私提醒。

## [v0.1.82-order-unit-cost] - 2026-07-23

### Added

- 订单明细导入支持 `unit_cost / 单位成本 / 单件成本 / 采购单价` 等字段，并按购买件数汇总为商品成本。
- 订单明细模板、数据契约、用户返回清单、CSV 单测和 Agent smoke 覆盖单位成本路径。

## [v0.1.81-ad-acos-import] - 2026-07-23

### Added

- 周度经营表和独立广告表支持 ACOS/广告成本占比字段，并按 `广告成交额 = 广告花费 ÷ ACOS` 正确反推广告成交额。
- API smoke、Agent smoke、CSV 导入单测和广告模板覆盖 ACOS 路径。

## [v0.1.80-latest-tag-docs] - 2026-07-23

### Changed

- 用户返回清单和 GitHub 回滚文档不再写死最新 tag，改为用 `git tag --sort=-creatordate | head -1` 查询。

## [v0.1.79-data-entry-templates] - 2026-07-23

### Added

- 新增 `data/templates/` 可填写模板，覆盖周度经营、订单明细、广告、库存/成本、用户声音和竞品数据。
- `agent:smoke` 会实际导入这些模板，防止模板字段和 Agent 导入器脱节。

## [v0.1.78-user-return-checklist] - 2026-07-23

### Added

- 刷新用户回来后的必要确认清单，补充最新稳定 tag、Web/API smoke 顺序、飞书 chat 缓存路径、清空缓存测试和 Shopify/Amazon/代码块粘贴说明。
- GitHub 回滚文档补充稳定 tag 检查和回滚入口。

## [v0.1.77-import-issue-groups] - 2026-07-23

### Added

- `/agent` 导入工作台会把导入提醒按“必须先修正”“建议你确认”“已自动处理”分组展示，帮助新手区分阻断错误、口径风险和 Agent 已处理事项。
- Web smoke 检查 `/agent` 页面保留导入提醒分组文案。

## [v0.1.76-feishu-clear-context] - 2026-07-23

### Added

- 飞书用户可以发送“清空这份数据”“忘记当前数据”“重新开始”等话术，清除当前 chat 最近一次粘贴的经营表缓存。
- 清空缓存回复会明确说明是否真的删除了已保存数据；使用说明和 smoke 覆盖清空数据话术。

## [v0.1.75-import-source-row-numbers] - 2026-07-23

### Added

- CSV/TSV/Markdown 导入会保留原始粘贴或文件行号；即使表格前有说明行，错误追问也会指向用户看到的真实行号。
- Agent smoke 覆盖“跳过说明行后仍提示正确异常行号”的场景。

## [v0.1.74-feishu-context-cache] - 2026-07-23

### Added

- 飞书长连接 worker 会把每个 chat 最近一次粘贴的经营表上下文保存在本机 `.agent-state/feishu-chat-contexts.json`，重启后继续用刚粘贴的数据回答待办、补数和复盘问题。
- 新增 `FEISHU_CHAT_CONTEXT_PERSISTENCE=off` 和 `FEISHU_CHAT_CONTEXT_FILE`，方便关闭本地缓存或迁移缓存文件。
- `feishu:doctor` 会提示当前会话上下文缓存路径，`.agent-state/` 已加入 Git 忽略列表。

## [v0.1.73-pasted-header-detection] - 2026-07-23

### Added

- CSV/TSV/Markdown 导入会自动跳过表格前的说明行、导出时间等人话内容，优先定位真实表头后再分析。
- 飞书粘贴路径和 Agent smoke 覆盖“先写说明，再粘贴表格”的新手使用场景。

## [v0.1.72-fenced-table-import] - 2026-07-23

### Added

- CSV/TSV/Markdown 导入会忽略开头和结尾的 Markdown 代码围栏，聊天里用 `csv` 或 `text` 代码块包裹的表格也能被网页、API 和飞书粘贴路径识别。

## [v0.1.71-feishu-platform-order-paste] - 2026-07-23

### Added

- 飞书粘贴表格检测支持 Shopify Orders 的 `Paid at / Lineitem price` 和 Amazon 订单 TSV 的 `amazon-order-id / purchase-date / item-price` 等平台原始表头。
- Agent smoke 和飞书回复单测覆盖直接在飞书粘贴 Shopify/Amazon 订单导出表的路径。

## [v0.1.70-api-kpi-guide] - 2026-07-23

### Added

- `/api/agent/analyze` 的成功、缺字段和缺 `metricsCsv` 响应都会返回 `kpiGuide`，方便前端或飞书解释销售额、订单、转化、广告、库存、退款/退货和竞品指标。

## [v0.1.69-currency-number-formats] - 2026-07-23

### Added

- 数字解析支持 `US$1,200.50`、`USD 80.25`、`RMB 90`、`￥980.00` 等币种符号/代码格式。
- 毛利等允许负数的字段支持会计负数写法，例如 `(30.5)` 会识别为 `-30.5`。

## [v0.1.68-excel-non-empty-sheet] - 2026-07-23

### Added

- Excel 上传会读取第一张有数据的工作表；如果第一页是空白说明页，会自动跳到后面的经营数据 sheet。

## [v0.1.67-order-detail-gap-question] - 2026-07-23

### Added

- 订单明细只覆盖一个自然周时，导入报告会说明当前识别到的周范围，并明确让用户补相邻一周的订单号、支付时间、商品/SKU、件数和实收金额。

## [v0.1.66-privacy-field-warning] - 2026-07-23

### Added

- 经营数据导入器会识别买家/收件人姓名、电话、邮箱、收货地址、身份证/税号等个人信息字段，并在导入报告里提醒删除或隐藏。
- 隐私字段不会阻断订单明细分析；Agent 会继续使用订单号、时间、SKU、金额、件数和售后状态等经营字段完成复盘。

## [v0.1.65-amazon-order-export] - 2026-07-23

### Added

- 订单明细导入器支持 Amazon Seller Central 订单报告常见表头：`amazon-order-id`、`purchase-date`、`product-name`、`sku`、`quantity-purchased`、`item-price` 和 `item-status`。
- `/agent` 工作台新增“Amazon 订单样例”，API/Web/Agent smoke 和单测覆盖 Amazon TSV 明细导入路径。

## [v0.1.64-feishu-non-text-guidance] - 2026-07-23

### Added

- 飞书机器人收到文件、图片、富文本等非文字消息时，不再只说“支持文字消息”，会指导用户复制表头和几行数据粘贴，或去 `/agent` 工作台上传 CSV/Excel。
- 飞书文字解析会去掉 `<at ...>` 和开头 `@机器人` 提及，群聊 @ 机器人后更稳定地识别“复盘、补数、测试”等意图。

## [v0.1.63-shopify-sample-entry] - 2026-07-23

### Added

- `/agent` 真实数据导入工作台新增“Shopify 订单样例”，可一键验证 Shopify Orders 原始导出表头和单价乘件数聚合。
- API smoke 新增 Shopify Orders 请求，Web smoke 检查 `/agent` 页面保留 Shopify 订单入口和 KPI 指南。

## [v0.1.62-shopify-order-export] - 2026-07-23

### Added

- 订单明细导入器支持 Shopify Orders 常见表头：`Name`、`Paid at`、`Lineitem name`、`Lineitem sku`、`Lineitem quantity`、`Lineitem price`、`Refunded Amount` 和 `Financial Status`。
- Shopify `Lineitem price` 会按单价乘购买件数后再聚合销售额，避免把多件订单低估成单件金额。

## [v0.1.61-file-import-errors] - 2026-07-23

### Added

- 真实数据导入工作台新增文件读取失败提示；空 Excel、损坏文件或无法读取的上传会提示用户改为复制表格内容粘贴。

## [v0.1.60-excel-workbook-upload] - 2026-07-23

### Added

- 真实数据导入工作台支持上传 `.xlsx/.xls`，会把第一张工作表转成 CSV 文本后进入现有字段识别和复盘流程。
- 新增工作簿转换工具与单测，验证中文电商表头从 Excel 转换后仍能被导入器识别。

## [v0.1.59-product-risk-table] - 2026-07-23

### Added

- 新增风险商品 TSV，包含优先级、商品、SKU、问题、人话原因和建议动作。
- `/api/agent/analyze` 返回 `riskTable`，首页真实数据导入工作台支持复制风险商品表。
- 飞书问答新增“风险商品/问题商品/异常 SKU”意图，可直接返回可粘贴到飞书表格或多维表格的风险商品表。

## [v0.1.58-feishu-chat-context] - 2026-07-23

### Added

- 飞书长连接 worker 新增 chat 级最近导入上下文：用户在同一会话粘贴经营表后，后续“复盘/待办/补数”会继续使用刚粘贴的数据。
- 飞书粘贴表识别放宽到“不完整但明显是经营表”的情况，可直接进入缺字段补数流程。
- 飞书事件处理器会把原始消息事件传给回复构造器，支持后续按 chat、用户或群做上下文扩展。

## [v0.1.57-feishu-incomplete-import] - 2026-07-23

### Added

- 飞书回复支持导入报告上下文：当本地经营表不完整时，机器人会按当前表追问缺失字段，而不是回落成样例店铺复盘。
- 飞书长连接 worker 读取到不完整经营表时仍会启动，让用户可以在飞书里继续补数。
- `feishu:doctor` 对不完整经营表输出下一句补数追问；只要飞书凭证齐，不再把缺字段数据当作 worker 致命错误。

## [v0.1.56-data-request-plan] - 2026-07-23

### Added

- 新增结构化补数清单，说明下一份要补什么、负责人、去哪里找、要复制哪些列、为什么重要以及首页影响。
- `/api/agent/analyze` 返回 `dataRequestPlan` 和可粘贴到飞书表格/多维表格的 `dataRequestTable`，缺字段 `422` 时也能继续带用户补数据。
- 首页真实数据导入工作台新增“下一份要补的数据”面板和复制补数清单按钮。
- 飞书问答新增“我还缺什么数据/补哪些数据”意图。

## [v0.1.55-feishu-task-intent] - 2026-07-23

### Added

- 飞书问答新增“待办/任务清单/分工”意图，可直接返回适合粘贴到飞书表格或多维表格的待办 TSV。

## [v0.1.54-task-table-export] - 2026-07-23

### Added

- 新增运营待办 TSV 导出，字段包含优先级、截止、负责人、任务、第一步、验收标准和原因。
- `/api/agent/analyze` 返回 `taskTable`，网页工作台“复制待办表格”可直接粘贴到飞书表格或多维表格。

## [v0.1.53-operational-task-list] - 2026-07-23

### Added

- 分析结果新增 `operationalTasks` 结构化运营待办，包含负责人、优先级、截止时间、第一步和验收标准。
- 飞书回复、飞书文档 Markdown 和网页工作台会展示可执行待办，而不是只给松散行动建议。
- 网页工作台新增“复制待办”，方便先手动迁移到飞书待办、多维表格或群消息。

## [v0.1.52-ad-single-date-current] - 2026-07-23

### Fixed

- 广告数据表只有一个日期周期时，默认按本周广告数据导入，避免常见的单日/单周广告导出被跳过。

## [v0.1.51-ads-table-import] - 2026-07-23

### Added

- 新增可选“广告数据表”，支持周期、SKU/商品名、广告计划、广告花费、广告成交额和 ROAS。
- 导入器会按周期和 SKU/商品名把广告表匹配到上周/本周商品，并支持用 ROAS 反推广告花费或广告成交额。
- 网页工作台、`/api/agent/analyze`、飞书 worker、doctor、样例数据、smoke 和文档同步支持广告表。

## [v0.1.50-product-snapshot-costs] - 2026-07-23

### Changed

- “库存快照表”升级为“库存/成本快照表”，支持 `unit_cost/单位成本` 和 `gross_margin_rate/毛利率`。
- 导入器会用单位成本补齐上周和本周 SKU 商品成本，并推算毛利，减少订单明细缺少利润口径时的误判。
- 网页工作台、样例数据、飞书数据清单、smoke 和文档同步更新库存/成本快照口径。

## [v0.1.49-inventory-snapshot-import] - 2026-07-23

### Added

- 新增可选“库存快照表”，支持 SKU/商品名、当前库存和库存日期，补足订单导出里常缺的库存数据。
- 导入器会把库存快照匹配到本周商品，用于断货风险判断，并提醒未匹配库存行。
- `/agent` 工作台、`/api/agent/analyze`、飞书 worker、doctor、smoke、样例数据和文档同步支持库存快照。

## [v0.1.48-order-detail-import] - 2026-07-23

### Added

- 经营数据导入器支持订单明细表：识别订单号、支付时间、商品名称/SKU、购买数量、实付金额、退款金额和售后状态。
- 订单明细会按订单日期自动聚合成最近两周 SKU 经营表，再进入同一套经营复盘、售后风险和飞书回复链路。
- `/agent` 工作台新增“订单明细样例”，飞书粘贴表格检测、API smoke、Agent smoke 和文档同步覆盖订单明细路径。

## [v0.1.47-customer-voice-import] - 2026-07-23

### Added

- 新增可选“用户声音/售后评价表”，支持客服备注、商品评价、差评关键词、退款备注和售后问题出现次数。
- 分析器会按 SKU/商品名把用户声音匹配到商品，在缺少结构化退款原因时用客服/评价文本解释售后风险。
- 网页工作台、`/api/agent/analyze`、飞书 worker、doctor、样例数据、周报 Markdown、smoke 和文档同步支持用户声音表。

## [v0.1.46-docs-reality-check] - 2026-07-22

### Changed

- GitHub 回滚文档更新为当前 A 组真实 remote，并说明 `.env.example` 可以放非敏感默认值。
- 用户准备清单澄清第一版主要读取表格文本/文件，截图暂时只能作为补充背景。
- 演示脚本补充本地 `3001` 备用访问地址。

## [v0.1.45-copy-workbench-output] - 2026-07-22

### Added

- 真实数据导入工作台生成复盘后，可一键复制飞书回复和飞书文档 Markdown，方便真实测试时直接回写。

## [v0.1.44-period-aliases] - 2026-07-22

### Added

- 经营表周期识别支持 `上期/本期`、`对比期/分析期`、`统计周期/统计日期` 等平台导出口径。

## [v0.1.43-duplicate-sku-merge] - 2026-07-22

### Added

- 经营表同一周期出现重复 SKU 时，导入器会先自动合并再分析，减少平台导出多行数据导致的重复商品诊断。
- 导入提醒、数据契约、测试计划和 `agent:smoke` 覆盖重复 SKU 合并场景。

## [v0.1.42-feishu-doctor-handoff] - 2026-07-22

### Changed

- `.env.example` 预填 A 组当前非敏感 App ID，用户回来后只需要补 App Secret。
- `feishu:doctor` 在没有 `.env` 或缺少飞书变量时给出更直接的下一步提示。
- 飞书状态快照和用户回来清单补充复制 `.env.example` 的操作。

## [v0.1.41-analysis-driven-work-session] - 2026-07-22

### Changed

- 网页和 `/api/agent/analyze` 的 `workSession` 会接入分析后的追问，让“下一句我会问你”指向真实缺口，例如竞品、流量、广告、库存、毛利或退款原因。
- 用户已经给出保利润、保销量、广告、库存、退款、竞品等具体目标时，Agent 不再重复追问目标优先级。

## [v0.1.40-feishu-platform-paste] - 2026-07-22

### Added

- 飞书消息入口可识别直接粘贴的平台中文经营表，例如 `支付买家数`、`商品支付金额`、`支付商品件数`、`退款率`、`退款原因`。
- `agent:smoke` 和测试计划补充飞书直贴平台表头场景，降低真实飞书测试时的误触发风险。

## [v0.1.39-derived-rate-fields] - 2026-07-22

### Added

- 平台经营表支持 `转化率/CVR`、`ROAS/投产比`、`毛利率`、`退款率/退货率`、`退款金额占比` 等比率字段。
- 当原始字段缺失但比率字段存在时，导入器会反推访客数、广告成交额、毛利、退款/退货单数或退款金额，帮助真实平台导出表先跑起来。
- KPI 文档、数据契约、用户准备清单和 smoke 检查同步覆盖比率字段。

## [v0.1.38-refund-reason-diagnosis] - 2026-07-22

### Added

- 经营表导入支持 `refund_reason`、`退款原因`、`退货原因`、`售后原因` 等退款/退货原因字段。
- 分析和飞书售后回复会直接引用用户给到的退款/退货原因，并给出商品页说明、质检、物流和客服话术检查方向。
- 样例数据、平台表头样例、smoke 检查和用户准备文档同步加入退款/退货原因。

## [v0.1.37-changelog-refresh] - 2026-07-22

### Changed

- 更新 changelog，补齐近期 tag 与 smoke 命令记录。

## [v0.1.36-competitor-source-refresh] - 2026-07-22

### Changed

- 更新样例竞品来源，Nextmug 和 VSITOO 优先使用官方站，Locckmy 明确标注为低价替代演示价。

## [v0.1.35-platform-number-units] - 2026-07-22

### Added

- 平台导出数字支持 `1.2万元`、`2.6千元`、`90单`、`100件`、`80元` 等常见带单位写法。

## [v0.1.34-api-smoke] - 2026-07-22

### Added

- 增加 `pnpm run smoke:api`，自动检查 `/api/agent/analyze` 的平台中文表头、缺参数和缺必填字段处理。

## [v0.1.33-profit-sample-data] - 2026-07-22

### Added

- 首页样例数据补齐毛利字段，让默认演示也能覆盖利润诊断。

## [v0.1.32-import-loader-docs] - 2026-07-22

### Added

- 测试计划补充“演示样例”和“平台表头样例”按钮的使用说明。

## [v0.1.31-import-sample-loaders] - 2026-07-22

### Added

- 真实数据导入工作台增加“演示样例”和“平台表头样例”按钮。

## [v0.1.30-feishu-app-status] - 2026-07-22

### Added

- 记录飞书后台真实应用状态：App ID、机器人能力、长连接事件、发布和 App Secret 缺口。

## [v0.1.29-web-route-smoke] - 2026-07-22

### Added

- 增加 `pnpm run smoke:web`，自动检查主要页面 200 且不泄漏原始 Prisma/DATABASE_URL 错误。

## [v0.1.28-real-table-wording] - 2026-07-22

### Changed

- 飞书回复、doctor 和文档统一使用“经营表”口径，明确支持 CSV/TSV/Markdown 和复制表格。

## [v0.1.27-platform-header-aliases] - 2026-07-22

### Added

- 扩展真实平台中文字段别名，例如 `商品访客数`、`支付买家数`、`商品支付金额`、`退款成功金额`。
- 导入报告不再展示未识别的可选字段，避免出现 `undefined -> startDate` 这类小白看不懂的映射。

## [Earlier 0.1.x]

### Added

- CSV 导入器支持 TSV、分号分隔文件，以及从 Excel/飞书表格直接复制的制表符数据。
- 真实数据导入工作台增加“本周目标”输入，网页端也能驱动保利润/保销量等行动优先级。
- 没有 `week` 列但有 `date/start_date/开始日期` 的平台导出表，也能自动判断最近两期。
- 增加电商 KPI 统一词典，页面和飞书共用同一套指标解释。
- 增加小白工作步骤 `workSession`，用于提示用户下一步要补什么、Agent 接下来会做什么。
- `/api/agent/analyze` 增加 `workSession` 返回值。
- 增加真实测试路径回复，飞书里可直接回答“怎么测、要不要接飞书”。
- CSV 导入支持从多周期平台导出中自动选择最近两期做对比。
- 经营分析会根据用户目标调整行动优先级，例如保利润时先核对利润口径。
- CSV 导入会拒绝负订单、负销售额、负销量、负库存等明显异常数据。
- 导入失败时优先追问具体错误行和字段，而不是泛泛要求确认周期。
- 增加 `pnpm run agent:smoke`，一条命令验证 CSV 导入、分析、飞书问答和异常数据拦截。
- 真实数据导入工作台会在本机浏览器保存草稿，刷新页面不会丢掉刚粘贴的数据。
- 增加 `pnpm run feishu:doctor`，在连接飞书前检查密钥和本地 CSV/TSV 配置。
- 更新用户回来后的操作清单，加入 smoke、本地页面和飞书体检顺序。

### Fixed

- 修复缺少竞品数据时，因提示文案包含“促销”而误触发竞品促销行动建议的问题。
- 修复导入错误提示在筛选上周/本周后行号不准确的问题。

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
