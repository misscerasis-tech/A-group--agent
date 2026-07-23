import { describe, expect, it } from "vitest";
import { analyzeEcommerceStore } from "./analysis";
import { buildOperationalWorkspace } from "./operational-workspace";
import { sampleEcommerceAgentInput } from "./sample-data";

describe("operational workspace", () => {
  it("turns an analysis into usable work surfaces", () => {
    const analysis = analyzeEcommerceStore(sampleEcommerceAgentInput);
    const workspace = buildOperationalWorkspace(sampleEcommerceAgentInput, analysis);

    expect(workspace.calendar).toHaveLength(4);
    expect(workspace.calendar[0].slot).toBe("今天");
    expect(workspace.calendar[0].output).toContain("已");
    expect(workspace.reviewQueue.length).toBeGreaterThan(0);
    expect(workspace.reviewQueue.some((item) => item.decisionNeeded.includes("确认"))).toBe(true);
    expect(workspace.reminders.some((rule) => rule.trigger.includes("复盘"))).toBe(true);
    expect(workspace.packageArtifacts.map((artifact) => artifact.title)).toContain("经营周报 Markdown");
    expect(workspace.recapMetrics.map((row) => row.name)).toContain("销售额");
    expect(workspace.weeklyMarkdown).toContain("下周行动");
    expect(workspace.taskTable).toContain("验收标准");
    expect(workspace.riskTable).toContain("人话原因");
  });
});
