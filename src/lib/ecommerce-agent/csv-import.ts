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
};

type MetricField =
  | "week"
  | "startDate"
  | "endDate"
  | "productName"
  | "sku"
  | "visitors"
  | "orders"
  | "revenue"
  | "unitsSold"
  | "adSpend"
  | "adRevenue"
  | "inventory"
  | "productCost"
  | "grossProfit";

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
  goal: "同时看销量、利润、广告回本、库存风险和竞品压力",
  userLevel: "beginner",
};

const metricFieldLabels: Record<MetricField, string> = {
  week: "数据周期",
  startDate: "开始日期",
  endDate: "结束日期",
  productName: "商品名称",
  sku: "SKU",
  visitors: "访客数",
  orders: "订单数",
  revenue: "销售额",
  unitsSold: "销量",
  adSpend: "广告花费",
  adRevenue: "广告成交额",
  inventory: "库存",
  productCost: "商品成本",
  grossProfit: "毛利",
};

const metricRequiredFields = new Set<MetricField>([
  "week",
  "productName",
  "orders",
  "revenue",
  "unitsSold",
]);

const metricAliases: Record<MetricField, string[]> = {
  week: ["week", "period", "label", "date_period", "time_period", "数据周期", "周期", "周", "时间段"],
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
  visitors: ["visitors", "visitor", "sessions", "traffic", "uv", "page_views", "访客", "访客数", "流量", "进店人数"],
  orders: ["orders", "order_count", "paid_orders", "订单", "订单数", "成交订单", "成交订单数", "支付订单数"],
  revenue: ["revenue", "sales", "gmv", "amount", "sales_amount", "销售额", "成交额", "营业额", "销售金额", "支付金额"],
  unitsSold: ["units_sold", "quantity", "qty", "items_sold", "销量", "件数", "售出件数", "销售件数", "支付件数"],
  adSpend: ["ad_spend", "ad_cost", "adcost", "cost", "spend", "广告费", "广告花费", "广告消耗", "投放花费"],
  adRevenue: [
    "ad_revenue",
    "ad_sales",
    "attributed_sales",
    "ads_sales",
    "广告成交额",
    "广告销售额",
    "广告带来销售",
    "投放成交额",
  ],
  inventory: ["inventory", "stock", "available_stock", "库存", "当前库存", "可售库存", "库存数"],
  productCost: ["product_cost", "cogs", "cost_of_goods", "商品成本", "采购成本"],
  grossProfit: ["gross_profit", "grossprofit", "profit", "margin_amount", "毛利", "毛利润", "利润"],
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

function parseCsvLine(line: string) {
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

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

export function parseCsv(text: string): CsvTable {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.replace(/^\uFEFF/, ""));
  const rows = lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });

  return { headers, rows };
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

    fieldMappings.push({
      canonicalField: field,
      label: labels[field],
      sourceHeader,
      required: requiredFields.has(field),
    });
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
  const cleaned = value.replace(/[$￥¥,%\s]/g, "").replace(/,/g, "");

  if (!cleaned) {
    return null;
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
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

function optionalNumber(value: string) {
  return parseNumber(value);
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

function inferTwoPeriods(rows: Array<Record<string, string>>, mapping: Map<MetricField, string>) {
  const weekHeader = mapping.get("week");

  if (!weekHeader) {
    return null;
  }

  const uniqueWeeks = [...new Set(rows.map((row) => readField(row, mapping, "week")).filter(Boolean))];

  if (uniqueWeeks.length !== 2) {
    return null;
  }

  const sortedWeeks = uniqueWeeks.sort();

  return {
    previous: sortedWeeks[0],
    current: sortedWeeks[1],
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

  const orders = requiredNumber(readField(row, mapping, "orders"), metricFieldLabels.orders, issues, rowNumber);
  const revenue = requiredNumber(readField(row, mapping, "revenue"), metricFieldLabels.revenue, issues, rowNumber);
  const unitsSold = requiredNumber(
    readField(row, mapping, "unitsSold"),
    metricFieldLabels.unitsSold,
    issues,
    rowNumber,
  );

  if (orders === null || revenue === null || unitsSold === null) {
    return null;
  }

  return {
    productName: productName || sku,
    sku: sku || productName,
    visitors: optionalNumber(readField(row, mapping, "visitors")),
    orders,
    revenue,
    unitsSold,
    adSpend: optionalNumber(readField(row, mapping, "adSpend")),
    adRevenue: optionalNumber(readField(row, mapping, "adRevenue")),
    inventory: optionalNumber(readField(row, mapping, "inventory")),
    productCost: optionalNumber(readField(row, mapping, "productCost")),
    grossProfit: optionalNumber(readField(row, mapping, "grossProfit")),
  };
}

function buildWeeklyMetricSet({
  label,
  rows,
  mapping,
  issues,
}: {
  label: string;
  rows: Array<Record<string, string>>;
  mapping: Map<MetricField, string>;
  issues: ImportIssue[];
}): WeeklyMetricSet {
  const firstRow = rows[0];

  return {
    label,
    startDate: firstRow ? readField(firstRow, mapping, "startDate") : "",
    endDate: firstRow ? readField(firstRow, mapping, "endDate") : "",
    products: rows
      .map((row) => buildMetricRow(row, mapping, issues, rows.indexOf(row) + 2))
      .filter((product): product is ProductMetric => product !== null),
  };
}

function buildCompetitors(
  text: string | undefined,
  issues: ImportIssue[],
): { competitors: CompetitorSignal[]; rows: number } {
  if (!text?.trim()) {
    issues.push({
      severity: "warning",
      message: "还没有竞品 CSV。Agent 可以先做店铺复盘，但竞品价格和促销判断会弱一些。",
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
      message: "经营数据 CSV 里没有可读取的数据行。",
    });
  }

  const explicitPreviousRows: Array<Record<string, string>> = [];
  const explicitCurrentRows: Array<Record<string, string>> = [];
  const inferredPeriods = inferTwoPeriods(metricsTable.rows, mapping);

  for (const row of metricsTable.rows) {
    const week = normalizeWeek(readField(row, mapping, "week"));
    const effectiveWeek =
      week === "previous" || week === "current"
        ? week
        : week === inferredPeriods?.previous
          ? "previous"
          : week === inferredPeriods?.current
            ? "current"
            : week;

    if (effectiveWeek === "previous") {
      explicitPreviousRows.push(row);
    } else if (effectiveWeek === "current") {
      explicitCurrentRows.push(row);
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
    ...(previousWeek.products.length === 0 ? ["请确认哪些行属于上周。"] : []),
    ...(currentWeek.products.length === 0 ? ["请确认哪些行属于本周。"] : []),
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
        ...store,
      },
      previousWeek,
      currentWeek,
      competitors: competitorResult.competitors,
    },
  };
}
