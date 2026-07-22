import type { EcommerceAgentAnalysis, EcommerceAgentInput, MetricTotals } from "./types";

function formatMoney(value: number) {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function formatNullableMoney(value: number | null) {
  return value === null ? "待补充" : formatMoney(value);
}

function formatRate(value: number | null) {
  if (value === null) {
    return "待补充";
  }

  return `${value >= 0 ? "+" : "-"}${Math.abs(value * 100).toFixed(1)}%`;
}

function metricTable(previous: MetricTotals, current: MetricTotals) {
  return [
    "| 指标 | 上周 | 本周 | 变化 |",
    "| --- | ---: | ---: | ---: |",
    `| 销售额 | ${formatMoney(previous.revenue)} | ${formatMoney(current.revenue)} | - |`,
    `| 订单数 | ${previous.orders} | ${current.orders} | - |`,
    `| 销量 | ${previous.unitsSold} | ${current.unitsSold} | - |`,
    `| 广告花费 | ${formatNullableMoney(previous.adSpend)} | ${formatNullableMoney(current.adSpend)} | - |`,
    `| 广告成交额 | ${formatNullableMoney(previous.adRevenue)} | ${formatNullableMoney(current.adRevenue)} | - |`,
    `| 毛利 | ${formatNullableMoney(previous.grossProfit)} | ${formatNullableMoney(current.grossProfit)} | - |`,
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
    `- 进店后下单变化：${formatRate(analysis.totals.conversionRateChange)}`,
    `- 广告回本变化：${formatRate(analysis.totals.adReturnChange)}`,
    `- 毛利变化：${formatRate(analysis.totals.grossProfitChangeRate)}`,
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
    "## 5. 竞品判断",
    ...analysis.competitorInsights.map((item) => `- ${item}`),
    "",
    "## 6. 下周行动",
    ...analysis.nextActions.map(
      (action, index) =>
        `${index + 1}. **${action.title}**  \n负责人：${action.owner}  \n原因：${action.reason}  \n第一步：${action.firstStep}`,
    ),
    "",
    "## 7. Agent 还需要追问",
    ...analysis.questionsForUser.map(
      (question, index) => `${index + 1}. ${question.question}  \n为什么重要：${question.whyItMatters}`,
    ),
  ];

  return sections.join("\n");
}
