"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import ConfirmAction from "@/components/admin/ConfirmAction";
import { authErrorMessage } from "@/lib/firebase";
import { fetchMember, type Member } from "@/lib/members";
import { computeBalances, fetchStockLogs } from "@/lib/stock";
import {
  SHIP_STATUS_LABELS,
  cancelShipRequest,
  confirmShipment,
  deleteShipRequest,
  fetchShipRequest,
  saveShipAdminNote,
  type ShipRequest,
} from "@/lib/shipments";
import { formatDateTime } from "@/lib/adminOrders";

type LoadState =
  | { kind: "loading" }
  | { kind: "notFound" }
  | { kind: "error"; message: string }
  | { kind: "ready"; request: ShipRequest; member: Member | null; balances: Map<string, number> };

async function load(id: string): Promise<LoadState> {
  try {
    const request = await fetchShipRequest(id);
    if (!request) return { kind: "notFound" };
    const [member, logs] = await Promise.all([fetchMember(request.uid), fetchStockLogs(request.uid)]);
    return { kind: "ready", request, member, balances: computeBalances(logs) };
  } catch (err) {
    return { kind: "error", message: authErrorMessage(err) };
  }
}

const boxClass = "mt-4 rounded-2xl bg-surface p-5";
const inputClass =
  "mt-2 w-full rounded-2xl border-2 border-line bg-surface px-4 py-3 text-lg text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none";

export default function AdminShipmentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
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
      <AdminHeader backHref="/admin/shipments" backLabel="申請列表" title="🚚 出貨申請" />
      <section className="px-4 pt-4">
        {state.kind === "loading" && <p className="text-lg text-ink-soft">載入中…</p>}
        {state.kind === "notFound" && <p className={boxClass + " text-lg font-bold"}>找不到這筆申請。</p>}
        {state.kind === "error" && (
          <p role="alert" className="rounded-2xl border-2 border-brand bg-brand-soft px-4 py-3 text-base font-bold">
            ⚠️ {state.message}
          </p>
        )}
        {state.kind === "ready" && (
          <Detail request={state.request} member={state.member} balances={state.balances} onChanged={reload} />
        )}
      </section>
    </main>
  );
}

function Detail({
  request,
  member,
  balances,
  onChanged,
}: {
  request: ShipRequest;
  member: Member | null;
  balances: Map<string, number>;
  onChanged: () => Promise<void>;
}) {
  const shortage = request.items.filter((i) => i.quantity > (balances.get(i.product) ?? 0));
  const isPending = request.status === "pending";

  return (
    <>
      <div className="rounded-2xl bg-brand px-5 py-4">
        <p className="text-base font-semibold">目前狀態</p>
        <p className="text-2xl font-bold">{SHIP_STATUS_LABELS[request.status]}</p>
      </div>
      <p className="mt-2 text-sm text-ink-muted">申請時間：{formatDateTime(request.createdAt)}</p>

      {/* 申請品項與餘額對照 */}
      <div className={boxClass}>
        <p className="text-lg font-bold">申請品項 ／ 目前餘額</p>
        <ul className="mt-2 space-y-2">
          {request.items.map((item, i) => {
            const balance = balances.get(item.product) ?? 0;
            const short = item.quantity > balance;
            return (
              <li
                key={i}
                className={`flex items-center justify-between rounded-2xl px-4 py-3 ${
                  short ? "border-4 border-brand bg-brand-soft" : "bg-cream"
                }`}
              >
                <span className="text-lg font-bold">{item.product}</span>
                <span className="text-lg">
                  申請 <b className="text-2xl">{item.quantity}</b> ／ 餘額 <b>{balance}</b>
                </span>
              </li>
            );
          })}
        </ul>
        {isPending && shortage.length > 0 && (
          <p role="alert" className="mt-3 rounded-2xl border-4 border-brand bg-brand-soft px-4 py-3 text-lg font-bold">
            ⚠️ 餘額不足：{shortage.map((s) => s.product).join("、")}。請先確認寄倉紀錄再出貨。
          </p>
        )}
        {member && (
          <Link
            href={`/admin/members/${member.uid}`}
            className="mt-3 inline-block text-base font-bold underline decoration-brand decoration-2 underline-offset-4"
          >
            查看這位會員的寄倉紀錄 →
          </Link>
        )}
      </div>

      {/* 收件資料 */}
      <div className={boxClass}>
        <p className="text-lg font-bold">👤 收件資料</p>
        <dl className="mt-2 space-y-2 text-lg">
          <div>
            <dt className="text-sm text-ink-soft">會員 Email</dt>
            <dd className="break-all">{member?.email ?? "（找不到會員）"}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-soft">姓名</dt>
            <dd className="font-bold">{request.name}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-soft">手機</dt>
            <dd>
              <a href={`tel:${request.phone}`} className="inline-block rounded-full border-2 border-brand px-4 py-2 font-bold">
                📞 {request.phone}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-sm text-ink-soft">收件資訊</dt>
            <dd className="whitespace-pre-line break-words">{request.shipping}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-soft">客人備註</dt>
            <dd className="whitespace-pre-line break-words">{request.note || "（無）"}</dd>
          </div>
        </dl>
      </div>

      {(request.carrier || request.trackingNo) && (
        <div className={boxClass}>
          <p className="text-lg font-bold">🚚 物流資訊</p>
          <p className="mt-2 text-lg">物流公司：{request.carrier ?? "—"}</p>
          <p className="break-all text-lg">物流單號：{request.trackingNo ?? "—"}</p>
        </div>
      )}

      <Actions request={request} onChanged={onChanged} />
      <ShipNote request={request} />
    </>
  );
}

function Actions({ request, onChanged }: { request: ShipRequest; onChanged: () => Promise<void> }) {
  const router = useRouter();
  const [carrier, setCarrier] = useState("");
  const [trackingNo, setTrackingNo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function run(action: () => Promise<void>, done: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(done);
      await onChanged();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function handleShip() {
    const c = carrier.trim();
    const t = trackingNo.trim();
    if (!c || !t) return setError("請填寫物流公司和物流單號。");
    if (c.length > 50 || t.length > 50) return setError("物流公司和物流單號最多 50 個字。");
    run(() => confirmShipment(request, c, t), "已確認出貨，並自動新增出庫紀錄。");
  }

  async function handleDelete() {
    setBusy(true);
    setError("");
    try {
      await deleteShipRequest(request.id);
      router.replace("/admin/shipments");
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className={boxClass}>
      <p className="text-lg font-bold">⚙️ 操作</p>
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
        {request.status === "pending" ? (
          <>
            <label className="block">
              <span className="text-lg font-bold">物流公司</span>
              <span className="ml-2 text-sm text-ink-muted">必填</span>
              <input maxLength={50} value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="例如：7-11 交貨便" className={inputClass} />
            </label>
            <label className="block">
              <span className="text-lg font-bold">物流單號</span>
              <span className="ml-2 text-sm text-ink-muted">必填</span>
              <input maxLength={50} value={trackingNo} onChange={(e) => setTrackingNo(e.target.value)} className={inputClass} />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={handleShip}
              className="w-full rounded-full bg-brand py-5 text-xl font-bold text-ink shadow-sm transition active:scale-95 disabled:bg-disabled disabled:text-ink-muted"
            >
              {busy ? "處理中…" : "🚚 確認出貨"}
            </button>
            <p className="text-sm text-ink-muted">確認出貨後，會自動為每個品項新增一筆出庫紀錄（備註「出貨申請」）。</p>

            <ConfirmAction
              label="取消申請"
              question="確定要取消這筆出貨申請嗎？"
              confirmLabel="確定取消"
              busy={busy}
              onConfirm={() => run(() => cancelShipRequest(request.id), "已取消這筆申請。")}
            />
          </>
        ) : (
          <ConfirmAction
            label="🗑️ 刪除這筆申請"
            question="要刪除這筆出貨申請嗎？"
            warning="刪除後無法復原。已產生的出庫紀錄不會一起刪除。"
            confirmLabel="確定刪除"
            twice
            busy={busy}
            onConfirm={handleDelete}
          />
        )}
      </div>
    </div>
  );
}

function ShipNote({ request }: { request: ShipRequest }) {
  const [note, setNote] = useState(request.adminNote ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSave() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await saveShipAdminNote(request.id, note.trim());
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
      <p className="text-sm text-ink-muted">客人的畫面不會顯示，但客人讀得到自己的申請資料，請勿寫私密內容。</p>
      <textarea rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
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
