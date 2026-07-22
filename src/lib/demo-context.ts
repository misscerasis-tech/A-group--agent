import type { WorkspaceContext } from "@/lib/workspace-context";

export { ecommerceKpiGuide } from "@/lib/ecommerce-agent/kpi-guide";

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
