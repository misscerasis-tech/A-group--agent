import type { EcommerceCsvImportReport } from "./csv-import";
import { ecommerceKpiGuide } from "./kpi-guide";
import type { AgentQuestion } from "./types";

export type DataRequestPriority = "must" | "should" | "later";
export type DataRequestStatus = "missing" | "partial" | "present";

export type DataRequestItem = {
  id: string;
  title: string;
  owner: string;
  priority: DataRequestPriority;
  priorityLabel: string;
  status: DataRequestStatus;
  statusLabel: string;
  ask: string;
  whyItMatters: string;
  whereToFind: string;
  fields: string[];
  homepageImpact: string;
};

export type DataRequestPlan = {
  summary: string;
  nextQuestion: string;
  items: DataRequestItem[];
};

type DataRequestDraft = Omit<DataRequestItem, "priorityLabel" | "statusLabel">;

const priorityLabels: Record<DataRequestPriority, string> = {
  must: "必须先补",
  should: "建议补",
  later: "可后补",
};

const statusLabels: Record<DataRequestStatus, string> = {
  missing: "缺失",
  partial: "部分已有",
  present: "已够用",
};

function guideHomepageImpact(id: string, fallback: string) {
  return ecommerceKpiGuide.find((item) => item.id === id)?.homepageSignal ?? fallback;
}

function normalizeQuestionText(analysisQuestions: AgentQuestion[]) {
  return analysisQuestions
    .map((question) => `${question.question} ${question.whyItMatters}`)
    .join("\n");
}

function questionIncludes(questionText: string, keywords: string[]) {
  return keywords.some((keyword) => questionText.includes(keyword));
}

function missingRequiredLabels(report?: EcommerceCsvImportReport) {
  return (
    report?.fieldMappings
      .filter((field) => field.required && !field.sourceHeader)
      .map((field) => field.label) ?? []
  );
}

function importErrorMessages(report?: EcommerceCsvImportReport) {
  return (
    report?.issues
      .filter((issue) => issue.severity === "error")
      .slice(0, 3)
      .map((issue) => `${issue.rowNumber ? `第 ${issue.rowNumber} 行：` : ""}${issue.message}`) ?? []
  );
}

function withLabels(item: DataRequestDraft): DataRequestItem {
  return {
    ...item,
    priorityLabel: priorityLabels[item.priority],
    statusLabel: statusLabels[item.status],
  };
}

function sortDataRequests(items: DataRequestItem[]) {
  const priorityScore: Record<DataRequestPriority, number> = {
    must: 3,
    should: 2,
    later: 1,
  };
  const statusScore: Record<DataRequestStatus, number> = {
    missing: 3,
    partial: 2,
    present: 1,
  };

  return [...items].sort((a, b) => {
    const priorityDiff = priorityScore[b.priority] - priorityScore[a.priority];

    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return statusScore[b.status] - statusScore[a.status];
  });
}

export function buildDataRequestPlan(
  report?: EcommerceCsvImportReport,
  analysisQuestions: AgentQuestion[] = [],
  options: {
    hasKnownInput?: boolean;
  } = {},
): DataRequestPlan {
  const items = new Map<string, DataRequestItem>();
  const questionText = normalizeQuestionText(analysisQuestions);
  const missingRequired = missingRequiredLabels(report);
  const importErrors = importErrorMessages(report);
  const hasReport = Boolean(report);
  const hasKnownInput = options.hasKnownInput ?? hasReport;
  const canAnalyze = Boolean(report?.ok);

  function add(item: DataRequestDraft) {
    if (!items.has(item.id)) {
      items.set(item.id, withLabels(item));
    }
  }

  if (!hasKnownInput && analysisQuestions.length === 0) {
    add({
      id: "weekly-metrics",
      title: "最近两期经营对比表",
      owner: "店铺运营",
      priority: "must",
      status: "missing",
      ask: "先给我一份最近两期经营数据，最少要有周期、商品名称、订单数、销售额和销量。",
      whyItMatters: "没有这张表，我无法判断本周是变好还是变差，也不能生成复盘。",
      whereToFind: "电商后台的经营分析、商品分析、订单报表，或直接导出订单明细。",
      fields: ["周期/日期", "商品名称或 SKU", "订单数", "销售额", "销量"],
      homepageImpact: "首页的销售额、订单和风险商品判断会先靠这张表启动。",
    });
  }

  if (hasReport && (!canAnalyze || missingRequired.length > 0 || importErrors.length > 0)) {
    const missingText = missingRequired.length > 0 ? missingRequired.join("、") : "上周/本周两段数据";
    const errorText = importErrors.length > 0 ? ` 还需要修正：${importErrors.join("；")}` : "";

    add({
      id: "fix-metrics",
      title: "修正经营数据表",
      owner: "店铺运营",
      priority: "must",
      status: "missing",
      ask: `请先补齐或修正「${missingText}」。${errorText}`,
      whyItMatters: "必要字段不完整时，Agent 不能安全判断趋势，只能先追问。",
      whereToFind: "电商后台的经营分析、商品分析、订单报表，或订单明细导出。",
      fields: missingRequired.length > 0 ? missingRequired : ["上周/本周周期", "商品名称", "订单数", "销售额", "销量"],
      homepageImpact: "补齐后首页才会从“还不能分析”进入复盘、字段识别和行动清单。",
    });
  }

  if (questionIncludes(questionText, ["访客", "曝光", "流量", "进店"])) {
    add({
      id: "traffic",
      title: "访客数或曝光数",
      owner: "店铺运营",
      priority: "should",
      status: "missing",
      ask: "能否补每个 SKU 的访客数、曝光数或 sessions？",
      whyItMatters: "这样才能判断是没人进店，还是进店后没有下单。",
      whereToFind: "商品分析、流量分析、店铺概览、Shopify Analytics 或 GA。",
      fields: ["SKU", "访客数/UV", "曝光量", "周期"],
      homepageImpact: guideHomepageImpact("traffic", "首页会把“进店后下单”从待补充变成可判断。"),
    });
  }

  if (questionIncludes(questionText, ["广告", "投放", "花费", "成交额"])) {
    add({
      id: "ads",
      title: "广告花费和广告成交额",
      owner: "投放负责人",
      priority: "should",
      status: (report?.adRows ?? 0) > 0 ? "partial" : "missing",
      ask: "请补广告组或 SKU 维度的广告花费、广告成交额、ROAS 或 ACOS。",
      whyItMatters: "这样才能判断增长是不是靠烧钱换来的，避免越投越亏。",
      whereToFind: "广告后台、站内推广、巨量千川、Amazon Ads、Meta Ads 或 Google Ads。",
      fields: ["周期", "SKU/商品", "广告组", "广告花费", "广告成交额/ROAS/ACOS"],
      homepageImpact: guideHomepageImpact("ads", "首页会把广告回本解释成“每花 1 元带回多少成交”。"),
    });
  }

  if (questionIncludes(questionText, ["库存", "断货", "补货"])) {
    add({
      id: "inventory",
      title: "库存快照",
      owner: "供应链/运营",
      priority: "should",
      status: (report?.inventoryRows ?? 0) > 0 ? "partial" : "missing",
      ask: "请补每个 SKU 当前还有多少可售库存，最好带库存日期。",
      whyItMatters: "卖得好但库存少会浪费流量，卖不动又会压库存。",
      whereToFind: "库存管理、仓库系统、商品 SKU 列表或供应链日报。",
      fields: ["SKU", "商品名称", "当前库存", "库存日期"],
      homepageImpact: guideHomepageImpact("inventory", "首页会把快断货 SKU 标成优先处理。"),
    });
  }

  if (questionIncludes(questionText, ["成本", "毛利", "利润", "赚钱"])) {
    add({
      id: "gross-profit",
      title: "成本或毛利口径",
      owner: "店铺负责人",
      priority: "should",
      status: (report?.inventoryRows ?? 0) > 0 ? "partial" : "missing",
      ask: "请补 SKU 的商品成本、毛利、毛利率，或至少给单位成本；如果有平台佣金、支付手续费、物流/履约费，也一起给。",
      whyItMatters: "没有利润口径时，销售额增长不一定代表真的赚钱。",
      whereToFind: "成本表、供应链报价、ERP、财务毛利表或商品成本快照。",
      fields: ["SKU", "商品成本/单位成本", "平台佣金/服务费", "支付/交易手续费", "物流/履约成本", "毛利", "毛利率"],
      homepageImpact: "首页会把“卖得多”进一步判断成“是否真的留下利润”。",
    });
  }

  if (questionIncludes(questionText, ["退款单数", "退货数", "退款金额", "退款/退货数据", "售后风险"])) {
    add({
      id: "returns",
      title: "退款/退货数据",
      owner: "客服/运营",
      priority: "should",
      status: "missing",
      ask: "请补每个 SKU 的退款/退货单数、退款金额，最好和订单数、销售额放在同一周期。",
      whyItMatters: "售后会把已经成交的销售额吃回去，也会影响评价和后续转化。",
      whereToFind: "售后管理、退款订单、退货退款报表、客服工单。",
      fields: ["SKU", "订单数", "销售额", "退款/退货单数", "退款金额"],
      homepageImpact: guideHomepageImpact("returns", "首页会判断售后是否拖累真实利润。"),
    });
  }

  if (questionIncludes(questionText, ["退款/退货原因", "退款原因", "退货原因", "客服备注", "差评", "评价", "用户为什么"])) {
    add({
      id: "customer-voice",
      title: "退款原因、客服备注或差评关键词",
      owner: "客服/运营",
      priority: "should",
      status: (report?.customerVoiceRows ?? 0) > 0 ? "partial" : "missing",
      ask: "请补高风险 SKU 的退款原因、客服备注、差评内容或问题标签。",
      whyItMatters: "这样我才能告诉你该先改商品描述、质量、物流，还是客服承诺。",
      whereToFind: "售后原因、客服工单、商品评价、差评导出、退款备注。",
      fields: ["SKU", "问题主题", "原始反馈", "出现次数", "来源"],
      homepageImpact: "首页商品问题会从“售后偏高”升级到具体该改哪类问题。",
    });
  }

  if ((report && report.competitorRows === 0) || questionIncludes(questionText, ["竞品", "对手", "比价"])) {
    add({
      id: "competitors",
      title: "1 到 3 个竞品链接和价格",
      owner: "电商运营",
      priority: "should",
      status: (report?.competitorRows ?? 0) > 0 ? "partial" : "missing",
      ask: "请给 1 到 3 个最在意的竞品链接，最好补价格、价格备注、观察日期、促销、评分、评论数和核心卖点。",
      whyItMatters: "很多转化下降不是自己店坏了，而是竞品降价、促销或卖点更清楚。",
      whereToFind: "平台搜索结果、竞品商品页、收藏的对标链接或人工整理表。",
      fields: ["竞品名称", "链接", "来源", "观察日期", "价格", "价格备注", "促销", "评分", "评论数", "卖点"],
      homepageImpact: guideHomepageImpact("competitors", "首页会用竞品动态解释外部价格和卖点压力。"),
    });
  }

  if (questionIncludes(questionText, ["保销量", "保利润", "目标", "这周你更想"])) {
    add({
      id: "goal-priority",
      title: "本周目标取舍",
      owner: "店铺负责人",
      priority: "should",
      status: "missing",
      ask: "这周你更想保销量、保利润，还是先降低退款/退货？",
      whyItMatters: "目标不同，我给出的降价、广告、补货和售后动作会不一样。",
      whereToFind: "不需要导表，由店铺负责人直接决定。",
      fields: ["本周目标"],
      homepageImpact: "首页下周行动清单会按目标重排优先级。",
    });
  }

  if (items.size === 0) {
    add({
      id: "ready-to-run",
      title: "核心数据暂时够用",
      owner: "Agent",
      priority: "later",
      status: "present",
      ask: "可以先生成复盘和待办；如果要继续变准，再补广告组、客服备注和竞品细节。",
      whyItMatters: "当前数据已经能支持一版经营判断，后续补细节会让动作更精确。",
      whereToFind: "先不用找新表，直接看复盘、待办和飞书回写文本。",
      fields: ["复盘结果", "行动清单", "待办表格"],
      homepageImpact: "首页可以进入复盘、商品问题、竞品解释和下周行动。",
    });
  }

  const sortedItems = sortDataRequests([...items.values()]);
  const urgentCount = sortedItems.filter((item) => item.priority === "must").length;
  const missingCount = sortedItems.filter((item) => item.status === "missing").length;
  const nextQuestion = sortedItems[0]?.ask ?? "可以先生成复盘和待办。";
  const summary =
    urgentCount > 0
      ? `还有 ${urgentCount} 项必须先补，补完才能安全复盘。`
      : missingCount > 0
        ? `已经能继续工作，但还有 ${missingCount} 项数据会让判断更准。`
        : "核心数据暂时够用，可以先生成复盘和行动清单。";

  return {
    summary,
    nextQuestion,
    items: sortedItems,
  };
}

function tableCell(value: string) {
  return value.replace(/\r?\n/g, " ").replace(/\t/g, " ").trim();
}

export function buildDataRequestPlanTsv(plan: DataRequestPlan) {
  return [
    ["优先级", "状态", "要补的数据", "负责人", "去哪里找", "要复制的列", "为什么重要", "首页会变准的位置"].join("\t"),
    ...plan.items.map((item) =>
      [
        item.priorityLabel,
        item.statusLabel,
        item.title,
        item.owner,
        item.whereToFind,
        item.fields.join("、"),
        item.whyItMatters,
        item.homepageImpact,
      ]
        .map(tableCell)
        .join("\t"),
    ),
  ].join("\n");
}

export function formatDataRequestPlanForFeishu(plan: DataRequestPlan) {
  return [
    plan.summary,
    "",
    `下一句我会问你：${plan.nextQuestion}`,
    "",
    ...plan.items.slice(0, 6).map((item, index) =>
      [
        `${index + 1}. ${item.title}（${item.priorityLabel}，${item.statusLabel}）`,
        `你要给我：${item.fields.join("、")}`,
        `去哪找：${item.whereToFind}`,
        `为什么：${item.whyItMatters}`,
        `首页会变准：${item.homepageImpact}`,
      ].join("\n"),
    ),
    "",
    "你可以直接复制表格给我，不用先清洗字段名；我会识别字段，缺什么再继续问。",
  ].join("\n");
}
