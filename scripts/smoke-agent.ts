import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { analyzeEcommerceStore } from "../src/lib/ecommerce-agent/analysis";
import { buildEcommerceInputFromCsv } from "../src/lib/ecommerce-agent/csv-import";
import { buildFeishuAgentReply } from "../src/lib/integrations/feishu/agent-reply";

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
  assert(sampleImport.report.customerVoiceRows === 3, "样例用户声音表应该可以导入。");

  const input = sampleImport.input;

  if (!input) {
    throw new Error("样例 CSV 应该生成 Agent 输入。");
  }

  const analysis = analyzeEcommerceStore(input);

  assert(analysis.headline.includes("Smoke Test Aurora Cup"), "分析标题应该包含店铺名。");
  assert(analysis.nextActions.length > 0, "分析应该生成下一步行动。");
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

  const tsvImport = buildEcommerceInputFromCsv({
    metricsCsv: [
      "week\tproduct_name\torders\trevenue\tunits_sold",
      "previous\t黑杯\t10\t500\t12",
      "current\t黑杯\t9\t450\t10",
    ].join("\n"),
  });

  assert(tsvImport.report.ok, "从 Excel/飞书表格复制的 TSV 应该可以导入。");

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

  const workPlanReply = buildFeishuAgentReply("我现在做什么");
  const pastedTableReply = buildFeishuAgentReply(
    [
      "week\tproduct_name\torders\trevenue\tunits_sold",
      "previous\t黑杯\t10\t500\t12",
      "current\t黑杯\t9\t450\t10",
    ].join("\n"),
  );
  const pastedPlatformTableReply = buildFeishuAgentReply(
    [
      "周期\t商品名称\t支付买家数\t商品支付金额\t支付商品件数\t退款率\t退款原因",
      "上周\t黑杯\t10\t500\t12\t10%\t杯盖漏水",
      "本周\t黑杯\t8\t420\t9\t25%\t杯盖漏水 / 物流慢",
    ].join("\n"),
  );
  const testingReply = buildFeishuAgentReply("怎么真正测试，接入飞书吗");
  const returnsReply = buildFeishuAgentReply("退款退货怎么看");

  assert(workPlanReply.includes("经营数据表"), "飞书工作计划回复应该提示经营数据表。");
  assert(workPlanReply.includes("Markdown"), "飞书工作计划回复应该提示支持 Markdown 表格。");
  assert(pastedTableReply.includes("刚粘贴的表格"), "飞书应该能分析直接粘贴的表格。");
  assert(pastedPlatformTableReply.includes("刚粘贴的表格"), "飞书应该能分析平台中文表头粘贴数据。");
  assert(pastedPlatformTableReply.includes("杯盖漏水"), "飞书平台表头回复应该引用退款原因。");
  assert(testingReply.includes("App Secret"), "飞书测试回复应该提示 App Secret。");
  assert(returnsReply.includes("售后把成交吃回去"), "飞书应该能单独回答退款/退货问题。");

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

  console.info("[smoke] 经营表导入、经营分析、飞书问答和异常数据拦截均通过。");
}

main();
