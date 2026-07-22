import { describe, expect, it } from "vitest";
import { analyzeEcommerceStore } from "./analysis";
import { buildWeeklyMarkdownReport } from "./report";
import { sampleEcommerceAgentInput } from "./sample-data";

describe("weekly markdown report", () => {
  it("builds a Feishu-doc-ready markdown report", () => {
    const analysis = analyzeEcommerceStore(sampleEcommerceAgentInput);
    const report = buildWeeklyMarkdownReport(sampleEcommerceAgentInput, analysis);

    expect(report).toContain("# Aurora Cup 独立站 经营复盘");
    expect(report).toContain("## 2. 关键指标");
    expect(report).toContain("| 销售额 |");
    expect(report).toContain("## 6. 下周行动");
  });
});
