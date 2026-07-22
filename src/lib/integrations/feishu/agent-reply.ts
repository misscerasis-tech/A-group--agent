import { analyzeEcommerceStore } from "../../ecommerce-agent/analysis";
import { buildEcommerceInputFromCsv } from "../../ecommerce-agent/csv-import";
import { sampleEcommerceAgentInput } from "../../ecommerce-agent/sample-data";
import type { EcommerceAgentAnalysis, EcommerceAgentInput } from "../../ecommerce-agent/types";

export type FeishuReplyIntent =
  | "store_review"
  | "data_checklist"
  | "usage"
  | "inventory"
  | "profit"
  | "sales"
  | "ads"
  | "competitors"
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

  if (["利润", "毛利", "赚钱", "保利润"].some((keyword) => normalized.includes(keyword))) {
    return "profit";
  }

  if (["保销量", "销量", "订单", "销售额"].some((keyword) => normalized.includes(keyword))) {
    return "sales";
  }

  if (["广告", "投放", "回本", "roas"].some((keyword) => normalized.includes(keyword))) {
    return "ads";
  }

  if (["竞品", "对手", "比价", "价格"].some((keyword) => normalized.includes(keyword))) {
    return "competitors";
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

export function buildProfitReply(analysis: EcommerceAgentAnalysis) {
  const profitFindings = analysis.productFindings.filter((finding) =>
    ["利润空间偏低", "广告回本偏弱"].includes(finding.issue),
  );

  return [
    "如果这周目标是保利润，我会先这样带你看：",
    analysis.totals.grossProfitChangeRate === null
      ? "1. 先补商品成本、毛利或利润列。没有这列时，我不会把销售增长误判成利润增长。"
      : `1. 毛利变化是 ${(analysis.totals.grossProfitChangeRate * 100).toFixed(1)}%，先确认是不是低利润订单变多了。`,
    analysis.totals.adReturnChange === null
      ? "2. 再补广告花费和广告成交额，确认投放有没有吞掉利润。"
      : `2. 广告回本变化是 ${(analysis.totals.adReturnChange * 100).toFixed(1)}%，低回本广告先别加预算。`,
    profitFindings.length > 0
      ? `3. 优先处理：${profitFindings.map((finding) => `${finding.productName}（${finding.issue}）`).join("、")}。`
      : "3. 当前没有明显低毛利/低广告回本商品，但仍建议按 SKU 看成本结构。",
    "第一步：把商品成本、运费、折扣和广告花费放到同一张表，我来帮你排出先停、先改、先保留的 SKU。",
  ].join("\n");
}

export function buildSalesReply(analysis: EcommerceAgentAnalysis) {
  const salesFindings = analysis.productFindings.filter((finding) =>
    ["销售明显下滑", "卖得变快但库存偏紧"].includes(finding.issue),
  );

  return [
    "如果这周目标是保销量，我会先这样看：",
    `1. 本周销售额变化 ${analysis.totals.revenueChangeRate >= 0 ? "+" : ""}${(analysis.totals.revenueChangeRate * 100).toFixed(1)}%，订单变化 ${analysis.totals.orderChangeRate >= 0 ? "+" : ""}${(analysis.totals.orderChangeRate * 100).toFixed(1)}%。`,
    analysis.totals.conversionRateChange === null
      ? "2. 现在缺流量数据，先补访客数/曝光数，才能判断是没人进店还是进店后不买。"
      : `2. 进店后下单变化 ${analysis.totals.conversionRateChange >= 0 ? "+" : ""}${(analysis.totals.conversionRateChange * 100).toFixed(1)}%，先判断商品页和价格有没有拖后腿。`,
    salesFindings.length > 0
      ? `3. 优先处理：${salesFindings.map((finding) => `${finding.productName}（${finding.issue}）`).join("、")}。`
      : "3. 当前没有明显销量异常商品，可以先保持复盘节奏。",
    "第一步：把主推 SKU 的访客数、订单数、价格和优惠截图给我，我先排查购买理由够不够强。",
  ].join("\n");
}

export function buildAdsReply(analysis: EcommerceAgentAnalysis) {
  const weakAds = analysis.productFindings.filter((finding) => finding.issue === "广告回本偏弱");

  return [
    "我会把广告当成“花钱买订单”来看，不只看点击：",
    analysis.totals.adReturnChange === null
      ? "1. 先补广告花费和广告成交额。不完整时，我不会判断广告好坏。"
      : `1. 本周广告回本变化 ${analysis.totals.adReturnChange >= 0 ? "+" : ""}${(analysis.totals.adReturnChange * 100).toFixed(1)}%。`,
    weakAds.length > 0
      ? `2. 先查这些低回本商品：${weakAds.map((finding) => finding.productName).join("、")}。`
      : "2. 当前没有明显低回本商品，但还需要广告组/关键词层级数据才能继续细拆。",
    "3. 不建议平均加预算。先保留能成交的广告组，暂停花费高但成交弱的广告组。",
    "第一步：导出广告组明细，至少给我广告组名、SKU、花费、成交额、订单数。",
  ].join("\n");
}

export function buildCompetitorsReply(analysis: EcommerceAgentAnalysis) {
  return [
    "竞品我会先看三件事：价格、促销、卖点。",
    ...analysis.competitorInsights.map((insight, index) => `${index + 1}. ${insight}`),
    "第一步：给我 1 到 3 个你最在意的竞品链接；如果已经有竞品 CSV，就补价格、促销、评分、评论数和核心卖点。",
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

  if (intent === "profit") {
    return buildProfitReply(analysis);
  }

  if (intent === "sales") {
    return buildSalesReply(analysis);
  }

  if (intent === "ads") {
    return buildAdsReply(analysis);
  }

  if (intent === "competitors") {
    return buildCompetitorsReply(analysis);
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
