import { describe, expect, it } from "vitest";
import { buildEcommerceInputFromCsv } from "./csv-import";
import {
  buildBeginnerWorkSession,
  formatBeginnerWorkSessionForFeishu,
} from "./work-session";

describe("beginner work session", () => {
  it("asks for a metrics CSV when there is no data yet", () => {
    const session = buildBeginnerWorkSession();

    expect(session.nextQuestion).toContain("经营数据 CSV/TSV");
    expect(session.steps.some((step) => step.status === "needs_user")).toBe(true);
  });

  it("moves to runnable steps when the CSV can be analyzed", () => {
    const importResult = buildEcommerceInputFromCsv({
      metricsCsv: [
        "week,product_name,orders,revenue,units_sold",
        "previous,黑杯,10,500,12",
        "current,黑杯,8,420,9",
      ].join("\n"),
    });
    const session = buildBeginnerWorkSession(importResult.report);
    const formatted = formatBeginnerWorkSessionForFeishu(session);

    expect(session.steps.some((step) => step.status === "agent_can_run")).toBe(true);
    expect(formatted).toContain("Agent 动作");
  });
});
