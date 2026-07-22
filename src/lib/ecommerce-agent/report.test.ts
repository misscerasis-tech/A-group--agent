import { describe, expect, it } from "vitest";
import { analyzeEcommerceStore } from "./analysis";
import {
  buildOperationalTasksTsv,
  buildProductFindingsTsv,
  buildWeeklyMarkdownReport,
} from "./report";
import { sampleEcommerceAgentInput } from "./sample-data";

describe("weekly markdown report", () => {
  it("builds a Feishu-doc-ready markdown report", () => {
    const analysis = analyzeEcommerceStore(sampleEcommerceAgentInput);
    const report = buildWeeklyMarkdownReport(sampleEcommerceAgentInput, analysis);

    expect(report).toContain("# Aurora Cup 独立站 经营复盘");
    expect(report).toContain("## 2. 关键指标");
    expect(report).toContain("| 销售额 |");
    expect(report).toContain("| 客单价 |");
    expect(report).toContain("客单价变化");
    expect(report).toContain("| 退款金额 |");
    expect(report).toContain("退款/退货单占比变化");
    expect(report).toContain("## 5. 用户声音");
    expect(report).toContain("杯盖漏水");
    expect(report).toContain("观察快照");
    expect(report).toContain("## 7. 下周行动");
    expect(report).toContain("| 状态 | 优先级 | 截止 | 负责人 | 任务 | 验收标准 |");
    expect(report).toContain("验收");
  });

  it("builds a task table that can be pasted into Feishu sheets", () => {
    const analysis = analyzeEcommerceStore(sampleEcommerceAgentInput);
    const taskTable = buildOperationalTasksTsv(analysis);

    expect(taskTable.split("\n")[0]).toBe("状态\t优先级\t截止\t负责人\t任务\t第一步\t验收标准\t原因");
    expect(taskTable).toContain("待开始");
    expect(taskTable).toContain("验收");
    expect(taskTable).toContain("店铺负责人");
  });

  it("builds a product risk table that can be pasted into Feishu sheets", () => {
    const analysis = analyzeEcommerceStore(sampleEcommerceAgentInput);
    const riskTable = buildProductFindingsTsv(analysis);

    expect(riskTable.split("\n")[0]).toBe("排查状态\t优先级\t建议负责人\t商品\tSKU\t问题\t人话原因\t建议动作");
    expect(riskTable).toContain("待排查");
    expect(riskTable).toContain("CUP-BLACK-500");
    expect(riskTable).toContain("销售明显下滑");
    expect(riskTable).toContain("商品页");
  });
});
