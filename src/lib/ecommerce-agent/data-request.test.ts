import { describe, expect, it } from "vitest";
import { analyzeEcommerceStore } from "./analysis";
import { buildEcommerceInputFromCsv } from "./csv-import";
import {
  buildDataRequestPlan,
  buildDataRequestPlanTsv,
  formatDataRequestPlanForFeishu,
} from "./data-request";
import { sampleEcommerceAgentInput } from "./sample-data";

describe("data request plan", () => {
  it("creates a starter request when there is no report yet", () => {
    const plan = buildDataRequestPlan();

    expect(plan.items[0]).toMatchObject({
      id: "weekly-metrics",
      priority: "must",
      status: "missing",
    });
    expect(plan.nextQuestion).toContain("经营数据");
    expect(formatDataRequestPlanForFeishu(plan)).toContain("下一句我会问你");
  });

  it("turns missing required fields into a must-fix request", () => {
    const importResult = buildEcommerceInputFromCsv({
      metricsCsv: ["周期,商品名称,销售额", "本周,黑杯,450"].join("\n"),
    });
    const plan = buildDataRequestPlan(importResult.report);
    const tsv = buildDataRequestPlanTsv(plan);

    expect(plan.items[0]).toMatchObject({
      id: "fix-metrics",
      priority: "must",
      status: "missing",
    });
    expect(plan.nextQuestion).toContain("订单数");
    expect(plan.nextQuestion).toContain("销量");
    expect(tsv).toContain("优先级\t状态\t要补的数据");
    expect(tsv).toContain("修正经营数据表");
  });

  it("uses analysis questions to ask for optional data that makes diagnosis sharper", () => {
    const importResult = buildEcommerceInputFromCsv({
      metricsCsv: [
        "week,product_name,orders,revenue,units_sold",
        "previous,黑杯,10,500,12",
        "current,黑杯,8,420,9",
      ].join("\n"),
    });

    if (!importResult.input) {
      throw new Error("测试数据应该可分析。");
    }

    const analysis = analyzeEcommerceStore(importResult.input);
    const plan = buildDataRequestPlan(importResult.report, analysis.questionsForUser);
    const requestIds = plan.items.map((item) => item.id);

    expect(requestIds).toContain("traffic");
    expect(requestIds).toContain("ads");
    expect(requestIds).toContain("inventory");
    expect(requestIds).toContain("gross-profit");
    expect(requestIds).toContain("returns");
    expect(requestIds).toContain("competitors");
    expect(plan.summary).toContain("已经能继续工作");
  });

  it("does not ask for more data when the sample already supports a full review", () => {
    const analysis = analyzeEcommerceStore({
      ...sampleEcommerceAgentInput,
      store: {
        ...sampleEcommerceAgentInput.store,
        goal: "这周先保利润",
      },
    });
    const plan = buildDataRequestPlan(undefined, analysis.questionsForUser, {
      hasKnownInput: true,
    });

    expect(plan.items[0].id).toBe("ready-to-run");
    expect(plan.summary).toContain("核心数据暂时够用");
  });
});
