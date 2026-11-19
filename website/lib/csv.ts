// 簡單的 CSV 工具（不使用外部套件）
// - 解析：支援引號、欄位內的逗號與換行、""（跳脫的引號）、UTF-8 BOM
// - 產生：UTF-8 加 BOM，Excel 與 Google Sheet 開啟中文不會亂碼

export type CsvRecord = {
  line: number; // 這一列在檔案中從第幾行開始（給錯誤訊息用）
  cells: string[];
};

export function parseCsv(input: string): CsvRecord[] {
  const text = input.replace(/^﻿/, ""); // 去掉 BOM
  const records: CsvRecord[] = [];
  let cells: string[] = [];
  let cell = "";
  let inQuotes = false;
  let line = 1;
  let recordLine = 1;

  const endCell = () => {
    cells.push(cell);
    cell = "";
  };
  const endRecord = () => {
    endCell();
    // 整列都是空的就略過
    if (cells.some((c) => c.trim() !== "")) records.push({ line: recordLine, cells });
    cells = [];
    recordLine = line;
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        if (ch === "\n") line++;
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      endCell();
    } else if (ch === "\r") {
      // \r\n 交給下面的 \n 處理；單獨的 \r 也當換行
      if (text[i + 1] !== "\n") {
        line++;
        endRecord();
      }
    } else if (ch === "\n") {
      line++;
      endRecord();
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || cells.length > 0) endRecord();
  return records;
}

// 讀取上傳的檔案：先當 UTF-8；如果不是 UTF-8（例如 Excel 存成 Big5），改用 Big5 讀
export async function readCsvFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("big5").decode(buffer);
  }
}

function escapeCell(value: string | number): string {
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: (string | number)[][]): string {
  return "﻿" + rows.map((row) => row.map(escapeCell).join(",")).join("\r\n");
}

// 讓瀏覽器下載 CSV 檔
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
