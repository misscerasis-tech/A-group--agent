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

  const input = sampleImport.input;

  if (!input) {
    throw new Error("样例 CSV 应该生成 Agent 输入。");
  }

  const analysis = analyzeEcommerceStore(input);

  assert(analysis.headline.includes("Smoke Test Aurora Cup"), "分析标题应该包含店铺名。");
  assert(analysis.nextActions.length > 0, "分析应该生成下一步行动。");
  assert(analysis.nextActions[0].title === "先核对利润口径", "保利润目标应该优先核对利润口径。");

  const tsvImport = buildEcommerceInputFromCsv({
    metricsCsv: [
      "week\tproduct_name\torders\trevenue\tunits_sold",
      "previous\t黑杯\t10\t500\t12",
      "current\t黑杯\t9\t450\t10",
    ].join("\n"),
  });

  assert(tsvImport.report.ok, "从 Excel/飞书表格复制的 TSV 应该可以导入。");

  const workPlanReply = buildFeishuAgentReply("我现在做什么");
  const pastedTableReply = buildFeishuAgentReply(
    [
      "week\tproduct_name\torders\trevenue\tunits_sold",
      "previous\t黑杯\t10\t500\t12",
      "current\t黑杯\t9\t450\t10",
    ].join("\n"),
  );
  const testingReply = buildFeishuAgentReply("怎么真正测试，接入飞书吗");

  assert(workPlanReply.includes("经营数据 CSV/TSV"), "飞书工作计划回复应该提示经营 CSV/TSV。");
  assert(pastedTableReply.includes("刚粘贴的表格"), "飞书应该能分析直接粘贴的表格。");
  assert(testingReply.includes("App Secret"), "飞书测试回复应该提示 App Secret。");

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

  console.info("[smoke] CSV 导入、经营分析、飞书问答和异常数据拦截均通过。");
}

main();
