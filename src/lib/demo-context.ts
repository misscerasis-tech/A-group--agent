import type { WorkspaceContext } from "@/lib/workspace-context";

export const demoWorkspaceContext = {
  user: {
    id: "demo-user",
    name: "新手店主",
    email: "demo@example.com",
  },
  workspaces: [
    {
      id: "demo-workspace",
      name: "A 组电商运营 Demo",
      slug: "a-group-ecommerce-demo",
      role: "OWNER",
    },
  ],
  currentWorkspace: {
    id: "demo-workspace",
    name: "A 组电商运营 Demo",
    slug: "a-group-ecommerce-demo",
  },
  currentRole: "OWNER",
} as WorkspaceContext;

export const demoProject = {
  id: "demo-project-weekly-ops-review",
  name: "Aurora Cup 本周经营复盘",
  description: "围绕销量、利润、广告回本、库存风险和竞品压力的电商运营复盘项目。",
  status: "ACTIVE" as const,
  linkedProducts: 3,
};

export const demoProducts = [
  {
    id: "demo-product-black",
    name: "Aurora Cup 黑色 500ml",
    description: "主推款，本周销售下滑，需要优先检查价格、首图、优惠和广告来源。",
    status: "ACTIVE" as const,
    linkedProjects: 1,
  },
  {
    id: "demo-product-white",
    name: "Aurora Cup 白色 500ml",
    description: "稳定款，订单轻微下滑，适合继续观察转化和广告成本。",
    status: "ACTIVE" as const,
    linkedProjects: 1,
  },
  {
    id: "demo-product-gift",
    name: "Aurora Cup 礼盒套装",
    description: "增长款，但库存紧张，适合优先确认补货周期或控制推广强度。",
    status: "ACTIVE" as const,
    linkedProjects: 1,
  },
];

export const ecommerceMetricGuide = [
  {
    name: "销售额",
    plainName: "这周一共卖了多少钱",
    whyItMatters: "判断店铺整体有没有变好，是老板和运营最先看的结果指标。",
    homepageSignal: "首页放在第一张指标卡，用红绿变化提醒本周大盘方向。",
    priority: "结果",
  },
  {
    name: "订单数",
    plainName: "有多少人真的下单",
    whyItMatters: "区分销售额变化是因为订单变多，还是客单价变化。",
    homepageSignal: "和销售额并列展示，用来判断需求是否变弱。",
    priority: "结果",
  },
  {
    name: "访客数 / 曝光量",
    plainName: "有多少人看到了或进了店",
    whyItMatters: "判断问题是不是出在没人来。如果没人来，先看渠道和广告。",
    homepageSignal: "放进 Agent 追问和数据健康检查，缺失时优先向用户要。",
    priority: "原因",
  },
  {
    name: "转化率",
    plainName: "进店的人里有多少真的买",
    whyItMatters: "判断商品页、价格、优惠、评价和竞品是否影响购买决定。",
    homepageSignal: "首页写成“进店后下单”，避免小白被术语卡住。",
    priority: "原因",
  },
  {
    name: "客单价",
    plainName: "每个订单平均花多少钱",
    whyItMatters: "判断销售额变化是不是来自套餐、加购、折扣或高低价商品结构。",
    homepageSignal: "作为二级诊断项，后续放进商品问题诊断。",
    priority: "原因",
  },
  {
    name: "广告花费 / 广告成交额",
    plainName: "广告花了多少钱，又带回多少订单",
    whyItMatters: "判断增长是不是靠烧钱换来的，避免越投越亏。",
    homepageSignal: "首页展示“广告回本”，并用人话解释每花 1 美元带回多少成交。",
    priority: "风险",
  },
  {
    name: "库存 / 可售天数",
    plainName: "按现在速度还能卖几天",
    whyItMatters: "卖得好但断货会浪费流量，卖不动又会压库存。",
    homepageSignal: "首页的商品问题诊断会把库存少但增长快的 SKU 标成优先处理。",
    priority: "风险",
  },
  {
    name: "退款 / 退货",
    plainName: "买完后有多少人退掉",
    whyItMatters: "判断商品质量、物流、描述不符和售后风险。",
    homepageSignal: "第一版样例暂不展示，真实数据接入后进入风险提醒。",
    priority: "风险",
  },
  {
    name: "竞品价格 / 促销 / 卖点",
    plainName: "别人卖多少钱、怎么打折、主打什么理由",
    whyItMatters: "很多转化下降不是自己店坏了，而是竞品降价或卖点更清楚。",
    homepageSignal: "首页单独有竞品动态解释，并把价格压力翻译成运营动作。",
    priority: "外部",
  },
];
