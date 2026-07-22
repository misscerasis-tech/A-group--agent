import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { analyzeEcommerceStore } from "../src/lib/ecommerce-agent/analysis";
import { buildEcommerceInputFromCsv } from "../src/lib/ecommerce-agent/csv-import";
import { buildDataRequestPlan } from "../src/lib/ecommerce-agent/data-request";
import {
  buildFeishuAgentReply,
  buildFeishuClearContextReply,
  buildFeishuImportContextFromText,
  isFeishuClearContextRequest,
  type FeishuEcommerceImportContext,
} from "../src/lib/integrations/feishu/agent-reply";

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function readSample(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

function main() {
  const sampleImport = buildEcommerceInputFromCsv({
    metricsCsv: readSample("data/samples/aurora-cup-weekly-metrics.csv"),
    competitorsCsv: readSample("data/samples/aurora-cup-competitors.csv"),
    adsCsv: readSample("data/samples/aurora-cup-ads.csv"),
    inventoryCsv: readSample("data/samples/aurora-cup-inventory.csv"),
    customerVoicesCsv: readSample("data/samples/aurora-cup-customer-voices.csv"),
    store: {
      storeName: "Smoke Test Aurora Cup",
      platform: "Shopify",
      market: "美国",
      category: "智能温控/温显旅行杯",
      goal: "这周先保利润",
    },
  });

  assert(sampleImport.report.ok, "样例 CSV 应该可以导入。");
  assert(sampleImport.input, "样例 CSV 应该生成 Agent 输入。");
  assert(sampleImport.report.adRows === 6, "样例广告表应该可以导入。");
  assert(sampleImport.report.inventoryRows === 3, "样例库存/成本快照表应该可以导入。");
  assert(sampleImport.report.customerVoiceRows === 3, "样例用户声音表应该可以导入。");

  const input = sampleImport.input;

  if (!input) {
    throw new Error("样例 CSV 应该生成 Agent 输入。");
  }

  const analysis = analyzeEcommerceStore(input);
  const dataRequestPlan = buildDataRequestPlan(sampleImport.report, analysis.questionsForUser);

  assert(analysis.headline.includes("Smoke Test Aurora Cup"), "分析标题应该包含店铺名。");
  assert(analysis.nextActions.length > 0, "分析应该生成下一步行动。");
  assert(analysis.operationalTasks.length === analysis.nextActions.length, "分析应该生成结构化运营待办。");
  assert(analysis.operationalTasks[0].acceptanceCriteria.includes("已"), "运营待办应该包含验收标准。");
  assert(analysis.nextActions[0].title === "先核对利润口径", "保利润目标应该优先核对利润口径。");
  assert(input.currentWeek.products[0].refundAmount === 160, "样例 CSV 应该导入退款金额。");
  assert(input.currentWeek.products[0].refundReason?.includes("杯盖漏水"), "样例 CSV 应该导入退款原因。");
  assert(
    analysis.dataHealth.some((item) => item.includes("退款/退货数据")),
    "分析应该说明退款/退货数据状态。",
  );
  assert(
    analysis.dataHealth.some((item) => item.includes("退款/退货原因")),
    "分析应该说明退款/退货原因状态。",
  );
  assert(dataRequestPlan.summary.includes("核心数据暂时够用"), "完整样例数据应该提示可以先生成复盘。");

  const templateImport = buildEcommerceInputFromCsv({
    metricsCsv: readSample("data/templates/weekly-metrics-template.csv"),
    competitorsCsv: readSample("data/templates/competitors-template.csv"),
    adsCsv: readSample("data/templates/ads-template.csv"),
    inventoryCsv: readSample("data/templates/inventory-cost-template.csv"),
    customerVoicesCsv: readSample("data/templates/customer-voices-template.csv"),
  });

  assert(templateImport.report.ok, "可填写 CSV 模板应该可以直接导入。");
  assert(templateImport.report.competitorRows === 2, "竞品模板应该可以导入。");
  assert(templateImport.report.customerVoiceRows === 2, "用户声音模板应该可以导入。");

  const totalRowsImport = buildEcommerceInputFromCsv({
    metricsCsv: [
      "周期,商品名称,SKU,订单数,销售额,销量",
      "上周,黑杯,CUP-BLACK,10,500,12",
      "上周,合计,,10,500,12",
      "本周,黑杯,CUP-BLACK,9,450,10",
      "本周,Total,,9,450,10",
    ].join("\n"),
    adsCsv: [
      "周期,商品名称,商家编码,广告花费,ROAS",
      "上周,黑杯,CUP-BLACK,80,300%",
      "本周,黑杯,CUP-BLACK,90,2",
      "总计,合计,,170,2",
    ].join("\n"),
    inventoryCsv: ["商品名称,商家编码,当前库存", "黑杯,CUP-BLACK,18", "合计,,18"].join("\n"),
    competitorsCsv: ["竞品名称,价格,促销,核心卖点", "竞品 A,39.9,满减,低价", "总计,39.9,,"].join("\n"),
    customerVoicesCsv: [
      "商品名称,商家编码,问题类型,评价内容,出现次数",
      "黑杯,CUP-BLACK,杯盖漏水,用户说杯盖渗水,4",
      "汇总,,售后问题,汇总行,4",
    ].join("\n"),
  });

  assert(totalRowsImport.report.ok, "带总计/合计行的经营表应该可以导入。");
  assert(totalRowsImport.input?.currentWeek.products.length === 1, "总计/合计行不应该变成商品。");
  assert(totalRowsImport.input?.currentWeek.products[0].revenue === 450, "总计/合计行不应该重复计入销售额。");
  assert(totalRowsImport.input?.currentWeek.products[0].adSpend === 90, "广告汇总行不应该重复计入广告花费。");
  assert(totalRowsImport.input?.currentWeek.products[0].inventory === 18, "库存汇总行不应该污染 SKU 库存。");
  assert(totalRowsImport.input?.competitors.length === 1, "竞品汇总行不应该变成竞品。");
  assert(totalRowsImport.input?.customerVoices?.length === 1, "用户声音汇总行不应该变成问题反馈。");

  const templateOrderDetailImport = buildEcommerceInputFromCsv({
    metricsCsv: readSample("data/templates/order-details-template.csv"),
  });

  assert(templateOrderDetailImport.report.ok, "订单明细模板应该可以直接导入。");
  assert(templateOrderDetailImport.report.metricsInputKind === "order_details", "订单明细模板应该被识别为订单明细。");
  assert(
    templateOrderDetailImport.input?.previousWeek.products.find((product) => product.sku === "CUP-BLACK")
      ?.productCost === 60,
    "订单明细模板的单位成本应该按件数汇总。",
  );

  const tsvImport = buildEcommerceInputFromCsv({
    metricsCsv: [
      "week\tproduct_name\torders\trevenue\tunits_sold",
      "previous\t黑杯\t10\t500\t12",
      "current\t黑杯\t9\t450\t10",
    ].join("\n"),
  });

  assert(tsvImport.report.ok, "从 Excel/飞书表格复制的 TSV 应该可以导入。");

  const inventoryImport = buildEcommerceInputFromCsv({
    metricsCsv: [
      "周期,商品名称,SKU,订单数,销售额,销量",
      "上周,黑杯,CUP-BLACK,10,500,12",
      "本周,黑杯,CUP-BLACK,9,450,10",
    ].join("\n"),
    inventoryCsv: ["商品名称,商家编码,当前库存,单位成本", "黑杯,CUP-BLACK,18,18"].join("\n"),
  });

  assert(inventoryImport.report.inventoryRows === 1, "库存/成本快照表应该可以导入。");
  assert(inventoryImport.input?.currentWeek.products[0].inventory === 18, "库存/成本快照应该更新本周 SKU 库存。");
  assert(inventoryImport.input?.currentWeek.products[0].grossProfit === 270, "库存/成本快照应该补齐毛利。");

  const feeAwareProfitImport = buildEcommerceInputFromCsv({
    metricsCsv: [
      "周期,商品名称,订单数,销售额,销量,商品成本,平台佣金,支付手续费,履约费",
      "上周,黑杯,10,500,12,300,50,5,15",
      "本周,黑杯,9,450,10,330,45,6,18",
    ].join("\n"),
  });

  assert(feeAwareProfitImport.report.ok, "带平台/支付/履约费的经营表应该可以导入。");
  assert(
    feeAwareProfitImport.input?.currentWeek.products[0].grossProfit === 51,
    "平台/支付/履约费应该折进派生毛利。",
  );

  const adsImport = buildEcommerceInputFromCsv({
    metricsCsv: [
      "周期,商品名称,SKU,订单数,销售额,销量",
      "上周,黑杯,CUP-BLACK,10,500,12",
      "本周,黑杯,CUP-BLACK,9,450,10",
    ].join("\n"),
    adsCsv: [
      "周期,商品名称,商家编码,广告花费,ROAS",
      "上周,黑杯,CUP-BLACK,80,300%",
      "本周,黑杯,CUP-BLACK,90,2",
    ].join("\n"),
  });

  assert(adsImport.report.adRows === 2, "广告数据表应该可以导入。");
  assert(adsImport.input?.currentWeek.products[0].adRevenue === 180, "广告 ROAS 应该能反推广告成交额。");

  const adsAcosImport = buildEcommerceInputFromCsv({
    metricsCsv: [
      "周期,商品名称,SKU,订单数,销售额,销量",
      "上周,黑杯,CUP-BLACK,10,500,12",
      "本周,黑杯,CUP-BLACK,9,450,10",
    ].join("\n"),
    adsCsv: [
      "周期,商品名称,商家编码,广告花费,ACOS",
      "上周,黑杯,CUP-BLACK,80,25%",
      "本周,黑杯,CUP-BLACK,90,50%",
    ].join("\n"),
  });

  assert(adsAcosImport.input?.currentWeek.products[0].adRevenue === 180, "广告 ACOS 应该能反推广告成交额。");

  const orderDetailImport = buildEcommerceInputFromCsv({
    metricsCsv: readSample("data/samples/aurora-cup-order-details.csv"),
  });

  assert(orderDetailImport.report.ok, "订单明细导出表应该可以自动聚合并导入。");
  assert(orderDetailImport.report.metricsInputKind === "order_details", "订单明细应该被识别为明细输入。");
  assert(orderDetailImport.input?.currentWeek.products.length === 2, "订单明细本周应该按 SKU 聚合。");
  assert(
    orderDetailImport.input?.currentWeek.products.find((product) => product.sku === "CUP-BLACK-500")?.refundOrders ===
      1,
    "订单明细退款状态应该能转成退款/退货单数。",
  );

  const shopifyOrderImport = buildEcommerceInputFromCsv({
    metricsCsv: [
      "Name,Paid at,Lineitem name,Lineitem sku,Lineitem quantity,Lineitem price,Refunded Amount,Financial Status",
      "#1001,2026-07-08 10:11:00,黑杯,CUP-BLACK,2,39.9,,paid",
      "#1002,2026-07-09 12:30:00,黑杯,CUP-BLACK,1,39.9,0,paid",
      "#1003,2026-07-15 09:20:00,黑杯,CUP-BLACK,1,39.9,39.9,refunded",
      "#1004,2026-07-16 19:45:00,白杯,CUP-WHITE,3,29.9,,paid",
    ].join("\n"),
  });

  assert(shopifyOrderImport.report.ok, "Shopify Orders 导出表应该可以自动聚合并导入。");
  assert(
    shopifyOrderImport.input?.previousWeek.products.find((product) => product.sku === "CUP-BLACK")?.revenue ===
      119.7,
    "Shopify Lineitem price 应按单价乘购买件数聚合。",
  );
  assert(
    shopifyOrderImport.input?.currentWeek.products.find((product) => product.sku === "CUP-WHITE")?.revenue === 89.7,
    "Shopify 多件商品应该按件数计算销售额。",
  );

  const amazonOrderImport = buildEcommerceInputFromCsv({
    metricsCsv: [
      "amazon-order-id\tpurchase-date\tproduct-name\tsku\tquantity-purchased\titem-price\titem-status",
      "112-0001\t2026-07-08T10:11:00Z\t黑杯\tCUP-BLACK\t2\t79.8\tShipped",
      "112-0002\t2026-07-09T12:30:00Z\t黑杯\tCUP-BLACK\t1\t39.9\tShipped",
      "112-0003\t2026-07-15T09:20:00Z\t黑杯\tCUP-BLACK\t1\t39.9\tRefunded",
      "112-0004\t2026-07-16T19:45:00Z\t白杯\tCUP-WHITE\t3\t89.7\tShipped",
    ].join("\n"),
  });

  assert(amazonOrderImport.report.ok, "Amazon 订单 TSV 导出表应该可以自动聚合并导入。");
  assert(amazonOrderImport.report.metricsInputKind === "order_details", "Amazon 订单 TSV 应该被识别为订单明细。");
  assert(
    amazonOrderImport.input?.currentWeek.products.find((product) => product.sku === "CUP-BLACK")?.refundOrders === 1,
    "Amazon item-status 退款状态应该能转成退款/退货单数。",
  );

  const privacyWarningImport = buildEcommerceInputFromCsv({
    metricsCsv: [
      "amazon-order-id\tpurchase-date\tproduct-name\tsku\tquantity-purchased\titem-price\tbuyer-email\tbuyer-name\tship-address-1\tbuyer-phone-number",
      "112-0001\t2026-07-08T10:11:00Z\t黑杯\tCUP-BLACK\t2\t79.8\tbuyer@example.com\t张三\t测试路 1 号\t13800000000",
      "112-0002\t2026-07-15T09:20:00Z\t黑杯\tCUP-BLACK\t1\t39.9\tbuyer@example.com\t张三\t测试路 1 号\t13800000000",
    ].join("\n"),
  });

  assert(privacyWarningImport.report.ok, "带个人信息列的订单表仍应该可分析经营字段。");
  assert(
    privacyWarningImport.report.issues.some((issue) => issue.message.includes("个人信息字段")),
    "带个人信息列的订单表应该提醒用户删除隐私字段。",
  );

  const currencyFormatImport = buildEcommerceInputFromCsv({
    metricsCsv: [
      "周期,商品名称,订单数,销售额,销量,广告花费,毛利",
      '上周,黑杯,10,"US$1,200.50",12,USD 80.25,$320.50',
      '本周,黑杯,8,"￥980.00",9,RMB 90,(30.5)',
    ].join("\n"),
  });

  assert(currencyFormatImport.report.ok, "带币种符号和会计负数的经营表应该可以导入。");
  assert(currencyFormatImport.input?.previousWeek.products[0].revenue === 1200.5, "US$ 金额应该能解析。");
  assert(currencyFormatImport.input?.currentWeek.products[0].grossProfit === -30.5, "会计负数毛利应该能解析。");

  const europeanCurrencyFormatImport = buildEcommerceInputFromCsv({
    metricsCsv: [
      "周期,商品名称,订单数,销售额,销量,广告花费,毛利",
      '上周,黑杯,10,"€1.234,56",12,"€80,25","€320,50"',
      '本周,黑杯,8,"1 280,40 €",9,"EUR 90,75","(€30,50)"',
    ].join("\n"),
  });

  assert(europeanCurrencyFormatImport.report.ok, "欧式金额和小数逗号应该可以导入。");
  assert(europeanCurrencyFormatImport.input?.previousWeek.products[0].revenue === 1234.56, "欧式千分位金额应该能解析。");
  assert(europeanCurrencyFormatImport.input?.currentWeek.products[0].adSpend === 90.75, "欧式小数逗号应该能解析。");

  const approximateChineseNumberImport = buildEcommerceInputFromCsv({
    metricsCsv: [
      "周期,商品名称,订单数,销售额,销量,广告成交额,库存",
      "上周,黑杯,约90单,1.2万元+,100件,3200元,50件",
      "本周,黑杯,80单,9800元,88件,2.6千元左右,3百件",
    ].join("\n"),
  });

  assert(approximateChineseNumberImport.report.ok, "带约数和中文单位的经营表应该可以导入。");
  assert(approximateChineseNumberImport.input?.previousWeek.products[0].orders === 90, "约数订单应该能解析。");
  assert(approximateChineseNumberImport.input?.previousWeek.products[0].revenue === 12000, "万元加号应该能解析。");
  assert(approximateChineseNumberImport.input?.currentWeek.products[0].adRevenue === 2600, "千元左右应该能解析。");
  assert(approximateChineseNumberImport.input?.currentWeek.products[0].inventory === 300, "百件应该能解析。");

  const rateFieldImport = buildEcommerceInputFromCsv({
    metricsCsv: [
      "周期,商品名称,订单数,销售额,销量,转化率,广告消耗,ROAS,毛利率,退款率,退款金额占比",
      "上周,黑杯,10,500,12,10%,80,300%,40%,10%,6%",
      "本周,黑杯,8,420,9,8%,90,2.5,30%,25%,19.05%",
    ].join("\n"),
  });

  assert(rateFieldImport.report.ok, "平台比率字段应该可以导入。");
  assert(rateFieldImport.input?.currentWeek.products[0].visitors === 100, "转化率应该能反推出访客数。");
  assert(rateFieldImport.input?.currentWeek.products[0].adRevenue === 225, "ROAS 应该能反推出广告成交额。");
  assert(rateFieldImport.input?.currentWeek.products[0].grossProfit === 126, "毛利率应该能反推出毛利。");
  assert(rateFieldImport.input?.currentWeek.products[0].refundOrders === 2, "退款率应该能反推出退款单数。");

  const averageOrderValueImport = buildEcommerceInputFromCsv({
    metricsCsv: [
      "周期,商品名称,订单数,客单价,销量",
      "上周,黑杯,10,50,12",
      "本周,黑杯,8,52.5,9",
    ].join("\n"),
  });

  assert(averageOrderValueImport.report.ok, "只有客单价和订单数的经营表应该可以补出销售额。");
  assert(averageOrderValueImport.input?.currentWeek.products[0].revenue === 420, "客单价应乘订单数补出销售额。");
  assert(
    averageOrderValueImport.report.issues.some((issue) => issue.message.includes("订单数 × 客单价")),
    "客单价补销售额应该进入导入提醒。",
  );

  const duplicateSkuImport = buildEcommerceInputFromCsv({
    metricsCsv: [
      "周期,商品名称,SKU,订单数,销售额,销量,库存,退款单数,退款金额,退款原因",
      "上周,黑杯,CUP-BLACK,6,300,7,50,1,30,杯盖漏水",
      "上周,黑杯,CUP-BLACK,4,200,5,48,0,0,",
      "本周,黑杯,CUP-BLACK,5,250,6,45,1,30,杯盖漏水",
      "本周,黑杯,CUP-BLACK,3,170,3,42,1,50,物流慢",
    ].join("\n"),
  });

  assert(duplicateSkuImport.report.ok, "重复 SKU 经营表应该可以导入。");
  assert(duplicateSkuImport.input?.currentWeek.products.length === 1, "同周期重复 SKU 应该先合并。");
  assert(duplicateSkuImport.input?.currentWeek.products[0].revenue === 420, "重复 SKU 销售额应该合并。");

  const voiceImport = buildEcommerceInputFromCsv({
    metricsCsv: [
      "周期,商品名称,SKU,订单数,销售额,销量,退款单数,退款金额",
      "上周,黑杯,CUP-BLACK,10,500,12,1,30",
      "本周,黑杯,CUP-BLACK,8,420,9,2,80",
    ].join("\n"),
    customerVoicesCsv: [
      "商品名称,商家编码,反馈来源,问题类型,评价内容,出现次数",
      "黑杯,CUP-BLACK,商品评价,杯盖漏水,用户说杯盖渗水,4",
    ].join("\n"),
  });

  assert(voiceImport.report.customerVoiceRows === 1, "用户声音表应该可以导入。");
  assert(voiceImport.input?.customerVoices?.[0].theme === "杯盖漏水", "用户声音主题应该被识别。");

  const voicePrivacyImport = buildEcommerceInputFromCsv({
    metricsCsv: [
      "周期,商品名称,SKU,订单数,销售额,销量",
      "上周,黑杯,CUP-BLACK,10,500,12",
      "本周,黑杯,CUP-BLACK,8,420,9",
    ].join("\n"),
    customerVoicesCsv: [
      "商品名称,商家编码,问题类型,评价内容,买家姓名,手机号",
      "黑杯,CUP-BLACK,杯盖漏水,用户说杯盖渗水,张三,13800000000",
    ].join("\n"),
  });

  assert(
    voicePrivacyImport.report.issues.some((issue) => issue.message.includes("用户声音/售后评价表")),
    "用户声音表带个人信息字段时应该提醒删除。",
  );

  const workPlanReply = buildFeishuAgentReply("我现在做什么");
  assert(workPlanReply.includes("week,product_name,sku"), "新手工作计划应该给出可复制的最小经营表。");
  const pastedTableReply = buildFeishuAgentReply(
    [
      "week\tproduct_name\torders\trevenue\tunits_sold",
      "previous\t黑杯\t10\t500\t12",
      "current\t黑杯\t9\t450\t10",
    ].join("\n"),
  );
  const pastedMetricsContext = buildFeishuImportContextFromText(
    [
      "week\tproduct_name\tsku\torders\trevenue\tunits_sold",
      "previous\t黑杯\tCUP-BLACK\t10\t500\t12",
      "current\t黑杯\tCUP-BLACK\t9\t450\t10",
    ].join("\n"),
  );
  const pastedAdsContext = buildFeishuImportContextFromText(
    [
      "周期\t商品名称\t商家编码\t广告花费\tROAS",
      "上周\t黑杯\tCUP-BLACK\t80\t300%",
      "本周\t黑杯\tCUP-BLACK\t90\t2",
    ].join("\n"),
    pastedMetricsContext,
  );
  const pastedAdsReply = buildFeishuAgentReply(
    [
      "周期\t商品名称\t商家编码\t广告花费\tROAS",
      "上周\t黑杯\tCUP-BLACK\t80\t300%",
      "本周\t黑杯\tCUP-BLACK\t90\t2",
    ].join("\n"),
    pastedAdsContext ?? undefined,
  );
  const pastedPlatformTableReply = buildFeishuAgentReply(
    [
      "周期\t商品名称\t支付买家数\t商品支付金额\t支付商品件数\t退款率\t退款原因",
      "上周\t黑杯\t10\t500\t12\t10%\t杯盖漏水",
      "本周\t黑杯\t8\t420\t9\t25%\t杯盖漏水 / 物流慢",
    ].join("\n"),
  );
  const pastedOrderDetailReply = buildFeishuAgentReply(
    [
      "订单号\t支付时间\t商品名称\t商家编码\t购买数量\t实付金额\t退款金额\t售后状态",
      "O-1001\t2026-07-08 10:11:00\t黑杯\tCUP-BLACK\t2\t79.8\t\t已完成",
      "O-1002\t2026-07-09 12:30:00\t黑杯\tCUP-BLACK\t1\t39.9\t0\t已完成",
      "O-1003\t2026-07-15 09:20:00\t黑杯\tCUP-BLACK\t1\t39.9\t39.9\t已退款",
      "O-1004\t2026-07-16 19:45:00\t白杯\tCUP-WHITE\t3\t119.7\t\t已完成",
    ].join("\n"),
  );
  const pastedShopifyOrderReply = buildFeishuAgentReply(
    [
      "Name,Paid at,Lineitem name,Lineitem sku,Lineitem quantity,Lineitem price,Refunded Amount,Financial Status",
      "#1001,2026-07-08 10:11:00,黑杯,CUP-BLACK,2,39.9,,paid",
      "#1002,2026-07-09 12:30:00,黑杯,CUP-BLACK,1,39.9,0,paid",
      "#1003,2026-07-15 09:20:00,黑杯,CUP-BLACK,1,39.9,39.9,refunded",
      "#1004,2026-07-16 19:45:00,白杯,CUP-WHITE,3,29.9,,paid",
    ].join("\n"),
  );
  const pastedAmazonOrderReply = buildFeishuAgentReply(
    [
      "amazon-order-id\tpurchase-date\tproduct-name\tsku\tquantity-purchased\titem-price\titem-status",
      "112-0001\t2026-07-08T10:11:00Z\t黑杯\tCUP-BLACK\t2\t79.8\tShipped",
      "112-0002\t2026-07-09T12:30:00Z\t黑杯\tCUP-BLACK\t1\t39.9\tShipped",
      "112-0003\t2026-07-15T09:20:00Z\t黑杯\tCUP-BLACK\t1\t39.9\tRefunded",
      "112-0004\t2026-07-16T19:45:00Z\t白杯\tCUP-WHITE\t3\t89.7\tShipped",
    ].join("\n"),
  );
  const pastedFencedCsvReply = buildFeishuAgentReply(
    [
      "```csv",
      "week,product_name,orders,revenue,units_sold",
      "previous,黑杯,10,500,12",
      "current,黑杯,8,420,9",
      "```",
    ].join("\n"),
  );
  const pastedIntroTableReply = buildFeishuAgentReply(
    [
      "这段是从飞书表格复制出来的经营数据，请直接帮我看",
      "导出时间：2026-07-23",
      "week\tproduct_name\torders\trevenue\tunits_sold",
      "previous\t黑杯\t10\t500\t12",
      "current\t黑杯\t8\t420\t9",
    ].join("\n"),
  );
  const testingReply = buildFeishuAgentReply("怎么真正测试，接入飞书吗");
  const returnsReply = buildFeishuAgentReply("退款退货怎么看");
  const taskReply = buildFeishuAgentReply("给我待办清单");
  const riskReply = buildFeishuAgentReply("给我风险商品表");
  const dataRequestReply = buildFeishuAgentReply("我还缺什么数据");
  const fileQuestionReply = buildFeishuAgentReply("Excel 文件可以直接发吗");

  assert(workPlanReply.includes("经营数据表"), "飞书工作计划回复应该提示经营数据表。");
  assert(workPlanReply.includes("Markdown"), "飞书工作计划回复应该提示支持 Markdown 表格。");
  assert(pastedTableReply.includes("刚粘贴的表格"), "飞书应该能分析直接粘贴的表格。");
  assert(pastedAdsContext?.report.adRows === 2, "飞书同一会话应该能把广告表合并进刚粘贴的经营表。");
  assert(pastedAdsReply.includes("已把广告数据表合并"), "飞书合并广告表后应该明确说明已合并。");
  assert(pastedPlatformTableReply.includes("刚粘贴的表格"), "飞书应该能分析平台中文表头粘贴数据。");
  assert(pastedPlatformTableReply.includes("杯盖漏水"), "飞书平台表头回复应该引用退款原因。");
  assert(pastedOrderDetailReply.includes("刚粘贴的表格"), "飞书应该能分析订单明细粘贴数据。");
  assert(pastedOrderDetailReply.includes("已退款"), "飞书订单明细回复应该引用售后状态。");
  assert(pastedOrderDetailReply.includes("验收"), "飞书分析回复应该包含待办验收标准。");
  assert(pastedShopifyOrderReply.includes("刚粘贴的表格"), "飞书应该能分析 Shopify Orders 粘贴数据。");
  assert(pastedShopifyOrderReply.includes("refunded"), "飞书 Shopify Orders 回复应该引用退款状态。");
  assert(pastedAmazonOrderReply.includes("刚粘贴的表格"), "飞书应该能分析 Amazon 订单 TSV 粘贴数据。");
  assert(pastedAmazonOrderReply.includes("Refunded"), "飞书 Amazon 订单 TSV 回复应该引用退款状态。");
  assert(pastedFencedCsvReply.includes("刚粘贴的表格"), "飞书应该能分析 Markdown 代码块里的 CSV。");
  assert(pastedIntroTableReply.includes("刚粘贴的表格"), "飞书应该能跳过粘贴表格前的人话说明。");
  assert(isFeishuClearContextRequest("清空这份数据，重新开始"), "飞书应该能识别清空当前会话数据请求。");
  assert(buildFeishuClearContextReply(true).includes("已清空"), "飞书清空数据回复应该确认已清空。");
  assert(testingReply.includes("App Secret"), "飞书测试回复应该提示 App Secret。");
  assert(returnsReply.includes("售后把成交吃回去"), "飞书应该能单独回答退款/退货问题。");
  assert(taskReply.includes("优先级\t截止\t负责人"), "飞书应该能返回可复制的待办表格。");
  assert(riskReply.includes("排查状态\t优先级\t建议负责人"), "飞书应该能返回可复制的风险商品表。");
  assert(dataRequestReply.includes("最近两期经营对比表"), "飞书应该能回答下一份要补的数据。");
  assert(fileQuestionReply.includes("附件消息我暂时不会下载"), "飞书应该解释 Excel/CSV 文件怎么给。");

  const negativeRefundImport = buildEcommerceInputFromCsv({
    metricsCsv: [
      "week,product_name,orders,revenue,units_sold,refund_amount",
      "previous,A,10,1000,10,30",
      "current,A,12,1200,12,-45",
    ].join("\n"),
  });

  assert(negativeRefundImport.report.ok, "负数退款金额应该按退款金额处理，而不是阻断复盘。");
  assert(negativeRefundImport.input?.currentWeek.products[0].refundAmount === 45, "负数退款金额应该按绝对值导入。");
  assert(
    negativeRefundImport.report.issues.some((issue) => issue.message.includes("已按绝对值 45 处理")),
    "负数退款金额应该进入导入提醒。",
  );

  const invalidImport = buildEcommerceInputFromCsv({
    metricsCsv: [
      "week,product_name,orders,revenue,units_sold,inventory",
      "previous,A,-1,1000,10,20",
      "current,A,12,1200,12,-3",
    ].join("\n"),
  });

  assert(!invalidImport.report.ok, "负数经营指标应该被拒绝。");
  assert(
    invalidImport.report.questionsForUser[0]?.includes("请修正第 2 行"),
    "异常数据应该追问具体行号。",
  );

  const invalidImportWithIntro = buildEcommerceInputFromCsv({
    metricsCsv: [
      "这段表格来自运营导出",
      "week,product_name,orders,revenue,units_sold",
      "previous,A,-1,1000,10",
      "current,A,12,1200,12",
    ].join("\n"),
  });

  assert(
    invalidImportWithIntro.report.questionsForUser[0]?.includes("请修正第 3 行"),
    "跳过说明行后，异常数据仍应该追问原始粘贴行号。",
  );

  const incompleteImport = buildEcommerceInputFromCsv({
    metricsCsv: ["周期,商品名称,销售额", "本周,黑杯,450"].join("\n"),
  });
  const incompleteFeishuReply = buildFeishuAgentReply("帮我看本周经营情况", {
    report: incompleteImport.report,
    sourceLabel: "当前导入数据",
  });

  assert(!incompleteImport.report.ok, "缺字段经营表应该不可直接分析。");
  assert(incompleteFeishuReply.includes("还不能直接复盘"), "飞书不应该把不完整导入表回落成样例复盘。");
  assert(incompleteFeishuReply.includes("订单数"), "飞书应该追问不完整导入表缺少的字段。");

  const chatContexts = new Map<string, FeishuEcommerceImportContext>();
  function chatScopedReply(text: string, chatId: string) {
    const pastedContext = buildFeishuImportContextFromText(text);

    if (pastedContext) {
      chatContexts.set(chatId, pastedContext);
      return buildFeishuAgentReply(text, pastedContext);
    }

    const context = chatContexts.get(chatId);
    return buildFeishuAgentReply(text, {
      input: context?.input,
      report: context?.report,
      sourceLabel: context?.sourceLabel ?? "样例店铺",
    });
  }

  chatScopedReply(
    [
      "week,product_name,orders,revenue,units_sold",
      "previous,黑杯,10,500,12",
      "current,黑杯,8,420,9",
    ].join("\n"),
    "oc_smoke",
  );
  const followUpReply = chatScopedReply("帮我看本周经营情况", "oc_smoke");

  assert(followUpReply.includes("飞书粘贴数据店铺"), "飞书同一会话后续追问应该使用刚粘贴的经营表。");

  console.info("[smoke] 经营表导入、经营分析、飞书问答和异常数据拦截均通过。");
}

main();
