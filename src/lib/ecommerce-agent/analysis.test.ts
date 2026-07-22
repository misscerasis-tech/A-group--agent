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
    expect(analysis.operationalTasks.length).toBe(analysis.nextActions.length);
    expect(analysis.operationalTasks[0]).toMatchObject({
      owner: expect.any(String),
      dueLabel: expect.any(String),
      acceptanceCriteria: expect.any(String),
    });
    expect(analysis.feishuReply).toContain("飞书");
    expect(analysis.dataHealth.some((item) => item.includes("已有成本或毛利数据"))).toBe(true);
    expect(analysis.dataHealth.some((item) => item.includes("已有退款/退货原因"))).toBe(true);
    expect(analysis.competitorInsights.some((item) => item.includes("观察快照"))).toBe(true);
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
          grossProfit: undefined,
          productCost: undefined,
        })),
      },
      previousWeek: {
        ...sampleEcommerceAgentInput.previousWeek,
        products: sampleEcommerceAgentInput.previousWeek.products.map((product) => ({
          ...product,
          grossProfit: undefined,
          productCost: undefined,
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

  it("asks for refund data instead of guessing售后风险", () => {
    const analysis = analyzeEcommerceStore({
      ...sampleEcommerceAgentInput,
      previousWeek: {
        ...sampleEcommerceAgentInput.previousWeek,
        products: sampleEcommerceAgentInput.previousWeek.products.map((product) => ({
          ...product,
          refundOrders: undefined,
          refundAmount: undefined,
          refundReason: undefined,
        })),
      },
      currentWeek: {
        ...sampleEcommerceAgentInput.currentWeek,
        products: sampleEcommerceAgentInput.currentWeek.products.map((product) => ({
          ...product,
          refundOrders: undefined,
          refundAmount: undefined,
          refundReason: undefined,
        })),
      },
    });

    expect(analysis.totals.current.refundOrders).toBeNull();
    expect(analysis.questionsForUser.some((item) => item.question.includes("退款"))).toBe(true);
    expect(analysis.dataHealth.some((item) => item.includes("还没有退款/退货数据"))).toBe(true);
    expect(analysis.plainSummary.some((line) => line.includes("退款/退货数据缺失"))).toBe(true);
  });

  it("flags high refund and return risk by sku", () => {
    const analysis = analyzeEcommerceStore({
      ...sampleEcommerceAgentInput,
      currentWeek: {
        ...sampleEcommerceAgentInput.currentWeek,
        products: sampleEcommerceAgentInput.currentWeek.products.map((product) =>
          product.sku === "CUP-WHITE-500"
            ? {
                ...product,
                refundOrders: 18,
                refundAmount: 760,
                refundReason: "颜色有色差 / 杯盖漏水",
              }
            : product,
        ),
      },
    });

    expect(analysis.productFindings.some((finding) => finding.issue === "售后风险偏高")).toBe(true);
    expect(
      analysis.productFindings.some(
        (finding) => finding.issue === "售后风险偏高" && finding.plainReason.includes("颜色有色差"),
      ),
    ).toBe(true);
    expect(analysis.nextActions.some((action) => action.title === "先查退款/退货原因")).toBe(true);
    expect(analysis.plainSummary.some((line) => line.includes("退款/退货这块"))).toBe(true);
  });

  it("uses customer voices to explain return risk when refund reasons are missing", () => {
    const analysis = analyzeEcommerceStore({
      ...sampleEcommerceAgentInput,
      previousWeek: {
        ...sampleEcommerceAgentInput.previousWeek,
        products: sampleEcommerceAgentInput.previousWeek.products.map((product) => ({
          ...product,
          refundReason: undefined,
        })),
      },
      currentWeek: {
        ...sampleEcommerceAgentInput.currentWeek,
        products: sampleEcommerceAgentInput.currentWeek.products.map((product) =>
          product.sku === "CUP-BLACK-500"
            ? {
                ...product,
                refundOrders: 16,
                refundAmount: 680,
                refundReason: undefined,
              }
            : {
                ...product,
                refundReason: undefined,
              },
        ),
      },
    });

    expect(analysis.dataHealth.some((item) => item.includes("用户声音"))).toBe(true);
    expect(
      analysis.productFindings.some(
        (finding) => finding.issue === "售后风险偏高" && finding.plainReason.includes("杯盖漏水"),
      ),
    ).toBe(true);
    expect(analysis.questionsForUser.some((item) => item.question.includes("客服备注"))).toBe(false);
  });

  it("explains average order value drops separately from order drops", () => {
    const analysis = analyzeEcommerceStore({
      ...sampleEcommerceAgentInput,
      previousWeek: {
        ...sampleEcommerceAgentInput.previousWeek,
        products: [
          {
            productName: "黑杯",
            sku: "CUP-BLACK",
            visitors: 100,
            orders: 10,
            revenue: 1000,
            unitsSold: 10,
            adSpend: 100,
            adRevenue: 500,
            inventory: 100,
            refundOrders: 0,
            refundAmount: 0,
          },
        ],
      },
      currentWeek: {
        ...sampleEcommerceAgentInput.currentWeek,
        products: [
          {
            productName: "黑杯",
            sku: "CUP-BLACK",
            visitors: 100,
            orders: 10,
            revenue: 700,
            unitsSold: 10,
            adSpend: 100,
            adRevenue: 400,
            inventory: 100,
            refundOrders: 0,
            refundAmount: 0,
          },
        ],
      },
    });

    expect(analysis.totals.averageOrderValueChange).toBeLessThan(0);
    expect(analysis.productFindings.some((finding) => finding.issue === "客单价下降")).toBe(true);
    expect(analysis.nextActions.some((action) => action.title === "检查折扣和套装结构")).toBe(true);
    expect(analysis.plainSummary.some((line) => line.includes("客单价"))).toBe(true);
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

  it("does not use stale or unavailable competitor prices for active discount decisions", () => {
    const baseProduct = {
      productName: "黑杯",
      sku: "CUP-BLACK",
      visitors: null,
      orders: 10,
      revenue: 1000,
      unitsSold: 10,
      adSpend: null,
      adRevenue: null,
      inventory: null,
    };

    const analysis = analyzeEcommerceStore({
      ...sampleEcommerceAgentInput,
      competitors: [
        {
          ...sampleEcommerceAgentInput.competitors[0],
          name: "历史低价竞品",
          price: 20,
          priceNote: "历史价，仅用于价格带分析；当前无 featured offer",
          promotion: "低价替代品",
        },
        {
          ...sampleEcommerceAgentInput.competitors[0],
          name: "定位文案竞品",
          price: 120,
          priceNote: "页面价快照",
          promotion: "高端温控旅行杯",
        },
      ],
      previousWeek: {
        ...sampleEcommerceAgentInput.previousWeek,
        products: [baseProduct],
      },
      currentWeek: {
        ...sampleEcommerceAgentInput.currentWeek,
        products: [baseProduct],
      },
    });

    expect(analysis.competitorInsights[0]).toContain("竞品价格没有明显压过我们");
    expect(analysis.competitorInsights.some((item) => item.includes("历史低价竞品 的价格比我们低"))).toBe(
      false,
    );
    expect(analysis.competitorInsights.some((item) => item.includes("不是当前可购买价"))).toBe(true);
    expect(analysis.competitorInsights.some((item) => item.includes("正在做促销"))).toBe(false);
  });

  it("still recognizes active competitor sale prices", () => {
    const baseProduct = {
      productName: "黑杯",
      sku: "CUP-BLACK",
      visitors: null,
      orders: 10,
      revenue: 1000,
      unitsSold: 10,
      adSpend: null,
      adRevenue: null,
      inventory: null,
    };

    const analysis = analyzeEcommerceStore({
      ...sampleEcommerceAgentInput,
      competitors: [
        {
          ...sampleEcommerceAgentInput.competitors[0],
          name: "真实促销竞品",
          price: 80,
          priceNote: "页面价快照",
          promotion: "summer sale price",
        },
      ],
      previousWeek: {
        ...sampleEcommerceAgentInput.previousWeek,
        products: [baseProduct],
      },
      currentWeek: {
        ...sampleEcommerceAgentInput.currentWeek,
        products: [baseProduct],
      },
    });

    expect(analysis.competitorInsights.some((item) => item.includes("真实促销竞品 的价格比我们低"))).toBe(
      true,
    );
    expect(analysis.competitorInsights.some((item) => item.includes("真实促销竞品 正在做促销"))).toBe(
      true,
    );
  });

  it("does not use stale competitor observations for current-week pricing decisions", () => {
    const baseProduct = {
      productName: "黑杯",
      sku: "CUP-BLACK",
      visitors: null,
      orders: 10,
      revenue: 1000,
      unitsSold: 10,
      adSpend: null,
      adRevenue: null,
      inventory: null,
    };

    const analysis = analyzeEcommerceStore({
      ...sampleEcommerceAgentInput,
      competitors: [
        {
          ...sampleEcommerceAgentInput.competitors[0],
          name: "过期促销竞品",
          observedAt: "2026-05-01",
          price: 80,
          priceNote: "页面价快照",
          promotion: "summer sale price",
        },
      ],
      previousWeek: {
        ...sampleEcommerceAgentInput.previousWeek,
        products: [baseProduct],
      },
      currentWeek: {
        ...sampleEcommerceAgentInput.currentWeek,
        endDate: "2026-07-19",
        products: [baseProduct],
      },
    });

    expect(analysis.competitorInsights[0]).toContain("竞品价格没有明显压过我们");
    expect(analysis.competitorInsights.some((item) => item.includes("过期促销竞品 的价格比我们低"))).toBe(
      false,
    );
    expect(analysis.competitorInsights.some((item) => item.includes("已超过 30 天"))).toBe(true);
    expect(analysis.competitorInsights.some((item) => item.includes("过期促销竞品 正在做促销"))).toBe(
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
    expect(analysis.operationalTasks[0]).toMatchObject({
      title: "先核对利润口径",
      owner: "店铺负责人",
      priority: "medium",
    });
  });

  it("does not ask for goal priority when the user already gave a specific goal", () => {
    const analysis = analyzeEcommerceStore({
      ...sampleEcommerceAgentInput,
      store: {
        ...sampleEcommerceAgentInput.store,
        goal: "这周先保利润",
      },
    });

    expect(analysis.questionsForUser.some((item) => item.question.includes("保销量"))).toBe(false);
  });

  it("prioritizes return reduction goals", () => {
    const analysis = analyzeEcommerceStore({
      ...sampleEcommerceAgentInput,
      store: {
        ...sampleEcommerceAgentInput.store,
        goal: "这周先降低退货和差评",
      },
    });

    expect(analysis.nextActions[0].title).toBe("先确认退款/退货口径");
  });
});
