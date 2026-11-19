"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import LineButton from "@/components/LineButton";
import { saveLastOrderId } from "@/lib/cart";
import {
  STATUS_LABELS,
  fetchOrderStatus,
  fetchPaymentSettings,
  reportRemittance,
  type OrderStatusView,
  type PaymentSettings,
} from "@/lib/orders";
import { formatPrice } from "@/lib/products";

type LoadState =
  | { kind: "loading" }
  | { kind: "notFound" }
  | { kind: "error" }
  | { kind: "ready"; order: OrderStatusView; payment: PaymentSettings | null };

async function loadOrder(id: string): Promise<LoadState> {
  try {
    const order = await fetchOrderStatus(id);
    if (!order) return { kind: "notFound" };
    // 匯款資訊讀不到時，畫面會改成「請洽官方 LINE」
    const payment = await fetchPaymentSettings().catch(() => null);
    return { kind: "ready", order, payment };
  } catch {
    return { kind: "error" };
  }
}

export default function OrderView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    loadOrder(id).then((result) => {
      if (cancelled) return;
      setState(result);
      if (result.kind === "ready") saveLastOrderId(id);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const reload = useCallback(async () => {
    setState(await loadOrder(id));
  }, [id]);

  return (
    <main className="min-h-screen bg-surface pb-28 text-ink">
      <SiteHeader />

      <section className="px-4 pt-5">
        {state.kind === "loading" && <p className="pt-10 text-center text-lg text-ink-soft">載入中…</p>}

        {state.kind === "notFound" && (
          <div className="pt-10 text-center">
            <p className="text-6xl">🔍</p>
            <h1 className="mt-4 text-2xl font-bold">找不到這筆訂單</h1>
            <p className="mt-2 text-base text-ink-soft">請確認訂單網址是否完整。</p>
            <Link href="/order" className="mt-6 block w-full rounded-full bg-brand py-4 text-lg font-bold text-ink">
              重新查詢
            </Link>
          </div>
        )}

        {state.kind === "error" && (
          <div className="pt-10 text-center">
            <p className="text-lg font-bold">⚠️ 讀取訂單失敗，請檢查網路後重新整理。</p>
          </div>
        )}

        {state.kind === "ready" && (
          <OrderDetail order={state.order} payment={state.payment} onUpdated={reload} />
        )}

        <div className="mt-6">
          <LineButton label="訂單問題？問官方 LINE" />
        </div>
      </section>
    </main>
  );
}

function OrderDetail({
  order,
  payment,
  onUpdated,
}: {
  order: OrderStatusView;
  payment: PaymentSettings | null;
  onUpdated: () => Promise<void>;
}) {
  const isPending = order.status === "pending";
  const reported = isPending && order.remittanceLast5 !== null;
  const statusText = reported ? "已回報匯款，等待確認" : STATUS_LABELS[order.status];

  return (
    <>
      <p className="text-base text-ink-soft">訂單編號</p>
      <h1 className="text-3xl font-bold tracking-wide">{order.orderNo}</h1>

      <div className="mt-4 rounded-2xl bg-brand px-5 py-4">
        <p className="text-base font-semibold">目前狀態</p>
        <p className="text-2xl font-bold">{statusText}</p>
      </div>

      {/* 品項 */}
      <div className="mt-5 rounded-2xl border border-line p-5">
        <p className="text-lg font-bold">訂購內容</p>
        <ul className="mt-2 space-y-1 text-base">
          {order.items.map((item, index) => (
            <li key={index} className="flex justify-between gap-3">
              <span>{item.name}</span>
              <span className="shrink-0">× {item.quantity}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-end justify-between border-t border-line pt-3">
          <span className="text-lg font-bold">{isPending ? "應匯款金額" : "訂單金額"}</span>
          <span className="text-3xl font-bold">{formatPrice(order.total)}</span>
        </div>
      </div>

      {/* 待匯款：匯款資訊與回報末五碼 */}
      {isPending && (
        <>
          <PaymentInfo payment={payment} total={order.total} />
          <RemittanceReport order={order} onUpdated={onUpdated} />
        </>
      )}

      {/* 物流資訊 */}
      {(order.shippingCarrier || order.trackingNo) && (
        <div className="mt-5 rounded-2xl border border-line p-5">
          <p className="text-lg font-bold">🚚 物流資訊</p>
          {order.shippingCarrier && (
            <p className="mt-2 text-base">物流公司：{order.shippingCarrier}</p>
          )}
          {order.trackingNo && (
            <p className="mt-1 break-all text-base">物流單號：{order.trackingNo}</p>
          )}
        </div>
      )}

      {/* 查詢代碼：讓客人之後能再回來查 */}
      <div className="mt-5 rounded-2xl bg-cream p-5">
        <p className="text-base font-bold">📌 請把這個網頁加入書籤，或截圖保存</p>
        <p className="mt-1 text-sm text-ink-soft">之後可以到「查詢訂單」貼上這個查詢代碼：</p>
        <p className="mt-2 break-all rounded-xl bg-surface px-3 py-2 font-mono text-base">{order.id}</p>
      </div>
    </>
  );
}

function PaymentInfo({ payment, total }: { payment: PaymentSettings | null; total: number }) {
  if (!payment) {
    return (
      <div className="mt-5 rounded-2xl bg-brand-soft p-5">
        <p className="text-lg font-bold">🏦 匯款資訊</p>
        <p className="mt-2 text-base">匯款資訊請洽官方 LINE。</p>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-2xl bg-brand-soft p-5">
      <p className="text-lg font-bold">🏦 請匯款 {formatPrice(total)} 到以下帳戶</p>
      <dl className="mt-3 space-y-2 text-lg">
        <div>
          <dt className="text-sm text-ink-soft">銀行</dt>
          <dd className="font-bold">
            {payment.bankName}
            {payment.bankCode && `（代碼 ${payment.bankCode}）`}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-ink-soft">帳號</dt>
          <dd className="break-all text-2xl font-bold tracking-wider">{payment.accountNumber}</dd>
        </div>
        {payment.accountName && (
          <div>
            <dt className="text-sm text-ink-soft">戶名</dt>
            <dd className="font-bold">{payment.accountName}</dd>
          </div>
        )}
      </dl>
      {payment.note && <p className="mt-3 whitespace-pre-line text-base">{payment.note}</p>}
    </div>
  );
}

function RemittanceReport({
  order,
  onUpdated,
}: {
  order: OrderStatusView;
  onUpdated: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(order.remittanceLast5 ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (!/^\d{5}$/.test(value)) {
      setError("請輸入 5 位數字。");
      return;
    }
    setBusy(true);
    try {
      await reportRemittance(order.id, value);
      setDone(true);
      setOpen(false);
      await onUpdated();
    } catch {
      setError("送出失敗，請重新整理後再試。如果訂單已確認收款，就不能再修改。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5">
      {done && (
        <p role="status" className="mb-4 rounded-2xl border-2 border-brand bg-surface px-4 py-3 text-base font-bold">
          ✅ 已收到你的匯款通知，我們核對後會更新訂單狀態。
        </p>
      )}

      {order.remittanceLast5 && !open && (
        <p className="mb-3 text-base">
          你回報的末五碼：<span className="text-xl font-bold tracking-widest">{order.remittanceLast5}</span>
        </p>
      )}

      {!open ? (
        <button
          type="button"
          onClick={() => {
            setValue(order.remittanceLast5 ?? "");
            setError("");
            setDone(false);
            setOpen(true);
          }}
          className="w-full rounded-full bg-brand py-5 text-xl font-bold text-ink shadow-sm transition active:scale-95"
        >
          {order.remittanceLast5 ? "修改末五碼" : "我已匯款，填寫末五碼"}
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="rounded-2xl border-2 border-brand p-5">
          <label className="block">
            <span className="text-lg font-bold">請填寫你匯款帳號的末五碼</span>
            <input
              inputMode="numeric"
              autoComplete="off"
              maxLength={5}
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 5))}
              placeholder="例如 12345"
              className="mt-3 w-full rounded-2xl border-2 border-line bg-surface px-4 py-4 text-center text-3xl font-bold tracking-[0.4em] focus:border-brand focus:outline-none"
            />
          </label>

          {error && (
            <p role="alert" className="mt-3 rounded-2xl bg-brand-soft px-4 py-3 text-base font-bold">
              ⚠️ {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-4 w-full rounded-full bg-brand py-5 text-xl font-bold text-ink disabled:bg-disabled disabled:text-ink-muted"
          >
            {busy ? "送出中…" : "送出"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={busy}
            className="mt-3 w-full rounded-full border-2 border-line py-4 text-lg font-bold"
          >
            取消
          </button>
        </form>
      )}
    </div>
  );
}
