import { analyzeEcommerceStore } from "../../ecommerce-agent/analysis";
import { buildEcommerceInputFromCsv } from "../../ecommerce-agent/csv-import";
import { sampleEcommerceAgentInput } from "../../ecommerce-agent/sample-data";
import type { EcommerceAgentAnalysis, EcommerceAgentInput } from "../../ecommerce-agent/types";

export type FeishuReplyIntent =
  | "store_review"
  | "data_checklist"
  | "usage"
  | "inventory"
  | "unknown";

export function parseFeishuTextContent(content: string) {
  try {
    const parsed = JSON.parse(content) as { text?: unknown };
    if (typeof parsed.text === "string") {
      return parsed.text.replace(/@\w+/g, "").trim();
    }
  } catch {
    return content.trim();
  }

  return content.trim();
}

export function detectFeishuReplyIntent(text: string): FeishuReplyIntent {
  const normalized = text.toLowerCase();

  if (["怎么用", "帮助", "help", "用法"].some((keyword) => normalized.includes(keyword))) {
    return "usage";
  }

  if (["需要什么数据", "准备什么", "数据", "指标", "字段"].some((keyword) => normalized.includes(keyword))) {
    return "data_checklist";
  }

  if (["库存", "断货", "补货"].some((keyword) => normalized.includes(keyword))) {
    return "inventory";
  }

  if (["复盘", "经营", "本周", "周报", "分析", "看看", "店铺", "测试"].some((keyword) => normalized.includes(keyword))) {
    return "store_review";
  }

  return "unknown";
}

export function formatEcommerceAnalysisForFeishu(
  analysis: EcommerceAgentAnalysis,
  sourceLabel = "样例店铺",
) {
  const findings = analysis.productFindings
    .slice(0, 3)
    .map(
      (finding, index) =>
        `${index + 1}. ${finding.productName}：${finding.issue}。${finding.plainReason} 下一步：${finding.suggestedAction}`,
    );
  const actions = analysis.nextActions
    .slice(0, 3)
    .map((action, index) => `${index + 1}. ${action.title}：${action.firstStep}`);
  const questions = analysis.questionsForUser
    .slice(0, 2)
    .map((question, index) => `${index + 1}. ${question.question} ${question.whyItMatters}`);

  return [
    `我先按${sourceLabel}做一版复盘：${analysis.headline}`,
    "",
    "先说人话：",
    ...analysis.plainSummary.map((line) => `- ${line}`),
    "",
    "最该关注的问题：",
    ...(findings.length > 0 ? findings : ["暂时没有明显高风险商品。"]),
    "",
    "建议你先做：",
    ...actions,
    "",
    "我还会追问你：",
    ...questions,
    "",
    sourceLabel === "样例店铺"
      ? "等你把真实订单、商品、库存、广告和竞品数据给我，我会用同一套逻辑重新判断，不会拿样例结论硬套。"
      : "这版结论来自当前导入数据。如果字段缺失，我会继续追问，不会把缺失项硬编成确定结论。",
  ].join("\n");
}

export function buildFeishuDataChecklistReply() {
  return [
    "电商运营 Agent 第一优先要这些数据，我按“小白能理解”的方式说：",
    "",
    "1. 订单数据：看卖了多少钱、多少单、客单价有没有变。",
    "2. 商品/SKU 数据：看是哪几个商品带来增长，哪几个在拖后腿。",
    "3. 流量数据：看问题是没人进店，还是进店后不买。",
    "4. 广告数据：看广告每花 1 元能带回多少成交，避免越投越亏。",
    "5. 库存数据：看热卖品还能卖几天，提前提醒断货。",
    "6. 竞品链接/价格：看竞品是否降价、做促销、换卖点。",
    "",
    "你现在不用一次给全。缺什么我会继续问，不会假装看懂。",
  ].join("\n");
}

export function buildFeishuUsageReply() {
  return [
    "你可以在飞书里这样叫我：",
    "",
    "- “帮我看本周经营情况”",
    "- “我需要准备什么数据？”",
    "- “先看库存风险”",
    "- “这周目标是保销量/保利润”",
    "",
    "第一版先用样例店铺验证机器人闭环；接下来把真实表格接进来后，我会改成根据你的店铺数据复盘。",
  ].join("\n");
}

export function buildInventoryReply(analysis: EcommerceAgentAnalysis) {
  const inventoryFindings = analysis.productFindings.filter((finding) =>
    finding.issue.includes("库存"),
  );

  if (inventoryFindings.length === 0) {
    return "按当前样例数据，暂时没有特别突出的库存风险。真实测试时请给我每个 SKU 的当前库存和近 7 天销量，我会估算还能卖几天。";
  }

  return [
    "我先看库存风险：",
    ...inventoryFindings.map(
      (finding, index) =>
        `${index + 1}. ${finding.productName}：${finding.plainReason} 建议：${finding.suggestedAction}`,
    ),
  ].join("\n");
}

function looksLikePastedMetricsCsv(text: string) {
  const normalized = text.toLowerCase();

  return (
    text.includes(",") &&
    text.includes("\n") &&
    (normalized.includes("week") || text.includes("周期")) &&
    (normalized.includes("orders") || text.includes("订单")) &&
    (normalized.includes("revenue") || normalized.includes("gmv") || text.includes("销售额"))
  );
}

function buildPastedCsvReply(text: string) {
  const result = buildEcommerceInputFromCsv({
    metricsCsv: text,
    store: {
      storeName: "飞书粘贴数据店铺",
      platform: "待确认平台",
      market: "待确认市场",
      category: "待确认类目",
    },
  });

  if (!result.input) {
    const issues = result.report.issues
      .filter((issue) => issue.severity === "error")
      .slice(0, 5)
      .map((issue, index) => `${index + 1}. ${issue.message}`);

    return [
      "我看到了你贴的 CSV，但现在还不能直接复盘。",
      "需要你先补这些信息：",
      ...issues,
      "最小格式需要：week、product_name、orders、revenue、units_sold，并且要同时有 previous/current 两段数据。",
    ].join("\n");
  }

  return formatEcommerceAnalysisForFeishu(analyzeEcommerceStore(result.input), "刚粘贴的 CSV");
}

export function buildFeishuAgentReply(
  text: string,
  options: {
    input?: EcommerceAgentInput;
    sourceLabel?: string;
} = {},
) {
  if (looksLikePastedMetricsCsv(text)) {
    return buildPastedCsvReply(text);
  }

  const sourceLabel = options.sourceLabel ?? "样例店铺";
  const analysis = analyzeEcommerceStore(options.input ?? sampleEcommerceAgentInput);
  const intent = detectFeishuReplyIntent(text);

  if (intent === "usage") {
    return buildFeishuUsageReply();
  }

  if (intent === "data_checklist") {
    return buildFeishuDataChecklistReply();
  }

  if (intent === "inventory") {
    return buildInventoryReply(analysis);
  }

  if (intent === "store_review") {
    return formatEcommerceAnalysisForFeishu(analysis, sourceLabel);
  }

  return [
    `我收到你说的：“${text || "空消息"}”。`,
    "我现在最适合先帮你做电商经营复盘。你可以直接发：帮我看本周经营情况。",
    "如果你还没有真实数据，也可以问：我需要准备什么数据？",
  ].join("\n");
}
