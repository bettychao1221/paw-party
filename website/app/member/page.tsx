"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { ADMIN_UID, auth, authErrorMessage } from "@/lib/firebase";

export default function MemberPage() {
  const router = useRouter();
  // undefined = 還在確認登入狀態；null = 沒登入
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [error, setError] = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, (current) => {
      setUser(current);
      if (!current) router.replace("/login");
    });
  }, [router]);

  async function handleSignOut() {
    setError("");
    try {
      await signOut(auth);
      router.replace("/login");
    } catch (err) {
      setError(authErrorMessage(err));
    }
  }

  return (
    <main className="min-h-screen bg-surface pb-28 text-ink">
      {/* 頂部：品牌名稱 */}
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="text-lg font-black tracking-wider">
            PAW PARTY
            <span className="ml-2 text-sm font-medium text-ink-soft">
              肉球派對
            </span>
          </Link>
          <span className="text-xl">🐾</span>
        </div>
      </header>

      {!user ? (
        // 確認登入狀態中（或正在導向登入頁）
        <p className="px-5 pt-16 text-center text-lg text-ink-soft">
          載入中…
        </p>
      ) : (
        <section className="px-5 pt-8">
          <h1 className="text-3xl font-bold">會員中心</h1>

          <div className="mt-6 rounded-2xl bg-brand-soft p-5">
            <p className="text-base text-ink-soft">目前登入的帳號</p>
            <p className="mt-1 break-all text-xl font-bold">{user.email}</p>
          </div>

          {/* 寄倉資料：之後接上資料庫再顯示 */}
          <div className="mt-4 rounded-2xl border border-line bg-cream p-5">
            <p className="text-lg font-bold">📦 我的寄倉</p>
            <p className="mt-1 text-base text-ink-soft">
              寄倉餘量與紀錄即將開放查詢。
            </p>
          </div>

          {/* 後台入口：只有管理員看得到（不放在前台導覽列） */}
          {user.uid === ADMIN_UID && (
            <Link
              href="/admin"
              className="mt-4 block w-full rounded-full bg-brand py-5 text-center text-xl font-bold text-ink shadow-sm transition active:scale-95"
            >
              🛠️ 進入後台
            </Link>
          )}

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-2xl border-2 border-brand bg-brand-soft px-4 py-3 text-base font-bold text-ink"
            >
              ⚠️ {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleSignOut}
            className="mt-8 w-full rounded-full border-2 border-brand bg-surface py-5 text-xl font-bold text-ink transition active:scale-95"
          >
            登出
          </button>
        </section>
      )}
    </main>
  );
}
