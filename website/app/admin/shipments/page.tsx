"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminHeader from "@/components/admin/AdminHeader";
import { authErrorMessage } from "@/lib/firebase";
import { fetchMembers } from "@/lib/members";
import {
  SHIP_STATUS_LABELS,
  fetchAllShipRequests,
  type ShipRequest,
  type ShipStatus,
} from "@/lib/shipments";
import { formatDateTime } from "@/lib/adminOrders";
import { adminShipmentUrl } from "@/lib/urls";

export default function AdminShipmentsPage() {
  return (
    <AdminGuard>
      <ShipmentList />
    </AdminGuard>
  );
}

const FILTERS: (ShipStatus | "all")[] = ["all", "pending", "done", "cancelled"];

function ShipmentList() {
  const [requests, setRequests] = useState<ShipRequest[]>([]);
  const [emails, setEmails] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<ShipStatus | "all">("all");

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchAllShipRequests(), fetchMembers()])
      .then(([list, members]) => {
        if (cancelled) return;
        setRequests(list);
        setEmails(new Map(members.map((m) => [m.uid, m.email])));
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

  const list = filter === "all" ? requests : requests.filter((r) => r.status === filter);
  const countOf = (f: ShipStatus | "all") =>
    f === "all" ? requests.length : requests.filter((r) => r.status === f).length;

  return (
    <main className="min-h-screen bg-cream pb-28 text-ink">
      <AdminHeader backHref="/admin" backLabel="後台" title="🚚 出貨申請" />

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
            {f === "all" ? "全部" : SHIP_STATUS_LABELS[f]}
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
          <p className="rounded-2xl bg-surface p-5 text-lg text-ink-soft">目前沒有出貨申請。</p>
        ) : (
          <ul className="space-y-3">
            {list.map((r) => (
              <li key={r.id}>
                <Link
                  href={adminShipmentUrl(r.id)}
                  className={`block rounded-2xl bg-surface p-4 transition active:scale-[0.98] ${
                    r.status === "pending" ? "border-4 border-brand" : "border border-line"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-lg font-bold">{r.name}</p>
                      <p className="break-all text-sm text-ink-muted">{emails.get(r.uid) ?? "（找不到會員）"}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold ${
                        r.status === "pending"
                          ? "bg-brand text-ink"
                          : r.status === "cancelled"
                            ? "bg-disabled text-ink-soft"
                            : "bg-brand-soft text-ink"
                      }`}
                    >
                      {SHIP_STATUS_LABELS[r.status]}
                    </span>
                  </div>
                  <p className="mt-2 text-base">
                    {r.items.map((i) => `${i.product} × ${i.quantity}`).join("、")}
                  </p>
                  <p className="mt-1 text-sm text-ink-muted">{formatDateTime(r.createdAt)}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
