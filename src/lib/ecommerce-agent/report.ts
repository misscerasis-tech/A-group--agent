import type { EcommerceAgentAnalysis, EcommerceAgentInput, MetricTotals } from "./types";

function formatMoney(value: number) {
  return value.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}

function formatNullableMoney(value: number | null) {
  return value === null ? "待补充" : formatMoney(value);
}

function formatNullableCount(value: number | null) {
  return value === null ? "待补充" : `${value}`;
}

function averageOrderValue(totals: MetricTotals) {
  if (totals.orders === 0) {
    return null;
  }

  return totals.revenue / totals.orders;
}

function formatRate(value: number | null) {
  if (value === null) {
    return "待补充";
  }

  return `${value >= 0 ? "+" : "-"}${Math.abs(value * 100).toFixed(1)}%`;
}

function sumVariableFees(totals: MetricTotals) {
  const values = [totals.platformFee, totals.paymentFee, totals.fulfillmentCost, totals.otherCost];

  if (values.every((value) => value === null)) {
    return null;
  }

  return values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

function metricTable(previous: MetricTotals, current: MetricTotals) {
  return [
    "| 指标 | 上周 | 本周 | 变化 |",
    "| --- | ---: | ---: | ---: |",
    `| 销售额 | ${formatMoney(previous.revenue)} | ${formatMoney(current.revenue)} | - |`,
    `| 订单数 | ${previous.orders} | ${current.orders} | - |`,
    `| 客单价 | ${formatNullableMoney(averageOrderValue(previous))} | ${formatNullableMoney(averageOrderValue(current))} | - |`,
    `| 销量 | ${previous.unitsSold} | ${current.unitsSold} | - |`,
    `| 广告花费 | ${formatNullableMoney(previous.adSpend)} | ${formatNullableMoney(current.adSpend)} | - |`,
    `| 广告成交额 | ${formatNullableMoney(previous.adRevenue)} | ${formatNullableMoney(current.adRevenue)} | - |`,
    `| 平台/支付/履约费 | ${formatNullableMoney(sumVariableFees(previous))} | ${formatNullableMoney(sumVariableFees(current))} | - |`,
    `| 毛利 | ${formatNullableMoney(previous.grossProfit)} | ${formatNullableMoney(current.grossProfit)} | - |`,
    `| 退款/退货单数 | ${formatNullableCount(previous.refundOrders)} | ${formatNullableCount(current.refundOrders)} | - |`,
    `| 退款金额 | ${formatNullableMoney(previous.refundAmount)} | ${formatNullableMoney(current.refundAmount)} | - |`,
  ].join("\n");
}

function customerVoiceLines(input: EcommerceAgentInput) {
  const voices = input.customerVoices ?? [];

  if (voices.length === 0) {
    return ["暂时没有单独导入客服备注、评价或售后文本。"];
  }

  return voices
    .slice(0, 6)
    .map(
      (voice, index) =>
        `${index + 1}. **${voice.productName}**：${voice.theme}（${voice.source}，提及 ${voice.count} 次）  \n${voice.text}`,
    );
}

function priorityLabel(priority: "high" | "medium" | "low") {
  const labels = {
    high: "高",
    medium: "中",
    low: "低",
  };

  return labels[priority];
}

function taskTable(analysis: EcommerceAgentAnalysis) {
  if (analysis.operationalTasks.length === 0) {
    return "暂时没有需要创建的运营待办。";
  }

  return [
    "| 状态 | 优先级 | 截止 | 负责人 | 任务 | 验收标准 |",
    "| --- | --- | --- | --- | --- | --- |",
    ...analysis.operationalTasks.map(
      (task) =>
        `| 待开始 | ${priorityLabel(task.priority)} | ${task.dueLabel} | ${task.owner} | ${task.title}：${task.firstStep} | ${task.acceptanceCriteria} |`,
    ),
  ].join("\n");
}

function tableCell(value: string) {
  return value.replace(/\r?\n/g, " ").replace(/\t/g, " ").trim();
}

export function buildOperationalTasksTsv(analysis: EcommerceAgentAnalysis) {
  return [
    ["状态", "优先级", "截止", "负责人", "任务", "第一步", "验收标准", "原因"].join("\t"),
    ...analysis.operationalTasks.map((task) =>
      [
        "待开始",
        priorityLabel(task.priority),
        task.dueLabel,
        task.owner,
        task.title,
        task.firstStep,
        task.acceptanceCriteria,
        task.reason,
      ]
        .map(tableCell)
        .join("\t"),
    ),
  ].join("\n");
}

export function buildProductFindingsTsv(analysis: EcommerceAgentAnalysis) {
  return [
    ["优先级", "商品", "SKU", "问题", "人话原因", "建议动作"].join("\t"),
    ...analysis.productFindings.map((finding) =>
      [
        priorityLabel(finding.priority),
        finding.productName,
        finding.sku,
        finding.issue,
        finding.plainReason,
        finding.suggestedAction,
      ]
        .map(tableCell)
        .join("\t"),
    ),
  ].join("\n");
}

export function buildWeeklyMarkdownReport(
  input: EcommerceAgentInput,
  analysis: EcommerceAgentAnalysis,
) {
  const sections = [
    `# ${input.store.storeName} 经营复盘`,
    "",
    `> ${analysis.headline}`,
    "",
    "## 1. 先说结论",
    ...analysis.plainSummary.map((line) => `- ${line}`),
    "",
    "## 2. 关键指标",
    metricTable(analysis.totals.previous, analysis.totals.current),
    "",
    `- 销售额变化：${formatRate(analysis.totals.revenueChangeRate)}`,
    `- 订单变化：${formatRate(analysis.totals.orderChangeRate)}`,
    `- 客单价变化：${formatRate(analysis.totals.averageOrderValueChange)}`,
    `- 进店后下单变化：${formatRate(analysis.totals.conversionRateChange)}`,
    `- 广告回本变化：${formatRate(analysis.totals.adReturnChange)}`,
    `- 毛利变化：${formatRate(analysis.totals.grossProfitChangeRate)}`,
    `- 退款/退货单占比变化：${formatRate(analysis.totals.refundOrderRateChange)}`,
    `- 退款金额占比变化：${formatRate(analysis.totals.refundAmountRateChange)}`,
    "",
    "## 3. 数据完整度",
    ...analysis.dataHealth.map((item) => `- ${item}`),
    "",
    "## 4. 商品问题",
    ...(analysis.productFindings.length > 0
      ? analysis.productFindings.map(
          (finding, index) =>
            `${index + 1}. **${finding.productName}｜${finding.issue}**：${finding.plainReason}  下一步：${finding.suggestedAction}`,
        )
      : ["暂时没有明显商品异常。"]),
    "",
    "## 5. 用户声音",
    ...customerVoiceLines(input),
    "",
    "## 6. 竞品判断",
    ...analysis.competitorInsights.map((item) => `- ${item}`),
    "",
    "## 7. 下周行动",
    taskTable(analysis),
    "",
    "## 8. Agent 还需要追问",
    ...analysis.questionsForUser.map(
      (question, index) => `${index + 1}. ${question.question}  \n为什么重要：${question.whyItMatters}`,
    ),
  ];

  return sections.join("\n");
}
