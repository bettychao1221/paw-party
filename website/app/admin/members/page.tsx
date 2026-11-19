"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminHeader from "@/components/admin/AdminHeader";
import StockImport from "@/components/admin/StockImport";
import { authErrorMessage } from "@/lib/firebase";
import { fetchMembers, type Member } from "@/lib/members";
import { computeBalances, fetchAllStockLogs, lastActivity, type StockLog } from "@/lib/stock";
import { downloadCsv } from "@/lib/csv";
import { todayString } from "@/lib/fsValue";
import { adminMemberUrl } from "@/lib/urls";

export default function AdminMembersPage() {
  return (
    <AdminGuard>
      <StockOverview />
    </AdminGuard>
  );
}

type Row = {
  uid: string;
  email: string;
  duplicated: boolean;
  balances: Map<string, number>;
  total: number;
  last: string | null;
};

function buildRows(members: Member[], logs: StockLog[]): { rows: Row[]; products: string[] } {
  const logsByUid = new Map<string, StockLog[]>();
  for (const log of logs) {
    logsByUid.set(log.uid, [...(logsByUid.get(log.uid) ?? []), log]);
  }

  const emailCount = new Map<string, number>();
  for (const m of members) {
    const key = m.email.trim().toLowerCase();
    emailCount.set(key, (emailCount.get(key) ?? 0) + 1);
  }

  // 有流水但找不到會員檔的，也列出來（避免漏掉）
  const knownUids = new Set(members.map((m) => m.uid));
  const all = [
    ...members.map((m) => ({ uid: m.uid, email: m.email })),
    ...[...logsByUid.keys()]
      .filter((uid) => !knownUids.has(uid))
      .map((uid) => ({ uid, email: "" })),
  ];

  const productSet = new Set<string>();
  const rows = all.map(({ uid, email }) => {
    const memberLogs = logsByUid.get(uid) ?? [];
    const balances = computeBalances(memberLogs);
    for (const p of balances.keys()) productSet.add(p);
    const total = [...balances.values()].reduce((s, q) => s + q, 0);
    return {
      uid,
      email,
      duplicated: !!email && (emailCount.get(email.trim().toLowerCase()) ?? 0) > 1,
      balances,
      total,
      last: lastActivity(memberLogs),
    };
  });

  rows.sort((a, b) => a.email.localeCompare(b.email));
  const products = [...productSet].sort((a, b) => a.localeCompare(b, "zh-Hant"));
  return { rows, products };
}

function StockOverview() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [onlyWithStock, setOnlyWithStock] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchMembers(), fetchAllStockLogs()])
      .then(([m, l]) => {
        if (cancelled) return;
        setMembers(m);
        setLogs(l);
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

  const reload = useCallback(async () => {
    try {
      const [m, l] = await Promise.all([fetchMembers(), fetchAllStockLogs()]);
      setMembers(m);
      setLogs(l);
    } catch (err) {
      setError(authErrorMessage(err));
    }
  }, []);

  const { rows, products } = buildRows(members, logs);
  const k = keyword.trim().toLowerCase();
  const visible = rows.filter(
    (r) =>
      (!k || r.email.toLowerCase().includes(k)) &&
      (!onlyWithStock || [...r.balances.values()].some((q) => q !== 0)),
  );
  const totals = products.map((p) => visible.reduce((s, r) => s + (r.balances.get(p) ?? 0), 0));
  const grandTotal = totals.reduce((s, q) => s + q, 0);
  const duplicates = rows.filter((r) => r.duplicated);

  function handleExport() {
    downloadCsv(`寄倉總覽_${todayString()}.csv`, [
      ["Email", ...products, "總件數"],
      ...visible.map((r) => [
        r.email || "（找不到會員）",
        ...products.map((p) => r.balances.get(p) ?? 0),
        r.total,
      ]),
      ["合計", ...totals, grandTotal],
    ]);
  }

  const cell = "whitespace-nowrap px-3 py-3 text-right text-lg";
  const stickyCell = "sticky left-0 z-10 max-w-[11rem] px-3 py-3 text-left";

  return (
    <main className="min-h-screen bg-cream pb-28 text-ink">
      <AdminHeader backHref="/admin" backLabel="後台" title="📦 寄倉總覽" />

      <section className="px-4 pt-4">
        <label className="block">
          <span className="text-lg font-bold">用 Email 搜尋</span>
          <input
            type="search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="輸入 Email 的一部分"
            className="mt-2 w-full rounded-2xl border-2 border-line bg-surface px-4 py-3 text-lg focus:border-brand focus:outline-none"
          />
        </label>

        <button
          type="button"
          onClick={() => setOnlyWithStock(!onlyWithStock)}
          aria-pressed={onlyWithStock}
          className={`mt-3 w-full rounded-2xl border-2 px-4 py-3 text-lg font-bold ${
            onlyWithStock ? "border-brand bg-brand text-ink" : "border-line bg-surface text-ink-soft"
          }`}
        >
          {onlyWithStock ? "✓ 只顯示有寄倉的會員" : "顯示全部會員"}
        </button>

        {error && (
          <p role="alert" className="mt-4 rounded-2xl border-2 border-brand bg-brand-soft px-4 py-3 text-base font-bold">
            ⚠️ {error}
          </p>
        )}

        {duplicates.length > 0 && (
          <div role="alert" className="mt-4 rounded-2xl border-4 border-brand bg-brand-soft px-4 py-3">
            <p className="text-base font-bold">⚠️ 有會員使用相同 Email，請確認：</p>
            <p className="break-all text-base">{[...new Set(duplicates.map((d) => d.email))].join("、")}</p>
          </div>
        )}

        {loading ? (
          <p className="mt-4 text-lg text-ink-soft">載入中…</p>
        ) : (
          <>
            <div className="mt-4 flex items-end justify-between">
              <p className="text-base text-ink-soft">共 {visible.length} 位</p>
              <button
                type="button"
                onClick={handleExport}
                disabled={visible.length === 0}
                className="rounded-full bg-brand px-5 py-3 text-base font-bold text-ink disabled:bg-disabled disabled:text-ink-muted"
              >
                ⬇️ 匯出 CSV
              </button>
            </div>

            {visible.length === 0 ? (
              <p className="mt-3 rounded-2xl bg-surface p-5 text-lg text-ink-soft">
                {onlyWithStock ? "目前沒有寄倉中的會員。" : "找不到會員。"}
              </p>
            ) : (
              // 手機上可左右捲動；第一欄 Email 固定在左邊
              <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-surface">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-line bg-brand-soft">
                      <th className={`${stickyCell} bg-brand-soft text-base`}>Email</th>
                      {products.map((p) => (
                        <th key={p} className="whitespace-nowrap px-3 py-3 text-right text-base">
                          {p}
                        </th>
                      ))}
                      <th className="whitespace-nowrap px-3 py-3 text-right text-base">總件數</th>
                      <th className="whitespace-nowrap px-3 py-3 text-right text-base">最近異動</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((r) => (
                      <tr
                        key={r.uid}
                        onClick={() => router.push(adminMemberUrl(r.uid))}
                        className="cursor-pointer border-b border-line active:bg-cream"
                      >
                        <td className={`${stickyCell} bg-surface`}>
                          <span className="block break-all text-base font-bold underline decoration-brand decoration-2 underline-offset-4">
                            {r.duplicated && "⚠️ "}
                            {r.email || "（找不到會員）"}
                          </span>
                        </td>
                        {products.map((p) => {
                          const q = r.balances.get(p) ?? 0;
                          return (
                            <td key={p} className={`${cell} ${q < 0 ? "font-bold" : ""}`}>
                              {q === 0 ? <span className="text-ink-muted">—</span> : q}
                              {q < 0 && " ⚠️"}
                            </td>
                          );
                        })}
                        <td className={`${cell} font-bold`}>{r.total === 0 ? "—" : r.total}</td>
                        <td className={`${cell} text-base text-ink-soft`}>{r.last ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-line bg-cream font-bold">
                      <td className={`${stickyCell} bg-cream text-base`}>合計</td>
                      {totals.map((t, i) => (
                        <td key={products[i]} className={cell}>
                          {t === 0 ? "—" : t}
                        </td>
                      ))}
                      <td className={cell}>{grandTotal === 0 ? "—" : grandTotal}</td>
                      <td className={cell} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </>
        )}

        {!loading && <StockImport members={members} onImported={reload} />}
      </section>
    </main>
  );
}
