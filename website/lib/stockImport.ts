// 寄倉 CSV 匯入：先預覽檢查，沒問題才寫入
//
// 欄位：Email、商品、數量、日期（選填 YYYY-MM-DD，預設今天）、備註（選填）
// 數量正數＝入庫、負數＝出庫。
import { collection, doc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { todayString } from "@/lib/fsValue";
import type { CsvRecord } from "@/lib/csv";
import type { Member } from "@/lib/members";
import { STOCK_LIMITS, stockLogData, type NewStockLog } from "@/lib/stock";

export const IMPORT_NOTE_SUFFIX = "CSV 匯入";
export const MAX_IMPORT_ROWS = 2000;
const WRITES_PER_BATCH = 400;

export type ImportRow = NewStockLog & { line: number; email: string };

export type ImportPreview = {
  rows: ImportRow[]; // 可以匯入的
  unknownEmails: { email: string; lines: number[] }[]; // 找不到會員
  errors: { line: number; reason: string }[]; // 格式錯誤
};

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

function isRealDate(text: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const [y, m, d] = text.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

function isHeader(cells: string[]): boolean {
  const first = normalizeEmail(cells[0] ?? "");
  return first === "email" || first === "e-mail" || first === "信箱";
}

export function previewImport(records: CsvRecord[], members: Member[]): ImportPreview {
  // Email → 會員（同一個 Email 有多位會員時，無法判斷要匯給誰）
  const byEmail = new Map<string, Member[]>();
  for (const m of members) {
    const key = normalizeEmail(m.email);
    byEmail.set(key, [...(byEmail.get(key) ?? []), m]);
  }

  const rows: ImportRow[] = [];
  const unknown = new Map<string, number[]>();
  const errors: { line: number; reason: string }[] = [];
  const today = todayString();
  const noteMax = STOCK_LIMITS.note - IMPORT_NOTE_SUFFIX.length - 3;

  const dataRecords = records.length > 0 && isHeader(records[0].cells) ? records.slice(1) : records;
  if (dataRecords.length > MAX_IMPORT_ROWS) {
    errors.push({ line: 0, reason: `一次最多匯入 ${MAX_IMPORT_ROWS} 列，請分成多個檔案。` });
    return { rows: [], unknownEmails: [], errors };
  }

  for (const { line, cells } of dataRecords) {
    const [rawEmail = "", rawProduct = "", rawQty = "", rawDate = "", rawNote = ""] = cells;
    const email = normalizeEmail(rawEmail);
    const product = rawProduct.trim();
    const qtyText = rawQty.trim().replace(/^\+/, "");
    const date = rawDate.trim() || today;
    const note = rawNote.trim();

    if (cells.length > 5 && cells.slice(5).some((c) => c.trim() !== "")) {
      errors.push({ line, reason: "欄位太多（最多 5 欄：Email、商品、數量、日期、備註）" });
      continue;
    }
    if (!email) {
      errors.push({ line, reason: "Email 是空的" });
      continue;
    }
    if (!product) {
      errors.push({ line, reason: "商品是空的" });
      continue;
    }
    if (product.length > STOCK_LIMITS.product) {
      errors.push({ line, reason: `商品名稱超過 ${STOCK_LIMITS.product} 個字` });
      continue;
    }
    if (!/^-?\d+$/.test(qtyText)) {
      errors.push({ line, reason: `數量「${rawQty}」不是整數` });
      continue;
    }
    const qty = Number(qtyText);
    if (qty === 0) {
      errors.push({ line, reason: "數量不能是 0" });
      continue;
    }
    if (Math.abs(qty) > STOCK_LIMITS.quantity) {
      errors.push({ line, reason: `數量超過上限 ${STOCK_LIMITS.quantity}` });
      continue;
    }
    if (!isRealDate(date)) {
      errors.push({ line, reason: `日期「${rawDate}」格式不對，請用 YYYY-MM-DD，例如 2026-11-19` });
      continue;
    }
    if (note.length > noteMax) {
      errors.push({ line, reason: `備註超過 ${noteMax} 個字` });
      continue;
    }

    const matched = byEmail.get(email) ?? [];
    if (matched.length === 0) {
      unknown.set(email, [...(unknown.get(email) ?? []), line]);
      continue;
    }
    if (matched.length > 1) {
      errors.push({ line, reason: `「${email}」有 ${matched.length} 位會員使用，無法判斷要匯給誰` });
      continue;
    }

    rows.push({
      line,
      email,
      uid: matched[0].uid,
      product,
      type: qty > 0 ? "in" : "out",
      quantity: Math.abs(qty),
      occurredOn: date,
      note: note ? `${note}（${IMPORT_NOTE_SUFFIX}）` : IMPORT_NOTE_SUFFIX,
    });
  }

  return {
    rows,
    unknownEmails: [...unknown.entries()].map(([email, lines]) => ({ email, lines })),
    errors,
  };
}

// 寫入：分批，每批最多 400 次寫入。回傳成功寫入的筆數
export async function runImport(
  rows: ImportRow[],
  onProgress?: (done: number) => void,
): Promise<number> {
  let done = 0;
  for (let start = 0; start < rows.length; start += WRITES_PER_BATCH) {
    const batch = writeBatch(db);
    const chunk = rows.slice(start, start + WRITES_PER_BATCH);
    for (const row of chunk) {
      batch.set(
        doc(collection(db, "stockLogs")),
        stockLogData({
          uid: row.uid,
          product: row.product,
          type: row.type,
          quantity: row.quantity,
          note: row.note,
          occurredOn: row.occurredOn,
        }),
      );
    }
    await batch.commit();
    done += chunk.length;
    onProgress?.(done);
  }
  return done;
}
