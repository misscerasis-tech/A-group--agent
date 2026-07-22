import * as XLSX from "xlsx";

export function isWorkbookFileName(fileName: string) {
  return /\.(xlsx|xls)$/i.test(fileName.trim());
}

function countNonEmptyCells(row: unknown[]) {
  return row.filter((cell) => String(cell ?? "").trim().length > 0).length;
}

function isLikelyDataTable(sheet: XLSX.WorkSheet) {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
  });
  const nonEmptyRows = rows.filter((row) => countNonEmptyCells(row) > 0);
  const firstWideRowIndex = nonEmptyRows.findIndex((row) => countNonEmptyCells(row) >= 2);

  if (firstWideRowIndex < 0) {
    return false;
  }

  return nonEmptyRows.slice(firstWideRowIndex + 1).some((row) => countNonEmptyCells(row) >= 2);
}

export function workbookArrayBufferToCsv(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: false,
  });

  if (workbook.SheetNames.length === 0) {
    throw new Error("Excel 文件里没有可读取的工作表。");
  }

  const nonEmptySheets: Array<{ sheet: XLSX.WorkSheet; csv: string }> = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet, {
      FS: ",",
      RS: "\n",
      blankrows: false,
    });

    if (csv.trim()) {
      nonEmptySheets.push({ sheet, csv });
    }
  }

  const tableSheet = nonEmptySheets.find(({ sheet }) => isLikelyDataTable(sheet));

  if (tableSheet) {
    return tableSheet.csv;
  }

  if (nonEmptySheets[0]) {
    return nonEmptySheets[0].csv;
  }

  throw new Error("Excel 文件里的工作表都没有可读取的数据。");
}
