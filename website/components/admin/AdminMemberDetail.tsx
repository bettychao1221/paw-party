"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminHeader from "@/components/admin/AdminHeader";
import ConfirmAction from "@/components/admin/ConfirmAction";
import { authErrorMessage } from "@/lib/firebase";
import { todayString } from "@/lib/fsValue";
import { downloadCsv } from "@/lib/csv";
import { MEMBER_NOTE_LIMIT, fetchMember, saveMemberAdminNote, type Member } from "@/lib/members";
import {
  STOCK_LIMITS,
  STOCK_TYPE_LABELS,
  addStockLog,
  computeBalances,
  deleteStockLog,
  fetchStockLogs,
  voidStockLog,
  type StockLog,
  type StockType,
} from "@/lib/stock";
import { fetchAllProducts } from "@/lib/products";

type LoadState =
  | { kind: "loading" }
  | { kind: "notFound" }
  | { kind: "error"; message: string }
  | { kind: "ready"; member: Member; logs: StockLog[]; productNames: string[] };

async function load(uid: string): Promise<LoadState> {
  if (!uid) return { kind: "notFound" }; // 網址沒有帶 ?uid=
  try {
    const [member, logs, products] = await Promise.all([
      fetchMember(uid),
      fetchStockLogs(uid),
      fetchAllProducts().catch(() => []),
    ]);
    if (!member) return { kind: "notFound" };
    return { kind: "ready", member, logs, productNames: products.map((p) => p.name) };
  } catch (err) {
    return { kind: "error", message: authErrorMessage(err) };
  }
}

const boxClass = "mt-4 rounded-2xl bg-surface p-5";
const inputClass =
  "mt-2 w-full rounded-2xl border-2 border-line bg-surface px-4 py-3 text-lg text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none";

export default function AdminMemberDetail() {
  // 會員 UID 從網址 ?uid= 取得
  const uid = useSearchParams().get("uid") ?? "";
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    load(uid).then((result) => {
      if (!cancelled) setState(result);
    });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const reload = useCallback(async () => {
    setState(await load(uid));
  }, [uid]);

  return (
    <main className="min-h-screen bg-cream pb-28 text-ink">
      <AdminHeader backHref="/admin/members" backLabel="寄倉總覽" title="📦 會員寄倉" />
      <section className="px-4 pt-4">
        {state.kind === "loading" && <p className="text-lg text-ink-soft">載入中…</p>}
        {state.kind === "notFound" && <p className={boxClass + " text-lg font-bold"}>找不到這位會員。</p>}
        {state.kind === "error" && (
          <p role="alert" className="rounded-2xl border-2 border-brand bg-brand-soft px-4 py-3 text-base font-bold">
            ⚠️ {state.message}
          </p>
        )}
        {state.kind === "ready" && (
          <>
            <p className="text-base text-ink-soft">會員 Email</p>
            <h1 className="break-all text-2xl font-bold">{state.member.email}</h1>

            <Balances logs={state.logs} />
            <AddLogForm
              uid={uid}
              logs={state.logs}
              productNames={state.productNames}
              onAdded={reload}
            />
            <LogList email={state.member.email} logs={state.logs} onChanged={reload} />
            <MemberNote member={state.member} />
          </>
        )}
      </section>
    </main>
  );
}

function Balances({ logs }: { logs: StockLog[] }) {
  const balances = computeBalances(logs);
  return (
    <div className={boxClass}>
      <p className="text-lg font-bold">目前餘額</p>
      {balances.size === 0 ? (
        <p className="mt-2 text-base text-ink-soft">還沒有寄倉紀錄。</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {[...balances.entries()].map(([product, qty]) => (
            <li
              key={product}
              className={`flex items-center justify-between rounded-2xl px-4 py-3 ${
                qty < 0 ? "border-4 border-brand bg-brand-soft" : "bg-brand-soft"
              }`}
            >
              <span className="text-lg font-bold">{product}</span>
              <span className="text-2xl font-bold">
                {qty}
                {qty < 0 && " ⚠️"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AddLogForm({
  uid,
  logs,
  productNames,
  onAdded,
}: {
  uid: string;
  logs: StockLog[];
  productNames: string[];
  onAdded: () => Promise<void>;
}) {
  const [type, setType] = useState<StockType>("in");
  const [product, setProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [occurredOn, setOccurredOn] = useState(todayString());
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const balances = computeBalances(logs);
  // 商品名稱選單：網站商品＋這位會員已有的寄倉商品
  const suggestions = [...new Set([...productNames, ...balances.keys()])];
  const qty = /^\d+$/.test(quantity.trim()) ? Number(quantity.trim()) : 0;
  const current = balances.get(product.trim()) ?? 0;
  const overdraw = type === "out" && qty > current;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setNotice("");
    const p = product.trim();
    if (!p) return setError("請填寫商品名稱。");
    if (p.length > STOCK_LIMITS.product) return setError(`商品名稱最多 ${STOCK_LIMITS.product} 個字。`);
    if (!/^\d+$/.test(quantity.trim()) || qty < 1 || qty > STOCK_LIMITS.quantity)
      return setError(`數量請填 1～${STOCK_LIMITS.quantity} 的整數。`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) return setError("請選擇日期。");
    if (note.trim().length > STOCK_LIMITS.note) return setError(`備註最多 ${STOCK_LIMITS.note} 個字。`);

    setBusy(true);
    try {
      await addStockLog({ uid, product: p, type, quantity: qty, note: note.trim(), occurredOn });
      setNotice(`已新增：${p} ${STOCK_TYPE_LABELS[type]} ${qty}`);
      setQuantity("");
      setNote("");
      await onAdded();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={boxClass + " space-y-4"} noValidate>
      <p className="text-lg font-bold">➕ 新增入庫／出庫</p>

      <div className="grid grid-cols-2 gap-3">
        {(["in", "out"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            aria-pressed={type === t}
            className={`rounded-2xl border-2 py-4 text-lg font-bold ${
              type === t ? "border-brand bg-brand text-ink" : "border-line bg-surface text-ink-soft"
            }`}
          >
            {STOCK_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      <label className="block">
        <span className="text-lg font-bold">商品名稱</span>
        <span className="ml-2 text-sm text-ink-muted">可從選單選，也可以自己打</span>
        <input
          list="stock-products"
          maxLength={STOCK_LIMITS.product}
          value={product}
          onChange={(e) => setProduct(e.target.value)}
          className={inputClass}
        />
        <datalist id="stock-products">
          {suggestions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-lg font-bold">數量</span>
          <input inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inputClass} />
        </label>
        <label className="block">
          <span className="text-lg font-bold">日期</span>
          <input type="date" value={occurredOn} onChange={(e) => setOccurredOn(e.target.value)} className={inputClass} />
        </label>
      </div>

      <label className="block">
        <span className="text-lg font-bold">備註</span>
        <span className="ml-2 text-sm text-ink-muted">選填</span>
        <input maxLength={STOCK_LIMITS.note} value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
      </label>

      {/* 出庫超過餘額：只警告，不阻擋 */}
      {overdraw && (
        <p role="alert" className="rounded-2xl border-4 border-brand bg-brand-soft px-4 py-3 text-base font-bold">
          ⚠️ 出庫數量 {qty} 超過目前餘額 {current}，仍可以送出，請再確認一次。
        </p>
      )}
      {notice && <p role="status" className="text-base font-bold">✅ {notice}</p>}
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
        {busy ? "儲存中…" : `新增${STOCK_TYPE_LABELS[type]}`}
      </button>
    </form>
  );
}

function LogList({
  email,
  logs,
  onChanged,
}: {
  email: string;
  logs: StockLog[];
  onChanged: () => Promise<void>;
}) {
  function handleExport() {
    downloadCsv(`寄倉流水_${email || "會員"}_${todayString()}.csv`, [
      ["日期", "商品", "類型", "數量", "備註", "狀態", "作廢原因"],
      ...logs.map((log) => [
        log.occurredOn,
        log.product,
        STOCK_TYPE_LABELS[log.type],
        log.type === "in" ? log.quantity : -log.quantity,
        log.note,
        log.voided ? "已作廢" : "有效",
        log.voidReason ?? "",
      ]),
    ]);
  }

  return (
    <div className={boxClass}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-bold">流水記錄</p>
        {logs.length > 0 && (
          <button
            type="button"
            onClick={handleExport}
            className="rounded-full bg-brand px-4 py-3 text-base font-bold text-ink"
          >
            ⬇️ 匯出此會員流水 CSV
          </button>
        )}
      </div>
      {logs.length === 0 ? (
        <p className="mt-2 text-base text-ink-soft">沒有紀錄。</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {logs.map((log) => (
            <LogRow key={log.id} log={log} onChanged={onChanged} />
          ))}
        </ul>
      )}
    </div>
  );
}

function LogRow({ log, onChanged }: { log: StockLog; onChanged: () => Promise<void> }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleVoid() {
    const r = reason.trim();
    if (!r) return setError("請填寫作廢原因。");
    if (r.length > STOCK_LIMITS.voidReason) return setError(`原因最多 ${STOCK_LIMITS.voidReason} 個字。`);
    setBusy(true);
    setError("");
    try {
      await voidStockLog(log.id, r);
      await onChanged();
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    setError("");
    try {
      await deleteStockLog(log.id);
      await onChanged();
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <li className="py-4">
      <div className={`flex items-start justify-between gap-3 ${log.voided ? "text-ink-muted line-through" : ""}`}>
        <div>
          <p className="text-base">{log.occurredOn}</p>
          <p className="text-lg font-bold">{log.product}</p>
          {log.note && <p className="text-base">{log.note}</p>}
        </div>
        <span className="shrink-0 text-lg font-bold">
          {STOCK_TYPE_LABELS[log.type]} {log.type === "in" ? "+" : "−"}
          {log.quantity}
        </span>
      </div>
      {log.voided && (
        <p className="mt-1 inline-block rounded-full bg-disabled px-3 py-0.5 text-sm font-bold text-ink-soft">
          已作廢{log.voidReason ? `：${log.voidReason}` : ""}
        </p>
      )}
      {error && <p role="alert" className="mt-2 text-base font-bold">⚠️ {error}</p>}

      <div className="mt-3">
        {log.voided ? (
          <ConfirmAction
            label="🗑️ 刪除這筆"
            question="要刪除這筆已作廢的紀錄嗎？"
            warning="刪除後無法復原。"
            confirmLabel="確定刪除"
            twice
            busy={busy}
            onConfirm={handleDelete}
          />
        ) : (
          <ConfirmAction
            label="作廢這筆"
            question="要作廢這筆紀錄嗎？作廢後不會算進餘額。"
            confirmLabel="確定作廢"
            busy={busy}
            onConfirm={handleVoid}
          >
            <label className="mt-3 block">
              <span className="text-base font-bold">作廢原因（必填）</span>
              <input
                maxLength={STOCK_LIMITS.voidReason}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="例如：數量記錯"
                className={inputClass}
              />
            </label>
          </ConfirmAction>
        )}
      </div>
    </li>
  );
}

function MemberNote({ member }: { member: Member }) {
  const [note, setNote] = useState(member.adminNote);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSave() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await saveMemberAdminNote(member.uid, note.trim());
      setMessage("✅ 備註已儲存。");
    } catch (err) {
      setMessage(`⚠️ ${authErrorMessage(err)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={boxClass}>
      <p className="text-lg font-bold">📝 管理員備註</p>
      <p className="text-sm text-ink-muted">客人的畫面不會顯示，但客人讀得到自己的會員檔，請勿寫私密內容。</p>
      <textarea rows={4} maxLength={MEMBER_NOTE_LIMIT} value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
      {message && <p role="status" className="mt-2 text-base font-bold">{message}</p>}
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
