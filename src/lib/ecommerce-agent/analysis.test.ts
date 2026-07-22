import { describe, expect, it } from "vitest";
import { analyzeEcommerceStore } from "./analysis";
import { sampleEcommerceAgentInput } from "./sample-data";

describe("ecommerce agent analysis", () => {
  it("explains store performance in beginner-friendly language", () => {
    const analysis = analyzeEcommerceStore(sampleEcommerceAgentInput);

    expect(analysis.headline).toContain("销售额");
    expect(analysis.plainSummary.length).toBeGreaterThan(0);
    expect(analysis.productFindings.some((finding) => finding.priority === "high")).toBe(true);
    expect(analysis.nextActions.length).toBeGreaterThanOrEqual(3);
    expect(analysis.feishuReply).toContain("飞书");
  });

  it("asks for missing data instead of guessing", () => {
    const analysis = analyzeEcommerceStore({
      ...sampleEcommerceAgentInput,
      competitors: [],
      currentWeek: {
        ...sampleEcommerceAgentInput.currentWeek,
        products: sampleEcommerceAgentInput.currentWeek.products.map((product) => ({
          ...product,
          visitors: null,
        })),
      },
    });

    expect(analysis.questionsForUser.some((item) => item.question.includes("访客数"))).toBe(true);
    expect(analysis.questionsForUser.some((item) => item.question.includes("竞品链接"))).toBe(true);
    expect(analysis.questionsForUser.some((item) => item.question.includes("成本"))).toBe(true);
    expect(analysis.plainSummary.some((line) => line.includes("不能判断"))).toBe(true);
  });

  it("uses gross profit data when available", () => {
    const analysis = analyzeEcommerceStore({
      ...sampleEcommerceAgentInput,
      previousWeek: {
        ...sampleEcommerceAgentInput.previousWeek,
        products: sampleEcommerceAgentInput.previousWeek.products.map((product) => ({
          ...product,
          grossProfit: product.revenue * 0.4,
        })),
      },
      currentWeek: {
        ...sampleEcommerceAgentInput.currentWeek,
        products: sampleEcommerceAgentInput.currentWeek.products.map((product) => ({
          ...product,
          grossProfit: product.revenue * 0.2,
        })),
      },
    });

    expect(analysis.totals.grossProfitChangeRate).not.toBeNull();
    expect(analysis.productFindings.some((finding) => finding.issue === "利润空间偏低")).toBe(true);
    expect(analysis.plainSummary.some((line) => line.includes("毛利"))).toBe(true);
  });

  it("does not treat missing competitor data as an active competitor promotion", () => {
    const analysis = analyzeEcommerceStore({
      ...sampleEcommerceAgentInput,
      competitors: [],
      previousWeek: {
        ...sampleEcommerceAgentInput.previousWeek,
        products: [
          {
            productName: "黑杯",
            sku: "CUP-BLACK",
            visitors: null,
            orders: 10,
            revenue: 1000,
            unitsSold: 10,
            adSpend: null,
            adRevenue: null,
            inventory: null,
          },
        ],
      },
      currentWeek: {
        ...sampleEcommerceAgentInput.currentWeek,
        products: [
          {
            productName: "黑杯",
            sku: "CUP-BLACK",
            visitors: null,
            orders: 9,
            revenue: 900,
            unitsSold: 9,
            adSpend: null,
            adRevenue: null,
            inventory: null,
          },
        ],
      },
    });

    expect(analysis.competitorInsights[0]).toContain("还没有竞品数据");
    expect(analysis.nextActions.some((action) => action.title === "先处理主推款购买理由")).toBe(
      false,
    );
  });

  it("changes next actions when the user goal is profit", () => {
    const analysis = analyzeEcommerceStore({
      ...sampleEcommerceAgentInput,
      store: {
        ...sampleEcommerceAgentInput.store,
        goal: "这周先保利润",
      },
      previousWeek: {
        ...sampleEcommerceAgentInput.previousWeek,
        products: sampleEcommerceAgentInput.previousWeek.products.map((product) => ({
          ...product,
          grossProfit: undefined,
          productCost: undefined,
        })),
      },
      currentWeek: {
        ...sampleEcommerceAgentInput.currentWeek,
        products: sampleEcommerceAgentInput.currentWeek.products.map((product) => ({
          ...product,
          grossProfit: undefined,
          productCost: undefined,
        })),
      },
    });

    expect(analysis.nextActions[0].title).toBe("先核对利润口径");
  });
});
