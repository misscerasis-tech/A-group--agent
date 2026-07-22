# A 组数据契约

本文件定义电商运营 Agent 第一版能理解的数据结构。目标不是要求用户严格填表，而是让 Agent 能识别用户上传的数据，并在缺失时主动追问。

## 店铺资料

| 字段 | 含义 | 是否必需 | 示例 |
| --- | --- | --- | --- |
| storeName | 店铺名称 | 必需 | Aurora Store |
| platform | 销售平台 | 必需 | Shopify |
| market | 目标市场 | 推荐 | 美国 |
| category | 商品类目 | 推荐 | 智能保温杯 |
| goal | 用户本次目标 | 必需 | 看本周销售为什么下降 |

## 经营数据

| 字段 | 含义 | 是否必需 | 示例 |
| --- | --- | --- | --- |
| week | 数据周期 | 必需 | previous / current / 上周 / 本周 |
| startDate | 开始日期 | 推荐 | 2026-07-13 |
| endDate | 结束日期 | 推荐 | 2026-07-19 |
| productName | 商品名称 | 必需 | Aurora Cup |
| sku | SKU | 推荐 | CUP-BLACK-500 |
| visitors | 访客数 | 推荐 | 1200 |
| conversionRate | 转化率 | 可选 | 8% |
| orders | 订单数 | 必需 | 58 |
| revenue | 销售额 | 必需；如果暂时没有，可用订单数 + 客单价先补出口径 | 3480 |
| averageOrderValue | 客单价 | 可选；缺销售额时可用于自动补出销售额 | 60 |
| unitsSold | 销售件数 | 必需 | 62 |
| adSpend | 广告花费 | 可选 | 820 |
| adRevenue | 广告成交额 | 可选 | 2100 |
| adReturn | 广告回本/ROAS | 可选 | 2.5 / 250% |
| inventory | 当前库存 | 可选 | 180 |
| productCost | 商品成本 | 可选 | 2100 |
| platformFee | 平台佣金或服务费 | 可选 | 210 |
| paymentFee | 支付或交易手续费 | 可选 | 35 |
| fulfillmentCost | 物流、仓配或履约成本 | 可选 | 160 |
| otherCost | 包装、仓储等其他可变成本 | 可选 | 45 |
| grossProfit | 毛利 | 可选 | 1380 |
| grossMarginRate | 毛利率 | 可选 | 38% |
| refundOrders | 退款或退货单数 | 可选 | 3 |
| refundAmount | 退款金额 | 可选 | 120 |
| refundOrderRate | 退款或退货单率 | 可选 | 5% |
| refundAmountRate | 退款金额占比 | 可选 | 3.4% |
| refundReason | 退款、退货或售后原因 | 可选 | 杯盖漏水 / 物流慢 |

当前导入器已经支持 CSV/TSV/Markdown 表格，不要求字段名完全一致。从 Excel、飞书表格或 Google Sheets 直接复制出来的制表符表格也能识别。网页工作台也支持上传 `.xlsx/.xls`，会读取第一张有数据的工作表并转成 CSV 文本进入同一套字段识别流程。常见别名会自动识别：

`week` 可以直接写 `previous/current`、`上周/本周`、`上期/本期`，也可以写真实日期或周，例如 `2026-07-08`、`2026-W29`。如果没有 `week` 列，但有 `date/start_date/开始日期/统计日期`，Agent 会把日期当成周期来源。如果导出的表里超过两个周期，Agent 会自动选择最近两期做对比，并在导入报告里说明它选了哪两期。

数字不用手动清洗成纯数字。常见平台写法例如 `1.2万元`、`2.6千元`、`90单`、`100件`、`80元`、`US$1,200.50`、`USD 80.25`、`RMB 90`、`￥980.00` 都能识别。毛利等允许为负的字段也支持会计写法，例如 `(30.5)` 会按 `-30.5` 处理。平台如果只导出 `客单价`、`转化率`、`ROAS/投产比`、`毛利率`、`退款率` 或 `退款金额占比`，Agent 会在不覆盖原始字段的前提下反推销售额、访客数、广告成交额、毛利、退款/退货单数或退款金额，用来继续做复盘。

如果已经有明确 `grossProfit/毛利`，Agent 会尊重这列，不重复扣平台费或履约费。如果没有毛利但有 `productCost/商品成本`，并且同时给了平台佣金、支付手续费、物流/履约费或包装仓储等可变成本，Agent 会把这些费用一起扣进派生毛利。只有手续费但缺商品成本时，Agent 仍会追问商品成本，不会假装知道真实利润。

如果同一个周期里出现重复 SKU，Agent 会先按 SKU 自动合并再分析。销售额、订单数、销量、广告、毛利和退款金额会相加；库存取同 SKU 最后一条可用值；退款原因会去重合并。

### 订单明细也可以直接导入

如果用户没有按周汇总好的经营表，可以先导出订单明细。Agent 会在识别到订单号、支付时间、商品名称/SKU、实付金额和购买数量后，按订单日期自动聚合成最近两周的 SKU 经营表。

Shopify Orders 导出的 `Name / Paid at / Lineitem name / Lineitem sku / Lineitem quantity / Lineitem price / Refunded Amount / Financial Status` 可以直接作为订单明细导入。其中 `Lineitem price` 会按单价处理，Agent 会乘以 `Lineitem quantity` 后再汇总为销售额。

Amazon Seller Central 订单报告常见的 TSV 表头也可以直接导入，例如 `amazon-order-id / purchase-date / product-name / sku / quantity-purchased / item-price / item-status`。其中 `item-price` 按订单行金额汇总。

真实订单导出里如果包含买家姓名、收件人、手机号、邮箱、收货地址、身份证或税号，Agent 会在导入报告里提醒删除或隐藏。这些个人信息字段不会参与经营复盘，保留订单号、时间、SKU、金额、件数和售后状态就够了。

订单明细最小字段：

| 字段 | 含义 | 是否必需 | 示例 |
| --- | --- | --- | --- |
| orderId | 订单号 | 推荐 | O-1001 |
| orderDate | 下单或支付时间 | 必需 | 2026-07-15 09:20:00 |
| productName | 商品名称 | 商品名称和 SKU 至少有一个 | Aurora Cup 黑色 |
| sku | SKU | 商品名称和 SKU 至少有一个 | CUP-BLACK |
| quantity | 购买件数 | 推荐，缺失时按 1 件估算 | 2 |
| revenue | 订单实收金额 | 必需 | 79.8 |
| discountAmount | 折扣金额 | 可选，会从订单明细收入中扣除 | 5 |
| refundAmount | 退款金额 | 可选 | 39.9 |
| unitCost | 单位成本 | 可选，会乘购买件数后汇总 | 20 |
| platformFee | 平台佣金或服务费 | 可选 | 3 |
| paymentFee | 支付或交易手续费 | 可选 | 0.5 |
| fulfillmentCost | 物流、仓配或履约成本 | 可选 | 2 |
| otherCost | 包装、仓储等其他可变成本 | 可选 | 1 |
| status | 订单或售后状态 | 可选 | 已退款 |

订单明细会按自然周聚合，自动选择最近两周作为上周和本周。如果只覆盖一个自然周，Agent 会要求用户再补一周数据，不会把单周数据硬说成趋势。如果导出里同时有单价/原价和折扣列，Agent 会先扣除 `discountAmount` 再汇总销售额。如果同一订单号出现多行，但收入字段不像 line item 行金额，Agent 会提醒这列可能是整单金额重复到每个商品行上，避免销售额被算大。

| 标准字段 | 可识别别名示例 |
| --- | --- |
| week | week、period、date、start_date、周期、统计周期、周、日期、开始日期、统计日期、时间段 |
| productName | product_name、product、商品名称、商品、品名 |
| sku | sku、商家编码、商品编码、货号 |
| visitors | visitors、sessions、uv、访客数、商品访客数、流量 |
| conversionRate | conversion_rate、cvr、转化率、支付转化率、成交转化率 |
| orders | orders、order_count、订单数、支付订单数、支付买家数 |
| revenue | revenue、sales、gmv、net_sales、total_sales、gross_sales、销售额、净销售额、总销售额、成交额、支付金额、商品支付金额 |
| averageOrderValue | average_order_value、avg_order_value、aov、客单价、平均客单价、平均订单金额、每单金额、笔单价 |
| discountAmount | discount_amount、discount、Discount Amount、折扣金额、优惠金额、订单优惠 |
| unitsSold | units_sold、net_quantity、quantity、qty、items_sold、total_items、销量、支付件数、支付商品件数 |
| adSpend | ad_spend、cost、广告花费、广告消耗、消耗 |
| adRevenue | ad_revenue、attributed_sales、广告成交额、广告销售额、直接成交金额 |
| adReturn | roas、roi、投产比、广告投产比、广告回本、投入产出比 |
| inventory | inventory、stock、库存、可售库存、可售件数 |
| productCost | product_cost、cogs、cost_of_goods、商品成本、采购成本、成本金额 |
| unitCost | unit_cost、cost_per_unit、单位成本、单件成本、采购单价、成本单价 |
| platformFee | platform_fee、commission、referral_fee、selling_fee、平台佣金、平台服务费、技术服务费 |
| paymentFee | payment_fee、processing_fee、transaction_fee、支付手续费、交易手续费、收款手续费 |
| fulfillmentCost | fulfillment_fee、fba_fee、shipping_cost、logistics_cost、履约费、物流成本、运费成本、仓配费 |
| otherCost | other_cost、service_fee、packaging_cost、warehouse_fee、其他成本、包装费、仓储费 |
| grossProfit | gross_profit、profit、毛利、毛利润、利润、毛利额 |
| grossMarginRate | gross_margin、profit_margin、margin_rate、毛利率、利润率 |
| refundOrders | refund_orders、refunds、returns、return_count、退款单数、退款成功单数、售后单数 |
| refundAmount | refund_amount、refunded_amount、return_amount、退款金额、退款成功金额、售后金额 |
| refundOrderRate | refund_rate、return_rate、退款率、退货率、退款单率、售后率 |
| refundAmountRate | refund_amount_rate、refund_revenue_rate、退款金额占比、售后金额占比 |
| refundReason | refund_reason、return_reason、售后原因、退款原因、退货原因、差评原因 |

## 广告数据

这张表可选，用来补充独立广告后台导出的投放数据。它会按周期和 SKU/商品名称匹配经营数据，更新广告花费和广告成交额，用于判断广告回本是否拖累利润。

| 字段 | 含义 | 是否必需 | 示例 |
| --- | --- | --- | --- |
| week | 数据周期 | 推荐，缺失时默认当作本周 | previous / current / 上周 / 本周 |
| productName | 商品名称 | 商品名称和 SKU 至少有一个 | Aurora Cup 黑色 500ml |
| sku | SKU | 商品名称和 SKU 至少有一个 | CUP-BLACK-500 |
| campaignName | 广告计划或广告组 | 可选 | 品牌词 |
| adSpend | 广告花费 | 广告花费、广告成交额、ROAS 至少能组成一组 | 1510 |
| adRevenue | 广告成交额 | 广告花费、广告成交额、ROAS 至少能组成一组 | 2920 |
| adReturn | ROAS / 投产比 | 可选，可用于反推广告花费或成交额 | 2.5 / 250% |

如果广告表有三周或更多周期，Agent 会自动选择最近两期。广告表里同一个 SKU 有多条广告组时，会先按 SKU 汇总广告花费和广告成交额。

## 竞品数据

| 字段 | 含义 | 是否必需 | 示例 |
| --- | --- | --- | --- |
| competitorName | 竞品名称 | 必需 | HeatGo Cup |
| url | 竞品链接 | 推荐 | https://example.com/item |
| source | 数据来源 | 推荐 | Amazon 商品页 / 官方站 / 手动记录 |
| observedAt | 观察日期 | 推荐 | 2026-07-23 |
| price | 当前价格 | 必需 | 29.99 |
| priceNote | 价格备注 | 推荐 | 页面价快照，调价前需复核 |
| promotion | 促销信息 | 可选 | 买二减 10% |
| rating | 评分 | 可选 | 4.6 |
| reviews | 评论数 | 可选 | 1280 |
| keySellingPoints | 主要卖点 | 可选 | 温显、轻量、礼盒 |

竞品 CSV/TSV 也支持别名，例如 `name/竞品名称`、`url/竞品链接`、`source/来源`、`observed_at/观察日期`、`price/价格`、`price_note/价格备注`、`promotion/促销`、`key_selling_points/卖点`。

竞品价格不是实时抓取结果时，建议一定填写 `observedAt` 和 `priceNote`。例如“页面价快照，调价前需复核”“券后价”“当前无 featured offer”“历史价，仅用于价格带分析”。Agent 会把这些备注带到复盘里，避免新手把演示价当成实时决策依据。

## 库存 / 成本快照数据

这张表可选，用来补充独立库存表、仓库快照或 SKU 成本表。它会按 SKU 或商品名称匹配经营数据：当前库存用于判断热卖断货风险，单位成本或毛利率用于补齐利润口径。

| 字段 | 含义 | 是否必需 | 示例 |
| --- | --- | --- | --- |
| productName | 商品名称 | 商品名称和 SKU 至少有一个 | Aurora Cup 黑色 500ml |
| sku | SKU | 商品名称和 SKU 至少有一个 | CUP-BLACK-500 |
| inventory | 当前库存 | 当前库存、单位成本、毛利率至少有一个 | 118 |
| unitCost | 单位成本 | 当前库存、单位成本、毛利率至少有一个 | 27.45 |
| grossMarginRate | 毛利率 | 当前库存、单位成本、毛利率至少有一个 | 38% |
| observedAt | 库存日期 | 可选 | 2026-07-19 |

常见别名：

| 标准字段 | 可识别别名示例 |
| --- | --- |
| productName | product_name、商品名称、商品、品名 |
| sku | sku、商家编码、商品编码、货号 |
| inventory | inventory、stock、available_stock、当前库存、可售库存、库存数、可售件数 |
| unitCost | unit_cost、cost_per_unit、采购单价、成本单价、单位成本、单件成本 |
| grossMarginRate | gross_margin、profit_margin、margin_rate、毛利率、利润率 |
| observedAt | observed_at、date、库存日期、盘点日期、统计日期 |

如果快照表里有 SKU 不在经营数据中，Agent 会提醒“暂不参与库存或利润判断”，不会把未匹配数据硬塞进结论。

## 用户声音 / 售后评价数据

这张表可选，用来补充客服备注、差评、评价关键词、退款备注或售后原因。它不替代经营数据表，但能帮助 Agent 判断“用户到底为什么不满意”。

用户声音表也可能含个人信息。导出前建议删除买家姓名、手机号、邮箱和地址；如果这些列还在，Agent 会提醒但不会使用这些字段做经营判断。

| 字段 | 含义 | 是否必需 | 示例 |
| --- | --- | --- | --- |
| productName | 商品名称 | 推荐 | Aurora Cup 黑色 500ml |
| sku | SKU | 推荐 | CUP-BLACK-500 |
| source | 来源 | 可选 | 商品评价 / 客服售后备注 |
| observedAt | 记录日期 | 可选 | 2026-07-19 |
| sentiment | 情绪 | 可选 | negative / 负向 |
| theme | 问题主题 | 推荐 | 杯盖漏水 |
| text | 原始反馈内容 | 推荐 | 用户反馈通勤路上杯盖会渗水 |
| count | 出现次数 | 可选 | 4 |

至少要有商品名称或 SKU，并且有问题主题或反馈内容。常见别名：

| 标准字段 | 可识别别名示例 |
| --- | --- |
| productName | product_name、商品名称、商品、品名 |
| sku | sku、商家编码、商品编码、货号 |
| source | source、来源、渠道、反馈来源 |
| observedAt | observed_at、日期、反馈日期、评价日期、售后日期 |
| sentiment | sentiment、情绪、评价类型、正负向 |
| theme | theme、topic、keyword、标签、问题类型、售后原因、退款原因、差评原因 |
| text | text、content、feedback、评价内容、评论内容、客服备注、售后备注、退款备注 |
| count | count、frequency、次数、出现次数、提及次数 |

## Agent 自动计算指标

Agent 可以从原始字段计算：

- 销售额变化。
- 订单变化。
- 客单价。
- 转化率。
- 广告回本情况。
- 库存可售天数。
- 毛利变化。
- 毛利率风险。
- 退款/退货单占比。
- 退款金额占销售额比例。
- 售后风险商品。
- 用户声音中的主要售后/评价问题。
- 商品贡献度。
- 异常商品。
- 竞品价格差。
- 结构化运营待办：负责人、优先级、截止时间、第一步和验收标准。
- 结构化补数清单：下一份要补的数据、负责人、去哪里找、要复制的列、为什么重要、首页会变准的位置。

## 小白解释规则

输出时优先使用自然语言：

- “销售额”可以说成“这周一共卖了多少钱”。
- “转化率”可以说成“进店的人里有多少真的下单”。
- “客单价”可以说成“每个订单平均花多少钱”。
- “广告回本”可以说成“广告花出去的钱有没有换回订单”。
- “库存可售天数”可以说成“按现在的速度还能卖几天”。

专业词可以出现，但必须配一句解释。

## 缺失数据处理

如果没有流量数据：

- 不判断转化率，只判断销售、订单、客单价和库存。
- 追问用户是否能提供访客数或曝光数。

如果没有广告数据：

- 不判断广告回本。
- 把广告诊断标记为“需要补充数据”。

如果没有库存数据：

- 不判断断货风险。
- 追问库存表或每个 SKU 当前库存。

如果没有退款/退货数据：

- 不判断售后是否在侵蚀真实利润。
- 追问退款单数、退货数、退款金额或退款原因。

如果没有竞品数据：

- 让用户提供竞品链接。
- 或根据产品名称生成待观察竞品清单。

## API 输出给前端和飞书的工作结构

`POST /api/agent/analyze` 在成功分析时会返回：

- `workSession`：当前 Agent 怎么带用户工作，下一句问什么。
- `analysis`：经营结论、风险商品、追问和结构化运营待办。
- `feishuReply`：适合直接发到飞书的自然语言回复。
- `taskTable`：可粘贴到飞书表格/多维表格的待办 TSV，默认带 `状态=待开始`。
- `riskTable`：可粘贴到飞书表格/多维表格的风险商品 TSV，默认带 `排查状态=待排查` 和建议负责人。
- `dataRequestPlan`：结构化补数清单，告诉小白下一份数据要补什么。
- `dataRequestTable`：可粘贴到飞书表格/多维表格的补数 TSV。
- `kpiGuide`：小白版指标说明，解释每个核心指标代表什么、为什么重要、首页如何体现。
- `markdownReport`：适合沉淀为飞书文档的周报 Markdown。

`dataRequestPlan.items` 每项包含：

| 字段 | 含义 |
| --- | --- |
| title | 要补的数据 |
| owner | 建议负责人 |
| priorityLabel | 必须先补 / 建议补 / 可后补 |
| statusLabel | 缺失 / 部分已有 / 已够用 |
| ask | Agent 下一句可以怎么问用户 |
| whereToFind | 小白应该去哪里找这份数据 |
| fields | 需要复制或导出的字段列 |
| whyItMatters | 为什么这份数据重要 |
| homepageImpact | 补了之后首页哪部分判断会更准 |

当经营表缺必填字段时，即使接口返回 `422`，也会返回 `workSession`、`dataRequestPlan` 和 `dataRequestTable`，让前端或飞书能继续带用户补数据。
