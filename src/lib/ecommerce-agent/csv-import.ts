import type {
  CompetitorSignal,
  CustomerVoiceSignal,
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
  metricsInputKind: "weekly_metrics" | "order_details";
  metricsRows: number;
  competitorRows: number;
  customerVoiceRows: number;
  inventoryRows: number;
  adRows: number;
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
  rowNumbers: number[];
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
  | "adCostRate"
  | "inventory"
  | "productCost"
  | "platformFee"
  | "paymentFee"
  | "fulfillmentCost"
  | "otherCost"
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

type CustomerVoiceField =
  | "productName"
  | "sku"
  | "source"
  | "observedAt"
  | "sentiment"
  | "theme"
  | "text"
  | "count";

type OrderDetailField =
  | "orderId"
  | "orderDate"
  | "productName"
  | "sku"
  | "quantity"
  | "revenue"
  | "discountAmount"
  | "refundAmount"
  | "status"
  | "productCost"
  | "unitCost"
  | "platformFee"
  | "paymentFee"
  | "fulfillmentCost"
  | "otherCost"
  | "grossProfit";

type InventoryField = "productName" | "sku" | "inventory" | "unitCost" | "grossMarginRate" | "observedAt";

type AdField =
  | "week"
  | "productName"
  | "sku"
  | "campaignName"
  | "adSpend"
  | "adRevenue"
  | "adReturn"
  | "adCostRate";

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
  adCostRate: "ACOS/广告成本占比",
  inventory: "库存",
  productCost: "商品成本",
  platformFee: "平台佣金/服务费",
  paymentFee: "支付/交易手续费",
  fulfillmentCost: "物流/履约成本",
  otherCost: "其他可变成本",
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
    "统计周期",
    "报表周期",
    "周",
    "日期",
    "开始日期",
    "起始日期",
    "统计开始日期",
    "统计日期",
    "时间段",
    "时间",
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
    "net_sales",
    "netsales",
    "gross_sales",
    "grosssales",
    "total_sales",
    "totalsales",
    "sales_amount",
    "paid_amount",
    "order_amount",
    "销售额",
    "成交额",
    "营业额",
    "净销售额",
    "总销售额",
    "销售总额",
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
    "net_quantity",
    "netquantity",
    "items_sold",
    "total_items",
    "totalitems",
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
  adCostRate: [
    "acos",
    "ad_cost_rate",
    "adcostrate",
    "ad_cost_sales_ratio",
    "adcostsalesratio",
    "advertising_cost_of_sales",
    "advertisingcostofsales",
    "广告成本销售比",
    "广告成本占比",
    "广告花费占比",
    "广告费占比",
    "广告销售成本比",
    "广告销售成本占比",
  ],
  inventory: ["inventory", "stock", "available_stock", "sellable_stock", "库存", "当前库存", "可售库存", "库存数", "可售件数"],
  productCost: ["product_cost", "cogs", "cost_of_goods", "cost_amount", "商品成本", "采购成本", "成本金额"],
  platformFee: [
    "platform_fee",
    "platformfee",
    "platform_commission",
    "platformcommission",
    "commission",
    "commission_fee",
    "commissionfee",
    "referral_fee",
    "referralfee",
    "selling_fee",
    "sellingfee",
    "selling_fees",
    "sellingfees",
    "merchant_fee",
    "merchantfee",
    "平台费",
    "平台服务费",
    "平台佣金",
    "销售佣金",
    "交易佣金",
    "佣金",
    "技术服务费",
  ],
  paymentFee: [
    "payment_fee",
    "paymentfee",
    "processing_fee",
    "processingfee",
    "payment_processing_fee",
    "paymentprocessingfee",
    "transaction_fee",
    "transactionfee",
    "stripe_fee",
    "stripefee",
    "paypal_fee",
    "paypalfee",
    "支付手续费",
    "交易手续费",
    "收款手续费",
    "手续费",
    "支付服务费",
  ],
  fulfillmentCost: [
    "fulfillment_cost",
    "fulfillmentcost",
    "fulfillment_fee",
    "fulfillmentfee",
    "fba_fee",
    "fbafee",
    "shipping_cost",
    "shippingcost",
    "logistics_cost",
    "logisticscost",
    "freight_cost",
    "freightcost",
    "delivery_cost",
    "deliverycost",
    "配送成本",
    "物流成本",
    "运费成本",
    "履约成本",
    "履约费",
    "FBA费",
    "仓配费",
    "配送费成本",
    "发货成本",
  ],
  otherCost: [
    "other_cost",
    "othercost",
    "other_fee",
    "otherfee",
    "service_fee",
    "servicefee",
    "packaging_cost",
    "packagingcost",
    "package_cost",
    "packagecost",
    "warehouse_fee",
    "warehousefee",
    "其他成本",
    "其他费用",
    "服务费",
    "包装费",
    "仓储费",
  ],
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

const customerVoiceAliases: Record<CustomerVoiceField, string[]> = {
  productName: ["product_name", "product", "item_name", "商品名称", "商品", "产品名称", "品名"],
  sku: ["sku", "seller_sku", "商家编码", "商品编码", "货号", "规格编码"],
  source: ["source", "channel", "来源", "渠道", "数据来源", "反馈来源"],
  observedAt: ["observed_at", "date", "created_at", "feedback_date", "日期", "反馈日期", "评价日期", "售后日期"],
  sentiment: ["sentiment", "polarity", "type", "情绪", "倾向", "评价类型", "正负向"],
  theme: [
    "theme",
    "topic",
    "keyword",
    "keywords",
    "reason",
    "issue",
    "标签",
    "主题",
    "关键词",
    "问题",
    "问题类型",
    "问题原因",
    "售后原因",
    "退款原因",
    "差评原因",
  ],
  text: [
    "text",
    "content",
    "feedback",
    "comment",
    "review",
    "message",
    "评价内容",
    "评论内容",
    "用户反馈",
    "客户反馈",
    "客服备注",
    "售后备注",
    "退款备注",
    "差评内容",
  ],
  count: ["count", "qty", "frequency", "times", "mentions", "数量", "次数", "出现次数", "提及次数"],
};

const orderDetailFieldLabels: Record<OrderDetailField, string> = {
  orderId: "订单号",
  orderDate: "下单/支付日期",
  productName: "商品名称",
  sku: "SKU",
  quantity: "购买件数",
  revenue: "订单实收金额",
  discountAmount: "折扣金额",
  refundAmount: "退款金额",
  status: "订单/售后状态",
  productCost: "商品成本",
  unitCost: "单位成本",
  platformFee: "平台佣金/服务费",
  paymentFee: "支付/交易手续费",
  fulfillmentCost: "物流/履约成本",
  otherCost: "其他可变成本",
  grossProfit: "毛利",
};

const orderDetailAliases: Record<OrderDetailField, string[]> = {
  orderId: [
    "order_id",
    "orderid",
    "amazon_order_id",
    "amazonorderid",
    "order_name",
    "ordername",
    "id",
    "name",
    "transaction_id",
    "transactionid",
    "order_no",
    "orderno",
    "订单号",
    "订单编号",
    "交易订单号",
    "交易号",
    "子订单号",
    "父订单号",
    "订单id",
  ],
  orderDate: [
    "order_date",
    "orderdate",
    "paid_at",
    "paidat",
    "pay_time",
    "paytime",
    "created_at",
    "createdat",
    "create_time",
    "createtime",
    "order_time",
    "ordertime",
    "purchase_date",
    "purchasedate",
    "date",
    "日期",
    "下单日期",
    "下单时间",
    "支付日期",
    "支付时间",
    "成交日期",
    "成交时间",
    "订单日期",
    "创建时间",
  ],
  productName: [
    ...metricAliases.productName,
    "lineitem_name",
    "lineitemname",
    "line_item_name",
    "line item name",
    "订单商品名称",
  ],
  sku: [
    ...metricAliases.sku,
    "lineitem_sku",
    "lineitemsku",
    "line_item_sku",
    "line item sku",
  ],
  quantity: [
    "quantity",
    "qty",
    "units",
    "item_quantity",
    "itemquantity",
    "quantity_purchased",
    "quantitypurchased",
    "quantity_ordered",
    "quantityordered",
    "lineitem_quantity",
    "lineitemquantity",
    "line_item_quantity",
    "line item quantity",
    "num",
    "数量",
    "件数",
    "购买数量",
    "商品数量",
    "支付商品件数",
    "成交件数",
    "销售数量",
  ],
  revenue: [
    "revenue",
    "sales",
    "amount",
    "order_amount",
    "orderamount",
    "paid_amount",
    "paidamount",
    "payment",
    "item_total",
    "itemtotal",
    "net_sales",
    "netsales",
    "gross_sales",
    "grosssales",
    "total_sales",
    "totalsales",
    "subtotal",
    "total",
    "item_price",
    "itemprice",
    "item_subtotal",
    "itemsubtotal",
    "lineitem_price",
    "lineitemprice",
    "line_item_price",
    "line item price",
    "lineitem_total",
    "lineitemtotal",
    "line_item_total",
    "line item total",
    "actual_amount",
    "actualamount",
    "实收金额",
    "实付金额",
    "支付金额",
    "付款金额",
    "订单金额",
    "成交金额",
    "商品金额",
    "商品支付金额",
    "销售额",
  ],
  discountAmount: [
    "discount",
    "discounts",
    "discount_amount",
    "discountamount",
    "discount_total",
    "discounttotal",
    "lineitem_discount",
    "lineitemdiscount",
    "line_item_discount",
    "line item discount",
    "lineitem_discount_amount",
    "lineitemdiscountamount",
    "line_item_discount_amount",
    "line item discount amount",
    "优惠",
    "优惠金额",
    "折扣",
    "折扣金额",
    "订单优惠",
    "商品优惠",
    "商品优惠金额",
  ],
  refundAmount: metricAliases.refundAmount,
  status: [
    "status",
    "order_status",
    "orderstatus",
    "item_status",
    "itemstatus",
    "shipment_status",
    "shipmentstatus",
    "financial_status",
    "financialstatus",
    "fulfillment_status",
    "fulfillmentstatus",
    "refund_status",
    "refundstatus",
    "after_sale_status",
    "aftersalestatus",
    "订单状态",
    "交易状态",
    "售后状态",
    "退款状态",
    "退货状态",
  ],
  productCost: metricAliases.productCost,
  unitCost: [
    "unit_cost",
    "unitcost",
    "cost_per_unit",
    "costperunit",
    "unit_cogs",
    "unitcogs",
    "lineitem_unit_cost",
    "lineitemunitcost",
    "line_item_unit_cost",
    "line item unit cost",
    "采购单价",
    "成本单价",
    "单位成本",
    "单件成本",
    "件成本",
  ],
  platformFee: metricAliases.platformFee,
  paymentFee: metricAliases.paymentFee,
  fulfillmentCost: metricAliases.fulfillmentCost,
  otherCost: metricAliases.otherCost,
  grossProfit: metricAliases.grossProfit,
};

const inventoryFieldLabels: Record<InventoryField, string> = {
  productName: "商品名称",
  sku: "SKU",
  inventory: "当前库存",
  unitCost: "单位成本",
  grossMarginRate: "毛利率",
  observedAt: "库存日期",
};

const inventoryAliases: Record<InventoryField, string[]> = {
  productName: metricAliases.productName,
  sku: metricAliases.sku,
  inventory: [
    "inventory",
    "stock",
    "available_stock",
    "availablestock",
    "sellable_stock",
    "sellablestock",
    "on_hand",
    "onhand",
    "quantity_available",
    "quantityavailable",
    "库存",
    "当前库存",
    "可售库存",
    "库存数",
    "现货库存",
    "可售件数",
    "可用库存",
  ],
  unitCost: [
    "unit_cost",
    "unitcost",
    "cost_per_unit",
    "costperunit",
    "per_unit_cost",
    "perunitcost",
    "采购单价",
    "成本单价",
    "单位成本",
    "单件成本",
    "单品成本",
    "每件成本",
  ],
  grossMarginRate: metricAliases.grossMarginRate,
  observedAt: ["observed_at", "date", "snapshot_date", "stock_date", "日期", "库存日期", "盘点日期", "统计日期"],
};

const adFieldLabels: Record<AdField, string> = {
  week: "数据周期",
  productName: "商品名称",
  sku: "SKU",
  campaignName: "广告计划/广告组",
  adSpend: "广告花费",
  adRevenue: "广告成交额",
  adReturn: "广告回本/ROAS",
  adCostRate: "ACOS/广告成本占比",
};

const adAliases: Record<AdField, string[]> = {
  week: metricAliases.week,
  productName: metricAliases.productName,
  sku: metricAliases.sku,
  campaignName: [
    "campaign",
    "campaign_name",
    "campaignname",
    "ad_group",
    "adgroup",
    "ad_group_name",
    "adgroupname",
    "广告计划",
    "广告计划名称",
    "广告组",
    "广告组名称",
    "推广计划",
    "推广计划名称",
  ],
  adSpend: metricAliases.adSpend,
  adRevenue: metricAliases.adRevenue,
  adReturn: metricAliases.adReturn,
  adCostRate: metricAliases.adCostRate,
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

const knownImportHeaderAliases = new Set(
  [
    metricAliases,
    competitorAliases,
    customerVoiceAliases,
    orderDetailAliases,
    inventoryAliases,
    adAliases,
  ]
    .flatMap((aliases) => Object.values(aliases).flat())
    .map(normalizeAlias),
);

type SensitiveHeaderGroup = {
  label: string;
  matches: (normalizedHeader: string, rawHeader: string) => boolean;
};

const sensitiveHeaderGroups: SensitiveHeaderGroup[] = [
  {
    label: "买家/收件人姓名",
    matches: (normalizedHeader, rawHeader) =>
      [
        "buyername",
        "customername",
        "recipientname",
        "receivername",
        "shipname",
        "shippingname",
        "consigneename",
      ].includes(normalizedHeader) ||
      rawHeader.includes("买家姓名") ||
      rawHeader.includes("客户姓名") ||
      rawHeader.includes("收件人") ||
      rawHeader.includes("收货人"),
  },
  {
    label: "电话/手机号",
    matches: (normalizedHeader, rawHeader) =>
      normalizedHeader.includes("phone") ||
      normalizedHeader.includes("mobile") ||
      normalizedHeader.includes("telephone") ||
      rawHeader.includes("手机号") ||
      rawHeader.includes("电话") ||
      rawHeader.includes("手机"),
  },
  {
    label: "邮箱",
    matches: (normalizedHeader, rawHeader) => normalizedHeader.includes("email") || rawHeader.includes("邮箱"),
  },
  {
    label: "收货地址",
    matches: (normalizedHeader, rawHeader) =>
      normalizedHeader.includes("address") ||
      normalizedHeader.includes("street") ||
      normalizedHeader.includes("postalcode") ||
      normalizedHeader.includes("zipcode") ||
      normalizedHeader.includes("postcode") ||
      rawHeader.includes("地址") ||
      rawHeader.includes("邮编"),
  },
  {
    label: "身份证/税号",
    matches: (normalizedHeader, rawHeader) =>
      normalizedHeader.includes("idcard") ||
      normalizedHeader.includes("identity") ||
      normalizedHeader.includes("taxid") ||
      rawHeader.includes("身份证") ||
      rawHeader.includes("证件号") ||
      rawHeader.includes("税号"),
  },
];

function addSensitiveHeaderWarnings(headers: string[], issues: ImportIssue[], tableLabel: string) {
  const matchedLabels = new Set<string>();

  for (const header of headers) {
    const normalizedHeader = normalizeHeader(header);
    const rawHeader = header.trim().toLowerCase();
    const matchedGroup = sensitiveHeaderGroups.find((group) => group.matches(normalizedHeader, rawHeader));

    if (matchedGroup) {
      matchedLabels.add(matchedGroup.label);
    }
  }

  if (matchedLabels.size === 0) {
    return;
  }

  issues.push({
    severity: "warning",
    message: `${tableLabel}里包含可能的个人信息字段：${[...matchedLabels].join("、")}。这些字段不会参与复盘，建议导出前隐藏或删除，只保留订单号、时间、SKU、金额、件数和售后状态。`,
  });
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
    const counts = lines.slice(0, 20).map((line) => countDelimitedCells(line, delimiter));
    const usableCounts = counts.filter((count) => count > 1);
    const countFrequency = new Map<number, number>();

    for (const count of usableCounts) {
      countFrequency.set(count, (countFrequency.get(count) ?? 0) + 1);
    }

    const [dominantCellCount = 0, dominantFrequency = 0] =
      [...countFrequency.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0] ?? [];
    const firstDominantIndex = counts.findIndex((count) => count === dominantCellCount);

    return {
      delimiter,
      score: dominantFrequency * 20 + dominantCellCount * 2 + usableCounts.length - Math.max(firstDominantIndex, 0),
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

function countKnownHeaderCells(cells: string[]) {
  return cells.filter((cell) => knownImportHeaderAliases.has(normalizeHeader(cell))).length;
}

function findHeaderLineIndex(lines: string[], delimiter: string) {
  const scoredLines = lines.map((line, index) => {
    if (isMarkdownTableSeparator(line, delimiter)) {
      return { index, score: Number.NEGATIVE_INFINITY };
    }

    const cells = splitDelimitedLine(line, delimiter);
    const cellCount = cells.length;

    if (cellCount < 2) {
      return { index, score: Number.NEGATIVE_INFINITY };
    }

    const followingCellCounts = lines
      .slice(index + 1, index + 6)
      .filter((nextLine) => !isMarkdownTableSeparator(nextLine, delimiter))
      .map((nextLine) => countDelimitedCells(nextLine, delimiter));
    const matchingFollowingRows = followingCellCounts.filter((count) => count === cellCount).length;
    const closeFollowingRows = followingCellCounts.filter((count) => count >= Math.max(2, cellCount - 1)).length;
    const knownHeaderCells = countKnownHeaderCells(cells);

    return {
      index,
      score:
        knownHeaderCells * 30 +
        matchingFollowingRows * 10 +
        closeFollowingRows * 4 +
        cellCount -
        index * 0.5,
    };
  });
  const bestLine = scoredLines.sort((a, b) => b.score - a.score)[0];

  if (!bestLine || bestLine.score === Number.NEGATIVE_INFINITY) {
    return 0;
  }

  return bestLine.index;
}

export function parseCsv(text: string): CsvTable {
  const lineEntries = text
    .split(/\r?\n/)
    .map((line, index) => ({
      line: line.trim(),
      rowNumber: index + 1,
    }))
    .filter(({ line }) => !/^```/.test(line))
    .filter(({ line }) => Boolean(line));
  const lines = lineEntries.map(({ line }) => line);

  if (lines.length === 0) {
    return { headers: [], rows: [], rowNumbers: [], delimiter: "," };
  }

  const delimiter = detectDelimiter(lines);
  const readableLineEntries = lineEntries.filter(
    ({ line }, index) => index === 0 || !isMarkdownTableSeparator(line, delimiter),
  );
  const readableLines = readableLineEntries.map(({ line }) => line);
  const headerLineIndex = findHeaderLineIndex(readableLines, delimiter);
  const tableLineEntries = readableLineEntries.slice(headerLineIndex);
  const headers = splitDelimitedLine(tableLineEntries[0].line, delimiter).map((header) => header.replace(/^\uFEFF/, ""));
  const rows = tableLineEntries.slice(1).map(({ line }) => {
    const cells = splitDelimitedLine(line, delimiter);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
  const rowNumbers = tableLineEntries.slice(1).map(({ rowNumber }) => rowNumber);

  return { headers, rows, rowNumbers, delimiter };
}

function getCsvRowNumber(table: CsvTable, rowIndex: number) {
  return table.rowNumbers[rowIndex] ?? rowIndex + 2;
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
  const trimmed = value.trim();
  const isAccountingNegative = /^\(.*\)$/.test(trimmed);
  const unsignedValue = isAccountingNegative ? trimmed.slice(1, -1) : trimmed;
  const cleaned = unsignedValue
    .replace(/,/g, "")
    .replace(/人民币|美元|美金|usd|us\$|cny|rmb|eur|gbp/gi, "")
    .replace(/[$￥¥€£,%\s]/g, "");

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
    const result = parsed * multiplier;

    return Number.isFinite(result) ? (isAccountingNegative ? -result : result) : null;
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? (isAccountingNegative ? -parsed : parsed) : null;
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

function optionalCostComponent<TField extends string>(
  row: Record<string, string>,
  mapping: Map<TField, string>,
  field: TField,
  fieldLabel: string,
  issues: ImportIssue[],
  rowNumber: number,
) {
  if (!mapping.has(field)) {
    return null;
  }

  const value = readField(row, mapping, field);

  if (!value) {
    return 0;
  }

  return optionalNumber(value, fieldLabel, issues, rowNumber);
}

function extraCostTotal(product: Pick<Partial<ProductMetric>, "platformFee" | "paymentFee" | "fulfillmentCost" | "otherCost">) {
  return (
    (product.platformFee ?? 0) +
    (product.paymentFee ?? 0) +
    (product.fulfillmentCost ?? 0) +
    (product.otherCost ?? 0)
  );
}

function normalizeWeek(value: string) {
  const normalized = value.trim().toLowerCase();

  if (
    [
      "previous",
      "last",
      "last_week",
      "past",
      "before",
      "上周",
      "上一周",
      "前一周",
      "上期",
      "上一期",
      "前期",
      "对比期",
      "对照期",
    ].includes(normalized)
  ) {
    return "previous" as const;
  }

  if (
    [
      "current",
      "this",
      "this_week",
      "now",
      "本周",
      "这周",
      "当前",
      "本期",
      "当前期",
      "分析期",
      "本周期",
    ].includes(normalized)
  ) {
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

function parseImportDate(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const chineseDate = trimmed.match(/(\d{4})年(\d{1,2})月(\d{1,2})日?/);
  const dashedDate = trimmed.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  const dateMatch = chineseDate ?? dashedDate;

  if (dateMatch) {
    const year = Number(dateMatch[1]);
    const month = Number(dateMatch[2]);
    const day = Number(dateMatch[3]);
    const parsed = new Date(Date.UTC(year, month - 1, day));

    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(trimmed);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
}

function addUtcDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function startOfIsoWeek(date: Date) {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = copy.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  copy.setUTCDate(copy.getUTCDate() + diffToMonday);
  return copy;
}

function formatIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatWeekRange(startDate: Date) {
  const endDate = addUtcDays(startDate, 6);
  return `${formatIsoDate(startDate)} 至 ${formatIsoDate(endDate)}`;
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
  const adCostRate = optionalPercentRate(readField(row, mapping, "adCostRate"));

  if (adReturn !== null && adReturn > 0) {
    if (adRevenue === null && adSpend !== null) {
      adRevenue = roundMetric(adSpend * adReturn);
    } else if (adSpend === null && adRevenue !== null) {
      adSpend = roundMetric(adRevenue / adReturn);
    }
  }

  if (adCostRate !== null && adCostRate > 0) {
    if (adRevenue === null && adSpend !== null) {
      adRevenue = roundMetric(adSpend / adCostRate);
    } else if (adSpend === null && adRevenue !== null) {
      adSpend = roundMetric(adRevenue * adCostRate);
    }
  }

  const productCost = optionalNumber(
    readField(row, mapping, "productCost"),
    metricFieldLabels.productCost,
    issues,
    rowNumber,
  );
  const platformFee = optionalCostComponent(row, mapping, "platformFee", metricFieldLabels.platformFee, issues, rowNumber);
  const paymentFee = optionalCostComponent(row, mapping, "paymentFee", metricFieldLabels.paymentFee, issues, rowNumber);
  const fulfillmentCost = optionalCostComponent(
    row,
    mapping,
    "fulfillmentCost",
    metricFieldLabels.fulfillmentCost,
    issues,
    rowNumber,
  );
  const otherCost = optionalCostComponent(row, mapping, "otherCost", metricFieldLabels.otherCost, issues, rowNumber);
  let grossProfit = optionalNumber(readField(row, mapping, "grossProfit"), undefined, undefined, undefined, {
    allowNegative: true,
  });
  const grossMarginRate = optionalPercentRate(readField(row, mapping, "grossMarginRate"));

  if (grossProfit === null && grossMarginRate !== null) {
    grossProfit = roundMetric(revenue * grossMarginRate);
  }

  if (grossProfit === null && productCost !== null) {
    grossProfit = roundMetric(revenue - productCost - extraCostTotal({ platformFee, paymentFee, fulfillmentCost, otherCost }));
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
    platformFee,
    paymentFee,
    fulfillmentCost,
    otherCost,
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
      platformFee: sumOptionalProductField(group, "platformFee"),
      paymentFee: sumOptionalProductField(group, "paymentFee"),
      fulfillmentCost: sumOptionalProductField(group, "fulfillmentCost"),
      otherCost: sumOptionalProductField(group, "otherCost"),
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

type ParsedOrderDetailRow = {
  rowNumber: number;
  orderId: string;
  orderDate: Date;
  productName: string;
  sku: string;
  quantity: number;
  revenue: number;
  refundAmount: number | null;
  status: string;
  productCost: number | null;
  platformFee: number | null;
  paymentFee: number | null;
  fulfillmentCost: number | null;
  otherCost: number | null;
  grossProfit: number | null;
};

type OrderMetricGroup = {
  productName: string;
  sku: string;
  orderIds: Set<string>;
  refundOrderIds: Set<string>;
  quantity: number;
  revenue: number;
  refundAmount: number | null;
  productCost: number | null;
  platformFee: number | null;
  paymentFee: number | null;
  fulfillmentCost: number | null;
  otherCost: number | null;
  grossProfit: number | null;
  refundReasons: Set<string>;
};

function isRefundLikeStatus(status: string) {
  const normalized = status.trim().toLowerCase();

  if (!normalized) {
    return false;
  }

  return ["refund", "return", "after-sale", "aftersale", "退款", "退货", "售后", "已退款", "已退货"].some(
    (keyword) => normalized.includes(keyword),
  );
}

function hasCompleteWeeklyMetricMapping(mapping: Map<MetricField, string>) {
  return [...metricRequiredFields].every((field) => mapping.has(field));
}

function canUseOrderDetails(mapping: Map<OrderDetailField, string>) {
  return mapping.has("orderDate") && mapping.has("revenue") && (mapping.has("productName") || mapping.has("sku"));
}

function isOrderDetailUnitPriceHeader(header?: string) {
  if (!header) {
    return false;
  }

  return ["lineitemprice", "lineitemunitprice", "lineitemunitamount"].includes(normalizeHeader(header));
}

function parseOrderDetailRows(
  table: CsvTable,
  mapping: Map<OrderDetailField, string>,
  issues: ImportIssue[],
) {
  return table.rows
    .map((row, index): ParsedOrderDetailRow | null => {
      const rowNumber = getCsvRowNumber(table, index);
      const orderDate = parseImportDate(readField(row, mapping, "orderDate"));
      const productName = readField(row, mapping, "productName");
      const sku = readField(row, mapping, "sku");

      if (!orderDate) {
        issues.push({
          severity: "error",
          rowNumber,
          message: "订单明细缺少或无法识别下单/支付日期，暂时不能判断属于哪一周。",
        });
        return null;
      }

      if (!productName && !sku) {
        issues.push({
          severity: "error",
          rowNumber,
          message: "订单明细缺少商品名称或 SKU，Agent 无法知道这一行是哪款商品。",
        });
        return null;
      }

      const quantity = optionalNumber(readField(row, mapping, "quantity"), orderDetailFieldLabels.quantity, issues, rowNumber);
      if (quantity !== null && quantity < 0) {
        return null;
      }

      const rawRevenue = requireNonNegative(
        requiredNumber(readField(row, mapping, "revenue"), orderDetailFieldLabels.revenue, issues, rowNumber),
        orderDetailFieldLabels.revenue,
        issues,
        rowNumber,
      );
      const discountAmountValue = readField(row, mapping, "discountAmount");
      const rawDiscountAmount =
        mapping.has("discountAmount") && !discountAmountValue
          ? 0
          : optionalNumber(
              discountAmountValue,
              orderDetailFieldLabels.discountAmount,
              issues,
              rowNumber,
              { allowNegative: true },
            );
      const discountAmount = rawDiscountAmount === null ? 0 : Math.abs(rawDiscountAmount);
      const refundAmountValue = readField(row, mapping, "refundAmount");
      const refundAmount =
        mapping.has("refundAmount") && !refundAmountValue
          ? 0
          : optionalNumber(refundAmountValue, orderDetailFieldLabels.refundAmount, issues, rowNumber);
      let productCost = optionalNumber(
        readField(row, mapping, "productCost"),
        orderDetailFieldLabels.productCost,
        issues,
        rowNumber,
      );
      const unitCost = optionalNumber(readField(row, mapping, "unitCost"), orderDetailFieldLabels.unitCost, issues, rowNumber);
      const platformFee = optionalCostComponent(
        row,
        mapping,
        "platformFee",
        orderDetailFieldLabels.platformFee,
        issues,
        rowNumber,
      );
      const paymentFee = optionalCostComponent(
        row,
        mapping,
        "paymentFee",
        orderDetailFieldLabels.paymentFee,
        issues,
        rowNumber,
      );
      const fulfillmentCost = optionalCostComponent(
        row,
        mapping,
        "fulfillmentCost",
        orderDetailFieldLabels.fulfillmentCost,
        issues,
        rowNumber,
      );
      const otherCost = optionalCostComponent(row, mapping, "otherCost", orderDetailFieldLabels.otherCost, issues, rowNumber);
      let grossProfit = optionalNumber(readField(row, mapping, "grossProfit"), undefined, undefined, undefined, {
        allowNegative: true,
      });

      if (rawRevenue === null) {
        return null;
      }

      const grossRevenue = isOrderDetailUnitPriceHeader(mapping.get("revenue"))
        ? roundMetric(rawRevenue * (quantity ?? 1))
        : rawRevenue;
      const revenue = roundMetric(Math.max(grossRevenue - discountAmount, 0));

      if (productCost === null && unitCost !== null) {
        productCost = roundMetric(unitCost * (quantity ?? 1));
      }

      if (grossProfit === null && productCost !== null) {
        grossProfit = roundMetric(revenue - productCost - extraCostTotal({ platformFee, paymentFee, fulfillmentCost, otherCost }));
      }

      return {
        rowNumber,
        orderId: readField(row, mapping, "orderId") || `row-${rowNumber}`,
        orderDate,
        productName: productName || sku,
        sku: sku || productName,
        quantity: quantity ?? 1,
        revenue,
        refundAmount,
        status: readField(row, mapping, "status"),
        productCost,
        platformFee,
        paymentFee,
        fulfillmentCost,
        otherCost,
        grossProfit,
      };
    })
    .filter((row): row is ParsedOrderDetailRow => row !== null);
}

function addNullableSum(currentValue: number | null, value: number | null) {
  if (currentValue === null || value === null) {
    return null;
  }

  return currentValue + value;
}

function buildOrderDetailProducts(rows: ParsedOrderDetailRow[]) {
  const groups = new Map<string, OrderMetricGroup>();

  for (const row of rows) {
    const key = row.sku || row.productName;
    const existing = groups.get(key);
    const group =
      existing ??
      {
        productName: row.productName,
        sku: row.sku,
        orderIds: new Set<string>(),
        refundOrderIds: new Set<string>(),
        quantity: 0,
        revenue: 0,
        refundAmount: 0,
        productCost: 0,
        platformFee: 0,
        paymentFee: 0,
        fulfillmentCost: 0,
        otherCost: 0,
        grossProfit: 0,
        refundReasons: new Set<string>(),
      };

    group.orderIds.add(row.orderId);
    group.quantity += row.quantity;
    group.revenue += row.revenue;
    group.refundAmount = addNullableSum(group.refundAmount, row.refundAmount);
    group.productCost = addNullableSum(group.productCost, row.productCost);
    group.platformFee = addNullableSum(group.platformFee, row.platformFee);
    group.paymentFee = addNullableSum(group.paymentFee, row.paymentFee);
    group.fulfillmentCost = addNullableSum(group.fulfillmentCost, row.fulfillmentCost);
    group.otherCost = addNullableSum(group.otherCost, row.otherCost);
    group.grossProfit = addNullableSum(group.grossProfit, row.grossProfit);

    if ((row.refundAmount !== null && row.refundAmount > 0) || isRefundLikeStatus(row.status)) {
      group.refundOrderIds.add(row.orderId);

      if (row.status.trim()) {
        group.refundReasons.add(row.status.trim());
      }
    }

    groups.set(key, group);
  }

  return [...groups.values()].map((group): ProductMetric => ({
    productName: group.productName,
    sku: group.sku,
    visitors: null,
    orders: group.orderIds.size,
    revenue: roundMetric(group.revenue),
    unitsSold: roundMetric(group.quantity),
    adSpend: null,
    adRevenue: null,
    inventory: null,
    productCost: group.productCost === null ? null : roundMetric(group.productCost),
    platformFee: group.platformFee === null ? null : roundMetric(group.platformFee),
    paymentFee: group.paymentFee === null ? null : roundMetric(group.paymentFee),
    fulfillmentCost: group.fulfillmentCost === null ? null : roundMetric(group.fulfillmentCost),
    otherCost: group.otherCost === null ? null : roundMetric(group.otherCost),
    grossProfit: group.grossProfit === null ? null : roundMetric(group.grossProfit),
    refundOrders: group.refundOrderIds.size,
    refundAmount: group.refundAmount === null ? null : roundMetric(group.refundAmount),
    refundReason: group.refundReasons.size > 0 ? [...group.refundReasons].join(" / ") : null,
  }));
}

function buildWeeklyMetricSetsFromOrderDetails({
  table,
  mapping,
  issues,
}: {
  table: CsvTable;
  mapping: Map<OrderDetailField, string>;
  issues: ImportIssue[];
}) {
  const orderRows = parseOrderDetailRows(table, mapping, issues);
  const rowsByWeek = new Map<string, { startDate: Date; rows: ParsedOrderDetailRow[] }>();

  for (const row of orderRows) {
    const startDate = startOfIsoWeek(row.orderDate);
    const key = formatIsoDate(startDate);
    const group = rowsByWeek.get(key) ?? { startDate, rows: [] };
    group.rows.push(row);
    rowsByWeek.set(key, group);
  }

  const sortedWeeks = [...rowsByWeek.values()].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  const selectedWeeks = sortedWeeks.slice(-2);

  if (sortedWeeks.length > 2) {
    const [previous, current] = selectedWeeks;
    issues.push({
      severity: "info",
      message: `订单明细覆盖 ${sortedWeeks.length} 个自然周，已自动选择最近两周：${formatWeekRange(
        previous.startDate,
      )} 作为上周，${formatWeekRange(current.startDate)} 作为本周。`,
    });
  }

  issues.push({
    severity: "info",
    message: `识别到订单明细，已按订单日期和 SKU/商品名自动聚合成周度经营表，共读取 ${table.rows.length} 行订单明细。`,
  });

  const [previousWeekRows, currentWeekRows] =
    selectedWeeks.length === 2 ? selectedWeeks : [{ startDate: new Date(0), rows: [] }, selectedWeeks[0]];

  if (selectedWeeks.length < 2) {
    const recognizedWeeks =
      sortedWeeks.length > 0
        ? sortedWeeks.map((week) => formatWeekRange(week.startDate)).join("、")
        : "没有识别到可用自然周";

    issues.push({
      severity: "error",
      message: `订单明细至少需要覆盖两个自然周，Agent 才能判断上周到本周的变化趋势。当前只识别到：${recognizedWeeks}。请再补相邻一周订单明细，至少包含订单号、支付时间、商品/SKU、件数和实收金额。`,
    });
  }

  const previousWeekStartDate = previousWeekRows?.startDate;
  const currentWeekStartDate = currentWeekRows?.startDate;

  return {
    previousWeek: {
      label: "上周",
      startDate: previousWeekStartDate ? formatIsoDate(previousWeekStartDate) : "",
      endDate: previousWeekStartDate ? formatIsoDate(addUtcDays(previousWeekStartDate, 6)) : "",
      products: buildOrderDetailProducts(previousWeekRows?.rows ?? []),
    },
    currentWeek: {
      label: "本周",
      startDate: currentWeekStartDate ? formatIsoDate(currentWeekStartDate) : "",
      endDate: currentWeekStartDate ? formatIsoDate(addUtcDays(currentWeekStartDate, 6)) : "",
      products: buildOrderDetailProducts(currentWeekRows?.rows ?? []),
    },
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
    const rowNumber = getCsvRowNumber(table, index);
    const name = readField(row, mapping, "name");
    const price = parseNumber(readField(row, mapping, "price"));

    if (!name || price === null) {
      issues.push({
        severity: "warning",
        rowNumber,
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

function normalizeSentiment(value: string): CustomerVoiceSignal["sentiment"] {
  const normalized = value.trim().toLowerCase();

  if (["positive", "good", "好评", "正向", "满意", "表扬"].some((keyword) => normalized.includes(keyword))) {
    return "positive";
  }

  if (["neutral", "普通", "中性", "一般"].some((keyword) => normalized.includes(keyword))) {
    return "neutral";
  }

  return "negative";
}

function buildCustomerVoices(
  text: string | undefined,
  issues: ImportIssue[],
): { customerVoices: CustomerVoiceSignal[]; rows: number } {
  if (!text?.trim()) {
    return { customerVoices: [], rows: 0 };
  }

  const table = parseCsv(text);
  addSensitiveHeaderWarnings(table.headers, issues, "用户声音/售后评价表");
  const { mapping } = buildHeaderMap(
    table.headers,
    customerVoiceAliases,
    new Set<CustomerVoiceField>(),
    {
      productName: "商品名称",
      sku: "SKU",
      source: "来源",
      observedAt: "日期",
      sentiment: "情绪",
      theme: "问题主题",
      text: "反馈内容",
      count: "出现次数",
    },
  );

  const customerVoices = table.rows.flatMap((row, index) => {
    const rowNumber = getCsvRowNumber(table, index);
    const productName = readField(row, mapping, "productName");
    const sku = readField(row, mapping, "sku");
    const theme = readField(row, mapping, "theme");
    const voiceText = readField(row, mapping, "text");

    if (!productName && !sku) {
      issues.push({
        severity: "warning",
        rowNumber,
        message: "有一行用户声音缺少商品名称或 SKU，已跳过。",
      });
      return [];
    }

    if (!theme && !voiceText) {
      issues.push({
        severity: "warning",
        rowNumber,
        message: "有一行用户声音缺少问题主题或反馈内容，已跳过。",
      });
      return [];
    }

    return [
      {
        productName: productName || sku,
        sku: sku || undefined,
        source: readField(row, mapping, "source") || "用户声音表",
        observedAt: readField(row, mapping, "observedAt") || new Date().toISOString().slice(0, 10),
        sentiment: normalizeSentiment(readField(row, mapping, "sentiment")),
        theme: theme || voiceText.slice(0, 18),
        text: voiceText || theme,
        count: Math.max(optionalNumber(readField(row, mapping, "count")) ?? 1, 1),
      },
    ];
  });

  return { customerVoices, rows: table.rows.length };
}

type InventorySnapshot = {
  productName: string;
  sku?: string;
  inventory?: number;
  unitCost?: number;
  grossMarginRate?: number;
  observedAt?: string;
};

function buildInventorySnapshots(
  text: string | undefined,
  issues: ImportIssue[],
): { inventorySnapshots: InventorySnapshot[]; rows: number } {
  if (!text?.trim()) {
    return { inventorySnapshots: [], rows: 0 };
  }

  const table = parseCsv(text);
  const { mapping } = buildHeaderMap(
    table.headers,
    inventoryAliases,
    new Set<InventoryField>(),
    inventoryFieldLabels,
  );

  const inventorySnapshots = table.rows.flatMap((row, index) => {
    const rowNumber = getCsvRowNumber(table, index);
    const productName = readField(row, mapping, "productName");
    const sku = readField(row, mapping, "sku");
    const inventory = requireNonNegative(
      optionalNumber(readField(row, mapping, "inventory"), inventoryFieldLabels.inventory, issues, rowNumber),
      inventoryFieldLabels.inventory,
      issues,
      rowNumber,
    );
    const unitCost = requireNonNegative(
      optionalNumber(readField(row, mapping, "unitCost"), inventoryFieldLabels.unitCost, issues, rowNumber),
      inventoryFieldLabels.unitCost,
      issues,
      rowNumber,
    );
    const grossMarginRate = optionalPercentRate(readField(row, mapping, "grossMarginRate"));

    if (!productName && !sku) {
      issues.push({
        severity: "warning",
        rowNumber,
        message: "有一行库存快照缺少商品名称或 SKU，已跳过。",
      });
      return [];
    }

    if (inventory === null && unitCost === null && grossMarginRate === null) {
      issues.push({
        severity: "warning",
        rowNumber,
        message: "有一行商品快照缺少当前库存、单位成本或毛利率，已跳过。",
      });
      return [];
    }

    return [
      {
        productName: productName || sku,
        sku: sku || undefined,
        inventory: inventory ?? undefined,
        unitCost: unitCost ?? undefined,
        grossMarginRate: grossMarginRate ?? undefined,
        observedAt: readField(row, mapping, "observedAt") || undefined,
      },
    ];
  });

  return { inventorySnapshots, rows: table.rows.length };
}

function snapshotKey(snapshot: InventorySnapshot) {
  return snapshot.sku?.trim().toLowerCase() || snapshot.productName.trim().toLowerCase();
}

function applyInventorySnapshotsToMetricSet(
  metricSet: WeeklyMetricSet,
  inventorySnapshots: InventorySnapshot[],
  options: { updateInventory: boolean },
) {
  if (inventorySnapshots.length === 0) {
    return {
      metricSet,
      matchedKeys: new Set<string>(),
      updatedInventoryCount: 0,
      updatedCostCount: 0,
    };
  }

  const snapshotsBySku = new Map(
    inventorySnapshots
      .filter((snapshot) => snapshot.sku)
      .map((snapshot) => [snapshot.sku?.trim().toLowerCase() ?? "", snapshot]),
  );
  const snapshotsByProductName = new Map(
    inventorySnapshots.map((snapshot) => [snapshot.productName.trim().toLowerCase(), snapshot]),
  );
  const matchedKeys = new Set<string>();
  let updatedInventoryCount = 0;
  let updatedCostCount = 0;

  const products = metricSet.products.map((product) => {
    const skuKey = product.sku.trim().toLowerCase();
    const productNameKey = product.productName.trim().toLowerCase();
    const snapshot = snapshotsBySku.get(skuKey) ?? snapshotsByProductName.get(productNameKey);

    if (!snapshot) {
      return product;
    }

    matchedKeys.add(snapshotKey(snapshot));
    const nextProduct = { ...product };

    if (options.updateInventory && typeof snapshot.inventory === "number") {
      nextProduct.inventory = snapshot.inventory;
      updatedInventoryCount += 1;
    }

    if (
      typeof snapshot.unitCost === "number" &&
      (nextProduct.productCost === undefined || nextProduct.productCost === null)
    ) {
      nextProduct.productCost = roundMetric(snapshot.unitCost * product.unitsSold);
      updatedCostCount += 1;
    }

    if (nextProduct.grossProfit === undefined || nextProduct.grossProfit === null) {
      if (typeof nextProduct.productCost === "number") {
        nextProduct.grossProfit = roundMetric(product.revenue - nextProduct.productCost - extraCostTotal(nextProduct));
      } else if (typeof snapshot.grossMarginRate === "number") {
        nextProduct.grossProfit = roundMetric(product.revenue * snapshot.grossMarginRate);
        updatedCostCount += 1;
      }
    }

    return nextProduct;
  });

  return {
    metricSet: {
      ...metricSet,
      products,
    },
    matchedKeys,
    updatedInventoryCount,
    updatedCostCount,
  };
}

type AdSnapshot = {
  productName: string;
  sku?: string;
  week: "previous" | "current";
  adSpend: number | null;
  adRevenue: number | null;
};

function inferTwoAdPeriods(
  rows: Array<Record<string, string>>,
  mapping: Map<AdField, string>,
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
      message: `广告数据识别到 ${uniqueWeeks.length} 个周期，已自动选择最近两期：${previous} 作为上周，${current} 作为本周。`,
    });
  }

  return { previous, current };
}

function normalizeAdWeek(
  row: Record<string, string>,
  mapping: Map<AdField, string>,
  inferredPeriods: { previous: string; current: string } | null,
) {
  const rawWeek = readField(row, mapping, "week");

  if (!rawWeek) {
    return "current" as const;
  }

  const week = normalizeWeek(rawWeek);

  if (week === "previous" || week === "current") {
    return week;
  }

  if (!inferredPeriods) {
    return "current" as const;
  }

  if (week === inferredPeriods?.previous) {
    return "previous" as const;
  }

  if (week === inferredPeriods?.current) {
    return "current" as const;
  }

  return null;
}

function buildAdSnapshots(
  text: string | undefined,
  issues: ImportIssue[],
): { adSnapshots: AdSnapshot[]; rows: number } {
  if (!text?.trim()) {
    return { adSnapshots: [], rows: 0 };
  }

  const table = parseCsv(text);
  const { mapping } = buildHeaderMap(table.headers, adAliases, new Set<AdField>(), adFieldLabels);
  const inferredPeriods = inferTwoAdPeriods(table.rows, mapping, issues);

  const adSnapshots = table.rows.flatMap((row, index) => {
    const rowNumber = getCsvRowNumber(table, index);
    const productName = readField(row, mapping, "productName");
    const sku = readField(row, mapping, "sku");
    const week = normalizeAdWeek(row, mapping, inferredPeriods);

    if (!productName && !sku) {
      issues.push({
        severity: "warning",
        rowNumber,
        message: "有一行广告数据缺少商品名称或 SKU，已跳过。",
      });
      return [];
    }

    if (!week) {
      return [];
    }

    let adSpend = optionalNumber(readField(row, mapping, "adSpend"), adFieldLabels.adSpend, issues, rowNumber);
    let adRevenue = optionalNumber(readField(row, mapping, "adRevenue"), adFieldLabels.adRevenue, issues, rowNumber);
    const adReturn = optionalMultiplier(readField(row, mapping, "adReturn"));
    const adCostRate = optionalPercentRate(readField(row, mapping, "adCostRate"));

    if (adReturn !== null && adReturn > 0) {
      if (adRevenue === null && adSpend !== null) {
        adRevenue = roundMetric(adSpend * adReturn);
      } else if (adSpend === null && adRevenue !== null) {
        adSpend = roundMetric(adRevenue / adReturn);
      }
    }

    if (adCostRate !== null && adCostRate > 0) {
      if (adRevenue === null && adSpend !== null) {
        adRevenue = roundMetric(adSpend / adCostRate);
      } else if (adSpend === null && adRevenue !== null) {
        adSpend = roundMetric(adRevenue * adCostRate);
      }
    }

    if (adSpend === null && adRevenue === null) {
      issues.push({
        severity: "warning",
        rowNumber,
        message: "有一行广告数据缺少广告花费、广告成交额或可反推的 ROAS/ACOS，已跳过。",
      });
      return [];
    }

    return [
      {
        productName: productName || sku,
        sku: sku || undefined,
        week,
        adSpend,
        adRevenue,
      },
    ];
  });

  return { adSnapshots, rows: table.rows.length };
}

function adSnapshotKey(snapshot: AdSnapshot) {
  return snapshot.sku?.trim().toLowerCase() || snapshot.productName.trim().toLowerCase();
}

function applyAdSnapshotsToMetricSet(
  metricSet: WeeklyMetricSet,
  adSnapshots: AdSnapshot[],
  week: "previous" | "current",
) {
  if (adSnapshots.length === 0) {
    return {
      metricSet,
      matchedKeys: new Set<string>(),
      updatedCount: 0,
    };
  }

  const relevantSnapshots = adSnapshots.filter((snapshot) => snapshot.week === week);
  const matchedKeys = new Set<string>();
  let updatedCount = 0;

  const products = metricSet.products.map((product) => {
    const skuKey = product.sku.trim().toLowerCase();
    const productNameKey = product.productName.trim().toLowerCase();
    const matches = relevantSnapshots.filter((snapshot) => {
      const snapshotSku = snapshot.sku?.trim().toLowerCase();
      const snapshotName = snapshot.productName.trim().toLowerCase();
      return snapshotSku === skuKey || snapshotName === productNameKey;
    });

    if (matches.length === 0) {
      return product;
    }

    for (const match of matches) {
      matchedKeys.add(adSnapshotKey(match));
    }

    const adSpendValues = matches.map((match) => match.adSpend).filter((value): value is number => value !== null);
    const adRevenueValues = matches.map((match) => match.adRevenue).filter((value): value is number => value !== null);

    updatedCount += 1;

    return {
      ...product,
      adSpend: adSpendValues.length > 0 ? roundMetric(adSpendValues.reduce((sum, value) => sum + value, 0)) : product.adSpend,
      adRevenue:
        adRevenueValues.length > 0 ? roundMetric(adRevenueValues.reduce((sum, value) => sum + value, 0)) : product.adRevenue,
    };
  });

  return {
    metricSet: {
      ...metricSet,
      products,
    },
    matchedKeys,
    updatedCount,
  };
}

export function buildEcommerceInputFromCsv({
  metricsCsv,
  competitorsCsv,
  customerVoicesCsv,
  inventoryCsv,
  adsCsv,
  store,
}: {
  metricsCsv: string;
  competitorsCsv?: string;
  customerVoicesCsv?: string;
  inventoryCsv?: string;
  adsCsv?: string;
  store?: Partial<StoreProfile>;
}): EcommerceCsvImportResult {
  const issues: ImportIssue[] = [];
  const metricsTable = parseCsv(metricsCsv);

  addSensitiveHeaderWarnings(metricsTable.headers, issues, "经营数据表");

  const { mapping, fieldMappings: weeklyFieldMappings } = buildHeaderMap(
    metricsTable.headers,
    metricAliases,
    metricRequiredFields,
    metricFieldLabels,
  );
  const { mapping: orderDetailMapping, fieldMappings: orderDetailFieldMappings } = buildHeaderMap(
    metricsTable.headers,
    orderDetailAliases,
    new Set<OrderDetailField>(["orderDate", "revenue"]),
    orderDetailFieldLabels,
  );
  const shouldUseOrderDetails = !hasCompleteWeeklyMetricMapping(mapping) && canUseOrderDetails(orderDetailMapping);
  const fieldMappings = shouldUseOrderDetails ? orderDetailFieldMappings : weeklyFieldMappings;
  const metricsInputKind: EcommerceCsvImportReport["metricsInputKind"] = shouldUseOrderDetails
    ? "order_details"
    : "weekly_metrics";

  if (!shouldUseOrderDetails) {
    for (const field of metricRequiredFields) {
      if (!mapping.has(field)) {
        issues.push({
          severity: "error",
          message: `缺少必要字段「${metricFieldLabels[field]}」。`,
        });
      }
    }
  } else if (orderDetailMapping.has("discountAmount")) {
    issues.push({
      severity: "info",
      message: "已识别订单明细折扣字段，行收入会先扣除折扣后再汇总到销售额。",
    });
  }

  if (metricsTable.rows.length === 0) {
    issues.push({
      severity: "error",
      message: "经营数据表里没有可读取的数据行。",
    });
  }

  let explicitPreviousRows: MetricSourceRow[] = [];
  let explicitCurrentRows: MetricSourceRow[] = [];
  let previousWeek: WeeklyMetricSet;
  let currentWeek: WeeklyMetricSet;

  if (shouldUseOrderDetails) {
    const orderDetailResult = buildWeeklyMetricSetsFromOrderDetails({
      table: metricsTable,
      mapping: orderDetailMapping,
      issues,
    });

    previousWeek = orderDetailResult.previousWeek;
    currentWeek = orderDetailResult.currentWeek;
  } else {
    explicitPreviousRows = [];
    explicitCurrentRows = [];
    const inferredPeriods = inferTwoPeriods(metricsTable.rows, mapping, issues);

    for (const [index, row] of metricsTable.rows.entries()) {
      const week = normalizeWeek(readField(row, mapping, "week"));
      const sourceRow = { row, rowNumber: getCsvRowNumber(metricsTable, index) };
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

    previousWeek = buildWeeklyMetricSet({
      label: "上周",
      rows: explicitPreviousRows,
      mapping,
      issues,
    });
    currentWeek = buildWeeklyMetricSet({
      label: "本周",
      rows: explicitCurrentRows,
      mapping,
      issues,
    });
  }

  const competitorResult = buildCompetitors(competitorsCsv, issues);
  const customerVoiceResult = buildCustomerVoices(customerVoicesCsv, issues);
  const inventoryResult = buildInventorySnapshots(inventoryCsv, issues);
  const adResult = buildAdSnapshots(adsCsv, issues);
  const previousSnapshotResult = applyInventorySnapshotsToMetricSet(
    previousWeek,
    inventoryResult.inventorySnapshots,
    { updateInventory: false },
  );
  const currentSnapshotResult = applyInventorySnapshotsToMetricSet(
    currentWeek,
    inventoryResult.inventorySnapshots,
    { updateInventory: true },
  );

  previousWeek = previousSnapshotResult.metricSet;
  currentWeek = currentSnapshotResult.metricSet;

  if (inventoryResult.inventorySnapshots.length > 0) {
    const matchedKeys = new Set([
      ...previousSnapshotResult.matchedKeys,
      ...currentSnapshotResult.matchedKeys,
    ]);
    const unmatchedCount = inventoryResult.inventorySnapshots.filter((snapshot) => !matchedKeys.has(snapshotKey(snapshot)))
      .length;

    issues.push({
      severity: "info",
      message: `已读取库存/成本快照 ${inventoryResult.inventorySnapshots.length} 行，更新 ${currentSnapshotResult.updatedInventoryCount} 个本周商品库存，并补齐 ${previousSnapshotResult.updatedCostCount + currentSnapshotResult.updatedCostCount} 个商品成本口径。`,
    });

    if (unmatchedCount > 0) {
      issues.push({
        severity: "warning",
        message: `库存/成本快照里有 ${unmatchedCount} 行没有匹配到经营数据，已暂不参与库存或利润判断。`,
      });
    }
  }
  const previousAdResult = applyAdSnapshotsToMetricSet(previousWeek, adResult.adSnapshots, "previous");
  const currentAdResult = applyAdSnapshotsToMetricSet(currentWeek, adResult.adSnapshots, "current");

  previousWeek = previousAdResult.metricSet;
  currentWeek = currentAdResult.metricSet;

  if (adResult.adSnapshots.length > 0) {
    const matchedKeys = new Set([...previousAdResult.matchedKeys, ...currentAdResult.matchedKeys]);
    const unmatchedCount = adResult.adSnapshots.filter((snapshot) => !matchedKeys.has(adSnapshotKey(snapshot))).length;

    issues.push({
      severity: "info",
      message: `已读取广告数据 ${adResult.adSnapshots.length} 行，并更新 ${previousAdResult.updatedCount + currentAdResult.updatedCount} 个商品的广告花费或广告成交额。`,
    });

    if (unmatchedCount > 0) {
      issues.push({
        severity: "warning",
        message: `广告数据里有 ${unmatchedCount} 行没有匹配到经营数据，已暂不参与广告回本判断。`,
      });
    }
  }
  const errorIssues = issues.filter((issue) => issue.severity === "error");
  const questionsForUser = [
    ...fieldMappings
      .filter((field) => field.required && !field.sourceHeader)
      .map((field) => `请补一列「${field.label}」。`),
    ...errorIssues
      .slice(0, 3)
      .map((issue) => `${issue.rowNumber ? `请修正第 ${issue.rowNumber} 行：` : "请修正："}${issue.message}`),
    ...(!shouldUseOrderDetails && explicitPreviousRows.length === 0 ? ["请确认哪些行属于上周。"] : []),
    ...(!shouldUseOrderDetails && explicitCurrentRows.length === 0 ? ["请确认哪些行属于本周。"] : []),
    ...(competitorResult.competitors.length === 0 ? ["可以补 1 到 3 个最在意的竞品链接和价格。"] : []),
  ];

  const report: EcommerceCsvImportReport = {
    ok: errorIssues.length === 0 && previousWeek.products.length > 0 && currentWeek.products.length > 0,
    metricsInputKind,
    metricsRows: metricsTable.rows.length,
    competitorRows: competitorResult.rows,
    customerVoiceRows: customerVoiceResult.rows,
    inventoryRows: inventoryResult.rows,
    adRows: adResult.rows,
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
      customerVoices: customerVoiceResult.customerVoices,
    },
  };
}
