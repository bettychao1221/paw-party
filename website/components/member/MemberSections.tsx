"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { authErrorMessage } from "@/lib/firebase";
import { ensureMember } from "@/lib/members";
import { STOCK_TYPE_LABELS, computeBalances, fetchStockLogs, type StockLog } from "@/lib/stock";
import {
  SHIP_LIMITS,
  SHIP_STATUS_LABELS,
  createShipRequest,
  fetchMyShipRequests,
  pendingQuantities,
  type ShipRequest,
} from "@/lib/shipments";
import { STATUS_LABELS, fetchMyOrders, type MyOrder } from "@/lib/orders";
import { formatPrice } from "@/lib/products";
import { formatDateTime } from "@/lib/adminOrders";

type Data = { logs: StockLog[]; requests: ShipRequest[]; orders: MyOrder[] };

async function loadAll(user: User): Promise<Data> {
  await ensureMember(user); // 第一次登入時自動建立會員檔
  const [logs, requests, orders] = await Promise.all([
    fetchStockLogs(user.uid),
    fetchMyShipRequests(user.uid),
    fetchMyOrders(user.uid),
  ]);
  return { logs, requests, orders };
}

const boxClass = "mt-6 rounded-2xl border border-line bg-surface p-5";
const inputClass =
  "mt-2 w-full rounded-2xl border-2 border-line bg-surface px-4 py-4 text-lg text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none";

export default function MemberSections({ user }: { user: User }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    loadAll(user)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(authErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const reload = useCallback(async () => {
    try {
      setData(await loadAll(user));
    } catch (err) {
      setError(authErrorMessage(err));
    }
  }, [user]);

  if (error) {
    return (
      <p role="alert" className="mt-6 rounded-2xl border-2 border-brand bg-brand-soft px-4 py-3 text-base font-bold">
        ⚠️ 讀取會員資料失敗：{error}
      </p>
    );
  }
  if (!data) return <p className="mt-6 text-lg text-ink-soft">載入會員資料中…</p>;

  return (
    <>
      <MyStock logs={data.logs} />
      <ShipRequestSection user={user} logs={data.logs} requests={data.requests} onSent={reload} />
      <MyOrders orders={data.orders} />
    </>
  );
}

// ===== 我的寄倉 =====

function MyStock({ logs }: { logs: StockLog[] }) {
  const balances = computeBalances(logs);

  return (
    <div className={boxClass}>
      <h2 className="text-2xl font-bold">📦 我的寄倉</h2>

      {balances.size === 0 ? (
        <p className="mt-3 text-base text-ink-soft">目前沒有寄倉商品。寄倉請洽官方 LINE。</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {[...balances.entries()].map(([product, qty]) => (
            <li key={product} className="flex items-center justify-between rounded-2xl bg-brand-soft px-4 py-3">
              <span className="text-lg font-bold">{product}</span>
              <span className="text-2xl font-bold">{qty}</span>
            </li>
          ))}
        </ul>
      )}

      {logs.length > 0 && (
        <>
          <h3 className="mt-6 text-lg font-bold">入庫／出庫紀錄</h3>
          <ul className="mt-2 divide-y divide-line">
            {logs.map((log) => (
              <li key={log.id} className={`py-3 ${log.voided ? "text-ink-muted" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className={log.voided ? "line-through" : ""}>
                    <p className="text-base">{log.occurredOn}</p>
                    <p className="text-lg font-bold">{log.product}</p>
                  </div>
                  <span className={`shrink-0 text-lg font-bold ${log.voided ? "line-through" : ""}`}>
                    {STOCK_TYPE_LABELS[log.type]} {log.type === "in" ? "+" : "−"}
                    {log.quantity}
                  </span>
                </div>
                {log.note && <p className="text-base text-ink-soft">{log.note}</p>}
                {log.voided && (
                  <p className="mt-1 inline-block rounded-full bg-disabled px-3 py-0.5 text-sm font-bold text-ink-soft">
                    已作廢{log.voidReason ? `：${log.voidReason}` : ""}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// ===== 出貨申請 =====

function ShipRequestSection({
  user,
  logs,
  requests,
  onSent,
}: {
  user: User;
  logs: StockLog[];
  requests: ShipRequest[];
  onSent: () => Promise<void>;
}) {
  const balances = computeBalances(logs);
  const pending = pendingQuantities(requests);
  // 可申請數量 = 餘額 − 申請中數量
  const available = [...balances.entries()]
    .map(([product, qty]) => ({ product, max: qty - (pending.get(product) ?? 0) }))
    .filter((p) => p.max > 0);

  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [shipping, setShipping] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false); // 防止重複送出

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setError("");
    setNotice("");

    const items: { product: string; quantity: number }[] = [];
    for (const { product, max } of available) {
      const raw = (quantities[product] ?? "").trim();
      if (!raw) continue;
      if (!/^\d+$/.test(raw)) return setError(`「${product}」的數量請填整數。`);
      const q = Number(raw);
      if (q === 0) continue;
      if (q > max) return setError(`「${product}」最多只能申請 ${max} 個。`);
      items.push({ product, quantity: q });
    }
    if (items.length === 0) return setError("請至少填一個商品的數量。");
    if (items.length > SHIP_LIMITS.maxItems) return setError("一次申請的商品種類太多了。");

    const cleanName = name.trim();
    const cleanPhone = phone.replace(/[\s-]/g, "");
    const cleanShipping = shipping.trim();
    const cleanNote = note.trim();
    if (!cleanName) return setError("請填寫收件姓名。");
    if (cleanName.length > SHIP_LIMITS.name) return setError(`姓名最多 ${SHIP_LIMITS.name} 個字。`);
    if (!/^09\d{8}$/.test(cleanPhone))
      return setError("手機號碼格式不對，請填 09 開頭的 10 位數字。");
    if (!cleanShipping) return setError("請填寫收件資訊（地址，或超商店名與店號）。");
    if (cleanShipping.length > SHIP_LIMITS.shipping)
      return setError(`收件資訊最多 ${SHIP_LIMITS.shipping} 個字。`);
    if (cleanNote.length > SHIP_LIMITS.note) return setError(`備註最多 ${SHIP_LIMITS.note} 個字。`);

    submitting.current = true;
    setBusy(true);
    try {
      await createShipRequest({
        uid: user.uid,
        items,
        name: cleanName,
        phone: cleanPhone,
        shipping: cleanShipping,
        note: cleanNote,
      });
      setQuantities({});
      setNotice("已送出出貨申請，我們處理後會更新狀態。");
      await onSent();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <div className={boxClass}>
      <h2 className="text-2xl font-bold">🚚 出貨申請</h2>

      {notice && (
        <p role="status" className="mt-3 rounded-2xl border-2 border-brand px-4 py-3 text-base font-bold">
          ✅ {notice}
        </p>
      )}

      {available.length === 0 ? (
        <p className="mt-3 text-base text-ink-soft">目前沒有可以申請出貨的寄倉商品。</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-5" noValidate>
          <div className="space-y-3">
            <p className="text-lg font-bold">要出貨的商品與數量</p>
            {available.map(({ product, max }) => (
              <label key={product} className="flex items-center justify-between gap-3 rounded-2xl bg-cream px-4 py-3">
                <span>
                  <span className="block text-lg font-bold">{product}</span>
                  <span className="text-sm text-ink-soft">最多可申請 {max} 個</span>
                </span>
                <input
                  inputMode="numeric"
                  value={quantities[product] ?? ""}
                  onChange={(e) =>
                    setQuantities((prev) => ({ ...prev, [product]: e.target.value.replace(/\D/g, "") }))
                  }
                  placeholder="0"
                  className="w-24 rounded-2xl border-2 border-line bg-surface px-3 py-3 text-center text-xl font-bold focus:border-brand focus:outline-none"
                />
              </label>
            ))}
          </div>

          <label className="block">
            <span className="text-lg font-bold">收件姓名</span>
            <input autoComplete="name" maxLength={SHIP_LIMITS.name} value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </label>
          <label className="block">
            <span className="text-lg font-bold">手機</span>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={13}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0912345678"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-lg font-bold">收件資訊</span>
            <textarea
              rows={3}
              maxLength={SHIP_LIMITS.shipping}
              value={shipping}
              onChange={(e) => setShipping(e.target.value)}
              placeholder="寫地址，或超商店名＋店號"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-lg font-bold">備註</span>
            <span className="ml-2 text-sm text-ink-muted">選填</span>
            <textarea rows={2} maxLength={SHIP_LIMITS.note} value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
          </label>

          {error && (
            <p role="alert" className="rounded-2xl border-2 border-brand bg-brand-soft px-4 py-3 text-base font-bold">
              ⚠️ {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-brand py-5 text-xl font-bold text-ink shadow-sm transition active:scale-95 disabled:bg-disabled disabled:text-ink-muted"
          >
            {busy ? "送出中…" : "送出出貨申請"}
          </button>
        </form>
      )}

      {requests.length > 0 && (
        <>
          <h3 className="mt-6 text-lg font-bold">我的申請</h3>
          <ul className="mt-2 space-y-3">
            {requests.map((r) => (
              <li key={r.id} className="rounded-2xl bg-cream p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm text-ink-muted">{formatDateTime(r.createdAt)}</span>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold ${
                      r.status === "cancelled" ? "bg-disabled text-ink-soft" : "bg-brand text-ink"
                    }`}
                  >
                    {SHIP_STATUS_LABELS[r.status]}
                  </span>
                </div>
                <ul className="mt-2 text-base">
                  {r.items.map((item, i) => (
                    <li key={i}>
                      {item.product} × {item.quantity}
                    </li>
                  ))}
                </ul>
                {(r.carrier || r.trackingNo) && (
                  <p className="mt-2 break-all text-base">
                    🚚 {r.carrier ?? ""} {r.trackingNo ?? ""}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// ===== 我的訂單 =====

function MyOrders({ orders }: { orders: MyOrder[] }) {
  return (
    <div className={boxClass}>
      <h2 className="text-2xl font-bold">🧾 我的訂單</h2>
      {orders.length === 0 ? (
        <p className="mt-3 text-base text-ink-soft">
          還沒有記在會員帳號的訂單。登入後下單，訂單就會出現在這裡。
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/order/${o.id}`}
                className="block rounded-2xl border border-line bg-surface p-4 transition active:scale-[0.98]"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-lg font-bold tracking-wide">{o.orderNo}</span>
                  <span className="shrink-0 rounded-full bg-brand-soft px-3 py-1 text-sm font-bold">
                    {STATUS_LABELS[o.status]}
                  </span>
                </div>
                <div className="mt-1 flex items-end justify-between">
                  <span className="text-sm text-ink-muted">{formatDateTime(o.createdAt)}</span>
                  <span className="text-xl font-bold">{formatPrice(o.total)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
