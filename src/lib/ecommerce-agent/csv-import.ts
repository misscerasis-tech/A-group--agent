import type {
  CompetitorSignal,
  EcommerceAgentInput,
  ProductMetric,
  StoreProfile,
  WeeklyMetricSet,
} from "./types";

export type ImportIssueSeverity = "info" | "warning" | "error";

export type ImportIssue = {
  severity: ImportIssueSeverity;
  message: string;
  rowNumber?: number;
};

export type FieldMapping = {
  canonicalField: string;
  label: string;
  sourceHeader?: string;
  required: boolean;
};

export type EcommerceCsvImportReport = {
  ok: boolean;
  metricsRows: number;
  competitorRows: number;
  fieldMappings: FieldMapping[];
  issues: ImportIssue[];
  questionsForUser: string[];
};

export type EcommerceCsvImportResult = {
  report: EcommerceCsvImportReport;
  input?: EcommerceAgentInput;
};

type CsvTable = {
  headers: string[];
  rows: Array<Record<string, string>>;
  delimiter: string;
};

type MetricSourceRow = {
  row: Record<string, string>;
  rowNumber: number;
};

type MetricField =
  | "week"
  | "startDate"
  | "endDate"
  | "productName"
  | "sku"
  | "visitors"
  | "conversionRate"
  | "orders"
  | "revenue"
  | "unitsSold"
  | "adSpend"
  | "adRevenue"
  | "adReturn"
  | "inventory"
  | "productCost"
  | "grossProfit"
  | "grossMarginRate"
  | "refundOrders"
  | "refundAmount"
  | "refundOrderRate"
  | "refundAmountRate"
  | "refundReason";

type CompetitorField =
  | "name"
  | "url"
  | "source"
  | "observedAt"
  | "price"
  | "priceNote"
  | "promotion"
  | "rating"
  | "reviews"
  | "keySellingPoints";

const defaultStore: StoreProfile = {
  storeName: "待导入店铺",
  platform: "待确认平台",
  market: "待确认市场",
  category: "待确认类目",
  goal: "同时看销量、利润、广告回本、库存风险、退款/退货和竞品压力",
  userLevel: "beginner",
};

function cleanStoreOverride(store?: Partial<StoreProfile>) {
  return Object.fromEntries(
    Object.entries(store ?? {}).filter(([, value]) =>
      typeof value === "string" ? value.trim().length > 0 : value !== undefined,
    ),
  ) as Partial<StoreProfile>;
}

const metricFieldLabels: Record<MetricField, string> = {
  week: "数据周期",
  startDate: "开始日期",
  endDate: "结束日期",
  productName: "商品名称",
  sku: "SKU",
  visitors: "访客数",
  conversionRate: "转化率",
  orders: "订单数",
  revenue: "销售额",
  unitsSold: "销量",
  adSpend: "广告花费",
  adRevenue: "广告成交额",
  adReturn: "广告回本/ROAS",
  inventory: "库存",
  productCost: "商品成本",
  grossProfit: "毛利",
  grossMarginRate: "毛利率",
  refundOrders: "退款/退货单数",
  refundAmount: "退款金额",
  refundOrderRate: "退款/退货单率",
  refundAmountRate: "退款金额占比",
  refundReason: "退款/退货原因",
};

const metricRequiredFields = new Set<MetricField>([
  "week",
  "productName",
  "orders",
  "revenue",
  "unitsSold",
]);

const metricAliases: Record<MetricField, string[]> = {
  week: [
    "week",
    "period",
    "label",
    "date",
    "start_date",
    "startdate",
    "date_period",
    "time_period",
    "数据周期",
    "周期",
    "周",
    "日期",
    "开始日期",
    "起始日期",
    "统计开始日期",
    "时间段",
  ],
  startDate: ["start_date", "startdate", "start", "开始日期", "起始日期", "统计开始日期"],
  endDate: ["end_date", "enddate", "end", "结束日期", "统计结束日期"],
  productName: [
    "product_name",
    "product",
    "product_title",
    "title",
    "name",
    "item_name",
    "商品名称",
    "商品",
    "产品名称",
    "品名",
    "标题",
  ],
  sku: ["sku", "skuid", "seller_sku", "商家编码", "商品编码", "货号", "规格编码"],
  visitors: [
    "visitors",
    "visitor",
    "sessions",
    "traffic",
    "uv",
    "page_views",
    "访客",
    "访客数",
    "访客人数",
    "商品访客数",
    "商品访客",
    "页面访客数",
    "浏览人数",
    "流量",
    "进店人数",
  ],
  conversionRate: [
    "conversion_rate",
    "conversionrate",
    "cvr",
    "转化率",
    "支付转化率",
    "成交转化率",
    "下单转化率",
    "商品转化率",
    "进店转化率",
  ],
  orders: [
    "orders",
    "order_count",
    "paid_orders",
    "paid_buyers",
    "buyers",
    "订单",
    "订单数",
    "成交订单",
    "成交订单数",
    "支付订单数",
    "付款订单数",
    "支付买家数",
    "成交买家数",
    "下单买家数",
  ],
  revenue: [
    "revenue",
    "sales",
    "gmv",
    "amount",
    "sales_amount",
    "paid_amount",
    "order_amount",
    "销售额",
    "成交额",
    "营业额",
    "销售金额",
    "支付金额",
    "付款金额",
    "订单金额",
    "商品支付金额",
  ],
  unitsSold: [
    "units_sold",
    "quantity",
    "qty",
    "items_sold",
    "paid_quantity",
    "销量",
    "件数",
    "售出件数",
    "销售件数",
    "支付件数",
    "支付商品件数",
    "成交件数",
    "销售数量",
  ],
  adSpend: [
    "ad_spend",
    "ad_cost",
    "adcost",
    "cost",
    "spend",
    "广告费",
    "广告花费",
    "广告消耗",
    "投放花费",
    "消耗",
    "花费",
    "广告成本",
  ],
  adRevenue: [
    "ad_revenue",
    "ad_sales",
    "attributed_sales",
    "ads_sales",
    "attributed_revenue",
    "广告成交额",
    "广告销售额",
    "广告带来销售",
    "投放成交额",
    "直接成交金额",
    "投产金额",
  ],
  adReturn: [
    "roas",
    "roi",
    "ad_return",
    "adreturn",
    "ad_roas",
    "acos_inverse",
    "投产比",
    "广告投产比",
    "广告回本",
    "广告roi",
    "广告roas",
    "投入产出比",
  ],
  inventory: ["inventory", "stock", "available_stock", "sellable_stock", "库存", "当前库存", "可售库存", "库存数", "可售件数"],
  productCost: ["product_cost", "cogs", "cost_of_goods", "cost_amount", "商品成本", "采购成本", "成本金额"],
  grossProfit: ["gross_profit", "grossprofit", "profit", "margin_amount", "毛利", "毛利润", "利润", "毛利额"],
  grossMarginRate: [
    "gross_margin",
    "gross_margin_rate",
    "grossmargin",
    "grossmarginrate",
    "profit_margin",
    "margin_rate",
    "毛利率",
    "利润率",
  ],
  refundOrders: [
    "refund_orders",
    "refundorders",
    "refund_count",
    "refunds",
    "returns",
    "return_count",
    "return_orders",
    "refund_quantity",
    "退款单数",
    "退款订单数",
    "退款数",
    "退款成功单数",
    "退货单数",
    "退货订单数",
    "退货数",
    "售后单数",
  ],
  refundAmount: [
    "refund_amount",
    "refundamount",
    "refunded_amount",
    "refund_revenue",
    "refund_sales",
    "returns_amount",
    "return_amount",
    "退款金额",
    "退款额",
    "退款成功金额",
    "售后退款金额",
    "退货金额",
    "售后金额",
  ],
  refundOrderRate: [
    "refund_rate",
    "refundrate",
    "return_rate",
    "returnrate",
    "refund_order_rate",
    "return_order_rate",
    "退款率",
    "退货率",
    "退款单率",
    "退货单率",
    "售后率",
  ],
  refundAmountRate: [
    "refund_amount_rate",
    "refundamountrate",
    "refund_revenue_rate",
    "return_amount_rate",
    "退款金额占比",
    "退款额占比",
    "退款金额率",
    "售后金额占比",
  ],
  refundReason: [
    "refund_reason",
    "refundreason",
    "return_reason",
    "returnreason",
    "after_sale_reason",
    "aftersalereason",
    "售后原因",
    "退款原因",
    "退货原因",
    "退款退货原因",
    "退款/退货原因",
    "原因",
    "问题原因",
    "差评原因",
  ],
};

const competitorAliases: Record<CompetitorField, string[]> = {
  name: ["name", "competitor", "competitor_name", "竞品名称", "竞品", "商品名称"],
  url: ["url", "link", "product_url", "链接", "商品链接", "竞品链接"],
  source: ["source", "platform", "来源", "平台"],
  observedAt: ["observed_at", "observed", "date", "抓取日期", "观察日期", "记录日期"],
  price: ["price", "current_price", "售价", "价格", "当前价格"],
  priceNote: ["price_note", "note", "价格备注", "备注"],
  promotion: ["promotion", "promo", "discount", "促销", "优惠", "活动"],
  rating: ["rating", "score", "评分", "星级"],
  reviews: ["reviews", "review_count", "评论数", "评价数"],
  keySellingPoints: ["key_selling_points", "selling_points", "卖点", "核心卖点", "关键词"],
};

function normalizeHeader(header: string) {
  return header
    .trim()
    .toLowerCase()
    .replace(/^\uFEFF/, "")
    .replace(/[()（）\[\]【】]/g, "")
    .replace(/[\s_\-./:：]+/g, "");
}

function normalizeAlias(alias: string) {
  return normalizeHeader(alias);
}

function splitDelimitedLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());

  if (delimiter === "|" && cells[0] === "" && cells[cells.length - 1] === "") {
    return cells.slice(1, -1);
  }

  return cells;
}

function countDelimitedCells(line: string, delimiter: string) {
  return splitDelimitedLine(line, delimiter).length;
}

function detectDelimiter(lines: string[]) {
  const candidates = [",", "\t", ";", "|"];
  const scoredCandidates = candidates.map((delimiter) => {
    const counts = lines.slice(0, 5).map((line) => countDelimitedCells(line, delimiter));
    const usableCounts = counts.filter((count) => count > 1);
    const consistency = new Set(usableCounts).size <= 1 ? 1 : 0;
    const averageCells =
      usableCounts.reduce((sum, count) => sum + count, 0) / Math.max(usableCounts.length, 1);

    return {
      delimiter,
      score: usableCounts.length * 10 + averageCells + consistency,
    };
  });

  return scoredCandidates.sort((a, b) => b.score - a.score)[0]?.delimiter ?? ",";
}

function isMarkdownTableSeparator(line: string, delimiter: string) {
  if (delimiter !== "|") {
    return false;
  }

  const cells = splitDelimitedLine(line, delimiter);

  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

export function parseCsv(text: string): CsvTable {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { headers: [], rows: [], delimiter: "," };
  }

  const delimiter = detectDelimiter(lines);
  const readableLines = lines.filter((line, index) => index === 0 || !isMarkdownTableSeparator(line, delimiter));
  const headers = splitDelimitedLine(readableLines[0], delimiter).map((header) => header.replace(/^\uFEFF/, ""));
  const rows = readableLines.slice(1).map((line) => {
    const cells = splitDelimitedLine(line, delimiter);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });

  return { headers, rows, delimiter };
}

function buildHeaderMap<TField extends string>(
  headers: string[],
  aliases: Record<TField, string[]>,
  requiredFields: Set<TField>,
  labels: Record<TField, string>,
) {
  const normalizedHeaders = new Map(headers.map((header) => [normalizeHeader(header), header]));
  const mapping = new Map<TField, string>();
  const fieldMappings: FieldMapping[] = [];

  for (const field of Object.keys(aliases) as TField[]) {
    const sourceHeader = aliases[field]
      .map(normalizeAlias)
      .map((alias) => normalizedHeaders.get(alias))
      .find(Boolean);

    if (sourceHeader) {
      mapping.set(field, sourceHeader);
    }

    if (sourceHeader || requiredFields.has(field)) {
      fieldMappings.push({
        canonicalField: field,
        label: labels[field],
        sourceHeader,
        required: requiredFields.has(field),
      });
    }
  }

  return { mapping, fieldMappings };
}

function readField<TField extends string>(
  row: Record<string, string>,
  mapping: Map<TField, string>,
  field: TField,
) {
  const sourceHeader = mapping.get(field);
  return sourceHeader ? row[sourceHeader]?.trim() ?? "" : "";
}

function parseNumber(value: string) {
  const cleaned = value
    .trim()
    .replace(/,/g, "")
    .replace(/[$￥¥,%\s]/g, "")
    .replace(/人民币|美元|美金/g, "");

  if (!cleaned || ["-", "--", "—", "暂无", "无"].includes(cleaned)) {
    return null;
  }

  const unitMatch = cleaned.match(
    /^([-+]?\d+(?:\.\d+)?)(万|w|W|千|k|K)?(?:元|件|单|个|笔|次|人|条)?$/,
  );

  if (unitMatch) {
    const parsed = Number(unitMatch[1]);
    const multiplier = ["万", "w", "W"].includes(unitMatch[2])
      ? 10000
      : ["千", "k", "K"].includes(unitMatch[2])
        ? 1000
        : 1;

    return Number.isFinite(parsed) ? parsed * multiplier : null;
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseRatio(value: string, options: { percentageWhenAboveOne: boolean }) {
  const trimmed = value.trim();

  if (!trimmed || ["-", "--", "—", "暂无", "无"].includes(trimmed)) {
    return null;
  }

  const hasPercentSign = /[%％]/.test(trimmed);
  const cleaned = trimmed
    .replace(/,/g, "")
    .replace(/[％%\s]/g, "")
    .replace(/[倍xX]/g, "");
  const parsed = Number(cleaned);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  if (hasPercentSign) {
    return parsed / 100;
  }

  if (options.percentageWhenAboveOne && parsed > 1 && parsed <= 100) {
    return parsed / 100;
  }

  return parsed;
}

function optionalPercentRate(value: string) {
  return parseRatio(value, { percentageWhenAboveOne: true });
}

function optionalMultiplier(value: string) {
  return parseRatio(value, { percentageWhenAboveOne: false });
}

function roundMetric(value: number) {
  return Number(value.toFixed(2));
}

function requiredNumber(value: string, fieldLabel: string, issues: ImportIssue[], rowNumber: number) {
  const parsed = parseNumber(value);

  if (parsed === null) {
    issues.push({
      severity: "error",
      rowNumber,
      message: `缺少或无法识别「${fieldLabel}」，这行数据暂时不能参与分析。`,
    });
    return null;
  }

  return parsed;
}

function requireNonNegative(
  value: number | null,
  fieldLabel: string,
  issues: ImportIssue[],
  rowNumber: number,
) {
  if (value !== null && value < 0) {
    issues.push({
      severity: "error",
      rowNumber,
      message: `「${fieldLabel}」不能为负数，请检查导出数据。`,
    });
    return null;
  }

  return value;
}

function optionalNumber(
  value: string,
  fieldLabel?: string,
  issues?: ImportIssue[],
  rowNumber?: number,
  options: { allowNegative?: boolean } = {},
) {
  const parsed = parseNumber(value);

  if (
    parsed !== null &&
    parsed < 0 &&
    !options.allowNegative &&
    fieldLabel &&
    issues &&
    rowNumber
  ) {
    issues.push({
      severity: "error",
      rowNumber,
      message: `「${fieldLabel}」不能为负数，请检查导出数据。`,
    });
    return null;
  }

  return parsed;
}

function normalizeWeek(value: string) {
  const normalized = value.trim().toLowerCase();

  if (["previous", "last", "last_week", "past", "before", "上周", "上一周", "前一周"].includes(normalized)) {
    return "previous" as const;
  }

  if (["current", "this", "this_week", "now", "本周", "这周", "当前"].includes(normalized)) {
    return "current" as const;
  }

  return value.trim();
}

function periodSortValue(value: string) {
  const trimmed = value.trim();
  const normalized = trimmed.toLowerCase();
  const isoWeek = normalized.match(/^(\d{4})[-_/]?(?:w|week)[-_/]?(\d{1,2})$/);

  if (isoWeek) {
    return Number(isoWeek[1]) * 100 + Number(isoWeek[2]);
  }

  const dateLike = normalized.match(/\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/);

  if (dateLike) {
    const parsed = Date.parse(dateLike[0].replace(/[/.]/g, "-"));

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return trimmed;
}

function comparePeriods(a: string, b: string) {
  const aValue = periodSortValue(a);
  const bValue = periodSortValue(b);

  if (typeof aValue === "number" && typeof bValue === "number") {
    return aValue - bValue;
  }

  return String(aValue).localeCompare(String(bValue), "zh-Hans-CN", {
    numeric: true,
    sensitivity: "base",
  });
}

function inferTwoPeriods(
  rows: Array<Record<string, string>>,
  mapping: Map<MetricField, string>,
  issues: ImportIssue[],
) {
  const weekHeader = mapping.get("week");

  if (!weekHeader) {
    return null;
  }

  const uniqueWeeks = [...new Set(rows.map((row) => readField(row, mapping, "week")).filter(Boolean))];

  if (uniqueWeeks.length < 2) {
    return null;
  }

  const sortedWeeks = uniqueWeeks.sort(comparePeriods);
  const [previous, current] = sortedWeeks.slice(-2);

  if (uniqueWeeks.length > 2) {
    issues.push({
      severity: "info",
      message: `识别到 ${uniqueWeeks.length} 个周期，已自动选择最近两期：${previous} 作为上周，${current} 作为本周。`,
    });
  }

  return {
    previous,
    current,
  };
}

function buildMetricRow(
  row: Record<string, string>,
  mapping: Map<MetricField, string>,
  issues: ImportIssue[],
  rowNumber: number,
): ProductMetric | null {
  const productName = readField(row, mapping, "productName");
  const sku = readField(row, mapping, "sku");

  if (!productName && !sku) {
    issues.push({
      severity: "error",
      rowNumber,
      message: "缺少商品名称或 SKU，Agent 无法知道这一行是哪款商品。",
    });
    return null;
  }

  if (!sku) {
    issues.push({
      severity: "warning",
      rowNumber,
      message: `缺少 SKU，已临时用商品名称「${productName}」做跨周匹配。真实使用建议补 SKU。`,
    });
  }

  const orders = requireNonNegative(
    requiredNumber(readField(row, mapping, "orders"), metricFieldLabels.orders, issues, rowNumber),
    metricFieldLabels.orders,
    issues,
    rowNumber,
  );
  const revenue = requireNonNegative(
    requiredNumber(readField(row, mapping, "revenue"), metricFieldLabels.revenue, issues, rowNumber),
    metricFieldLabels.revenue,
    issues,
    rowNumber,
  );
  const unitsSold = requireNonNegative(
    requiredNumber(readField(row, mapping, "unitsSold"), metricFieldLabels.unitsSold, issues, rowNumber),
    metricFieldLabels.unitsSold,
    issues,
    rowNumber,
  );

  if (orders === null || revenue === null || unitsSold === null) {
    return null;
  }

  let visitors = optionalNumber(readField(row, mapping, "visitors"), metricFieldLabels.visitors, issues, rowNumber);
  const conversionRate = optionalPercentRate(readField(row, mapping, "conversionRate"));

  if (visitors === null && conversionRate !== null && conversionRate > 0) {
    visitors = roundMetric(orders / conversionRate);
  }

  let adSpend = optionalNumber(readField(row, mapping, "adSpend"), metricFieldLabels.adSpend, issues, rowNumber);
  let adRevenue = optionalNumber(readField(row, mapping, "adRevenue"), metricFieldLabels.adRevenue, issues, rowNumber);
  const adReturn = optionalMultiplier(readField(row, mapping, "adReturn"));

  if (adReturn !== null && adReturn > 0) {
    if (adRevenue === null && adSpend !== null) {
      adRevenue = roundMetric(adSpend * adReturn);
    } else if (adSpend === null && adRevenue !== null) {
      adSpend = roundMetric(adRevenue / adReturn);
    }
  }

  const productCost = optionalNumber(
    readField(row, mapping, "productCost"),
    metricFieldLabels.productCost,
    issues,
    rowNumber,
  );
  let grossProfit = optionalNumber(readField(row, mapping, "grossProfit"), undefined, undefined, undefined, {
    allowNegative: true,
  });
  const grossMarginRate = optionalPercentRate(readField(row, mapping, "grossMarginRate"));

  if (grossProfit === null && grossMarginRate !== null) {
    grossProfit = roundMetric(revenue * grossMarginRate);
  }

  let refundOrders = optionalNumber(
    readField(row, mapping, "refundOrders"),
    metricFieldLabels.refundOrders,
    issues,
    rowNumber,
  );
  let refundAmount = optionalNumber(
    readField(row, mapping, "refundAmount"),
    metricFieldLabels.refundAmount,
    issues,
    rowNumber,
  );
  const refundOrderRate = optionalPercentRate(readField(row, mapping, "refundOrderRate"));
  const refundAmountRate = optionalPercentRate(readField(row, mapping, "refundAmountRate"));

  if (refundOrders === null && refundOrderRate !== null && refundOrderRate >= 0) {
    refundOrders = roundMetric(orders * refundOrderRate);
  }

  if (refundAmount === null && refundAmountRate !== null && refundAmountRate >= 0) {
    refundAmount = roundMetric(revenue * refundAmountRate);
  }

  if (refundOrders !== null && refundOrders > orders) {
    issues.push({
      severity: "warning",
      rowNumber,
      message: "退款/退货单数大于订单数，请确认这列是否包含历史订单的售后。",
    });
  }

  if (refundAmount !== null && refundAmount > revenue) {
    issues.push({
      severity: "warning",
      rowNumber,
      message: "退款金额大于销售额，请确认退款口径是否跨周期或包含历史订单。",
    });
  }

  return {
    productName: productName || sku,
    sku: sku || productName,
    visitors,
    orders,
    revenue,
    unitsSold,
    adSpend,
    adRevenue,
    inventory: optionalNumber(readField(row, mapping, "inventory"), metricFieldLabels.inventory, issues, rowNumber),
    productCost,
    grossProfit,
    refundOrders,
    refundAmount,
    refundReason: readField(row, mapping, "refundReason") || null,
  };
}

function sumOptionalProductField(products: ProductMetric[], field: keyof ProductMetric) {
  const values = products.map((product) => product[field]);

  if (values.some((value) => value === undefined || value === null)) {
    return null;
  }

  return values.reduce<number>((sum, value) => sum + Number(value ?? 0), 0);
}

function lastOptionalProductField(products: ProductMetric[], field: keyof ProductMetric) {
  for (const product of [...products].reverse()) {
    const value = product[field];

    if (typeof value === "number") {
      return value;
    }
  }

  return null;
}

function mergeRefundReasons(products: ProductMetric[]) {
  const reasons = new Set<string>();

  for (const product of products) {
    for (const reason of (product.refundReason ?? "").split(/[\/|;；、,，\n]/)) {
      const trimmed = reason.trim();

      if (trimmed) {
        reasons.add(trimmed);
      }
    }
  }

  return reasons.size > 0 ? [...reasons].join(" / ") : null;
}

function mergeProductsBySku(products: ProductMetric[], label: string, issues: ImportIssue[]) {
  const groupedProducts = new Map<string, ProductMetric[]>();

  for (const product of products) {
    groupedProducts.set(product.sku, [...(groupedProducts.get(product.sku) ?? []), product]);
  }

  const mergedProducts = [...groupedProducts.values()].map((group) => {
    if (group.length === 1) {
      return group[0];
    }

    const [firstProduct] = group;

    return {
      productName: firstProduct.productName,
      sku: firstProduct.sku,
      visitors: sumOptionalProductField(group, "visitors"),
      orders: group.reduce((sum, product) => sum + product.orders, 0),
      revenue: group.reduce((sum, product) => sum + product.revenue, 0),
      unitsSold: group.reduce((sum, product) => sum + product.unitsSold, 0),
      adSpend: sumOptionalProductField(group, "adSpend"),
      adRevenue: sumOptionalProductField(group, "adRevenue"),
      inventory: lastOptionalProductField(group, "inventory"),
      productCost: sumOptionalProductField(group, "productCost"),
      grossProfit: sumOptionalProductField(group, "grossProfit"),
      refundOrders: sumOptionalProductField(group, "refundOrders"),
      refundAmount: sumOptionalProductField(group, "refundAmount"),
      refundReason: mergeRefundReasons(group),
    };
  });

  const duplicateSkuCount = [...groupedProducts.values()].filter((group) => group.length > 1).length;

  if (duplicateSkuCount > 0) {
    issues.push({
      severity: "info",
      message: `${label}识别到 ${duplicateSkuCount} 个重复 SKU，已按 SKU 自动合并后再分析。`,
    });
  }

  return mergedProducts;
}

function buildWeeklyMetricSet({
  label,
  rows,
  mapping,
  issues,
}: {
  label: string;
  rows: MetricSourceRow[];
  mapping: Map<MetricField, string>;
  issues: ImportIssue[];
}): WeeklyMetricSet {
  const firstRow = rows[0]?.row;

  return {
    label,
    startDate: firstRow ? readField(firstRow, mapping, "startDate") : "",
    endDate: firstRow ? readField(firstRow, mapping, "endDate") : "",
    products: mergeProductsBySku(
      rows
        .map(({ row, rowNumber }) => buildMetricRow(row, mapping, issues, rowNumber))
        .filter((product): product is ProductMetric => product !== null),
      label,
      issues,
    ),
  };
}

function buildCompetitors(
  text: string | undefined,
  issues: ImportIssue[],
): { competitors: CompetitorSignal[]; rows: number } {
  if (!text?.trim()) {
    issues.push({
      severity: "warning",
      message: "还没有竞品数据表。Agent 可以先做店铺复盘，但竞品价格和促销判断会弱一些。",
    });
    return { competitors: [], rows: 0 };
  }

  const table = parseCsv(text);
  const { mapping } = buildHeaderMap(
    table.headers,
    competitorAliases,
    new Set<CompetitorField>(["name", "price"]),
    {
      name: "竞品名称",
      url: "竞品链接",
      source: "来源",
      observedAt: "观察日期",
      price: "价格",
      priceNote: "价格备注",
      promotion: "促销",
      rating: "评分",
      reviews: "评论数",
      keySellingPoints: "核心卖点",
    },
  );

  const competitors = table.rows.flatMap((row, index) => {
    const name = readField(row, mapping, "name");
    const price = parseNumber(readField(row, mapping, "price"));

    if (!name || price === null) {
      issues.push({
        severity: "warning",
        rowNumber: index + 2,
        message: "有一行竞品缺少名称或价格，已跳过。",
      });
      return [];
    }

    return [
      {
        name,
        url: readField(row, mapping, "url"),
        source: readField(row, mapping, "source") || "用户导入竞品表",
        observedAt: readField(row, mapping, "observedAt") || new Date().toISOString().slice(0, 10),
        price,
        priceNote: readField(row, mapping, "priceNote") || "用户导入价格",
        promotion: readField(row, mapping, "promotion") || "无明显促销",
        rating: parseNumber(readField(row, mapping, "rating")) ?? 0,
        reviews: parseNumber(readField(row, mapping, "reviews")) ?? 0,
        keySellingPoints: readField(row, mapping, "keySellingPoints")
          .split(/\/|\||;|；|、/)
          .map((point) => point.trim())
          .filter(Boolean),
      },
    ];
  });

  return { competitors, rows: table.rows.length };
}

export function buildEcommerceInputFromCsv({
  metricsCsv,
  competitorsCsv,
  store,
}: {
  metricsCsv: string;
  competitorsCsv?: string;
  store?: Partial<StoreProfile>;
}): EcommerceCsvImportResult {
  const issues: ImportIssue[] = [];
  const metricsTable = parseCsv(metricsCsv);
  const { mapping, fieldMappings } = buildHeaderMap(
    metricsTable.headers,
    metricAliases,
    metricRequiredFields,
    metricFieldLabels,
  );

  for (const field of metricRequiredFields) {
    if (!mapping.has(field)) {
      issues.push({
        severity: "error",
        message: `缺少必要字段「${metricFieldLabels[field]}」。`,
      });
    }
  }

  if (metricsTable.rows.length === 0) {
    issues.push({
      severity: "error",
      message: "经营数据表里没有可读取的数据行。",
    });
  }

  const explicitPreviousRows: MetricSourceRow[] = [];
  const explicitCurrentRows: MetricSourceRow[] = [];
  const inferredPeriods = inferTwoPeriods(metricsTable.rows, mapping, issues);

  for (const [index, row] of metricsTable.rows.entries()) {
    const week = normalizeWeek(readField(row, mapping, "week"));
    const sourceRow = { row, rowNumber: index + 2 };
    const effectiveWeek =
      week === "previous" || week === "current"
        ? week
        : week === inferredPeriods?.previous
          ? "previous"
          : week === inferredPeriods?.current
            ? "current"
            : week;

    if (effectiveWeek === "previous") {
      explicitPreviousRows.push(sourceRow);
    } else if (effectiveWeek === "current") {
      explicitCurrentRows.push(sourceRow);
    }
  }

  if (explicitPreviousRows.length === 0 || explicitCurrentRows.length === 0) {
    issues.push({
      severity: "error",
      message: "需要同时有“上周/previous”和“本周/current”两段数据，Agent 才能判断变化趋势。",
    });
  }

  const competitorResult = buildCompetitors(competitorsCsv, issues);
  const previousWeek = buildWeeklyMetricSet({
    label: "上周",
    rows: explicitPreviousRows,
    mapping,
    issues,
  });
  const currentWeek = buildWeeklyMetricSet({
    label: "本周",
    rows: explicitCurrentRows,
    mapping,
    issues,
  });
  const errorIssues = issues.filter((issue) => issue.severity === "error");
  const questionsForUser = [
    ...fieldMappings
      .filter((field) => field.required && !field.sourceHeader)
      .map((field) => `请补一列「${field.label}」。`),
    ...errorIssues
      .slice(0, 3)
      .map((issue) => `${issue.rowNumber ? `请修正第 ${issue.rowNumber} 行：` : "请修正："}${issue.message}`),
    ...(explicitPreviousRows.length === 0 ? ["请确认哪些行属于上周。"] : []),
    ...(explicitCurrentRows.length === 0 ? ["请确认哪些行属于本周。"] : []),
    ...(competitorResult.competitors.length === 0 ? ["可以补 1 到 3 个最在意的竞品链接和价格。"] : []),
  ];

  const report: EcommerceCsvImportReport = {
    ok: errorIssues.length === 0 && previousWeek.products.length > 0 && currentWeek.products.length > 0,
    metricsRows: metricsTable.rows.length,
    competitorRows: competitorResult.rows,
    fieldMappings,
    issues,
    questionsForUser,
  };

  if (!report.ok) {
    return { report };
  }

  return {
    report,
    input: {
      store: {
        ...defaultStore,
        ...cleanStoreOverride(store),
      },
      previousWeek,
      currentWeek,
      competitors: competitorResult.competitors,
    },
  };
}
