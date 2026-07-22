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
| revenue | 销售额 | 必需 | 3480 |
| unitsSold | 销售件数 | 必需 | 62 |
| adSpend | 广告花费 | 可选 | 820 |
| adRevenue | 广告成交额 | 可选 | 2100 |
| adReturn | 广告回本/ROAS | 可选 | 2.5 / 250% |
| inventory | 当前库存 | 可选 | 180 |
| productCost | 商品成本 | 可选 | 2100 |
| grossProfit | 毛利 | 可选 | 1380 |
| grossMarginRate | 毛利率 | 可选 | 38% |
| refundOrders | 退款或退货单数 | 可选 | 3 |
| refundAmount | 退款金额 | 可选 | 120 |
| refundOrderRate | 退款或退货单率 | 可选 | 5% |
| refundAmountRate | 退款金额占比 | 可选 | 3.4% |
| refundReason | 退款、退货或售后原因 | 可选 | 杯盖漏水 / 物流慢 |

当前导入器已经支持 CSV/TSV/Markdown 表格，不要求字段名完全一致。从 Excel、飞书表格或 Google Sheets 直接复制出来的制表符表格也能识别。常见别名会自动识别：

`week` 可以直接写 `previous/current`、`上周/本周`、`上期/本期`，也可以写真实日期或周，例如 `2026-07-08`、`2026-W29`。如果没有 `week` 列，但有 `date/start_date/开始日期/统计日期`，Agent 会把日期当成周期来源。如果导出的表里超过两个周期，Agent 会自动选择最近两期做对比，并在导入报告里说明它选了哪两期。

数字不用手动清洗成纯数字。常见平台写法例如 `1.2万元`、`2.6千元`、`90单`、`100件`、`80元` 都能识别。平台如果只导出 `转化率`、`ROAS/投产比`、`毛利率`、`退款率` 或 `退款金额占比`，Agent 会在不覆盖原始字段的前提下反推访客数、广告成交额、毛利、退款/退货单数或退款金额，用来继续做复盘。

如果同一个周期里出现重复 SKU，Agent 会先按 SKU 自动合并再分析。销售额、订单数、销量、广告、毛利和退款金额会相加；库存取同 SKU 最后一条可用值；退款原因会去重合并。

| 标准字段 | 可识别别名示例 |
| --- | --- |
| week | week、period、date、start_date、周期、统计周期、周、日期、开始日期、统计日期、时间段 |
| productName | product_name、product、商品名称、商品、品名 |
| sku | sku、商家编码、商品编码、货号 |
| visitors | visitors、sessions、uv、访客数、商品访客数、流量 |
| conversionRate | conversion_rate、cvr、转化率、支付转化率、成交转化率 |
| orders | orders、order_count、订单数、支付订单数、支付买家数 |
| revenue | revenue、sales、gmv、销售额、成交额、支付金额、商品支付金额 |
| unitsSold | units_sold、quantity、qty、销量、支付件数、支付商品件数 |
| adSpend | ad_spend、cost、广告花费、广告消耗、消耗 |
| adRevenue | ad_revenue、attributed_sales、广告成交额、广告销售额、直接成交金额 |
| adReturn | roas、roi、投产比、广告投产比、广告回本、投入产出比 |
| inventory | inventory、stock、库存、可售库存、可售件数 |
| productCost | product_cost、cogs、cost_of_goods、商品成本、采购成本、成本金额 |
| grossProfit | gross_profit、profit、毛利、毛利润、利润、毛利额 |
| grossMarginRate | gross_margin、profit_margin、margin_rate、毛利率、利润率 |
| refundOrders | refund_orders、refunds、returns、return_count、退款单数、退款成功单数、售后单数 |
| refundAmount | refund_amount、refunded_amount、return_amount、退款金额、退款成功金额、售后金额 |
| refundOrderRate | refund_rate、return_rate、退款率、退货率、退款单率、售后率 |
| refundAmountRate | refund_amount_rate、refund_revenue_rate、退款金额占比、售后金额占比 |
| refundReason | refund_reason、return_reason、售后原因、退款原因、退货原因、差评原因 |

## 竞品数据

| 字段 | 含义 | 是否必需 | 示例 |
| --- | --- | --- | --- |
| competitorName | 竞品名称 | 必需 | HeatGo Cup |
| url | 竞品链接 | 推荐 | https://example.com/item |
| price | 当前价格 | 必需 | 29.99 |
| promotion | 促销信息 | 可选 | 买二减 10% |
| rating | 评分 | 可选 | 4.6 |
| reviews | 评论数 | 可选 | 1280 |
| keySellingPoints | 主要卖点 | 可选 | 温显、轻量、礼盒 |

竞品 CSV/TSV 也支持别名，例如 `name/竞品名称`、`url/竞品链接`、`price/价格`、`promotion/促销`、`key_selling_points/卖点`。

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
- 商品贡献度。
- 异常商品。
- 竞品价格差。

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
