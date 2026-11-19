"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import ConfirmAction from "@/components/admin/ConfirmAction";
import { authErrorMessage } from "@/lib/firebase";
import {
  ADMIN_NOTE_LIMIT,
  NEXT_STEPS,
  changeOrderStatus,
  deleteOrder,
  fetchAdminOrder,
  formatDateTime,
  recalculateTotal,
  saveAdminNote,
  type AdminOrder,
} from "@/lib/adminOrders";
import { STATUS_LABELS } from "@/lib/orders";
import { formatPrice } from "@/lib/products";

type LoadState =
  | { kind: "loading" }
  | { kind: "notFound" }
  | { kind: "error"; message: string }
  | { kind: "ready"; order: AdminOrder };

async function load(id: string): Promise<LoadState> {
  if (!id) return { kind: "notFound" }; // 網址沒有帶 ?id=
  try {
    const order = await fetchAdminOrder(id);
    return order ? { kind: "ready", order } : { kind: "notFound" };
  } catch (err) {
    return { kind: "error", message: authErrorMessage(err) };
  }
}

const boxClass = "mt-4 rounded-2xl bg-surface p-5";
const inputClass =
  "mt-2 w-full rounded-2xl border-2 border-line bg-surface px-4 py-3 text-lg text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none";

export default function AdminOrderDetail() {
  // 訂單代碼從網址 ?id= 取得
  const id = useSearchParams().get("id") ?? "";
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    load(id).then((result) => {
      if (!cancelled) setState(result);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const reload = useCallback(async () => {
    setState(await load(id));
  }, [id]);

  return (
    <main className="min-h-screen bg-cream pb-28 text-ink">
      <AdminHeader backHref="/admin/orders" backLabel="訂單列表" title="📋 訂單詳細" />

      <section className="px-4 pt-4">
        {state.kind === "loading" && <p className="text-lg text-ink-soft">載入中…</p>}
        {state.kind === "notFound" && (
          <div className={boxClass}>
            <p className="text-lg font-bold">找不到這筆訂單</p>
            <Link href="/admin/orders" className="mt-4 block w-full rounded-full bg-brand py-4 text-center text-lg font-bold">
              回訂單列表
            </Link>
          </div>
        )}
        {state.kind === "error" && (
          <p role="alert" className="rounded-2xl border-2 border-brand bg-brand-soft px-4 py-3 text-base font-bold">
            ⚠️ {state.message}
          </p>
        )}
        {state.kind === "ready" && <Detail order={state.order} onChanged={reload} />}
      </section>
    </main>
  );
}

function Detail({ order, onChanged }: { order: AdminOrder; onChanged: () => Promise<void> }) {
  const reported = order.status === "pending" && order.remittanceLast5 !== null;

  return (
    <>
      {/* 編號與狀態 */}
      <p className="text-base text-ink-soft">訂單編號</p>
      <h1 className="text-3xl font-bold tracking-wide">{order.orderNo}</h1>
      <p className="mt-1 text-sm text-ink-muted">下單時間：{formatDateTime(order.createdAt)}</p>

      <div className="mt-4 rounded-2xl bg-brand px-5 py-4">
        <p className="text-base font-semibold">目前狀態</p>
        <p className="text-2xl font-bold">{STATUS_LABELS[order.status]}</p>
      </div>

      {/* 匯款回報 */}
      <div className={`${boxClass} ${reported ? "border-4 border-brand" : ""}`}>
        <p className="text-lg font-bold">💰 客人回報的匯款</p>
        {order.remittanceLast5 ? (
          <>
            <p className="mt-2 text-base">
              末五碼：<span className="text-2xl font-bold tracking-widest">{order.remittanceLast5}</span>
            </p>
            <p className="text-base">回報時間：{formatDateTime(order.remittanceReportedAt)}</p>
          </>
        ) : (
          <p className="mt-2 text-base text-ink-soft">客人尚未回報。</p>
        )}
      </div>

      {/* 客人資料 */}
      <div className={boxClass}>
        <p className="text-lg font-bold">👤 客人資料</p>
        <dl className="mt-2 space-y-2 text-lg">
          <div>
            <dt className="text-sm text-ink-soft">姓名</dt>
            <dd className="font-bold">{order.name}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-soft">手機</dt>
            <dd>
              <a
                href={`tel:${order.phone}`}
                className="inline-block rounded-full border-2 border-brand px-4 py-2 font-bold"
              >
                📞 {order.phone}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-sm text-ink-soft">收件資訊</dt>
            <dd className="whitespace-pre-line break-words">{order.shipping}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-soft">客人備註</dt>
            <dd className="whitespace-pre-line break-words">{order.note || "（無）"}</dd>
          </div>
        </dl>
      </div>

      {/* 品項與金額核對 */}
      <ItemsAndTotal order={order} />

      {/* 物流資訊 */}
      {(order.shippingCarrier || order.trackingNo) && (
        <div className={boxClass}>
          <p className="text-lg font-bold">🚚 物流資訊</p>
          <p className="mt-2 text-lg">物流公司：{order.shippingCarrier ?? "—"}</p>
          <p className="break-all text-lg">物流單號：{order.trackingNo ?? "—"}</p>
        </div>
      )}

      {/* 狀態操作 */}
      <StatusActions order={order} onChanged={onChanged} />

      {/* 刪除：只有「已取消」的訂單才顯示 */}
      {order.status === "cancelled" && <DeleteOrder order={order} />}

      {/* 管理員備註 */}
      <AdminNote order={order} />
    </>
  );
}

function ItemsAndTotal({ order }: { order: AdminOrder }) {
  const [recalc, setRecalc] = useState<{ total: number; missing: string[] } | null>(null);
  const [recalcError, setRecalcError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    recalculateTotal(order.items)
      .then((result) => {
        if (!cancelled) setRecalc(result);
      })
      .catch(() => {
        if (!cancelled) setRecalcError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [order.items]);

  const mismatch = recalc !== null && (recalc.missing.length > 0 || recalc.total !== order.total);

  return (
    <div className={boxClass}>
      <p className="text-lg font-bold">🛒 訂購內容</p>
      <ul className="mt-3 divide-y divide-line">
        {order.items.map((item, index) => (
          <li key={index} className="py-3">
            <p className="text-lg font-bold">{item.name}</p>
            <div className="flex justify-between text-base text-ink-soft">
              <span>
                {formatPrice(item.price)} × {item.quantity}
              </span>
              <span className="font-bold text-ink">{formatPrice(item.price * item.quantity)}</span>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-2 space-y-2 border-t-2 border-line pt-3">
        <div className="flex items-end justify-between">
          <span className="text-lg font-bold">訂單金額</span>
          <span className="text-3xl font-bold">{formatPrice(order.total)}</span>
        </div>
        <div className="flex items-end justify-between text-ink-soft">
          <span className="text-base">依目前商品價格重新計算</span>
          <span className="text-xl font-bold">
            {recalcError ? "讀取失敗" : recalc === null ? "計算中…" : formatPrice(recalc.total)}
          </span>
        </div>
      </div>

      {mismatch && (
        <div role="alert" className="mt-4 rounded-2xl border-4 border-brand bg-brand-soft p-4">
          <p className="text-lg font-bold">⚠️ 金額不一致，請核對！</p>
          <p className="mt-1 text-base">
            訂單金額和目前商品價格算出來的不同。可能是下單後改過價格，也可能是訂單資料有問題。請確認客人應付的金額後再標記收款。
          </p>
          {recalc && recalc.missing.length > 0 && (
            <p className="mt-2 text-base">
              以下商品目前找不到或沒有價格，沒算進重新計算：{recalc.missing.join("、")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function StatusActions({ order, onChanged }: { order: AdminOrder; onChanged: () => Promise<void> }) {
  const steps = NEXT_STEPS[order.status];
  const [carrier, setCarrier] = useState("");
  const [trackingNo, setTrackingNo] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  if (steps.length === 0) {
    return (
      <div className={boxClass}>
        <p className="text-base text-ink-soft">這筆訂單已經{STATUS_LABELS[order.status]}，沒有下一步。</p>
      </div>
    );
  }

  async function run(next: (typeof steps)[number]) {
    if (busy) return;
    setError("");
    setNotice("");
    let shipping: { carrier: string; trackingNo: string } | undefined;
    if (next === "shipped") {
      const c = carrier.trim();
      const t = trackingNo.trim();
      if (!c || !t) {
        setError("請填寫物流公司和物流單號。");
        return;
      }
      if (c.length > 50 || t.length > 50) {
        setError("物流公司和物流單號最多 50 個字。");
        return;
      }
      shipping = { carrier: c, trackingNo: t };
    }
    setBusy(true);
    try {
      await changeOrderStatus(order, next, shipping);
      setNotice(`已改成「${STATUS_LABELS[next]}」。`);
      setConfirmCancel(false);
      await onChanged();
    } catch (err) {
      setError(
        err instanceof Error && err.message === "invalid-step"
          ? "這個狀態不能這樣改，請重新整理頁面。"
          : authErrorMessage(err),
      );
    } finally {
      setBusy(false);
    }
  }

  const bigButton =
    "w-full rounded-full bg-brand py-5 text-xl font-bold text-ink shadow-sm transition active:scale-95 disabled:bg-disabled disabled:text-ink-muted";

  return (
    <div className={boxClass}>
      <p className="text-lg font-bold">⚙️ 下一步</p>

      {notice && (
        <p role="status" className="mt-3 rounded-2xl border-2 border-brand px-4 py-3 text-base font-bold">
          ✅ {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 rounded-2xl border-2 border-brand bg-brand-soft px-4 py-3 text-base font-bold">
          ⚠️ {error}
        </p>
      )}

      <div className="mt-4 space-y-4">
        {steps.includes("paid") && (
          <button type="button" disabled={busy} onClick={() => run("paid")} className={bigButton}>
            {busy ? "處理中…" : "✅ 標記已收款"}
          </button>
        )}

        {steps.includes("shipped") && (
          <div className="space-y-3">
            <label className="block">
              <span className="text-lg font-bold">物流公司</span>
              <span className="ml-2 text-sm text-ink-muted">必填</span>
              <input
                maxLength={50}
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                placeholder="例如：7-11 交貨便、黑貓宅急便"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-lg font-bold">物流單號</span>
              <span className="ml-2 text-sm text-ink-muted">必填</span>
              <input
                maxLength={50}
                value={trackingNo}
                onChange={(e) => setTrackingNo(e.target.value)}
                className={inputClass}
              />
            </label>
            <button type="button" disabled={busy} onClick={() => run("shipped")} className={bigButton}>
              {busy ? "處理中…" : "🚚 標記已出貨"}
            </button>
          </div>
        )}

        {steps.includes("completed") && (
          <button type="button" disabled={busy} onClick={() => run("completed")} className={bigButton}>
            {busy ? "處理中…" : "🎉 標記完成"}
          </button>
        )}

        {steps.includes("cancelled") &&
          (confirmCancel ? (
            <div className="rounded-2xl border-4 border-brand bg-brand-soft p-4">
              <p className="text-lg font-bold">確定要取消這筆訂單嗎？</p>
              <p className="mt-1 text-base">取消後不能再改回來。</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run("cancelled")}
                  className="rounded-full bg-brand py-4 text-lg font-bold text-ink disabled:bg-disabled disabled:text-ink-muted"
                >
                  {busy ? "處理中…" : "確定取消"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmCancel(false)}
                  className="rounded-full border-2 border-line bg-surface py-4 text-lg font-bold"
                >
                  不要取消
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setError("");
                setNotice("");
                setConfirmCancel(true);
              }}
              className="w-full rounded-full border-2 border-line bg-surface py-4 text-lg font-bold"
            >
              取消訂單
            </button>
          ))}
      </div>
    </div>
  );
}

function DeleteOrder({ order }: { order: AdminOrder }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setBusy(true);
    setError("");
    try {
      await deleteOrder(order);
      router.replace("/admin/orders");
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className={boxClass}>
      {error && (
        <p role="alert" className="mb-3 rounded-2xl bg-brand-soft px-4 py-3 text-base font-bold">
          ⚠️ {error}
        </p>
      )}
      <ConfirmAction
        label="🗑️ 刪除訂單"
        question="要刪除這筆已取消的訂單嗎？"
        warning="刪除後無法復原，客人用舊網址查詢會看到「找不到這筆訂單」。"
        confirmLabel="確定刪除"
        twice
        busy={busy}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function AdminNote({ order }: { order: AdminOrder }) {
  const [note, setNote] = useState(order.adminNote);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleSave() {
    if (busy) return;
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await saveAdminNote(order.id, note.trim());
      setNotice("備註已儲存。");
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={boxClass}>
      <p className="text-lg font-bold">📝 管理員備註</p>
      <p className="text-sm text-ink-muted">只有你看得到，客人看不到。</p>
      <textarea
        rows={4}
        maxLength={ADMIN_NOTE_LIMIT}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className={inputClass}
      />
      {notice && <p role="status" className="mt-2 text-base font-bold">✅ {notice}</p>}
      {error && (
        <p role="alert" className="mt-2 rounded-2xl bg-brand-soft px-4 py-3 text-base font-bold">
          ⚠️ {error}
        </p>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={handleSave}
        className="mt-3 w-full rounded-full border-2 border-brand bg-surface py-4 text-lg font-bold disabled:text-ink-muted"
      >
        {busy ? "儲存中…" : "儲存備註"}
      </button>
    </div>
  );
}
