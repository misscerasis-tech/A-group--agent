import { analyzeEcommerceStore } from "../../ecommerce-agent/analysis";
import {
  buildEcommerceInputFromCsv,
  type EcommerceCsvImportReport,
} from "../../ecommerce-agent/csv-import";
import {
  buildDataRequestPlan,
  formatDataRequestPlanForFeishu,
} from "../../ecommerce-agent/data-request";
import { buildKpiGuideReply } from "../../ecommerce-agent/kpi-guide";
import { buildOperationalTasksTsv, buildProductFindingsTsv } from "../../ecommerce-agent/report";
import { sampleEcommerceAgentInput } from "../../ecommerce-agent/sample-data";
import { buildTestingChecklistReply } from "../../ecommerce-agent/testing-checklist";
import type {
  AgentQuestion,
  EcommerceAgentAnalysis,
  EcommerceAgentInput,
} from "../../ecommerce-agent/types";
import {
  buildBeginnerWorkSession,
  formatBeginnerWorkSessionForFeishu,
} from "../../ecommerce-agent/work-session";

export type FeishuReplyIntent =
  | "store_review"
  | "data_checklist"
  | "data_request"
  | "work_plan"
  | "tasks"
  | "risks"
  | "testing"
  | "usage"
  | "inventory"
  | "profit"
  | "sales"
  | "ads"
  | "returns"
  | "competitors"
  | "unknown";

export type FeishuEcommerceImportContext = {
  input?: EcommerceAgentInput;
  report: EcommerceCsvImportReport;
  sourceLabel: string;
  mergedTableLabel?: string;
  tables?: {
    metricsCsv?: string;
    competitorsCsv?: string;
    customerVoicesCsv?: string;
    inventoryCsv?: string;
    adsCsv?: string;
  };
};

export type FeishuPastedTableKind = "metrics" | "ads" | "inventory" | "customerVoices" | "competitors";

function stripFeishuMentions(text: string) {
  return text
    .replace(/<at\b[^>]*>[\s\S]*?<\/at>/g, "")
    .replace(/^(@\S+\s*)+/, "")
    .trim();
}

export function parseFeishuTextContent(content: string) {
  try {
    const parsed = JSON.parse(content) as { text?: unknown };
    if (typeof parsed.text === "string") {
      return stripFeishuMentions(parsed.text);
    }
  } catch {
    return stripFeishuMentions(content);
  }

  return stripFeishuMentions(content);
}

export function buildUnsupportedFeishuMessageReply(messageType: string) {
  const messageTypeLabels: Record<string, string> = {
    file: "文件",
    image: "图片",
    post: "富文本",
    interactive: "卡片",
    audio: "语音",
    media: "视频",
  };
  const label = messageTypeLabels[messageType] ?? messageType;

  return [
    `我看到你发的是${label}消息。当前本地长连接先不下载附件，所以我不会假装已经读懂文件内容。`,
    "",
    "你可以这样把数据给我：",
    "1. 打开 Excel、CSV 或飞书表格，复制表头和几行数据，直接粘贴到聊天里。",
    "2. 或到 `/agent` 工作台上传 CSV/Excel，生成复盘后把飞书回复或 Markdown 发回群里。",
    "3. 如果不知道复制哪些列，直接发“我需要准备什么数据”，我会按电商小白能懂的方式列给你。",
  ].join("\n");
}

export function detectFeishuReplyIntent(text: string): FeishuReplyIntent {
  const normalized = text.toLowerCase();

  if (["怎么用", "帮助", "help", "用法"].some((keyword) => normalized.includes(keyword))) {
    return "usage";
  }

  if (
    ["怎么测", "测试", "真正测试", "接入飞书", "飞书怎么测", "长连接", "worker"].some(
      (keyword) => normalized.includes(keyword),
    )
  ) {
    return "testing";
  }

  if (["待办", "任务清单", "行动清单", "分工", "负责人", "验收标准"].some((keyword) => normalized.includes(keyword))) {
    return "tasks";
  }

  if (
    ["风险商品", "问题商品", "异常商品", "风险sku", "问题sku", "异常sku", "商品风险"].some((keyword) =>
      normalized.includes(keyword),
    )
  ) {
    return "risks";
  }

  if (
    ["还缺什么", "缺什么数据", "补什么数据", "补哪些数据", "下一份数据", "补数", "数据缺口", "要我补"].some(
      (keyword) => normalized.includes(keyword),
    )
  ) {
    return "data_request";
  }

  if (["退款", "退货", "售后", "退单", "差评"].some((keyword) => normalized.includes(keyword))) {
    return "returns";
  }

  if (
    ["需要什么数据", "准备什么", "数据", "指标", "字段", "首页", "重要", "关注", "看哪些"].some(
      (keyword) => normalized.includes(keyword),
    )
  ) {
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

  if (
    ["现在做什么", "现在要做什么", "我要做什么", "下一步", "先做什么", "带我", "接手", "开始工作"].some(
      (keyword) => normalized.includes(keyword),
    )
  ) {
    return "work_plan";
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
  const tasks = analysis.operationalTasks
    .slice(0, 3)
    .map(
      (task, index) =>
        `${index + 1}. ${task.title}｜${task.owner}｜${task.dueLabel}：${task.firstStep} 验收：${task.acceptanceCriteria}`,
    );
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
    "建议你先做这些待办：",
    ...tasks,
    "",
    "我还会追问你：",
    ...questions,
    "",
    sourceLabel === "样例店铺"
      ? "等你把真实订单、商品、库存、广告、退款/退货和竞品数据给我，我会用同一套逻辑重新判断，不会拿样例结论硬套。"
      : "这版结论来自当前导入数据。如果字段缺失，我会继续追问，不会把缺失项硬编成确定结论。",
  ].join("\n");
}

export function buildFeishuDataChecklistReply() {
  return [
    buildKpiGuideReply(),
    "",
    "最小经营表可以是周汇总：week、product_name、orders、revenue、units_sold；也可以是订单明细：订单号、支付时间、商品名称、实付金额、购买数量。",
    "如果你有广告、库存/成本快照、退款/退货、客服备注、评价内容和竞品，我会把结论从“能复盘”升级成“能安排动作”。",
    "缺什么我会继续问，不会假装看懂。",
  ].join("\n");
}

export function buildFeishuUsageReply() {
  return [
    "你可以在飞书里这样叫我：",
    "",
    "- “帮我看本周经营情况”",
    "- “我需要准备什么数据？”",
    "- “我还缺什么数据？”",
    "- “先看库存风险”",
    "- “退款/退货风险怎么看？”",
    "- “这周先降低退款/退货”",
    "- “这周目标是保销量/保利润”",
    "- “给我待办清单”",
    "- “给我风险商品表”",
    "- “这是竞品链接：https://example.com/item”",
    "- “清空这份数据”",
    "- “我现在做什么？”",
    "",
    "也可以直接粘贴一小段 CSV/TSV/Markdown 表格，或从 Excel/飞书表格复制几行。我会先检查字段，缺什么就问你，不会把缺失项说成确定结论。",
  ].join("\n");
}

export function isFeishuClearContextRequest(text: string) {
  const normalized = text.trim().toLowerCase();

  return [
    "清空这份数据",
    "清空当前数据",
    "清除当前数据",
    "删除当前数据",
    "忘记这份数据",
    "忘记当前数据",
    "清空缓存",
    "清除缓存",
    "重置会话",
    "重新开始",
    "start over",
    "reset",
    "clear data",
  ].some((keyword) => normalized.includes(keyword));
}

export function buildFeishuClearContextReply(didClear: boolean) {
  return didClear
    ? "已清空这个会话里最近一次粘贴的经营数据。你可以重新粘贴新的表格，或发“我需要准备什么数据”。"
    : "这个会话里暂时没有已保存的粘贴数据。你可以直接粘贴经营表，或发“我需要准备什么数据”。";
}

export function buildWorkPlanReply(report?: EcommerceCsvImportReport, questions: AgentQuestion[] = []) {
  return formatBeginnerWorkSessionForFeishu(buildBeginnerWorkSession(report, questions));
}

export function buildFeishuTestingReply() {
  return buildTestingChecklistReply();
}

export function buildTasksReply(analysis: EcommerceAgentAnalysis) {
  return [
    "这是我整理好的待办表，可以直接复制到飞书表格或多维表格：",
    "",
    buildOperationalTasksTsv(analysis),
  ].join("\n");
}

export function buildRisksReply(analysis: EcommerceAgentAnalysis) {
  if (analysis.productFindings.length === 0) {
    return "当前数据里暂时没有明显风险商品。你可以继续补访客、广告、库存、毛利、退款/退货和用户声音，我会重新判断。";
  }

  return [
    "这是我整理好的风险商品表，可以直接复制到飞书表格或多维表格：",
    "",
    buildProductFindingsTsv(analysis),
  ].join("\n");
}

export function buildDataRequestReply({
  analysis,
  report,
  hasImportedContext,
}: {
  analysis?: EcommerceAgentAnalysis;
  report?: EcommerceCsvImportReport;
  hasImportedContext: boolean;
}) {
  return formatDataRequestPlanForFeishu(
    buildDataRequestPlan(report, hasImportedContext ? (analysis?.questionsForUser ?? []) : [], {
      hasKnownInput: hasImportedContext,
    }),
  );
}

function buildIncompleteImportReply(report: EcommerceCsvImportReport) {
  return [
    "我读到了当前导入数据，但现在还不能直接复盘。",
    "我不会拿样例店铺硬套；先按这份表给你列补数清单：",
    "",
    formatDataRequestPlanForFeishu(buildDataRequestPlan(report)),
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

export function buildReturnsReply(analysis: EcommerceAgentAnalysis) {
  const returnFindings = analysis.productFindings.filter((finding) => finding.issue === "售后风险偏高");
  const hasRefundTotals =
    analysis.totals.current.refundOrders !== null || analysis.totals.current.refundAmount !== null;

  return [
    "我会把退款/退货当成“售后把成交吃回去”来看：",
    hasRefundTotals
      ? `1. 当前数据里，退款/退货单数是 ${analysis.totals.current.refundOrders ?? "待补充"}，退款金额是 ${
          analysis.totals.current.refundAmount === null
            ? "待补充"
            : analysis.totals.current.refundAmount.toLocaleString("zh-CN", {
                maximumFractionDigits: 2,
              })
        }。`
      : "1. 先补退款单数、退货数或退款金额。不完整时，我不会判断售后风险高低。",
    returnFindings.length > 0
      ? `2. 优先查这些售后风险商品：${returnFindings
          .slice(0, 2)
          .map((finding) => `${finding.productName}：${finding.plainReason} 建议：${finding.suggestedAction}`)
          .join("；")}`
      : "2. 当前没有明显高退款/退货 SKU；如果真实数据里没有退款字段，我会先追问你补。",
    "3. 第一张表先给到 SKU、订单数、销售额、退款单数、退款金额。下一步再看退款原因、差评关键词和物流异常。",
  ].join("\n");
}

function extractUrls(text: string) {
  return [...text.matchAll(/https?:\/\/[^\s<>"'）)]+/g)].map((match) => match[0]);
}

export function buildCompetitorLinksReply(urls: string[]) {
  const uniqueUrls = [...new Set(urls)].slice(0, 5);

  return [
    `我收到了 ${uniqueUrls.length} 个竞品链接。`,
    "我先不会拿样例竞品硬套这些链接，也不会假装已经实时读取页面价格。",
    "要继续判断价格、促销和卖点压力，请把这些链接补成一张竞品数据表：",
    "",
    "name,url,source,observed_at,price,price_note,promotion,rating,reviews,key_selling_points",
    ...uniqueUrls.map((url, index) => `竞品 ${index + 1},${url},手动记录,观察日期,价格数字,price_note,促销,评分,评论数,核心卖点`),
    "",
    "填完后直接粘回飞书；如果只想先让我列补数清单，也可以发“我还缺什么数据”。",
  ].join("\n");
}

export function buildCompetitorsReply(analysis: EcommerceAgentAnalysis) {
  return [
    "竞品我会先看三件事：价格、促销、卖点。",
    ...analysis.competitorInsights.map((insight, index) => `${index + 1}. ${insight}`),
    "第一步：给我 1 到 3 个你最在意的竞品链接；如果已经有竞品数据表，就补价格、价格备注、观察日期、促销、评分、评论数和核心卖点。",
  ].join("\n");
}

function tableSignals(text: string) {
  const normalized = text.toLowerCase();
  const compact = normalized.replace(/[\s_\-./:：]+/g, "");
  const hasTableDelimiter = [",", "\t", ";", "|"].some((delimiter) => text.includes(delimiter));
  const hasMultipleLines = text.includes("\n");
  const hasPeriodSignal =
    normalized.includes("week") ||
    normalized.includes("period") ||
    compact.includes("startdate") ||
    compact.includes("statdate") ||
    text.includes("周期") ||
    text.includes("上周") ||
    text.includes("本周");
  const hasOrderDetailDateSignal =
    compact.includes("orderdate") ||
    compact.includes("paidat") ||
    compact.includes("paytime") ||
    compact.includes("purchasedate") ||
    text.includes("支付时间") ||
    text.includes("下单时间") ||
    text.includes("订单日期");
  const hasProductSignal =
    normalized.includes("product") ||
    compact.includes("lineitemname") ||
    normalized.includes("sku") ||
    compact.includes("sellersku") ||
    text.includes("商品") ||
    text.includes("产品") ||
    text.includes("商家编码") ||
    text.includes("货号");
  const hasOrderSignal =
    normalized.includes("orders") ||
    compact.includes("paidbuyers") ||
    normalized.includes("buyers") ||
    compact.includes("orderid") ||
    compact.includes("amazonorderid") ||
    text.includes("订单") ||
    text.includes("订单号") ||
    text.includes("买家数") ||
    text.includes("支付买家数");
  const hasRevenueSignal =
    normalized.includes("revenue") ||
    normalized.includes("gmv") ||
    normalized.includes("sales") ||
    compact.includes("lineitemprice") ||
    compact.includes("itemprice") ||
    compact.includes("itemtotal") ||
    text.includes("销售额") ||
    text.includes("成交额") ||
    text.includes("实付金额") ||
    text.includes("实收金额") ||
    text.includes("支付金额") ||
    text.includes("商品支付金额");
  const hasUnitsSignal =
    compact.includes("unitssold") ||
    compact.includes("quantitypurchased") ||
    compact.includes("lineitemquantity") ||
    normalized.includes("quantity") ||
    normalized.includes("qty") ||
    text.includes("销量") ||
    text.includes("数量") ||
    text.includes("购买数量") ||
    text.includes("商品数量") ||
    text.includes("件数") ||
    text.includes("支付商品件数");
  const hasAdSignal =
    compact.includes("adspend") ||
    compact.includes("adcost") ||
    compact.includes("adrevenue") ||
    compact.includes("adsales") ||
    normalized.includes("roas") ||
    normalized.includes("acos") ||
    text.includes("广告花费") ||
    text.includes("广告成交额") ||
    text.includes("广告销售额") ||
    text.includes("广告消耗") ||
    text.includes("投产比");
  const hasInventorySignal =
    normalized.includes("inventory") ||
    normalized.includes("stock") ||
    compact.includes("unitcost") ||
    compact.includes("grossmargin") ||
    text.includes("库存") ||
    text.includes("可售") ||
    text.includes("单位成本") ||
    text.includes("毛利率");
  const hasCustomerVoiceSignal =
    normalized.includes("feedback") ||
    normalized.includes("review") ||
    normalized.includes("comment") ||
    normalized.includes("sentiment") ||
    text.includes("评价") ||
    text.includes("客服备注") ||
    text.includes("用户反馈") ||
    text.includes("售后备注") ||
    text.includes("问题类型") ||
    text.includes("出现次数");
  const hasCompetitorSignal =
    normalized.includes("competitor") ||
    normalized.includes("rating") ||
    normalized.includes("reviews") ||
    normalized.includes("promotion") ||
    normalized.includes("url") ||
    text.includes("竞品") ||
    text.includes("链接") ||
    text.includes("评分") ||
    text.includes("评论数") ||
    text.includes("促销") ||
    text.includes("卖点");

  return {
    compact,
    hasAdSignal,
    hasCompetitorSignal,
    hasCustomerVoiceSignal,
    hasInventorySignal,
    hasMultipleLines,
    hasOrderDetailDateSignal,
    hasOrderSignal,
    hasPeriodSignal,
    hasProductSignal,
    hasRevenueSignal,
    hasTableDelimiter,
    hasUnitsSignal,
  };
}

function looksLikePastedMetricsTable(text: string) {
  const signals = tableSignals(text);
  const metricSignalCount = [signals.hasOrderSignal, signals.hasRevenueSignal, signals.hasUnitsSignal].filter(Boolean)
    .length;
  const hasWeeklyMetricsShape = signals.hasPeriodSignal && metricSignalCount >= 2;
  const hasIncompleteWeeklyMetricsShape =
    signals.hasPeriodSignal &&
    metricSignalCount >= 1 &&
    !signals.hasAdSignal &&
    !signals.hasInventorySignal &&
    !signals.hasCustomerVoiceSignal &&
    !signals.hasCompetitorSignal;
  const hasOrderDetailShape =
    signals.hasOrderDetailDateSignal &&
    signals.hasRevenueSignal &&
    (signals.hasOrderSignal || signals.hasUnitsSignal);

  return (
    signals.hasTableDelimiter &&
    signals.hasMultipleLines &&
    signals.hasProductSignal &&
    (hasWeeklyMetricsShape || hasIncompleteWeeklyMetricsShape || hasOrderDetailShape)
  );
}

export function detectFeishuPastedTableKind(text: string): FeishuPastedTableKind | null {
  const signals = tableSignals(text);

  if (!signals.hasTableDelimiter || !signals.hasMultipleLines) {
    return null;
  }

  if (looksLikePastedMetricsTable(text)) {
    return "metrics";
  }

  if (signals.hasProductSignal && signals.hasAdSignal) {
    return "ads";
  }

  if (signals.hasProductSignal && signals.hasInventorySignal) {
    return "inventory";
  }

  if (signals.hasProductSignal && signals.hasCustomerVoiceSignal) {
    return "customerVoices";
  }

  if (signals.hasCompetitorSignal && (signals.hasRevenueSignal || signals.compact.includes("price") || text.includes("价格"))) {
    return "competitors";
  }

  return null;
}

function buildPastedMetricsTableReply(text: string) {
  const context = buildFeishuImportContextFromText(text);

  if (!context) {
    return "我看到了表格迹象，但还不能识别成经营数据。你可以先发：我需要准备什么数据。";
  }

  if (!context.input) {
    const issues = context.report.issues
      .filter((issue) => issue.severity === "error")
      .slice(0, 5)
      .map((issue, index) => `${index + 1}. ${issue.message}`);
    const dataRequestPlan = buildDataRequestPlan(context.report);

    return [
      "我看到了你贴的表格，但现在还不能直接复盘。",
      "需要你先补这些信息：",
      ...issues,
      "",
      formatDataRequestPlanForFeishu(dataRequestPlan),
    ].join("\n");
  }

  return formatEcommerceAnalysisForFeishu(analyzeEcommerceStore(context.input), context.sourceLabel);
}

const pastedTableLabels: Record<FeishuPastedTableKind, string> = {
  metrics: "经营数据表",
  ads: "广告数据表",
  inventory: "库存/成本快照表",
  customerVoices: "用户声音/售后评价表",
  competitors: "竞品数据表",
};

export function buildFeishuImportContextFromTables({
  tables,
  store,
  mergedTableKind,
  sourceLabel,
}: {
  tables: NonNullable<FeishuEcommerceImportContext["tables"]>;
  store?: Partial<EcommerceAgentInput["store"]>;
  mergedTableKind?: FeishuPastedTableKind;
  sourceLabel?: string;
}): FeishuEcommerceImportContext | null {
  if (!tables.metricsCsv) {
    return null;
  }

  const result = buildEcommerceInputFromCsv({
    metricsCsv: tables.metricsCsv,
    competitorsCsv: tables.competitorsCsv,
    customerVoicesCsv: tables.customerVoicesCsv,
    inventoryCsv: tables.inventoryCsv,
    adsCsv: tables.adsCsv,
    store: {
      storeName: "飞书粘贴数据店铺",
      platform: "待确认平台",
      market: "待确认市场",
      category: "待确认类目",
      ...store,
    },
  });

  return {
    input: result.input,
    report: result.report,
    sourceLabel: sourceLabel ?? (mergedTableKind && mergedTableKind !== "metrics" ? "当前会话数据" : "刚粘贴的表格"),
    mergedTableLabel: mergedTableKind && mergedTableKind !== "metrics" ? pastedTableLabels[mergedTableKind] : undefined,
    tables,
  };
}

export function buildFeishuImportContextFromText(
  text: string,
  previousContext?: FeishuEcommerceImportContext | null,
): FeishuEcommerceImportContext | null {
  const tableKind = detectFeishuPastedTableKind(text);

  if (!tableKind) {
    return null;
  }

  if (tableKind === "metrics") {
    return buildFeishuImportContextFromTables({
      tables: {
        ...previousContext?.tables,
        metricsCsv: text,
      },
      store: previousContext?.input?.store,
      mergedTableKind: "metrics",
    });
  }

  if (!previousContext?.tables?.metricsCsv) {
    return null;
  }

  const nextTables = {
    ...previousContext.tables,
    ...(tableKind === "ads" ? { adsCsv: text } : {}),
    ...(tableKind === "inventory" ? { inventoryCsv: text } : {}),
    ...(tableKind === "customerVoices" ? { customerVoicesCsv: text } : {}),
    ...(tableKind === "competitors" ? { competitorsCsv: text } : {}),
  };

  return buildFeishuImportContextFromTables({
    tables: nextTables,
    store: previousContext.input?.store,
    mergedTableKind: tableKind,
  });
}

export function buildFeishuAuxiliaryTableNeedsMetricsReply(tableKind: FeishuPastedTableKind) {
  return [
    `我看到了${pastedTableLabels[tableKind]}，但这个会话里还没有可合并的经营数据表。`,
    "请先粘贴最近两期经营表，至少包含周期、商品名称或 SKU、订单数、销售额和销量。",
    `然后再把这张${pastedTableLabels[tableKind]}贴过来，我会合并到同一份复盘里。`,
  ].join("\n");
}

export function buildFeishuAgentReply(
  text: string,
  options: {
    input?: EcommerceAgentInput;
    report?: EcommerceCsvImportReport;
    sourceLabel?: string;
    mergedTableLabel?: string;
  } = {},
) {
  if (looksLikePastedMetricsTable(text)) {
    return buildPastedMetricsTableReply(text);
  }

  const sourceLabel = options.sourceLabel ?? "样例店铺";
  const hasImportedContext = Boolean(options.input);
  const intent = detectFeishuReplyIntent(text);
  const urls = extractUrls(text);

  if (options.mergedTableLabel) {
    if (options.input) {
      const analysis = analyzeEcommerceStore(options.input);

      return [
        `我已把${options.mergedTableLabel}合并到当前会话数据。`,
        "",
        formatEcommerceAnalysisForFeishu(analysis, sourceLabel),
      ].join("\n");
    }

    if (options.report) {
      return [
        `我收到了${options.mergedTableLabel}，但合并后还不能直接复盘。`,
        "先按当前会话数据给你列补数清单：",
        "",
        formatDataRequestPlanForFeishu(buildDataRequestPlan(options.report)),
      ].join("\n");
    }
  }

  if (intent === "usage") {
    return buildFeishuUsageReply();
  }

  if (intent === "data_checklist") {
    return buildFeishuDataChecklistReply();
  }

  if (options.report && !options.input) {
    if (intent === "work_plan") {
      return buildWorkPlanReply(options.report);
    }

    if (intent === "data_request") {
      return buildDataRequestReply({
        report: options.report,
        hasImportedContext: false,
      });
    }

    return buildIncompleteImportReply(options.report);
  }

  const analysis = analyzeEcommerceStore(options.input ?? sampleEcommerceAgentInput);

  if (intent === "data_request") {
    return buildDataRequestReply({
      analysis,
      report: options.report,
      hasImportedContext,
    });
  }

  if (intent === "work_plan") {
    return buildWorkPlanReply(options.report, hasImportedContext ? analysis.questionsForUser : []);
  }

  if (intent === "tasks") {
    return buildTasksReply(analysis);
  }

  if (intent === "risks") {
    return buildRisksReply(analysis);
  }

  if (intent === "testing") {
    return buildFeishuTestingReply();
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

  if (intent === "returns") {
    return buildReturnsReply(analysis);
  }

  if (intent === "competitors" || urls.length > 0) {
    if (urls.length > 0) {
      return buildCompetitorLinksReply(urls);
    }

    return buildCompetitorsReply(analysis);
  }

  if (intent === "store_review") {
    return formatEcommerceAnalysisForFeishu(analysis, sourceLabel);
  }

  return [
    text.trim() ? "我收到这条消息了，但暂时没有识别成经营表、竞品链接或明确指令。" : "我收到了一条空消息。",
    "我现在最适合先帮你做电商经营复盘。你可以直接发：帮我看本周经营情况。",
    "如果你还没有真实数据，也可以问：我现在做什么？或者：我需要准备什么数据？",
  ].join("\n");
}
