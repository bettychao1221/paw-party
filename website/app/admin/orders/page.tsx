"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminHeader from "@/components/admin/AdminHeader";
import { authErrorMessage } from "@/lib/firebase";
import { fetchAdminOrders, formatDateTime, type AdminOrder } from "@/lib/adminOrders";
import { ORDER_STATUSES, STATUS_LABELS, type OrderStatus } from "@/lib/orders";
import { formatPrice } from "@/lib/products";

export default function AdminOrdersPage() {
  return (
    <AdminGuard>
      <OrderList />
    </AdminGuard>
  );
}

const FILTERS: (OrderStatus | "all")[] = ["all", ...ORDER_STATUSES];

function OrderList() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<OrderStatus | "all">("all");

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

  const list = filter === "all" ? orders : orders.filter((o) => o.status === filter);
  const countOf = (f: OrderStatus | "all") =>
    f === "all" ? orders.length : orders.filter((o) => o.status === f).length;

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
            {f === "all" ? "全部" : STATUS_LABELS[f]}
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
                    href={`/admin/orders/${order.id}`}
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
