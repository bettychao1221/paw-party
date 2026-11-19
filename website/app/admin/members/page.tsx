"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminHeader from "@/components/admin/AdminHeader";
import { authErrorMessage } from "@/lib/firebase";
import { fetchMembers, type Member } from "@/lib/members";
import { formatDateTime } from "@/lib/adminOrders";

export default function AdminMembersPage() {
  return (
    <AdminGuard>
      <MemberList />
    </AdminGuard>
  );
}

function MemberList() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchMembers()
      .then((list) => {
        if (!cancelled) setMembers(list);
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

  // 同一個 Email 出現兩次以上 → 警告
  const emailCount = new Map<string, number>();
  for (const m of members) {
    const key = m.email.toLowerCase();
    emailCount.set(key, (emailCount.get(key) ?? 0) + 1);
  }
  const k = keyword.trim().toLowerCase();
  const list = k ? members.filter((m) => m.email.toLowerCase().includes(k)) : members;

  return (
    <main className="min-h-screen bg-cream pb-28 text-ink">
      <AdminHeader backHref="/admin" backLabel="後台" title="👥 會員寄倉" />

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

        {error && (
          <p role="alert" className="mt-4 rounded-2xl border-2 border-brand bg-brand-soft px-4 py-3 text-base font-bold">
            ⚠️ {error}
          </p>
        )}

        {loading ? (
          <p className="mt-4 text-lg text-ink-soft">載入中…</p>
        ) : (
          <>
            <p className="mt-4 text-base text-ink-soft">共 {list.length} 位會員</p>
            {list.length === 0 ? (
              <p className="mt-3 rounded-2xl bg-surface p-5 text-lg text-ink-soft">找不到會員。</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {list.map((m) => {
                  const duplicated = (emailCount.get(m.email.toLowerCase()) ?? 0) > 1;
                  return (
                    <li key={m.uid}>
                      <Link
                        href={`/admin/members/${m.uid}`}
                        className={`block rounded-2xl bg-surface p-4 transition active:scale-[0.98] ${
                          duplicated ? "border-4 border-brand" : "border border-line"
                        }`}
                      >
                        {duplicated && (
                          <p className="mb-2 inline-block rounded-full bg-brand px-3 py-1 text-base font-bold">
                            ⚠️ 有其他會員使用相同 Email
                          </p>
                        )}
                        <p className="break-all text-lg font-bold">{m.email || "（沒有 Email）"}</p>
                        <p className="text-sm text-ink-muted">加入時間：{formatDateTime(m.createdAt)}</p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </section>
    </main>
  );
}
