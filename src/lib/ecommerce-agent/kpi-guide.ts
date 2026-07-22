export type EcommerceKpiPriority = "结果" | "原因" | "风险" | "外部";

export type EcommerceKpiGuideItem = {
  id: string;
  name: string;
  plainName: string;
  whyItMatters: string;
  homepageSignal: string;
  priority: EcommerceKpiPriority;
  csvFields: string[];
  beginnerQuestion: string;
};

export const ecommerceKpiGuide: EcommerceKpiGuideItem[] = [
  {
    id: "revenue",
    name: "销售额",
    plainName: "这周一共卖了多少钱",
    whyItMatters: "判断店铺整体有没有变好，是老板和运营最先看的结果指标。",
    homepageSignal: "首页放在第一张指标卡，用红绿变化提醒本周大盘方向。",
    priority: "结果",
    csvFields: ["revenue", "gmv", "sales", "销售额", "成交额"],
    beginnerQuestion: "这周和上周分别卖了多少钱？",
  },
  {
    id: "orders",
    name: "订单数",
    plainName: "有多少人真的下单",
    whyItMatters: "区分销售额变化是因为订单变多，还是客单价变化。",
    homepageSignal: "和销售额并列展示，用来判断需求是否变弱。",
    priority: "结果",
    csvFields: ["orders", "order_count", "订单数", "支付订单数"],
    beginnerQuestion: "这周和上周分别有多少订单？",
  },
  {
    id: "traffic",
    name: "访客数 / 曝光量",
    plainName: "有多少人看到了或进了店",
    whyItMatters: "判断问题是不是出在没人来。如果没人来，先看渠道和广告。",
    homepageSignal: "放进 Agent 追问和数据健康检查，缺失时优先向用户要。",
    priority: "原因",
    csvFields: ["visitors", "sessions", "uv", "traffic", "访客数", "曝光量", "转化率"],
    beginnerQuestion: "平台能导出访客数、曝光量或 sessions 吗？",
  },
  {
    id: "conversion",
    name: "转化率",
    plainName: "进店的人里有多少真的买",
    whyItMatters: "判断商品页、价格、优惠、评价和竞品是否影响购买决定。",
    homepageSignal: "首页写成“进店后下单”，避免小白被术语卡住。",
    priority: "原因",
    csvFields: ["orders + visitors"],
    beginnerQuestion: "能同时给订单数和访客数吗？我会自己算转化率。",
  },
  {
    id: "average-order-value",
    name: "客单价",
    plainName: "每个订单平均花多少钱",
    whyItMatters: "判断销售额变化是不是来自套餐、加购、折扣或高低价商品结构。",
    homepageSignal: "作为二级诊断项，后续放进商品问题诊断。",
    priority: "原因",
    csvFields: ["revenue + orders"],
    beginnerQuestion: "能给销售额和订单数吗？我会自己算客单价。",
  },
  {
    id: "ads",
    name: "广告花费 / 广告成交额",
    plainName: "广告花了多少钱，又带回多少订单",
    whyItMatters: "判断增长是不是靠烧钱换来的，避免越投越亏。",
    homepageSignal: "首页展示“广告回本”，并用人话解释每花 1 美元带回多少成交。",
    priority: "风险",
    csvFields: ["ad_spend", "ad_revenue", "roas", "roi", "广告花费", "广告成交额", "投产比"],
    beginnerQuestion: "广告后台能导出花费和广告成交额吗？",
  },
  {
    id: "inventory",
    name: "库存 / 可售天数",
    plainName: "按现在速度还能卖几天",
    whyItMatters: "卖得好但断货会浪费流量，卖不动又会压库存。",
    homepageSignal: "首页的商品问题诊断会把库存少但增长快的 SKU 标成优先处理。",
    priority: "风险",
    csvFields: ["inventory", "stock", "库存", "可售库存"],
    beginnerQuestion: "每个 SKU 现在还有多少库存？",
  },
  {
    id: "returns",
    name: "退款 / 退货",
    plainName: "买完后有多少人退掉",
    whyItMatters: "判断商品质量、物流、描述不符和售后风险。",
    homepageSignal: "首页会在数据完整度、商品问题和周报里提示售后是否把成交吃回去。",
    priority: "风险",
    csvFields: [
      "refund_orders",
      "refund_amount",
      "refund_reason",
      "refund_rate",
      "returns",
      "customer_feedback",
      "退款单数",
      "退款金额",
      "退款原因",
      "退款率",
      "客服备注",
      "差评内容",
    ],
    beginnerQuestion: "平台能导出退款金额、退款单数或退货原因吗？",
  },
  {
    id: "competitors",
    name: "竞品价格 / 促销 / 卖点",
    plainName: "别人卖多少钱、怎么打折、主打什么理由",
    whyItMatters: "很多转化下降不是自己店坏了，而是竞品降价或卖点更清楚。",
    homepageSignal: "首页单独有竞品动态解释，并把价格压力翻译成运营动作。",
    priority: "外部",
    csvFields: ["competitor_url", "price", "promotion", "selling_points", "竞品链接"],
    beginnerQuestion: "你最在意的 1 到 3 个竞品链接是哪几个？",
  },
];

export function buildKpiGuideReply() {
  const lines = ecommerceKpiGuide.map(
    (metric, index) =>
      `${index + 1}. ${metric.name}：${metric.plainName}。${metric.whyItMatters}`,
  );

  return [
    "我会按“结果 -> 原因 -> 风险 -> 外部压力”的顺序看电商数据，不会让你先背术语：",
    "",
    ...lines,
    "",
    "首页也是按这个重要性体现：先放销售额和订单数判断大盘，再放转化、广告回本、库存和售后解释原因与风险，最后用竞品动态补充外部压力。",
    "你不用一次给全。缺哪一类，我会用一句人话继续问你要。",
  ].join("\n");
}
