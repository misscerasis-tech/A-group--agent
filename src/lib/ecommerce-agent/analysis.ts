import type {
  AgentQuestion,
  CustomerVoiceSignal,
  EcommerceAgentAnalysis,
  EcommerceAgentInput,
  MetricTotals,
  NextAction,
  OperationalTask,
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

function sumOptionalCost(values: Array<number | null | undefined>) {
  if (values.some((value) => value === undefined || value === null)) {
    return null;
  }

  return values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

function productExtraCost(product: ProductMetric) {
  return (
    (product.platformFee ?? 0) +
    (product.paymentFee ?? 0) +
    (product.fulfillmentCost ?? 0) +
    (product.otherCost ?? 0)
  );
}

function hasExtraCostData(product: ProductMetric) {
  return (
    product.platformFee !== undefined ||
    product.paymentFee !== undefined ||
    product.fulfillmentCost !== undefined ||
    product.otherCost !== undefined
  );
}

function productGrossProfit(product: ProductMetric) {
  if (product.grossProfit !== undefined && product.grossProfit !== null) {
    return product.grossProfit;
  }

  if (product.productCost !== undefined && product.productCost !== null) {
    return product.revenue - product.productCost - productExtraCost(product);
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
    platformFee: sumOptionalCost(metricSet.products.map((product) => product.platformFee)),
    paymentFee: sumOptionalCost(metricSet.products.map((product) => product.paymentFee)),
    fulfillmentCost: sumOptionalCost(metricSet.products.map((product) => product.fulfillmentCost)),
    otherCost: sumOptionalCost(metricSet.products.map((product) => product.otherCost)),
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

function averageOrderValue(totals: MetricTotals) {
  if (totals.orders === 0) {
    return null;
  }

  return totals.revenue / totals.orders;
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
  return value.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
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

function productAverageOrderValue(product: ProductMetric) {
  if (product.orders === 0) {
    return null;
  }

  return product.revenue / product.orders;
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

function refundReasonParts(product: ProductMetric) {
  return (product.refundReason ?? "")
    .split(/[\/|;；、,，\n]/)
    .map((reason) => reason.trim())
    .filter(Boolean);
}

function describeRefundReason(product: ProductMetric) {
  const reasons = refundReasonParts(product).slice(0, 3);

  if (reasons.length === 0) {
    return null;
  }

  return reasons.join("、");
}

function getCustomerVoicesForProduct(
  customerVoices: CustomerVoiceSignal[],
  product: ProductMetric,
) {
  const normalizedSku = product.sku.trim().toLowerCase();
  const normalizedName = product.productName.trim().toLowerCase();

  return customerVoices.filter((voice) => {
    const voiceSku = voice.sku?.trim().toLowerCase();
    const voiceName = voice.productName.trim().toLowerCase();

    return voiceSku === normalizedSku || voiceName === normalizedName;
  });
}

function describeCustomerVoice(voices: CustomerVoiceSignal[]) {
  const negativeVoices = voices
    .filter((voice) => voice.sentiment !== "positive")
    .sort((a, b) => b.count - a.count);
  const themes = negativeVoices
    .flatMap((voice) => [voice.theme, voice.text])
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);

  if (themes.length === 0) {
    return null;
  }

  return [...new Set(themes)].join("、");
}

function firstCustomerVoiceTheme(voices: CustomerVoiceSignal[]) {
  return voices
    .filter((voice) => voice.sentiment !== "positive")
    .sort((a, b) => b.count - a.count)[0]?.theme;
}

function shouldAskForGoalPriority(goal: string) {
  const normalizedGoal = goal.trim().toLowerCase();

  if (!normalizedGoal || ["不知道", "待确认", "不确定"].some((keyword) => normalizedGoal.includes(keyword))) {
    return true;
  }

  if (["同时看", "都要看", "全部", "所有", "综合"].some((keyword) => normalizedGoal.includes(keyword))) {
    return true;
  }

  return ![
    "销量",
    "销售",
    "订单",
    "利润",
    "毛利",
    "赚钱",
    "广告",
    "投放",
    "库存",
    "断货",
    "退款",
    "退货",
    "售后",
    "差评",
    "竞品",
    "价格",
    "转化",
    "客单",
  ].some((keyword) => normalizedGoal.includes(keyword));
}

function buildDataHealth(input: EcommerceAgentInput) {
  const health: string[] = [];
  const allProducts = [...input.previousWeek.products, ...input.currentWeek.products];
  const customerVoices = input.customerVoices ?? [];

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

  if (allProducts.some(hasExtraCostData)) {
    health.push("已读取平台佣金、支付手续费、履约费或其他可变成本，会在没有明确毛利时折进利润判断。");
  }

  const refundDataRows = allProducts.filter(hasRefundData).length;

  if (refundDataRows === 0) {
    health.push("还没有退款/退货数据，暂时不能判断售后是否在吃掉销售和利润。");
  } else if (refundDataRows < allProducts.length) {
    health.push("退款/退货数据只覆盖部分 SKU，售后风险判断会先作为提示项。");
  } else {
    health.push("已有退款/退货数据，可以判断售后、描述或物流问题是否拖累真实利润。");
  }

  if (allProducts.some((product) => refundReasonParts(product).length > 0)) {
    health.push("已有退款/退货原因，可以把售后风险直接落到商品描述、质量、物流或预期管理上。");
  } else if (customerVoices.length > 0) {
    health.push(`已读取 ${customerVoices.length} 条用户声音，可以用客服备注、评价或售后文本辅助判断用户为什么不满意。`);
  } else if (refundDataRows > 0) {
    health.push("还没有退款/退货原因；能判断售后占比，但还不能直接知道用户为什么退。");
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
  const customerVoices = input.customerVoices ?? [];

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
    const previousProductAverageOrderValue = productAverageOrderValue(previousProduct);
    const currentProductAverageOrderValue = productAverageOrderValue(currentProduct);
    const averageOrderValueChange =
      previousProductAverageOrderValue === null || currentProductAverageOrderValue === null
        ? null
        : rateChange(previousProductAverageOrderValue, currentProductAverageOrderValue);
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

    if (averageOrderValueChange !== null && averageOrderValueChange < -0.08 && orderChange > -0.05) {
      findings.push({
        sku: currentProduct.sku,
        productName: currentProduct.productName,
        issue: "客单价下降",
        plainReason: `这款商品订单数没有明显减少，但每单平均金额从 ${formatMoney(previousProductAverageOrderValue!)} 降到 ${formatMoney(currentProductAverageOrderValue!)}。销售额变差可能是折扣太重、套装少了，或用户只买低价规格。`,
        suggestedAction: "检查本周优惠券、包邮门槛、套装组合和规格销量占比，先把能提高每单金额的组合放回首屏。",
        priority: "medium",
      });
    }

    if (highestRefundRate >= 0.08) {
      const refundReason = describeRefundReason(currentProduct);
      const voiceReasons = refundReason
        ? null
        : describeCustomerVoice(getCustomerVoicesForProduct(customerVoices, currentProduct));
      const firstVoiceTheme = firstCustomerVoiceTheme(
        getCustomerVoicesForProduct(customerVoices, currentProduct),
      );
      findings.push({
        sku: currentProduct.sku,
        productName: currentProduct.productName,
        issue: "售后风险偏高",
        plainReason: refundReason
          ? `${describeRefundRisk(currentProduct)}。你给到的主要退款/退货原因是：${refundReason}。`
          : voiceReasons
            ? `${describeRefundRisk(currentProduct)}。用户声音里反复出现：${voiceReasons}。`
            : `${describeRefundRisk(currentProduct)}。这说明部分成交被退款或退货吃回去，需要检查商品描述、质量、物流或售后承诺是否让用户失望。`,
        suggestedAction: refundReason
          ? `先围绕「${refundReasonParts(currentProduct)[0]}」检查商品页说明、发货质检、物流承诺和客服话术。`
          : firstVoiceTheme
            ? `先围绕「${firstVoiceTheme}」检查商品页说明、发货质检、物流承诺和客服话术。`
            : "导出这款 SKU 的退款原因、差评关键词和物流异常记录，先改最常出现的 1 个问题。",
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
        plainReason: `这款商品广告每花 1 个金额单位，大约带回 ${productAdReturn.toFixed(2)} 个金额单位的成交额，当前不适合继续盲目加预算。`,
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
    (competitor) => hasActionableCompetitorPrice(competitor) && competitor.price < averageOwnPrice * 0.95,
  );
  const promotedCompetitors = input.competitors.filter(
    (competitor) => hasActionableCompetitorPrice(competitor) && hasActiveCompetitorPromotion(competitor),
  );
  const priceLimitedCompetitors = input.competitors.filter(
    (competitor) => competitor.price > 0 && !hasActionableCompetitorPrice(competitor),
  );

  const insights: string[] = [];

  if (cheaperCompetitors.length > 0) {
    insights.push(
      `${cheaperCompetitors.map((competitor) => competitor.name).join("、")} 的价格比我们低。用户比价时，我们需要用限时优惠、套装价值或赠品解释为什么值得买。`,
    );
  } else {
    insights.push("竞品价格没有明显压过我们，本周不需要急着全面降价。");
  }

  if (priceLimitedCompetitors.length > 0) {
    insights.push(
      `${priceLimitedCompetitors.map((competitor) => competitor.name).join("、")} 的价格备注提示可能不是当前可购买价，我只把它当观察线索，不作为主动降价依据。`,
    );
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

  insights.push(buildCompetitorEvidenceInsight(input));

  return insights;
}

function hasActionableCompetitorPrice(competitor: EcommerceAgentInput["competitors"][number]) {
  if (!Number.isFinite(competitor.price) || competitor.price <= 0) {
    return false;
  }

  const note = `${competitor.priceNote} ${competitor.promotion}`.toLowerCase();
  const nonActionableSignals = [
    "无 featured offer",
    "没有 featured offer",
    "no featured offer",
    "currently unavailable",
    "unavailable",
    "out of stock",
    "无库存",
    "缺货",
    "售罄",
    "下架",
    "历史价",
    "仅用于价格带",
    "不作为主动调价",
    "低价替代演示价",
  ];

  return !nonActionableSignals.some((signal) => note.includes(signal));
}

function hasActiveCompetitorPromotion(competitor: EcommerceAgentInput["competitors"][number]) {
  const promotion = competitor.promotion.trim().toLowerCase();

  if (
    promotion.length === 0 ||
    ["无", "none", "n/a", "na", "-", "无明显促销", "无促销", "未发现明显促销"].includes(promotion)
  ) {
    return false;
  }

  const promotionSignals = [
    "促销",
    "折扣",
    "优惠",
    "券",
    "满减",
    "立减",
    "赠品",
    "买一",
    "sale",
    "discount",
    "coupon",
    "offer",
    "code",
    "deal",
  ];

  return promotionSignals.some((signal) => promotion.includes(signal));
}

function buildCompetitorEvidenceInsight(input: EcommerceAgentInput) {
  const observedDates = [...new Set(input.competitors.map((competitor) => competitor.observedAt).filter(Boolean))];
  const sources = [...new Set(input.competitors.map((competitor) => competitor.source).filter(Boolean))];
  const competitorsWithPriceNotes = input.competitors.filter(
    (competitor) => competitor.priceNote.trim().length > 0,
  ).length;

  const dateText =
    observedDates.length === 0
      ? "未标注观察日期"
      : observedDates.length === 1
        ? `观察日期 ${observedDates[0]}`
        : `观察日期覆盖 ${observedDates.join("、")}`;
  const sourceText =
    sources.length === 0
      ? "来源未标注"
      : `来源包括 ${sources.slice(0, 3).join("、")}${sources.length > 3 ? `等 ${sources.length} 类` : ""}`;
  const noteText = competitorsWithPriceNotes > 0 ? `，其中 ${competitorsWithPriceNotes} 个价格带有备注` : "";

  return `竞品价格是人工整理的观察快照，不是实时价格；${dateText}，${sourceText}${noteText}。真正改价或跟促销前，先打开原链接复核。`;
}

function buildQuestions(input: EcommerceAgentInput): AgentQuestion[] {
  const questions: AgentQuestion[] = [];
  const allProducts = [...input.previousWeek.products, ...input.currentWeek.products];
  const customerVoices = input.customerVoices ?? [];

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
  } else if (
    allProducts.every((product) => refundReasonParts(product).length === 0) &&
    customerVoices.length === 0
  ) {
    questions.push({
      question: "能否补退款/退货原因、客服备注或差评关键词？",
      whyItMatters: "这样我才能告诉你该先改商品描述、质量、物流，还是客服承诺。",
    });
  }

  if (input.competitors.length === 0) {
    questions.push({
      question: "有没有 1 到 3 个你最在意的竞品链接？",
      whyItMatters: "这样我可以判断竞品是不是在降价、促销或换卖点。",
    });
  }

  if (shouldAskForGoalPriority(input.store.goal)) {
    questions.push({
      question: "这周你更想保销量，还是更想保利润？",
      whyItMatters: "如果目标不同，我给出的降价、广告和补货建议会不一样。",
    });
  }

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
  const hasAverageOrderValueDrop = findings.some((finding) => finding.issue === "客单价下降");
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

  if (hasAverageOrderValueDrop) {
    actions.push({
      title: "检查折扣和套装结构",
      owner: "电商运营",
      reason: "订单没有明显少，但每单金额下降，问题可能在优惠、套装、包邮门槛或低价规格占比。",
      firstStep: "对比上周和本周的优惠券、包邮门槛、套装曝光位置，以及低价/高价规格销量占比。",
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

function taskPriority(action: NextAction): OperationalTask["priority"] {
  if (
    [
      "先确认退款/退货口径",
      "先处理主推款购买理由",
      "先查退款/退货原因",
      "暂停最弱广告，保留能成交的投放",
      "检查礼盒套装补货或控量",
    ].includes(action.title)
  ) {
    return "high";
  }

  if (action.title === "建立下周复盘节奏") {
    return "low";
  }

  return "medium";
}

function taskDueLabel(priority: OperationalTask["priority"]) {
  if (priority === "high") {
    return "24 小时内";
  }

  if (priority === "medium") {
    return "3 天内";
  }

  return "下周一前";
}

function taskAcceptanceCriteria(action: NextAction) {
  if (action.title.includes("退款/退货")) {
    return "已按 SKU 排出退款/退货占比最高的商品，并确认第一条要处理的售后原因。";
  }

  if (action.title.includes("广告")) {
    return "已列出花费高但成交弱的广告组，并标记保留、暂停或继续观察。";
  }

  if (action.title.includes("库存") || action.title.includes("补货") || action.title.includes("控量")) {
    return "已确认补货周期；对 7 天内可能断货的 SKU 给出补货或控量动作。";
  }

  if (action.title.includes("利润") || action.title.includes("毛利") || action.title.includes("成本")) {
    return "已补齐主推 SKU 的成本、折扣、广告花费和毛利口径，并标出低利润 SKU。";
  }

  if (action.title.includes("折扣") || action.title.includes("套装")) {
    return "已对比上周和本周优惠、套装、包邮门槛，并决定先恢复或调整的组合。";
  }

  if (action.title.includes("购买理由") || action.title.includes("主推款")) {
    return "已完成主推 SKU 的首图、价格、优惠和前三条卖点检查，并确定一处首屏改动。";
  }

  if (action.title.includes("复盘节奏")) {
    return "已确定每周复盘时间、负责人和结果接收位置。";
  }

  return "负责人已完成第一步，并把结果发回飞书或周报。";
}

function buildOperationalTasks(actions: NextAction[]): OperationalTask[] {
  return actions.map((action, index) => {
    const priority = taskPriority(action);

    return {
      id: `task-${index + 1}`,
      title: action.title,
      owner: action.owner,
      priority,
      dueLabel: taskDueLabel(priority),
      reason: action.reason,
      firstStep: action.firstStep,
      acceptanceCriteria: taskAcceptanceCriteria(action),
    };
  });
}

export function analyzeEcommerceStore(input: EcommerceAgentInput): EcommerceAgentAnalysis {
  const previous = toTotals(input.previousWeek);
  const current = toTotals(input.currentWeek);
  const revenueChangeRate = rateChange(previous.revenue, current.revenue);
  const orderChangeRate = rateChange(previous.orders, current.orders);
  const previousAverageOrderValue = averageOrderValue(previous);
  const currentAverageOrderValue = averageOrderValue(current);
  const averageOrderValueChange =
    previousAverageOrderValue === null || currentAverageOrderValue === null
      ? null
      : rateChange(previousAverageOrderValue, currentAverageOrderValue);
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
  const operationalTasks = buildOperationalTasks(nextActions);
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
    averageOrderValueChange === null
      ? "本周或上周订单数为 0，所以我暂时不判断客单价。"
      : `客单价${averageOrderValueChange >= 0 ? "提高" : "下降"}了 ${formatPercent(averageOrderValueChange)}。简单说，本周每个订单平均买 ${formatMoney(currentAverageOrderValue!)}，要看用户是买少了，还是只买低价款。`,
    conversionRateChange === null
      ? "现在缺少完整流量数据，所以我还不能判断是没人进店，还是进店后没有下单。"
      : `进店后下单比例${conversionRateChange >= 0 ? "提高" : "下降"}了 ${formatPercent(conversionRateChange)}。这能帮助我们判断问题更靠近商品页、价格和促销，而不只是流量。`,
    adReturnChange === null
      ? "广告数据不完整，我不会强行判断广告好坏。"
      : `广告回本${adReturnChange >= 0 ? "变好" : "变差"}了 ${formatPercent(adReturnChange)}。简单说，每花 1 个金额单位广告费，带回来的成交额变${adReturnChange >= 0 ? "多" : "少"}了。`,
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
      averageOrderValueChange,
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
    operationalTasks,
    feishuReply: [
      headline,
      `我建议下周先做 ${operationalTasks.length} 件事：${operationalTasks.map((task) => `${task.title}（${task.owner}，${task.dueLabel}）`).join("、")}。`,
      "我已经把完整复盘、风险商品和待办清单整理好，可以同步到飞书文档并创建负责人待办。",
    ].join("\n"),
  };
}
