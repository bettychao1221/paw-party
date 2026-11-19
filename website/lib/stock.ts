// 寄倉流水 stockLogs/{id}
//
// 餘額＝同一商品「入庫總和 − 出庫總和」（不含已作廢），由前端加總。
// 注意：Firestore 規則算不出餘額，所以規則無法阻擋「出庫超過餘額」，
// 只能靠畫面警告與老闆核對。
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { num, text, textOrNull, toDate } from "@/lib/fsValue";

export type StockType = "in" | "out";

export type StockLog = {
  id: string;
  uid: string;
  product: string;
  type: StockType;
  quantity: number;
  note: string;
  occurredOn: string; // YYYY-MM-DD
  voided: boolean;
  voidReason: string | null;
  createdAt: Date | null;
};

export const STOCK_LIMITS = { product: 60, note: 200, quantity: 100000, voidReason: 200 };

export const STOCK_TYPE_LABELS: Record<StockType, string> = { in: "入庫", out: "出庫" };

function fromDoc(id: string, data: DocumentData): StockLog {
  return {
    id,
    uid: text(data.uid),
    product: text(data.product),
    type: data.type === "out" ? "out" : "in",
    quantity: num(data.quantity),
    note: text(data.note),
    occurredOn: text(data.occurredOn),
    voided: data.voided === true,
    voidReason: textOrNull(data.voidReason),
    createdAt: toDate(data.createdAt),
  };
}

// 讀某位會員的全部流水（客人只能讀自己的）。不用 orderBy，改在前端排序（不需要建索引）
export async function fetchStockLogs(uid: string): Promise<StockLog[]> {
  const snapshot = await getDocs(query(collection(db, "stockLogs"), where("uid", "==", uid)));
  return snapshot.docs
    .map((d) => fromDoc(d.id, d.data()))
    .sort(
      (a, b) =>
        b.occurredOn.localeCompare(a.occurredOn) ||
        (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
    );
}

// 各商品餘額（不含作廢）；有出現過的商品都會列出，0 也顯示
export function computeBalances(logs: StockLog[]): Map<string, number> {
  const balances = new Map<string, number>();
  for (const log of logs) {
    if (!balances.has(log.product)) balances.set(log.product, 0);
    if (log.voided) continue;
    const delta = log.type === "in" ? log.quantity : -log.quantity;
    balances.set(log.product, (balances.get(log.product) ?? 0) + delta);
  }
  return new Map([...balances.entries()].sort((a, b) => a[0].localeCompare(b[0], "zh-Hant")));
}

// 最近異動日期（不含作廢）；沒有就回傳 null
export function lastActivity(logs: StockLog[]): string | null {
  let latest: string | null = null;
  for (const log of logs) {
    if (log.voided) continue;
    if (!latest || log.occurredOn > latest) latest = log.occurredOn;
  }
  return latest;
}

// ---- 以下為後台使用（規則只允許管理員）----

// 讀全部會員的流水（寄倉總覽用）
export async function fetchAllStockLogs(): Promise<StockLog[]> {
  const snapshot = await getDocs(collection(db, "stockLogs"));
  return snapshot.docs.map((d) => fromDoc(d.id, d.data()));
}

export type NewStockLog = {
  uid: string;
  product: string;
  type: StockType;
  quantity: number;
  note: string;
  occurredOn: string;
};

export function stockLogData(input: NewStockLog) {
  return {
    ...input,
    voided: false,
    voidReason: null,
    createdAt: serverTimestamp(),
  };
}

export async function addStockLog(input: NewStockLog): Promise<void> {
  await addDoc(collection(db, "stockLogs"), stockLogData(input));
}

// 作廢（記錯時使用）：不刪除，只標記
export async function voidStockLog(id: string, reason: string): Promise<void> {
  await updateDoc(doc(db, "stockLogs", id), { voided: true, voidReason: reason });
}

// 刪除：只有已作廢的才能刪（規則也會檢查）
export async function deleteStockLog(id: string): Promise<void> {
  await deleteDoc(doc(db, "stockLogs", id));
}
