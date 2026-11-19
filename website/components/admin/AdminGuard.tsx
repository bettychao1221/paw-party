"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { ADMIN_UID, auth } from "@/lib/firebase";

// 後台頁面的門口：沒登入 → 去登入頁；不是管理員 → 顯示「沒有權限」。
// 這裡只是畫面判斷，真正的保護在 firestore.rules。
export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    return onAuthStateChanged(auth, (current) => {
      setUser(current);
      if (!current) router.replace("/login");
    });
  }, [router]);

  if (!user) {
    return (
      <main className="min-h-screen bg-surface px-5 pb-28 pt-16 text-center text-ink">
        <p className="text-lg text-ink-soft">載入中…</p>
      </main>
    );
  }

  if (user.uid !== ADMIN_UID) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 pb-28 text-center text-ink">
        <p className="text-6xl">🔒</p>
        <h1 className="mt-6 text-2xl font-bold">沒有權限</h1>
        <p className="mt-2 text-base text-ink-soft">這個頁面只有管理員可以使用。</p>
        <Link href="/" className="mt-8 rounded-full bg-brand px-8 py-4 text-lg font-bold text-ink">
          回到首頁
        </Link>
      </main>
    );
  }

  return <>{children}</>;
}
