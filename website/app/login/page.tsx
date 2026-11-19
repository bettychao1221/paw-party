"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth, authErrorMessage } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // 已經登入的人，直接帶去會員頁
  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      if (user) router.replace("/member");
    });
  }, [router]);

  const isLogin = mode === "login";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("請輸入 Email 和密碼。");
      return;
    }

    setBusy(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      }
      router.replace("/member");
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  }

  function switchMode() {
    setMode(isLogin ? "register" : "login");
    setError("");
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

      <section className="px-5 pt-8">
        <div className="text-center text-6xl">🐈</div>
        <h1 className="mt-4 text-center text-3xl font-bold">
          {isLogin ? "會員登入" : "註冊會員"}
        </h1>
        <p className="mt-2 text-center text-base text-ink-soft">
          {isLogin ? "登入後可以查看寄倉資料" : "用 Email 建立新帳號"}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="block">
            <span className="text-lg font-bold">Email</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="例如：name@gmail.com"
              className="mt-2 w-full rounded-2xl border-2 border-line bg-surface px-4 py-4 text-lg text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-lg font-bold">密碼</span>
            <input
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isLogin ? "請輸入密碼" : "至少 6 個字"}
              className="mt-2 w-full rounded-2xl border-2 border-line bg-surface px-4 py-4 text-lg text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none"
            />
          </label>

          {/* 錯誤訊息 */}
          {error && (
            <p
              role="alert"
              className="rounded-2xl border-2 border-brand bg-brand-soft px-4 py-3 text-base font-bold text-ink"
            >
              ⚠️ {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-brand py-5 text-xl font-bold text-ink shadow-sm transition active:scale-95 disabled:bg-disabled disabled:text-ink-muted"
          >
            {busy ? "請稍候…" : isLogin ? "登入" : "註冊"}
          </button>
        </form>

        {/* 切換登入／註冊 */}
        <div className="mt-8 rounded-2xl bg-cream p-5 text-center">
          <p className="text-base text-ink-soft">
            {isLogin ? "還沒有帳號嗎？" : "已經有帳號了嗎？"}
          </p>
          <button
            type="button"
            onClick={switchMode}
            className="mt-3 w-full rounded-full border-2 border-brand bg-surface py-4 text-lg font-bold text-ink transition active:scale-95"
          >
            {isLogin ? "我要註冊" : "我要登入"}
          </button>
        </div>
      </section>
    </main>
  );
}
