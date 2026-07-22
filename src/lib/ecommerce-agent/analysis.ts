import type {
  AgentQuestion,
  EcommerceAgentAnalysis,
  EcommerceAgentInput,
  MetricTotals,
  NextAction,
  ProductFinding,
  ProductMetric,
  WeeklyMetricSet,
} from "./types";

function sumNullable(values: Array<number | null>) {
  if (values.some((value) => value === null)) {
    return null;
  }

  return values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

function toTotals(metricSet: WeeklyMetricSet): MetricTotals {
  return {
    visitors: sumNullable(metricSet.products.map((product) => product.visitors)),
    orders: metricSet.products.reduce((sum, product) => sum + product.orders, 0),
    revenue: metricSet.products.reduce((sum, product) => sum + product.revenue, 0),
    unitsSold: metricSet.products.reduce((sum, product) => sum + product.unitsSold, 0),
    adSpend: sumNullable(metricSet.products.map((product) => product.adSpend)),
    adRevenue: sumNullable(metricSet.products.map((product) => product.adRevenue)),
  };
}

function rateChange(previous: number, current: number) {
  if (previous === 0) {
    return current === 0 ? 0 : 1;
  }

  return (current - previous) / previous;
}

function conversionRate(totals: MetricTotals) {
  if (!totals.visitors || totals.visitors === 0) {
    return null;
  }

  return totals.orders / totals.visitors;
}

function adReturn(totals: MetricTotals) {
  if (!totals.adSpend || !totals.adRevenue || totals.adSpend === 0) {
    return null;
  }

  return totals.adRevenue / totals.adSpend;
}

function formatPercent(value: number) {
  return `${Math.abs(value * 100).toFixed(1)}%`;
}

function formatMoney(value: number) {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function getProductBySku(products: ProductMetric[], sku: string) {
  return products.find((product) => product.sku === sku);
}

function inventoryDays(product: ProductMetric) {
  if (product.inventory === null || product.unitsSold === 0) {
    return null;
  }

  return product.inventory / (product.unitsSold / 7);
}

function averageSellingPrice(product: ProductMetric) {
  if (product.unitsSold === 0) {
    return 0;
  }

  return product.revenue / product.unitsSold;
}

function buildDataHealth(input: EcommerceAgentInput) {
  const health: string[] = [];
  const allProducts = [...input.previousWeek.products, ...input.currentWeek.products];

  if (allProducts.some((product) => product.visitors === null)) {
    health.push("缺少流量数据，暂时不能判断进店后购买比例。");
  } else {
    health.push("已有流量数据，可以判断是流量变少，还是进店后购买变少。");
  }

  if (allProducts.some((product) => product.adSpend === null || product.adRevenue === null)) {
    health.push("广告数据不完整，广告回本只能作为待补充项。");
  } else {
    health.push("已有广告花费和广告成交额，可以判断广告是否划算。");
  }

  if (allProducts.some((product) => product.inventory === null)) {
    health.push("库存数据不完整，暂时不能提前提醒断货风险。");
  } else {
    health.push("已有库存数据，可以估算每个 SKU 还能卖几天。");
  }

  if (input.competitors.length === 0) {
    health.push("还没有竞品链接，竞品价格和促销判断需要用户补充。");
  } else {
    health.push(`已读取 ${input.competitors.length} 个竞品信号，可辅助判断价格和卖点变化。`);
  }

  return health;
}

function buildProductFindings(input: EcommerceAgentInput): ProductFinding[] {
  const findings: ProductFinding[] = [];

  for (const currentProduct of input.currentWeek.products) {
    const previousProduct = getProductBySku(input.previousWeek.products, currentProduct.sku);

    if (!previousProduct) {
      continue;
    }

    const revenueChange = rateChange(previousProduct.revenue, currentProduct.revenue);
    const orderChange = rateChange(previousProduct.orders, currentProduct.orders);
    const previousConversion =
      previousProduct.visitors && previousProduct.visitors > 0
        ? previousProduct.orders / previousProduct.visitors
        : null;
    const currentConversion =
      currentProduct.visitors && currentProduct.visitors > 0
        ? currentProduct.orders / currentProduct.visitors
        : null;
    const daysLeft = inventoryDays(currentProduct);

    if (revenueChange < -0.12) {
      findings.push({
        sku: currentProduct.sku,
        productName: currentProduct.productName,
        issue: "销售明显下滑",
        plainReason:
          currentConversion !== null && previousConversion !== null && currentConversion < previousConversion
            ? "进店的人没有少太多，但下单比例变低，说明商品页、价格或竞品促销可能影响了购买决定。"
            : "这款商品本周卖出的金额明显变少，需要优先检查流量、价格和广告来源。",
        suggestedAction: "先检查商品页价格、首图、优惠信息和广告投放词，把它放入本周优先诊断清单。",
        priority: "high",
      });
    }

    if (orderChange > 0.08 && daysLeft !== null && daysLeft < 10) {
      findings.push({
        sku: currentProduct.sku,
        productName: currentProduct.productName,
        issue: "卖得变快但库存偏紧",
        plainReason: `按这周速度估算，这款商品大约还能卖 ${daysLeft.toFixed(0)} 天。继续推广可能很快断货。`,
        suggestedAction: "先安排补货或降低推广强度，避免广告把用户带来后却买不到。",
        priority: "high",
      });
    }

    const productAdReturn =
      currentProduct.adSpend && currentProduct.adRevenue && currentProduct.adSpend > 0
        ? currentProduct.adRevenue / currentProduct.adSpend
        : null;

    if (productAdReturn !== null && productAdReturn < 2) {
      findings.push({
        sku: currentProduct.sku,
        productName: currentProduct.productName,
        issue: "广告回本偏弱",
        plainReason: `这款商品广告每花 $1，大约带回 $${productAdReturn.toFixed(2)} 的成交额，当前不适合继续盲目加预算。`,
        suggestedAction: "暂停效果最差的广告组，先保留能稳定带来订单的关键词或素材。",
        priority: "medium",
      });
    }
  }

  return findings.sort((a, b) => {
    const priorityScore = { high: 3, medium: 2, low: 1 };
    return priorityScore[b.priority] - priorityScore[a.priority];
  });
}

function buildCompetitorInsights(input: EcommerceAgentInput) {
  if (input.competitors.length === 0) {
    return ["还没有竞品数据。建议先提供 1 到 3 个竞品链接，Agent 再判断价格、促销和卖点差异。"];
  }

  const currentPrices = input.currentWeek.products
    .map(averageSellingPrice)
    .filter((price) => price > 0);
  const averageOwnPrice =
    currentPrices.reduce((sum, price) => sum + price, 0) / Math.max(currentPrices.length, 1);
  const cheaperCompetitors = input.competitors.filter(
    (competitor) => competitor.price < averageOwnPrice * 0.95,
  );
  const promotedCompetitors = input.competitors.filter(
    (competitor) => competitor.promotion !== "无明显促销",
  );

  const insights: string[] = [];

  if (cheaperCompetitors.length > 0) {
    insights.push(
      `${cheaperCompetitors.map((competitor) => competitor.name).join("、")} 的价格比我们低。用户比价时，我们需要用限时优惠、套装价值或赠品解释为什么值得买。`,
    );
  } else {
    insights.push("竞品价格没有明显压过我们，本周不需要急着全面降价。");
  }

  if (promotedCompetitors.length > 0) {
    insights.push(
      `${promotedCompetitors.map((competitor) => competitor.name).join("、")} 正在做促销。建议主推款至少补一个清晰优惠，避免用户觉得我们没有购买理由。`,
    );
  }

  const repeatedSellingPoints = new Map<string, number>();

  for (const competitor of input.competitors) {
    for (const point of competitor.keySellingPoints) {
      repeatedSellingPoints.set(point, (repeatedSellingPoints.get(point) ?? 0) + 1);
    }
  }

  const commonPoints = [...repeatedSellingPoints.entries()]
    .filter(([, count]) => count >= 2)
    .map(([point]) => point);

  if (commonPoints.length > 0) {
    insights.push(
      `竞品反复强调 ${commonPoints.join("、")}。这些词应该出现在我们的商品首屏、广告素材和促销说明里。`,
    );
  }

  return insights;
}

function buildQuestions(input: EcommerceAgentInput): AgentQuestion[] {
  const questions: AgentQuestion[] = [];
  const allProducts = [...input.previousWeek.products, ...input.currentWeek.products];

  if (allProducts.some((product) => product.visitors === null)) {
    questions.push({
      question: "能否补一份访客数或曝光数？",
      whyItMatters: "这样我才能判断是没人进店，还是进店后没有下单。",
    });
  }

  if (allProducts.some((product) => product.adSpend === null || product.adRevenue === null)) {
    questions.push({
      question: "有没有广告花费和广告成交额？",
      whyItMatters: "这样我才能判断广告是在赚钱，还是只是把预算花掉了。",
    });
  }

  if (allProducts.some((product) => product.inventory === null)) {
    questions.push({
      question: "能否补每个 SKU 当前库存？",
      whyItMatters: "这样我可以提前告诉你哪些商品快断货，不会等卖没了才发现。",
    });
  }

  if (input.competitors.length === 0) {
    questions.push({
      question: "有没有 1 到 3 个你最在意的竞品链接？",
      whyItMatters: "这样我可以判断竞品是不是在降价、促销或换卖点。",
    });
  }

  questions.push({
    question: "这周你更想保销量，还是更想保利润？",
    whyItMatters: "如果目标不同，我给出的降价、广告和补货建议会不一样。",
  });

  return questions;
}

function buildNextActions(findings: ProductFinding[], competitorInsights: string[]): NextAction[] {
  const actions: NextAction[] = [];
  const hasRevenueDrop = findings.some((finding) => finding.issue === "销售明显下滑");
  const hasInventoryRisk = findings.some((finding) => finding.issue === "卖得变快但库存偏紧");
  const hasWeakAds = findings.some((finding) => finding.issue === "广告回本偏弱");
  const hasCompetitorPromotion = competitorInsights.some((insight) => insight.includes("促销"));

  if (hasRevenueDrop || hasCompetitorPromotion) {
    actions.push({
      title: "先处理主推款购买理由",
      owner: "电商运营",
      reason: "本周问题更像是用户进来后不够想买，价格、优惠和首屏卖点要先改。",
      firstStep: "把主推 SKU 的首图、价格、优惠和前三条卖点截图给 Agent 做二次检查。",
    });
  }

  if (hasWeakAds) {
    actions.push({
      title: "暂停最弱广告，保留能成交的投放",
      owner: "投放负责人",
      reason: "继续平均加预算会放大亏损，先把低回本广告停下来。",
      firstStep: "导出广告组明细，按花费从高到低筛出成交额最低的 2 个广告组。",
    });
  }

  if (hasInventoryRisk) {
    actions.push({
      title: "检查礼盒套装补货或控量",
      owner: "供应链/运营",
      reason: "卖得快但库存少，断货会浪费广告和自然流量。",
      firstStep: "确认补货周期；如果 7 天内补不上，先降低对应广告预算。",
    });
  }

  actions.push({
    title: "建立下周复盘节奏",
    owner: "店铺负责人",
    reason: "每周固定看一次，Agent 才能持续发现趋势，而不是等问题变大。",
    firstStep: "在飞书设置每周一上午自动生成经营复盘。",
  });

  return actions.slice(0, 4);
}

export function analyzeEcommerceStore(input: EcommerceAgentInput): EcommerceAgentAnalysis {
  const previous = toTotals(input.previousWeek);
  const current = toTotals(input.currentWeek);
  const revenueChangeRate = rateChange(previous.revenue, current.revenue);
  const orderChangeRate = rateChange(previous.orders, current.orders);
  const previousConversion = conversionRate(previous);
  const currentConversion = conversionRate(current);
  const conversionRateChange =
    previousConversion === null || currentConversion === null
      ? null
      : rateChange(previousConversion, currentConversion);
  const previousAdReturn = adReturn(previous);
  const currentAdReturn = adReturn(current);
  const adReturnChange =
    previousAdReturn === null || currentAdReturn === null
      ? null
      : rateChange(previousAdReturn, currentAdReturn);
  const productFindings = buildProductFindings(input);
  const competitorInsights = buildCompetitorInsights(input);
  const nextActions = buildNextActions(productFindings, competitorInsights);
  const direction = revenueChangeRate >= 0 ? "变好了" : "变差了";
  const headline = `${input.store.storeName} 本周整体${direction}：销售额${revenueChangeRate >= 0 ? "增长" : "下降"} ${formatPercent(revenueChangeRate)}`;

  const plainSummary = [
    `这周一共卖了 ${formatMoney(current.revenue)}，订单数是 ${current.orders} 单。和上周相比，销售额${revenueChangeRate >= 0 ? "多了" : "少了"} ${formatPercent(revenueChangeRate)}，订单数${orderChangeRate >= 0 ? "多了" : "少了"} ${formatPercent(orderChangeRate)}。`,
    conversionRateChange === null
      ? "现在缺少完整流量数据，所以我还不能判断是没人进店，还是进店后没有下单。"
      : `进店后下单比例${conversionRateChange >= 0 ? "提高" : "下降"}了 ${formatPercent(conversionRateChange)}。这能帮助我们判断问题更靠近商品页、价格和促销，而不只是流量。`,
    adReturnChange === null
      ? "广告数据不完整，我不会强行判断广告好坏。"
      : `广告回本${adReturnChange >= 0 ? "变好" : "变差"}了 ${formatPercent(adReturnChange)}。简单说，每花 1 美元广告费，带回来的成交额变${adReturnChange >= 0 ? "多" : "少"}了。`,
  ];

  return {
    headline,
    plainSummary,
    dataHealth: buildDataHealth(input),
    totals: {
      previous,
      current,
      revenueChangeRate,
      orderChangeRate,
      conversionRateChange,
      adReturnChange,
    },
    productFindings,
    competitorInsights,
    questionsForUser: buildQuestions(input),
    nextActions,
    feishuReply: [
      headline,
      `我建议下周先做 ${nextActions.length} 件事：${nextActions.map((action) => action.title).join("、")}。`,
      "我已经把完整复盘、风险商品和待办清单整理好，可以同步到飞书文档并创建负责人待办。",
    ].join("\n"),
  };
}
