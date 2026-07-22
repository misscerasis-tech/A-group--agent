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
    expect(analysis.plainSummary.some((line) => line.includes("不能判断"))).toBe(true);
  });
});
