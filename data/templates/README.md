# 电商运营数据模板

这些文件是给真实测试前快速填数用的，不是演示结论。用法：

1. 复制对应模板。
2. 保留第一行表头。
3. 把示例商品、SKU、金额和日期换成真实数据。
4. 回到 `/agent` 工作台粘贴或上传文件。

最小可用路径是 `weekly-metrics-template.csv`。如果没有现成毛利，可以保留 `product_cost`、`platform_fee`、`payment_fee`、`fulfillment_cost` 这些列，Agent 会在有商品成本时把平台佣金、支付手续费和履约成本折进派生毛利。若平台已经导出了 `gross_profit`，Agent 会优先用平台毛利，不重复扣费用。

如果只有订单明细，用 `order-details-template.csv`，并确保覆盖最近两个自然周；有单位成本时保留 `unit_cost` 列，Agent 会按购买件数汇总成本。订单明细里也可以保留 `platform_fee`、`payment_fee`、`fulfillment_cost`，用于更接近真实利润的复盘。

广告、库存/成本、用户声音和竞品模板不是必填，但补上后 Agent 的动作会更具体。广告模板可以填 ACOS；如果你的后台导出 ROAS，也可以把 `acos` 列换成 `roas`。竞品模板里的 `price_note` 用来标注“页面价快照、券后价、无库存、当前无 featured offer、历史价”等边界，Agent 会在复盘里提醒调价前复核原链接。
