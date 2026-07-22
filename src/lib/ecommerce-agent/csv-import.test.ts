import { describe, expect, it } from "vitest";
import { buildEcommerceInputFromCsv, parseCsv } from "./csv-import";

describe("ecommerce csv import", () => {
  it("parses quoted csv cells", () => {
    const table = parseCsv('name,revenue\n"Aurora, black",1234');

    expect(table.rows[0].name).toBe("Aurora, black");
  });

  it("maps Chinese ecommerce headers into agent input", () => {
    const result = buildEcommerceInputFromCsv({
      metricsCsv: [
        "周期,商品名称,SKU,访客数,订单数,销售额,销量,广告花费,广告成交额,库存",
        "上周,黑杯,CUP-BLACK,100,10,500,12,80,240,50",
        "本周,黑杯,CUP-BLACK,120,9,450,10,90,180,40",
      ].join("\n"),
      competitorsCsv: ["竞品名称,价格,促销,核心卖点", "竞品 A,39.9,满减,低价 / 大容量"].join("\n"),
      store: {
        storeName: "真实店铺导入测试",
        platform: "Shopify",
      },
    });

    expect(result.report.ok).toBe(true);
    expect(result.input?.store.storeName).toBe("真实店铺导入测试");
    expect(result.input?.currentWeek.products[0].revenue).toBe(450);
    expect(result.input?.competitors[0].keySellingPoints).toEqual(["低价", "大容量"]);
  });

  it("asks for missing required fields instead of guessing", () => {
    const result = buildEcommerceInputFromCsv({
      metricsCsv: ["周期,商品名称,销售额", "本周,黑杯,450"].join("\n"),
    });

    expect(result.report.ok).toBe(false);
    expect(result.input).toBeUndefined();
    expect(result.report.questionsForUser.some((question) => question.includes("订单数"))).toBe(true);
    expect(result.report.issues.some((issue) => issue.severity === "error")).toBe(true);
  });

  it("uses product name as a temporary key when sku is missing", () => {
    const result = buildEcommerceInputFromCsv({
      metricsCsv: [
        "week,product_name,orders,revenue,units_sold",
        "previous,黑杯,10,500,12",
        "current,黑杯,9,450,10",
      ].join("\n"),
    });

    expect(result.report.ok).toBe(true);
    expect(result.input?.currentWeek.products[0].sku).toBe("黑杯");
    expect(result.report.issues.some((issue) => issue.message.includes("临时用商品名称"))).toBe(true);
  });

  it("imports cost and gross profit fields when available", () => {
    const result = buildEcommerceInputFromCsv({
      metricsCsv: [
        "week,product_name,orders,revenue,units_sold,商品成本,毛利",
        "previous,黑杯,10,500,12,320,180",
        "current,黑杯,9,450,10,330,120",
      ].join("\n"),
    });

    expect(result.report.ok).toBe(true);
    expect(result.input?.currentWeek.products[0].productCost).toBe(330);
    expect(result.input?.currentWeek.products[0].grossProfit).toBe(120);
  });
});
