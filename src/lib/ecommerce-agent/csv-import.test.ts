import { describe, expect, it } from "vitest";
import { buildEcommerceInputFromCsv, parseCsv } from "./csv-import";

describe("ecommerce csv import", () => {
  it("parses quoted csv cells", () => {
    const table = parseCsv('name,revenue\n"Aurora, black",1234');

    expect(table.rows[0].name).toBe("Aurora, black");
    expect(table.delimiter).toBe(",");
  });

  it("parses tab-separated data copied from spreadsheets", () => {
    const result = buildEcommerceInputFromCsv({
      metricsCsv: [
        "week\tproduct_name\torders\trevenue\tunits_sold",
        "previous\t黑杯\t10\t500\t12",
        "current\t黑杯\t9\t450\t10",
      ].join("\n"),
    });

    expect(result.report.ok).toBe(true);
    expect(result.input?.currentWeek.products[0].revenue).toBe(450);
  });

  it("parses semicolon-separated platform exports", () => {
    const result = buildEcommerceInputFromCsv({
      metricsCsv: [
        "week;product_name;orders;revenue;units_sold",
        "previous;黑杯;10;500;12",
        "current;黑杯;9;450;10",
      ].join("\n"),
    });

    expect(result.report.ok).toBe(true);
    expect(result.input?.currentWeek.products[0].orders).toBe(9);
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

  it("imports refund and return fields from Chinese headers", () => {
    const result = buildEcommerceInputFromCsv({
      metricsCsv: [
        "周期,商品名称,订单数,销售额,销量,退款单数,退款金额",
        "上周,黑杯,10,500,12,1,30",
        "本周,黑杯,9,450,10,2,80",
      ].join("\n"),
    });

    expect(result.report.ok).toBe(true);
    expect(result.input?.currentWeek.products[0].refundOrders).toBe(2);
    expect(result.input?.currentWeek.products[0].refundAmount).toBe(80);
    expect(
      result.report.fieldMappings.some(
        (mapping) => mapping.canonicalField === "refundOrders" && mapping.sourceHeader === "退款单数",
      ),
    ).toBe(true);
  });

  it("uses the latest two periods when a platform export contains more than two weeks", () => {
    const result = buildEcommerceInputFromCsv({
      metricsCsv: [
        "week,product_name,orders,revenue,units_sold",
        "2026-07-01,黑杯,8,400,9",
        "2026-07-08,黑杯,10,500,12",
        "2026-07-15,黑杯,9,450,10",
      ].join("\n"),
    });

    expect(result.report.ok).toBe(true);
    expect(result.input?.previousWeek.products[0].revenue).toBe(500);
    expect(result.input?.currentWeek.products[0].revenue).toBe(450);
    expect(result.report.issues.some((issue) => issue.message.includes("最近两期"))).toBe(true);
  });

  it("uses start date as the period when a platform export has no week column", () => {
    const result = buildEcommerceInputFromCsv({
      metricsCsv: [
        "start_date,end_date,product_name,orders,revenue,units_sold",
        "2026-07-01,2026-07-07,黑杯,8,400,9",
        "2026-07-08,2026-07-14,黑杯,10,500,12",
        "2026-07-15,2026-07-21,黑杯,9,450,10",
      ].join("\n"),
    });

    expect(result.report.ok).toBe(true);
    expect(result.input?.previousWeek.startDate).toBe("2026-07-08");
    expect(result.input?.currentWeek.startDate).toBe("2026-07-15");
    expect(result.input?.currentWeek.products[0].revenue).toBe(450);
  });

  it("rejects impossible negative operating metrics", () => {
    const result = buildEcommerceInputFromCsv({
      metricsCsv: [
        "week,product_name,orders,revenue,units_sold,inventory",
        "previous,黑杯,-1,500,12,20",
        "current,黑杯,9,450,10,-3",
      ].join("\n"),
    });

    expect(result.report.ok).toBe(false);
    expect(result.report.issues.some((issue) => issue.message.includes("不能为负数"))).toBe(true);
    expect(result.report.issues.some((issue) => issue.rowNumber === 3 && issue.message.includes("库存"))).toBe(
      true,
    );
    expect(result.report.questionsForUser[0]).toContain("请修正第 2 行");
  });

  it("rejects negative refund metrics", () => {
    const result = buildEcommerceInputFromCsv({
      metricsCsv: [
        "week,product_name,orders,revenue,units_sold,refund_amount",
        "previous,黑杯,10,500,12,30",
        "current,黑杯,9,450,10,-5",
      ].join("\n"),
    });

    expect(result.report.ok).toBe(false);
    expect(result.report.issues.some((issue) => issue.message.includes("退款金额"))).toBe(true);
  });

  it("warns when refund metrics may include historical orders", () => {
    const result = buildEcommerceInputFromCsv({
      metricsCsv: [
        "week,product_name,orders,revenue,units_sold,refund_orders,refund_amount",
        "previous,黑杯,10,500,12,1,30",
        "current,黑杯,2,100,2,3,130",
      ].join("\n"),
    });

    expect(result.report.ok).toBe(true);
    expect(result.report.issues.some((issue) => issue.severity === "warning" && issue.message.includes("历史订单"))).toBe(
      true,
    );
  });
});
