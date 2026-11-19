// 出貨申請 shipRequests/{id}：會員從寄倉申請出貨
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { num, text, textOrNull, toDate, todayString } from "@/lib/fsValue";
import { stockLogData } from "@/lib/stock";

export type ShipStatus = "pending" | "done" | "cancelled";

export const SHIP_STATUS_LABELS: Record<ShipStatus, string> = {
  pending: "待處理",
  done: "已出貨",
  cancelled: "已取消",
};

export const SHIP_LIMITS = { name: 30, shipping: 200, note: 300, maxItems: 30 };

export type ShipItem = { product: string; quantity: number };

export type ShipRequest = {
  id: string;
  uid: string;
  items: ShipItem[];
  name: string;
  phone: string;
  shipping: string;
  note: string;
  status: ShipStatus;
  carrier: string | null;
  trackingNo: string | null;
  adminNote: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

function toStatus(v: unknown): ShipStatus {
  return v === "done" || v === "cancelled" ? v : "pending";
}

function fromDoc(id: string, data: DocumentData): ShipRequest {
  return {
    id,
    uid: text(data.uid),
    items: Array.isArray(data.items)
      ? data.items.map((i: DocumentData) => ({ product: text(i.product), quantity: num(i.quantity) }))
      : [],
    name: text(data.name),
    phone: text(data.phone),
    shipping: text(data.shipping),
    note: text(data.note),
    status: toStatus(data.status),
    carrier: textOrNull(data.carrier),
    trackingNo: textOrNull(data.trackingNo),
    adminNote: textOrNull(data.adminNote),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

const newestFirst = (a: ShipRequest, b: ShipRequest) =>
  (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);

// 申請中的數量（各商品加總），用來算「還能申請多少」
export function pendingQuantities(requests: ShipRequest[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of requests) {
    if (r.status !== "pending") continue;
    for (const item of r.items) {
      map.set(item.product, (map.get(item.product) ?? 0) + item.quantity);
    }
  }
  return map;
}

// ---- 客人 ----

export async function fetchMyShipRequests(uid: string): Promise<ShipRequest[]> {
  const snapshot = await getDocs(query(collection(db, "shipRequests"), where("uid", "==", uid)));
  return snapshot.docs.map((d) => fromDoc(d.id, d.data())).sort(newestFirst);
}

export async function createShipRequest(input: {
  uid: string;
  items: ShipItem[];
  name: string;
  phone: string;
  shipping: string;
  note: string;
}): Promise<void> {
  await addDoc(collection(db, "shipRequests"), {
    ...input,
    status: "pending",
    carrier: null,
    trackingNo: null,
    adminNote: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// ---- 後台 ----

// 全部申請：待處理的在前，其餘新的在前
export async function fetchAllShipRequests(): Promise<ShipRequest[]> {
  const snapshot = await getDocs(collection(db, "shipRequests"));
  return snapshot.docs
    .map((d) => fromDoc(d.id, d.data()))
    .sort(
      (a, b) =>
        Number(b.status === "pending") - Number(a.status === "pending") || newestFirst(a, b),
    );
}

export async function fetchShipRequest(id: string): Promise<ShipRequest | null> {
  const snapshot = await getDoc(doc(db, "shipRequests", id));
  return snapshot.exists() ? fromDoc(id, snapshot.data()) : null;
}

// 確認出貨：同時把申請改成已出貨＋寫入物流，並為每個品項新增一筆出庫流水
export async function confirmShipment(
  request: ShipRequest,
  carrier: string,
  trackingNo: string,
): Promise<void> {
  if (request.status !== "pending") throw new Error("not-pending");
  const batch = writeBatch(db);
  batch.update(doc(db, "shipRequests", request.id), {
    status: "done",
    carrier,
    trackingNo,
    updatedAt: serverTimestamp(),
  });
  const today = todayString();
  for (const item of request.items) {
    batch.set(
      doc(collection(db, "stockLogs")),
      stockLogData({
        uid: request.uid,
        product: item.product,
        type: "out",
        quantity: item.quantity,
        note: "出貨申請",
        occurredOn: today,
      }),
    );
  }
  await batch.commit();
}

export async function cancelShipRequest(id: string): Promise<void> {
  await updateDoc(doc(db, "shipRequests", id), {
    status: "cancelled",
    updatedAt: serverTimestamp(),
  });
}

export async function saveShipAdminNote(id: string, note: string): Promise<void> {
  await updateDoc(doc(db, "shipRequests", id), {
    adminNote: note || null,
    updatedAt: serverTimestamp(),
  });
}

// 刪除：只有已出貨或已取消的才能刪（規則也會檢查）
export async function deleteShipRequest(id: string): Promise<void> {
  await deleteDoc(doc(db, "shipRequests", id));
}
