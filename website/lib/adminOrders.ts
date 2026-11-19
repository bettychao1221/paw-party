// 後台訂單管理：讀寫 orders（完整資料）與 orderStatus（公開狀態）
// 只有管理員能成功，由 firestore.rules 把關。
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type DocumentData,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { fetchAllProducts } from "@/lib/products";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/orders";

export type AdminOrderItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
};

export type AdminOrder = {
  id: string;
  orderNo: string;
  name: string;
  phone: string;
  shipping: string;
  note: string;
  items: AdminOrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: Date | null;
  adminNote: string;
  // 以下來自 orderStatus
  remittanceLast5: string | null;
  remittanceReportedAt: Date | null;
  shippingCarrier: string | null;
  trackingNo: string | null;
};

export const ADMIN_NOTE_LIMIT = 1000;

// 每個狀態可以做的下一步
export const NEXT_STEPS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["paid", "cancelled"],
  paid: ["shipped", "cancelled"],
  shipped: ["completed"],
  completed: [],
  cancelled: [],
};

function toDate(value: unknown): Date | null {
  return value && typeof (value as Timestamp).toDate === "function"
    ? (value as Timestamp).toDate()
    : null;
}
const text = (v: unknown) => (typeof v === "string" ? v : "");
const textOrNull = (v: unknown) => (typeof v === "string" && v !== "" ? v : null);
const num = (v: unknown) => (typeof v === "number" ? v : 0);

function toStatus(value: unknown): OrderStatus {
  return ORDER_STATUSES.includes(value as OrderStatus) ? (value as OrderStatus) : "pending";
}

function combine(id: string, order: DocumentData, pub: DocumentData | undefined): AdminOrder {
  return {
    id,
    orderNo: text(order.orderNo) || id,
    name: text(order.name),
    phone: text(order.phone),
    shipping: text(order.shipping),
    note: text(order.note),
    items: Array.isArray(order.items)
      ? order.items.map((item: DocumentData) => ({
          productId: text(item.productId),
          name: text(item.name),
          price: num(item.price),
          quantity: num(item.quantity),
        }))
      : [],
    total: num(order.total),
    status: toStatus(order.status),
    createdAt: toDate(order.createdAt),
    adminNote: text(order.adminNote),
    remittanceLast5: textOrNull(pub?.remittanceLast5),
    remittanceReportedAt: toDate(pub?.remittanceReportedAt),
    shippingCarrier: textOrNull(pub?.shippingCarrier ?? order.shippingCarrier),
    trackingNo: textOrNull(pub?.trackingNo ?? order.trackingNo),
  };
}

// 讀全部訂單（新的在前），並用同一個文件 ID 對上 orderStatus
export async function fetchAdminOrders(): Promise<AdminOrder[]> {
  const [ordersSnap, statusSnap] = await Promise.all([
    getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc"))),
    getDocs(collection(db, "orderStatus")),
  ]);
  const statusById = new Map(statusSnap.docs.map((d) => [d.id, d.data()]));
  return ordersSnap.docs.map((d) => combine(d.id, d.data(), statusById.get(d.id)));
}

// 讀單筆訂單；找不到回傳 null
export async function fetchAdminOrder(id: string): Promise<AdminOrder | null> {
  const [orderSnap, statusSnap] = await Promise.all([
    getDoc(doc(db, "orders", id)),
    getDoc(doc(db, "orderStatus", id)),
  ]);
  if (!orderSnap.exists()) return null;
  return combine(id, orderSnap.data(), statusSnap.exists() ? statusSnap.data() : undefined);
}

// 改狀態：同時更新 orders 與 orderStatus（同時成功或同時失敗）
export async function changeOrderStatus(
  order: AdminOrder,
  next: OrderStatus,
  shipping?: { carrier: string; trackingNo: string },
): Promise<void> {
  if (!NEXT_STEPS[order.status].includes(next)) {
    throw new Error("invalid-step");
  }
  const extra =
    next === "shipped" && shipping
      ? { shippingCarrier: shipping.carrier, trackingNo: shipping.trackingNo }
      : {};

  const batch = writeBatch(db);
  batch.update(doc(db, "orders", order.id), {
    status: next,
    updatedAt: serverTimestamp(),
    ...extra,
  });
  batch.update(doc(db, "orderStatus", order.id), {
    status: next,
    updatedAt: serverTimestamp(),
    ...extra,
  });
  await batch.commit();
}

// 管理員備註：只存在 orders（客人看不到）
export async function saveAdminNote(id: string, note: string): Promise<void> {
  await updateDoc(doc(db, "orders", id), {
    adminNote: note,
    updatedAt: serverTimestamp(),
  });
}

// 刪除訂單：只有「已取消」的才能刪（規則也會檢查）；同時刪除 orders 與 orderStatus
export async function deleteOrder(order: AdminOrder): Promise<void> {
  if (order.status !== "cancelled") throw new Error("not-cancelled");
  const batch = writeBatch(db);
  batch.delete(doc(db, "orders", order.id));
  batch.delete(doc(db, "orderStatus", order.id));
  await batch.commit();
}

// 刪除全部已取消訂單：分段批次刪除，每批最多 400 個刪除動作（每筆訂單 2 個）
export async function deleteCancelledOrders(orders: AdminOrder[]): Promise<number> {
  const targets = orders.filter((o) => o.status === "cancelled");
  const perBatch = 200; // 200 筆 × 2 份文件 = 400 個刪除動作
  let deleted = 0;
  for (let start = 0; start < targets.length; start += perBatch) {
    const batch = writeBatch(db);
    for (const order of targets.slice(start, start + perBatch)) {
      batch.delete(doc(db, "orders", order.id));
      batch.delete(doc(db, "orderStatus", order.id));
    }
    await batch.commit();
    deleted += Math.min(perBatch, targets.length - start);
  }
  return deleted;
}

// 依目前商品價格重新計算金額；有商品找不到或沒有價格時，missing 會列出名稱
export async function recalculateTotal(
  items: AdminOrderItem[],
): Promise<{ total: number; missing: string[] }> {
  const products = await fetchAllProducts();
  let total = 0;
  const missing: string[] = [];
  for (const item of items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product || product.price === null) {
      missing.push(item.name || item.productId);
      continue;
    }
    total += product.price * item.quantity;
  }
  return { total, missing };
}

export function formatDateTime(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
