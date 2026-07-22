import { describe, expect, it } from "vitest";
import { buildKpiGuideReply, ecommerceKpiGuide } from "./kpi-guide";

describe("ecommerce kpi guide", () => {
  it("keeps beginner-facing KPI explanations in priority order", () => {
    expect(ecommerceKpiGuide[0].priority).toBe("结果");
    expect(ecommerceKpiGuide[0].name).toBe("销售额");
    expect(ecommerceKpiGuide.some((metric) => metric.priority === "外部")).toBe(true);

    const reply = buildKpiGuideReply();

    expect(reply).toContain("结果 -> 原因 -> 风险 -> 外部压力");
    expect(reply).toContain("首页也是按这个重要性体现");
  });
});
