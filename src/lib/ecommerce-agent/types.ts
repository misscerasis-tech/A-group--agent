export type StoreProfile = {
  storeName: string;
  platform: string;
  market: string;
  category: string;
  goal: string;
  userLevel: "beginner" | "operator" | "leader";
};

export type ProductMetric = {
  productName: string;
  sku: string;
  visitors: number | null;
  orders: number;
  revenue: number;
  unitsSold: number;
  adSpend: number | null;
  adRevenue: number | null;
  inventory: number | null;
  productCost?: number | null;
  grossProfit?: number | null;
};

export type WeeklyMetricSet = {
  label: string;
  startDate: string;
  endDate: string;
  products: ProductMetric[];
};

export type CompetitorSignal = {
  name: string;
  url: string;
  source: string;
  observedAt: string;
  price: number;
  priceNote: string;
  promotion: string;
  rating: number;
  reviews: number;
  keySellingPoints: string[];
};

export type EcommerceAgentInput = {
  store: StoreProfile;
  previousWeek: WeeklyMetricSet;
  currentWeek: WeeklyMetricSet;
  competitors: CompetitorSignal[];
};

export type MetricTotals = {
  visitors: number | null;
  orders: number;
  revenue: number;
  unitsSold: number;
  adSpend: number | null;
  adRevenue: number | null;
  productCost: number | null;
  grossProfit: number | null;
};

export type ProductFinding = {
  sku: string;
  productName: string;
  issue: string;
  plainReason: string;
  suggestedAction: string;
  priority: "high" | "medium" | "low";
};

export type NextAction = {
  title: string;
  owner: string;
  reason: string;
  firstStep: string;
};

export type AgentQuestion = {
  question: string;
  whyItMatters: string;
};

export type EcommerceAgentAnalysis = {
  headline: string;
  plainSummary: string[];
  dataHealth: string[];
  totals: {
    previous: MetricTotals;
    current: MetricTotals;
    revenueChangeRate: number;
    orderChangeRate: number;
    conversionRateChange: number | null;
    adReturnChange: number | null;
    grossProfitChangeRate: number | null;
    grossMarginChange: number | null;
  };
  productFindings: ProductFinding[];
  competitorInsights: string[];
  questionsForUser: AgentQuestion[];
  nextActions: NextAction[];
  feishuReply: string;
};
