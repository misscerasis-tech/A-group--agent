import type {
  EcommerceAgentAnalysis,
  EcommerceAgentInput,
  MetricTotals,
  OperationalTask,
  ProductFinding,
} from "./types";
import {
  buildOperationalTasksTsv,
  buildProductFindingsTsv,
  buildWeeklyMarkdownReport,
} from "./report";

export type WorkspacePriority = "high" | "medium" | "low";

export type CalendarWorkItem = {
  slot: string;
  title: string;
  owner: string;
  priority: WorkspacePriority;
  objective: string;
  input: string;
  output: string;
};

export type ReviewQueueItem = {
  title: string;
  owner: string;
  priority: WorkspacePriority;
  decisionNeeded: string;
  reason: string;
  nextStep: string;
};

export type ReminderRule = {
  title: string;
  level: WorkspacePriority;
  trigger: string;
  why: string;
  action: string;
};

export type PackageArtifact = {
  title: string;
  status: "ready" | "needs-data";
  destination: string;
  summary: string;
};

export type RecapMetricRow = {
  name: string;
  previous: string;
  current: string;
  change: string;
  plainMeaning: string;
};

export type OperationalWorkspace = {
  calendar: CalendarWorkItem[];
  reviewQueue: ReviewQueueItem[];
  reminders: ReminderRule[];
  packageArtifacts: PackageArtifact[];
  recapMetrics: RecapMetricRow[];
  weeklyMarkdown: string;
  taskTable: string;
  riskTable: string;
};

function formatMoney(value: number) {
  return value.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}

function formatNullableMoney(value: number | null) {
  return value === null ? "待补充" : formatMoney(value);
}

function formatNullableCount(value: number | null) {
  return value === null ? "待补充" : value.toLocaleString("zh-CN");
}

function formatRate(value: number | null) {
  if (value === null) {
    return "待补充";
  }

  return `${value >= 0 ? "+" : "-"}${Math.abs(value * 100).toFixed(1)}%`;
}

function averageOrderValue(totals: MetricTotals) {
  if (totals.orders === 0) {
    return null;
  }

  return totals.revenue / totals.orders;
}

function priorityLabel(priority: WorkspacePriority) {
  const labels = {
    high: "高优先级",
    medium: "中优先级",
    low: "低优先级",
  };

  return labels[priority];
}

function ownerFromFinding(finding: ProductFinding) {
  if (finding.issue.includes("库存")) {
    return "供应链/运营";
  }

  if (finding.issue.includes("广告")) {
    return "投放负责人";
  }

  if (finding.issue.includes("售后")) {
    return "客服/运营";
  }

  if (finding.issue.includes("利润")) {
    return "店铺负责人";
  }

  return "电商运营";
}

function buildCalendar(analysis: EcommerceAgentAnalysis) {
  const firstTask = analysis.operationalTasks[0];
  const secondTask = analysis.operationalTasks[1] ?? firstTask;
  const topFinding = analysis.productFindings[0];

  const fallbackTask: OperationalTask = {
    id: "task-fallback",
    title: "补齐经营数据",
    owner: "店铺负责人",
    priority: "medium",
    dueLabel: "3 天内",
    reason: "先把销售、广告、库存、售后和竞品数据放到同一张表，Agent 才能稳定判断。",
    firstStep: "复制最小经营表模板，替换成真实 SKU、订单数和销售额。",
    acceptanceCriteria: "已得到一份可分析的经营表。",
  };

  return [
    {
      slot: "今天",
      title: firstTask?.title ?? fallbackTask.title,
      owner: firstTask?.owner ?? fallbackTask.owner,
      priority: firstTask?.priority ?? fallbackTask.priority,
      objective: firstTask?.reason ?? fallbackTask.reason,
      input: firstTask?.firstStep ?? fallbackTask.firstStep,
      output: firstTask?.acceptanceCriteria ?? fallbackTask.acceptanceCriteria,
    },
    {
      slot: "明天",
      title: topFinding ? `复核 ${topFinding.productName}` : "复核主推商品",
      owner: topFinding ? ownerFromFinding(topFinding) : "电商运营",
      priority: topFinding?.priority ?? "medium",
      objective: topFinding?.plainReason ?? "确认主推商品的问题是不是来自价格、转化、广告、库存或售后。",
      input: topFinding?.suggestedAction ?? "把主推款商品页、广告组和库存快照放到同一处。",
      output: "明确一条先改的商品动作，并把结果回填到复盘待办。",
    },
    {
      slot: "周三",
      title: "整理竞品证据",
      owner: "电商运营",
      priority: "medium",
      objective: "改价或跟促销前先确认竞品链接、观察日期、价格备注和卖点，避免被旧价格误导。",
      input: "打开竞品原链接，补 observed_at、source、price_note 和核心卖点。",
      output: "得到一份可以放心放进周报的竞品观察表。",
    },
    {
      slot: "周五",
      title: secondTask?.title ?? "发送周报并约定下周复盘",
      owner: secondTask?.owner ?? "店铺负责人",
      priority: secondTask?.priority ?? "low",
      objective: secondTask?.reason ?? "把本周结论沉淀到飞书，让下周继续沿着同一套口径看变化。",
      input: secondTask?.firstStep ?? "确认周报接收群、负责人和下周复盘时间。",
      output: secondTask?.acceptanceCriteria ?? "周报已发出，下周复盘时间已确定。",
    },
  ] satisfies CalendarWorkItem[];
}

function buildReviewQueue(analysis: EcommerceAgentAnalysis) {
  const taskReviews = analysis.operationalTasks.map((task) => ({
    title: task.title,
    owner: task.owner,
    priority: task.priority,
    decisionNeeded:
      task.priority === "high"
        ? "确认今天是否立刻执行，还是先补一份数据再动。"
        : "确认是否进入本周待办，还是继续观察。",
    reason: task.reason,
    nextStep: task.firstStep,
  }));
  const productReviews = analysis.productFindings.slice(0, 3).map((finding) => ({
    title: `${finding.productName}｜${finding.issue}`,
    owner: ownerFromFinding(finding),
    priority: finding.priority,
    decisionNeeded: "确认这条商品风险是否真实存在，是否需要改页面、投放、补货或售后话术。",
    reason: finding.plainReason,
    nextStep: finding.suggestedAction,
  }));

  return [...taskReviews, ...productReviews].slice(0, 6) satisfies ReviewQueueItem[];
}

function buildReminders(analysis: EcommerceAgentAnalysis) {
  const findingReminders = analysis.productFindings.slice(0, 4).map((finding) => ({
    title: `${finding.productName}：${finding.issue}`,
    level: finding.priority,
    trigger:
      finding.priority === "high"
        ? "本周继续恶化或 24 小时内没有负责人更新。"
        : "下次复盘仍然出现同类问题。",
    why: finding.plainReason,
    action: finding.suggestedAction,
  }));
  const dataGapReminders = analysis.questionsForUser.slice(0, 2).map((question) => ({
    title: question.question,
    level: "medium" as const,
    trigger: "生成下一次复盘前仍未补齐。",
    why: question.whyItMatters,
    action: "在飞书里追问用户，并附上可复制的数据表模板。",
  }));

  return [...findingReminders, ...dataGapReminders].slice(0, 6) satisfies ReminderRule[];
}

function buildPackageArtifacts(
  input: EcommerceAgentInput,
  analysis: EcommerceAgentAnalysis,
): PackageArtifact[] {
  return [
    {
      title: "飞书消息摘要",
      status: "ready",
      destination: "单聊或群聊",
      summary: analysis.feishuReply.split("\n")[0] ?? analysis.headline,
    },
    {
      title: "经营周报 Markdown",
      status: "ready",
      destination: "飞书文档",
      summary: `${input.store.storeName} 的结论、指标、商品问题、竞品判断和下周行动已经整理成文档结构。`,
    },
    {
      title: "运营待办表",
      status: analysis.operationalTasks.length > 0 ? "ready" : "needs-data",
      destination: "飞书表格或多维表格",
      summary: `已生成 ${analysis.operationalTasks.length} 条待办，包含负责人、截止时间、第一步和验收标准。`,
    },
    {
      title: "风险商品表",
      status: analysis.productFindings.length > 0 ? "ready" : "needs-data",
      destination: "审核中心",
      summary: `已整理 ${analysis.productFindings.length} 条商品风险，按优先级给出人话原因和建议动作。`,
    },
  ];
}

function buildRecapMetrics(analysis: EcommerceAgentAnalysis) {
  const previous = analysis.totals.previous;
  const current = analysis.totals.current;

  return [
    {
      name: "销售额",
      previous: formatMoney(previous.revenue),
      current: formatMoney(current.revenue),
      change: formatRate(analysis.totals.revenueChangeRate),
      plainMeaning: "先看店铺这周结果是不是变好。",
    },
    {
      name: "订单数",
      previous: previous.orders.toLocaleString("zh-CN"),
      current: current.orders.toLocaleString("zh-CN"),
      change: formatRate(analysis.totals.orderChangeRate),
      plainMeaning: "判断买单人数有没有变化。",
    },
    {
      name: "客单价",
      previous: formatNullableMoney(averageOrderValue(previous)),
      current: formatNullableMoney(averageOrderValue(current)),
      change: formatRate(analysis.totals.averageOrderValueChange),
      plainMeaning: "看用户是买多了、买少了，还是只买低价款。",
    },
    {
      name: "广告回本",
      previous: formatNullableMoney(previous.adRevenue),
      current: formatNullableMoney(current.adRevenue),
      change: formatRate(analysis.totals.adReturnChange),
      plainMeaning: "看广告花费有没有换回足够成交。",
    },
    {
      name: "毛利",
      previous: formatNullableMoney(previous.grossProfit),
      current: formatNullableMoney(current.grossProfit),
      change: formatRate(analysis.totals.grossProfitChangeRate),
      plainMeaning: "防止只看到销售额，却没看到真实留下多少钱。",
    },
    {
      name: "退款/退货单",
      previous: formatNullableCount(previous.refundOrders),
      current: formatNullableCount(current.refundOrders),
      change: formatRate(analysis.totals.refundOrderRateChange),
      plainMeaning: "看成交是不是被售后吃回去。",
    },
  ] satisfies RecapMetricRow[];
}

export function buildOperationalWorkspace(
  input: EcommerceAgentInput,
  analysis: EcommerceAgentAnalysis,
): OperationalWorkspace {
  return {
    calendar: buildCalendar(analysis),
    reviewQueue: buildReviewQueue(analysis),
    reminders: buildReminders(analysis),
    packageArtifacts: buildPackageArtifacts(input, analysis),
    recapMetrics: buildRecapMetrics(analysis),
    weeklyMarkdown: buildWeeklyMarkdownReport(input, analysis),
    taskTable: buildOperationalTasksTsv(analysis),
    riskTable: buildProductFindingsTsv(analysis),
  };
}

export function operationalPriorityLabel(priority: WorkspacePriority) {
  return priorityLabel(priority);
}
