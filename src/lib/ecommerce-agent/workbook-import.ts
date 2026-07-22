import * as XLSX from "xlsx";

export function isWorkbookFileName(fileName: string) {
  return /\.(xlsx|xls)$/i.test(fileName.trim());
}

export function workbookArrayBufferToCsv(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: false,
  });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("Excel 文件里没有可读取的工作表。");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const csv = XLSX.utils.sheet_to_csv(sheet, {
    FS: ",",
    RS: "\n",
    blankrows: false,
  });

  if (!csv.trim()) {
    throw new Error("Excel 第一张工作表没有可读取的数据。");
  }

  return csv;
}
