"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth, authErrorMessage } from "@/lib/firebase";

// 寄送重設信後，按鈕要停用幾秒（防止連續點擊）
const RESET_COOLDOWN_SECONDS = 60;

// 不論 Email 有沒有註冊，都顯示同一句，避免透露誰是會員
const RESET_SENT_MESSAGE =
  "如果這個 Email 已經註冊，我們會寄出重設密碼的信。請查看收件匣，也請看一下垃圾郵件匣。";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // 忘記密碼
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // 已經登入的人，直接帶去會員頁
  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      if (user) router.replace("/member");
    });
  }, [router]);

  // 倒數計時：每秒減 1，到 0 停止
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const isLogin = mode === "login";

  function openReset() {
    setResetEmail(email.trim());
    setResetError("");
    setResetSent(false);
    setShowReset(true);
  }

  function closeReset() {
    setShowReset(false);
    setResetError("");
    setError("");
  }

  async function handleReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (resetBusy || cooldown > 0) return;
    setResetError("");
    setResetSent(false);

    const target = resetEmail.trim();
    if (!target) {
      setResetError("請輸入 Email。");
      return;
    }

    setResetBusy(true);
    try {
      auth.languageCode = "zh-TW"; // 重設信用繁體中文
      await sendPasswordResetEmail(auth, target);
      setResetSent(true);
      setCooldown(RESET_COOLDOWN_SECONDS);
    } catch (err) {
      const code =
        typeof err === "object" && err !== null && "code" in err
          ? String((err as { code: unknown }).code)
          : "";
      if (code === "auth/user-not-found") {
        // 沒註冊也顯示同一句成功訊息
        setResetSent(true);
        setCooldown(RESET_COOLDOWN_SECONDS);
      } else {
        setResetError(authErrorMessage(err));
        if (code === "auth/too-many-requests") {
          setCooldown(RESET_COOLDOWN_SECONDS);
        }
      }
    } finally {
      setResetBusy(false);
    }
  }

  const inputClass =
    "mt-2 w-full rounded-2xl border-2 border-line bg-surface px-4 py-4 text-lg text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none";

  if (showReset) {
    return (
      <main className="min-h-screen bg-surface pb-28 text-ink">
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
          <div className="text-center text-6xl">🔑</div>
          <h1 className="mt-4 text-center text-3xl font-bold">忘記密碼</h1>
          <p className="mt-2 text-center text-base text-ink-soft">
            輸入註冊用的 Email，我們會寄重設密碼的信給你
          </p>

          <form onSubmit={handleReset} className="mt-8 space-y-5">
            <label className="block">
              <span className="text-lg font-bold">Email</span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="例如：name@gmail.com"
                className={inputClass}
              />
            </label>

            {resetError && (
              <p
                role="alert"
                className="rounded-2xl border-2 border-brand bg-brand-soft px-4 py-3 text-base font-bold text-ink"
              >
                ⚠️ {resetError}
              </p>
            )}

            {resetSent && (
              <p
                role="status"
                className="rounded-2xl bg-cream px-4 py-4 text-base font-bold text-ink"
              >
                📮 {RESET_SENT_MESSAGE}
              </p>
            )}

            <button
              type="submit"
              disabled={resetBusy || cooldown > 0}
              className="w-full rounded-full bg-brand py-5 text-xl font-bold text-ink shadow-sm transition active:scale-95 disabled:bg-disabled disabled:text-ink-muted"
            >
              {resetBusy
                ? "寄送中…"
                : cooldown > 0
                  ? `${cooldown} 秒後可再寄一次`
                  : "寄送重設信"}
            </button>
          </form>

          <button
            type="button"
            onClick={closeReset}
            className="mt-6 w-full rounded-full border-2 border-brand bg-surface py-4 text-lg font-bold text-ink transition active:scale-95"
          >
            ← 返回登入
          </button>
        </section>
      </main>
    );
  }

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

        {/* 忘記密碼（只在登入模式顯示） */}
        {isLogin && (
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={openReset}
              className="px-4 py-3 text-lg font-bold text-ink underline decoration-brand decoration-2 underline-offset-4"
            >
              忘記密碼？
            </button>
          </div>
        )}

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
