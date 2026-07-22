import * as XLSX from "xlsx";

export function isWorkbookFileName(fileName: string) {
  return /\.(xlsx|xls)$/i.test(fileName.trim());
}

export function workbookArrayBufferToCsv(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: false,
  });

  if (workbook.SheetNames.length === 0) {
    throw new Error("Excel 文件里没有可读取的工作表。");
  }

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet, {
      FS: ",",
      RS: "\n",
      blankrows: false,
    });

    if (csv.trim()) {
      return csv;
    }
  }

  throw new Error("Excel 文件里的工作表都没有可读取的数据。");
}
