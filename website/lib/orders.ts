// 訂單與匯款設定：讀寫 Firestore
//
// 一筆訂單用同一個隨機文件 ID，同時寫兩份：
// - orders/{id}：完整資料（含姓名、手機、收件資訊），只有管理員能讀
// - orderStatus/{id}：公開狀態（不含任何個資），知道 ID 的人才能查
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { fetchAllProducts } from "@/lib/products";
import type { CartItem } from "@/lib/cart";

// ---- 訂單狀態 ----

export const ORDER_STATUSES = [
  "pending", // 待匯款
  "paid", // 已收款
  "shipped", // 已出貨
  "completed", // 完成
  "cancelled", // 已取消
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "待匯款",
  paid: "已收款",
  shipped: "已出貨",
  completed: "完成",
  cancelled: "已取消",
};

// ---- 欄位長度上限（firestore.rules 也有同樣的限制）----

export const LIMITS = {
  name: 30,
  shipping: 200,
  note: 300,
  maxItems: 30,
};

export type OrderStatusView = {
  id: string;
  orderNo: string;
  status: OrderStatus;
  total: number;
  items: { name: string; quantity: number }[];
  shippingCarrier: string | null;
  trackingNo: string | null;
  remittanceLast5: string | null;
  remittanceReportedAt: Date | null;
  createdAt: Date | null;
};

export type PaymentSettings = {
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  note: string;
};

// 結帳時用的「最新價格」明細
export type PricedLine = {
  productId: string;
  name: string;
  emoji: string;
  price: number;
  quantity: number;
  subtotal: number;
};

export type PricedCart = {
  lines: PricedLine[];
  unavailable: string[]; // 已下架、找不到或沒有價格的商品編號
  total: number;
};

// 從 Firestore 讀最新的商品與價格，算出購物車金額
export async function priceCart(cart: CartItem[]): Promise<PricedCart> {
  const products = await fetchAllProducts();
  const lines: PricedLine[] = [];
  const unavailable: string[] = [];

  for (const item of cart) {
    const product = products.find((p) => p.id === item.productId);
    if (!product || !product.published || product.price === null) {
      unavailable.push(item.productId);
      continue;
    }
    lines.push({
      productId: product.id,
      name: product.name,
      emoji: product.emoji,
      price: product.price,
      quantity: item.quantity,
      subtotal: product.price * item.quantity,
    });
  }

  return {
    lines,
    unavailable,
    total: lines.reduce((sum, line) => sum + line.subtotal, 0),
  };
}

// 短訂單編號：PP + 年月日 + 4 碼，例如 PP261119-AB12（方便和客人溝通）
function makeOrderNo(id: string): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `PP${yy}${mm}${dd}-${id.slice(0, 4).toUpperCase()}`;
}

export type CustomerInfo = {
  name: string;
  phone: string; // 已去掉空白與 -
  shipping: string;
  note: string;
};

// 送出訂單：同一個 ID 一次寫入 orders 與 orderStatus（同時成功或同時失敗）
// uid：登入者下單時填自己的 uid，沒登入是 null
export async function submitOrder(
  customer: CustomerInfo,
  priced: PricedCart,
  uid: string | null,
): Promise<string> {
  const ref = doc(collection(db, "orders"));
  const id = ref.id;
  const orderNo = makeOrderNo(id);

  const batch = writeBatch(db);
  batch.set(ref, {
    orderNo,
    uid,
    name: customer.name,
    phone: customer.phone,
    shipping: customer.shipping,
    note: customer.note,
    items: priced.lines.map((line) => ({
      productId: line.productId,
      name: line.name,
      price: line.price,
      quantity: line.quantity,
    })),
    total: priced.total,
    status: "pending",
    createdAt: serverTimestamp(),
  });
  batch.set(doc(db, "orderStatus", id), {
    orderNo,
    status: "pending",
    total: priced.total,
    items: priced.lines.map((line) => ({
      name: line.name,
      quantity: line.quantity,
    })),
    shippingCarrier: null,
    trackingNo: null,
    remittanceLast5: null,
    remittanceReportedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  return id;
}

function toDate(value: unknown): Date | null {
  return value && typeof (value as Timestamp).toDate === "function"
    ? (value as Timestamp).toDate()
    : null;
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

// 用訂單 ID 讀公開狀態；找不到回傳 null
export async function fetchOrderStatus(id: string): Promise<OrderStatusView | null> {
  const snapshot = await getDoc(doc(db, "orderStatus", id));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  const status = ORDER_STATUSES.includes(data.status) ? (data.status as OrderStatus) : "pending";
  return {
    id,
    orderNo: typeof data.orderNo === "string" ? data.orderNo : id,
    status,
    total: typeof data.total === "number" ? data.total : 0,
    items: Array.isArray(data.items)
      ? data.items.map((item: { name?: unknown; quantity?: unknown }) => ({
          name: typeof item.name === "string" ? item.name : "",
          quantity: typeof item.quantity === "number" ? item.quantity : 0,
        }))
      : [],
    shippingCarrier: toStringOrNull(data.shippingCarrier),
    trackingNo: toStringOrNull(data.trackingNo),
    remittanceLast5: toStringOrNull(data.remittanceLast5),
    remittanceReportedAt: toDate(data.remittanceReportedAt),
    createdAt: toDate(data.createdAt),
  };
}

// 客人回報匯款末五碼（只能在「待匯款」狀態，由 firestore.rules 把關）
export async function reportRemittance(id: string, last5: string): Promise<void> {
  await updateDoc(doc(db, "orderStatus", id), {
    remittanceLast5: last5,
    remittanceReportedAt: serverTimestamp(),
  });
}

// ---- 會員自己的訂單 ----

export type MyOrder = {
  id: string;
  orderNo: string;
  total: number;
  status: OrderStatus;
  createdAt: Date | null;
};

// 讀綁在這個會員帳號的訂單。不加 orderBy（免建索引），改在前端排序：新的在前
export async function fetchMyOrders(uid: string): Promise<MyOrder[]> {
  const snapshot = await getDocs(query(collection(db, "orders"), where("uid", "==", uid)));
  return snapshot.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        orderNo: typeof data.orderNo === "string" ? data.orderNo : d.id,
        total: typeof data.total === "number" ? data.total : 0,
        status: ORDER_STATUSES.includes(data.status) ? (data.status as OrderStatus) : "pending",
        createdAt: toDate(data.createdAt),
      };
    })
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
}

// ---- 匯款資訊 settings/payment ----

const paymentRef = () => doc(db, "settings", "payment");

export const PAYMENT_LIMIT = 100; // 每個欄位的長度上限

// 讀匯款資訊；沒設定（或帳號空白）時回傳 null
export async function fetchPaymentSettings(): Promise<PaymentSettings | null> {
  const snapshot = await getDoc(paymentRef());
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  const text = (v: unknown) => (typeof v === "string" ? v : "");
  const settings: PaymentSettings = {
    bankName: text(data.bankName),
    bankCode: text(data.bankCode),
    accountNumber: text(data.accountNumber),
    accountName: text(data.accountName),
    note: text(data.note),
  };
  return settings.accountNumber ? settings : null;
}

// 後台儲存匯款資訊（只有管理員能成功）
export async function savePaymentSettings(settings: PaymentSettings): Promise<void> {
  await setDoc(paymentRef(), settings);
}

// 從客人貼上的文字中取出訂單 ID（20 碼），支援：
// - 新網址：https://…/order/?id=xxxx（或 /order?id=xxxx）
// - 舊網址：https://…/order/xxxx
// - 直接貼代碼：xxxx
export function extractOrderId(input: string): string | null {
  const text = input.trim();
  if (!text) return null;
  const fromQuery = text.match(/[?&]id=([A-Za-z0-9]+)/);
  const fromPath = text.match(/\/order\/([A-Za-z0-9]{20})(?![A-Za-z0-9])/);
  const id = fromQuery ? fromQuery[1] : fromPath ? fromPath[1] : text;
  return /^[A-Za-z0-9]{20}$/.test(id) ? id : null;
}
