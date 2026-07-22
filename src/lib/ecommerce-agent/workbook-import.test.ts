import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { buildEcommerceInputFromCsv } from "./csv-import";
import { isWorkbookFileName, workbookArrayBufferToCsv } from "./workbook-import";

function workbookToArrayBuffer(workbook: XLSX.WorkBook) {
  const buffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "buffer",
  }) as Buffer;

  return new Uint8Array(buffer).buffer;
}

describe("workbook import", () => {
  it("detects Excel workbook file names", () => {
    expect(isWorkbookFileName("运营数据.xlsx")).toBe(true);
    expect(isWorkbookFileName("orders.XLS")).toBe(true);
    expect(isWorkbookFileName("metrics.csv")).toBe(false);
  });

  it("converts the first workbook sheet into importable csv", () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["周期", "商品名称", "订单数", "销售额", "销量"],
      ["上周", "黑杯", 10, 500, 12],
      ["本周", "黑杯", 8, 420, 9],
    ]);

    XLSX.utils.book_append_sheet(workbook, sheet, "经营数据");

    const csv = workbookArrayBufferToCsv(workbookToArrayBuffer(workbook));
    const importResult = buildEcommerceInputFromCsv({ metricsCsv: csv });

    expect(csv).toContain("周期,商品名称,订单数,销售额,销量");
    expect(importResult.report.ok).toBe(true);
    expect(importResult.input?.currentWeek.products[0].orders).toBe(8);
  });

  it("uses the first non-empty workbook sheet", () => {
    const workbook = XLSX.utils.book_new();
    const emptySheet = XLSX.utils.aoa_to_sheet([]);
    const metricsSheet = XLSX.utils.aoa_to_sheet([
      ["周期", "商品名称", "订单数", "销售额", "销量"],
      ["上周", "黑杯", 10, 500, 12],
      ["本周", "黑杯", 8, 420, 9],
    ]);

    XLSX.utils.book_append_sheet(workbook, emptySheet, "说明页");
    XLSX.utils.book_append_sheet(workbook, metricsSheet, "经营数据");

    const csv = workbookArrayBufferToCsv(workbookToArrayBuffer(workbook));
    const importResult = buildEcommerceInputFromCsv({ metricsCsv: csv });

    expect(csv).toContain("周期,商品名称,订单数,销售额,销量");
    expect(importResult.report.ok).toBe(true);
  });
});
