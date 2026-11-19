"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminHeader from "@/components/admin/AdminHeader";
import { authErrorMessage } from "@/lib/firebase";
import ConfirmAction from "@/components/admin/ConfirmAction";
import {
  deleteCancelledOrders,
  fetchAdminOrders,
  formatDateTime,
  type AdminOrder,
} from "@/lib/adminOrders";
import { ORDER_STATUSES, STATUS_LABELS, type OrderStatus } from "@/lib/orders";
import { formatPrice } from "@/lib/products";
import { adminOrderUrl } from "@/lib/urls";

export default function AdminOrdersPage() {
  return (
    <AdminGuard>
      <OrderList />
    </AdminGuard>
  );
}

// 「進行中」＝待匯款、已收款、已出貨（預設顯示這個）
type Filter = OrderStatus | "all" | "active";
const ACTIVE: OrderStatus[] = ["pending", "paid", "shipped"];
const FILTERS: Filter[] = ["active", "all", ...ORDER_STATUSES];
const FILTER_LABELS: Record<Filter, string> = { ...STATUS_LABELS, all: "全部", active: "進行中" };

function matches(order: AdminOrder, filter: Filter) {
  if (filter === "all") return true;
  if (filter === "active") return ACTIVE.includes(order.status);
  return order.status === filter;
}

function OrderList() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [filter, setFilter] = useState<Filter>("active");

  async function handleDeleteCancelled() {
    setDeleting(true);
    setError("");
    setNotice("");
    try {
      const count = await deleteCancelledOrders(orders);
      setNotice(`已刪除 ${count} 筆已取消訂單。`);
    } catch (err) {
      setError(`${authErrorMessage(err)}（可能只刪了一部分，請重新整理確認）`);
    } finally {
      try {
        setOrders(await fetchAdminOrders());
      } catch {
        // 重新讀取失敗時，保留原畫面
      }
      setDeleting(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetchAdminOrders()
      .then((list) => {
        if (!cancelled) setOrders(list);
      })
      .catch((err) => {
        if (!cancelled) setError(authErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const list = orders.filter((o) => matches(o, filter));
  const countOf = (f: Filter) => orders.filter((o) => matches(o, f)).length;
  const cancelledCount = countOf("cancelled");

  return (
    <main className="min-h-screen bg-cream pb-28 text-ink">
      <AdminHeader backHref="/admin" backLabel="後台" title="📋 訂單" />

      {/* 狀態篩選：可左右滑動 */}
      <div className="flex gap-2 overflow-x-auto bg-surface px-4 py-3 [scrollbar-width:none]">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full px-4 py-2 text-base font-semibold ${
              filter === f
                ? "border border-brand bg-brand text-ink"
                : "border border-line bg-surface text-ink-soft"
            }`}
          >
            {FILTER_LABELS[f]}
            {!loading && ` ${countOf(f)}`}
          </button>
        ))}
      </div>

      <section className="px-4 pt-4">
        {error && (
          <p role="alert" className="mb-4 rounded-2xl border-2 border-brand bg-brand-soft px-4 py-3 text-base font-bold">
            ⚠️ {error}
          </p>
        )}
        {notice && (
          <p role="status" className="mb-4 rounded-2xl border-2 border-brand bg-surface px-4 py-3 text-base font-bold">
            ✅ {notice}
          </p>
        )}

        {/* 已取消篩選畫面：一次刪除全部已取消訂單 */}
        {!loading && filter === "cancelled" && cancelledCount > 0 && (
          <div className="mb-4">
            <ConfirmAction
              label={`🗑️ 刪除全部已取消訂單（${cancelledCount} 筆）`}
              question={`要刪除全部 ${cancelledCount} 筆已取消訂單嗎？`}
              warning="刪除後無法復原，客人用舊網址查詢會看到「找不到這筆訂單」。"
              confirmLabel={`確定刪除 ${cancelledCount} 筆`}
              twice
              busy={deleting}
              onConfirm={handleDeleteCancelled}
            />
          </div>
        )}

        {loading ? (
          <p className="text-lg text-ink-soft">載入中…</p>
        ) : list.length === 0 ? (
          <p className="rounded-2xl bg-surface p-5 text-lg text-ink-soft">目前沒有訂單。</p>
        ) : (
          <ul className="space-y-3">
            {list.map((order) => {
              const reported = order.status === "pending" && order.remittanceLast5 !== null;
              return (
                <li key={order.id}>
                  <Link
                    href={adminOrderUrl(order.id)}
                    className={`block rounded-2xl bg-surface p-4 transition active:scale-[0.98] ${
                      reported ? "border-4 border-brand" : "border border-line"
                    }`}
                  >
                    {reported && (
                      <p className="mb-2 inline-block rounded-full bg-brand px-3 py-1 text-base font-bold">
                        💰 客人已回報匯款（末五碼 {order.remittanceLast5}）
                      </p>
                    )}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-lg font-bold tracking-wide">{order.orderNo}</p>
                        <p className="text-lg">{order.name}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold ${
                          order.status === "cancelled"
                            ? "bg-disabled text-ink-soft"
                            : "bg-brand-soft text-ink"
                        }`}
                      >
                        {STATUS_LABELS[order.status]}
                      </span>
                    </div>
                    <div className="mt-2 flex items-end justify-between">
                      <span className="text-sm text-ink-muted">{formatDateTime(order.createdAt)}</span>
                      <span className="text-xl font-bold">{formatPrice(order.total)}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
