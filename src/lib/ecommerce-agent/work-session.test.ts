import { describe, expect, it } from "vitest";
import { analyzeEcommerceStore } from "./analysis";
import { buildEcommerceInputFromCsv } from "./csv-import";
import {
  buildBeginnerWorkSession,
  formatBeginnerWorkSessionForFeishu,
} from "./work-session";

describe("beginner work session", () => {
  it("asks for a metrics CSV when there is no data yet", () => {
    const session = buildBeginnerWorkSession();

    expect(session.nextQuestion).toContain("经营数据表");
    expect(session.nextQuestion).toContain("Markdown");
    expect(session.copyableTable?.csv).toContain("week,product_name,sku");
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
    expect(session.copyableTable).toBeUndefined();
    expect(formatted).toContain("Agent 动作");
  });

  it("shows a reference table when rows exist but periods are incomplete", () => {
    const importResult = buildEcommerceInputFromCsv({
      metricsCsv: [
        "week,product_name,orders,revenue,units_sold",
        "current,黑杯,8,420,9",
      ].join("\n"),
    });
    const session = buildBeginnerWorkSession(importResult.report);

    expect(importResult.report.ok).toBe(false);
    expect(session.nextQuestion).toContain("上周");
    expect(session.copyableTable?.csv).toContain("previous");
    expect(session.copyableTable?.csv).toContain("current");
  });

  it("uses analysis questions as the next prompt after data can be analyzed", () => {
    const importResult = buildEcommerceInputFromCsv({
      metricsCsv: [
        "week,product_name,orders,revenue,units_sold",
        "previous,黑杯,10,500,12",
        "current,黑杯,8,420,9",
      ].join("\n"),
    });

    if (!importResult.input) {
      throw new Error("测试数据应该能生成 Agent 输入。");
    }

    const analysis = analyzeEcommerceStore(importResult.input);
    const session = buildBeginnerWorkSession(importResult.report, analysis.questionsForUser);

    expect(session.nextQuestion).toContain("访客数");
    expect(
      session.steps.some(
        (step) => step.title === "补风险数据" && step.userAction.includes("访客数"),
      ),
    ).toBe(true);
  });
});
