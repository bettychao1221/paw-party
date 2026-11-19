// 把 Firestore 讀回來的值安全地轉成需要的型別（欄位缺少或格式不對時給預設值）
import type { Timestamp } from "firebase/firestore";

export function toDate(value: unknown): Date | null {
  return value && typeof (value as Timestamp).toDate === "function"
    ? (value as Timestamp).toDate()
    : null;
}

export const text = (v: unknown): string => (typeof v === "string" ? v : "");

export const textOrNull = (v: unknown): string | null =>
  typeof v === "string" && v !== "" ? v : null;

export const num = (v: unknown): number => (typeof v === "number" ? v : 0);

// 今天的日期（台灣時間的本機日期），格式 YYYY-MM-DD
export function todayString(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${mm}-${dd}`;
}
