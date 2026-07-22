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

function productGrossProfit(product: ProductMetric) {
  if (product.grossProfit !== undefined && product.grossProfit !== null) {
    return product.grossProfit;
  }

  if (product.productCost !== undefined && product.productCost !== null) {
    return product.revenue - product.productCost;
  }

  return null;
}

function toTotals(metricSet: WeeklyMetricSet): MetricTotals {
  return {
    visitors: sumNullable(metricSet.products.map((product) => product.visitors)),
    orders: metricSet.products.reduce((sum, product) => sum + product.orders, 0),
    revenue: metricSet.products.reduce((sum, product) => sum + product.revenue, 0),
    unitsSold: metricSet.products.reduce((sum, product) => sum + product.unitsSold, 0),
    adSpend: sumNullable(metricSet.products.map((product) => product.adSpend)),
    adRevenue: sumNullable(metricSet.products.map((product) => product.adRevenue)),
    productCost: sumNullable(
      metricSet.products.map((product) =>
        product.productCost !== undefined ? product.productCost : null,
      ),
    ),
    grossProfit: sumNullable(metricSet.products.map(productGrossProfit)),
    refundOrders: sumNullable(
      metricSet.products.map((product) =>
        product.refundOrders !== undefined ? product.refundOrders : null,
      ),
    ),
    refundAmount: sumNullable(
      metricSet.products.map((product) =>
        product.refundAmount !== undefined ? product.refundAmount : null,
      ),
    ),
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

function grossMargin(totals: MetricTotals) {
  if (totals.grossProfit === null || totals.revenue === 0) {
    return null;
  }

  return totals.grossProfit / totals.revenue;
}

function refundOrderRate(totals: MetricTotals) {
  if (totals.refundOrders === null || totals.orders === 0) {
    return null;
  }

  return totals.refundOrders / totals.orders;
}

function refundAmountRate(totals: MetricTotals) {
  if (totals.refundAmount === null || totals.revenue === 0) {
    return null;
  }

  return totals.refundAmount / totals.revenue;
}

function formatPercent(value: number) {
  return `${Math.abs(value * 100).toFixed(1)}%`;
}

function formatMoney(value: number) {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function formatPointChange(previous: number, current: number) {
  const change = current - previous;
  return `${change >= 0 ? "增加" : "减少"} ${Math.abs(change * 100).toFixed(1)} 个百分点`;
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

function hasRefundData(product: ProductMetric) {
  return product.refundOrders !== undefined && product.refundOrders !== null
    ? true
    : product.refundAmount !== undefined && product.refundAmount !== null;
}

function productRefundOrderRate(product: ProductMetric) {
  if (product.refundOrders === undefined || product.refundOrders === null || product.orders === 0) {
    return null;
  }

  return product.refundOrders / product.orders;
}

function productRefundAmountRate(product: ProductMetric) {
  if (product.refundAmount === undefined || product.refundAmount === null || product.revenue === 0) {
    return null;
  }

  return product.refundAmount / product.revenue;
}

function describeRefundRisk(product: ProductMetric) {
  const orderRate = productRefundOrderRate(product);
  const amountRate = productRefundAmountRate(product);
  const parts: string[] = [];

  if (orderRate !== null) {
    parts.push(`退款/退货单约占订单 ${(orderRate * 100).toFixed(1)}%`);
  }

  if (amountRate !== null) {
    parts.push(`退款金额约占销售额 ${(amountRate * 100).toFixed(1)}%`);
  }

  return parts.join("，");
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

  if (allProducts.some((product) => productGrossProfit(product) === null)) {
    health.push("成本或毛利数据不完整，暂时只能判断销售表现，不能完整判断赚不赚钱。");
  } else {
    health.push("已有成本或毛利数据，可以判断销售增长是否真的带来利润。");
  }

  const refundDataRows = allProducts.filter(hasRefundData).length;

  if (refundDataRows === 0) {
    health.push("还没有退款/退货数据，暂时不能判断售后是否在吃掉销售和利润。");
  } else if (refundDataRows < allProducts.length) {
    health.push("退款/退货数据只覆盖部分 SKU，售后风险判断会先作为提示项。");
  } else {
    health.push("已有退款/退货数据，可以判断售后、描述或物流问题是否拖累真实利润。");
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
    const currentGrossProfit = productGrossProfit(currentProduct);
    const currentGrossMargin =
      currentGrossProfit !== null && currentProduct.revenue > 0
        ? currentGrossProfit / currentProduct.revenue
        : null;
    const currentRefundOrderRate = productRefundOrderRate(currentProduct);
    const currentRefundAmountRate = productRefundAmountRate(currentProduct);
    const highestRefundRate = Math.max(
      currentRefundOrderRate ?? Number.NEGATIVE_INFINITY,
      currentRefundAmountRate ?? Number.NEGATIVE_INFINITY,
    );

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

    if (currentGrossMargin !== null && currentGrossMargin < 0.25) {
      findings.push({
        sku: currentProduct.sku,
        productName: currentProduct.productName,
        issue: "利润空间偏低",
        plainReason: `这款商品本周毛利率约 ${(currentGrossMargin * 100).toFixed(1)}%。卖得越多，也可能只是把低利润订单放大。`,
        suggestedAction: "先检查采购成本、折扣、运费和广告成本，低毛利款不要盲目加大促销。",
        priority: "medium",
      });
    }

    if (highestRefundRate >= 0.08) {
      findings.push({
        sku: currentProduct.sku,
        productName: currentProduct.productName,
        issue: "售后风险偏高",
        plainReason: `${describeRefundRisk(currentProduct)}。这说明部分成交被退款或退货吃回去，需要检查商品描述、质量、物流或售后承诺是否让用户失望。`,
        suggestedAction: "导出这款 SKU 的退款原因、差评关键词和物流异常记录，先改最常出现的 1 个问题。",
        priority: highestRefundRate >= 0.15 ? "high" : "medium",
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

  if (allProducts.some((product) => productGrossProfit(product) === null)) {
    questions.push({
      question: "有没有商品成本、毛利或利润数据？",
      whyItMatters: "这样我才能判断是只卖得多，还是卖得多且真的赚钱。",
    });
  }

  if (allProducts.every((product) => !hasRefundData(product))) {
    questions.push({
      question: "有没有退款单数、退货数或退款金额？",
      whyItMatters: "这样我才能判断售后是不是把已经成交的订单吃回去。",
    });
  } else if (allProducts.some((product) => !hasRefundData(product))) {
    questions.push({
      question: "能否补齐缺少退款/退货数据的 SKU？",
      whyItMatters: "售后风险要按商品看，缺几款就容易漏掉真正拖利润的商品。",
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

function buildNextActions(
  findings: ProductFinding[],
  competitorInsights: string[],
  goal: string,
): NextAction[] {
  const actions: NextAction[] = [];
  const hasRevenueDrop = findings.some((finding) => finding.issue === "销售明显下滑");
  const hasInventoryRisk = findings.some((finding) => finding.issue === "卖得变快但库存偏紧");
  const hasWeakAds = findings.some((finding) => finding.issue === "广告回本偏弱");
  const hasWeakProfit = findings.some((finding) => finding.issue === "利润空间偏低");
  const hasRefundRisk = findings.some((finding) => finding.issue === "售后风险偏高");
  const hasCompetitorPromotion = competitorInsights.some((insight) => insight.includes("正在做促销"));
  const normalizedGoal = goal.toLowerCase();
  const wantsReturns = [
    "降低退款",
    "降低退货",
    "减少退款",
    "减少退货",
    "控制退款",
    "控制退货",
    "先看退款",
    "先看退货",
    "先查退款",
    "先查退货",
    "退款率",
    "退货率",
    "退款原因",
    "退货原因",
    "售后",
    "差评",
    "退单",
  ].some((keyword) => normalizedGoal.includes(keyword));
  const wantsProfit = ["利润", "毛利", "赚钱", "保利润"].some((keyword) =>
    normalizedGoal.includes(keyword),
  );
  const wantsSales = ["销量", "销售额", "增长", "保销量", "冲量"].some((keyword) =>
    normalizedGoal.includes(keyword),
  );

  if (wantsReturns) {
    actions.push({
      title: "先确认退款/退货口径",
      owner: "客服/运营",
      reason: "本周目标偏售后，先把退款单、退货单和退款金额口径确认清楚，避免把跨周期售后误判成商品突然变差。",
      firstStep: "补齐 SKU、订单数、销售额、退款/退货单数、退款金额和退款原因，先按 SKU 排出售后占比最高的商品。",
    });
  }

  if (wantsProfit) {
    actions.push({
      title: "先核对利润口径",
      owner: "店铺负责人",
      reason: "本周目标是保利润，不能只看销售额，需要先确认每个 SKU 到底留下多少钱。",
      firstStep: "补商品成本、运费、折扣、广告花费和毛利字段，让 Agent 把低利润订单单独标出来。",
    });
  }

  if (wantsSales && !hasRevenueDrop && !hasInventoryRisk) {
    actions.push({
      title: "先确认主推款还能不能承接销量",
      owner: "电商运营",
      reason: "本周目标是保销量，先确认主推款有流量、有库存、有清楚购买理由。",
      firstStep: "把主推 SKU 的访客数、库存、价格和优惠整理到同一张表。",
    });
  }

  if (hasRevenueDrop || hasCompetitorPromotion) {
    actions.push({
      title: "先处理主推款购买理由",
      owner: "电商运营",
      reason: "本周问题更像是用户进来后不够想买，价格、优惠和首屏卖点要先改。",
      firstStep: "把主推 SKU 的首图、价格、优惠和前三条卖点截图给 Agent 做二次检查。",
    });
  }

  if (hasRefundRisk && !wantsReturns) {
    actions.push({
      title: "先查退款/退货原因",
      owner: "客服/运营",
      reason: "售后问题会把已经成交的销售额吃回去，还会影响评价和后续转化。",
      firstStep: "导出高退款 SKU 的退款原因、差评关键词和物流异常，先按出现次数最多的问题改。",
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

  if (hasWeakProfit) {
    actions.push({
      title: "复核低毛利商品的成本结构",
      owner: "店铺负责人",
      reason: "低毛利商品继续放量，可能让销售额好看但利润承压。",
      firstStep: "把低毛利 SKU 的采购成本、运费、折扣和广告花费放到同一张表里核对。",
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
  const previousGrossMargin = grossMargin(previous);
  const currentGrossMargin = grossMargin(current);
  const previousRefundOrderRate = refundOrderRate(previous);
  const currentRefundOrderRate = refundOrderRate(current);
  const previousRefundAmountRate = refundAmountRate(previous);
  const currentRefundAmountRate = refundAmountRate(current);
  const grossProfitChangeRate =
    previous.grossProfit === null || current.grossProfit === null
      ? null
      : rateChange(previous.grossProfit, current.grossProfit);
  const grossMarginChange =
    previousGrossMargin === null || currentGrossMargin === null
      ? null
      : rateChange(previousGrossMargin, currentGrossMargin);
  const refundOrderRateChange =
    previousRefundOrderRate === null || currentRefundOrderRate === null
      ? null
      : rateChange(previousRefundOrderRate, currentRefundOrderRate);
  const refundAmountRateChange =
    previousRefundAmountRate === null || currentRefundAmountRate === null
      ? null
      : rateChange(previousRefundAmountRate, currentRefundAmountRate);
  const productFindings = buildProductFindings(input);
  const competitorInsights = buildCompetitorInsights(input);
  const nextActions = buildNextActions(productFindings, competitorInsights, input.store.goal);
  const direction = revenueChangeRate >= 0 ? "变好了" : "变差了";
  const headline = `${input.store.storeName} 本周整体${direction}：销售额${revenueChangeRate >= 0 ? "增长" : "下降"} ${formatPercent(revenueChangeRate)}`;
  const currentRefundParts = [
    currentRefundOrderRate === null
      ? null
      : `退款/退货单约占订单 ${(currentRefundOrderRate * 100).toFixed(1)}%`,
    currentRefundAmountRate === null
      ? null
      : `退款金额约占销售额 ${(currentRefundAmountRate * 100).toFixed(1)}%`,
  ].filter((line): line is string => line !== null);
  const refundTrend = [
    previousRefundOrderRate !== null && currentRefundOrderRate !== null
      ? `退款/退货单占比比上周${formatPointChange(previousRefundOrderRate, currentRefundOrderRate)}`
      : null,
    previousRefundAmountRate !== null && currentRefundAmountRate !== null
      ? `退款金额占比比上周${formatPointChange(previousRefundAmountRate, currentRefundAmountRate)}`
      : null,
  ]
    .filter((line): line is string => line !== null)
    .join("，");
  const refundSummary =
    currentRefundParts.length === 0
      ? "退款/退货数据缺失，我暂时不能判断售后是不是在侵蚀真实利润。"
      : [
          `退款/退货这块，本周${currentRefundParts.join("，")}。`,
          refundTrend ? `${refundTrend}。` : "等连续数据补齐后，我会继续判断售后风险有没有变严重。",
        ].join("");

  const plainSummary = [
    `这周一共卖了 ${formatMoney(current.revenue)}，订单数是 ${current.orders} 单。和上周相比，销售额${revenueChangeRate >= 0 ? "多了" : "少了"} ${formatPercent(revenueChangeRate)}，订单数${orderChangeRate >= 0 ? "多了" : "少了"} ${formatPercent(orderChangeRate)}。`,
    conversionRateChange === null
      ? "现在缺少完整流量数据，所以我还不能判断是没人进店，还是进店后没有下单。"
      : `进店后下单比例${conversionRateChange >= 0 ? "提高" : "下降"}了 ${formatPercent(conversionRateChange)}。这能帮助我们判断问题更靠近商品页、价格和促销，而不只是流量。`,
    adReturnChange === null
      ? "广告数据不完整，我不会强行判断广告好坏。"
      : `广告回本${adReturnChange >= 0 ? "变好" : "变差"}了 ${formatPercent(adReturnChange)}。简单说，每花 1 美元广告费，带回来的成交额变${adReturnChange >= 0 ? "多" : "少"}了。`,
    grossProfitChangeRate === null
      ? "成本或毛利数据不完整，所以我不会把“卖得多”直接说成“赚得多”。"
      : `毛利${grossProfitChangeRate >= 0 ? "增长" : "下降"}了 ${formatPercent(grossProfitChangeRate)}。这说明本周不只要看销售额，还要看每单留下多少钱。`,
    refundSummary,
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
      grossProfitChangeRate,
      grossMarginChange,
      refundOrderRateChange,
      refundAmountRateChange,
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
