"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AdminGuard from "@/components/admin/AdminGuard";
import { authErrorMessage } from "@/lib/firebase";
import {
  PAYMENT_LIMIT,
  fetchPaymentSettings,
  savePaymentSettings,
  type PaymentSettings,
} from "@/lib/orders";

const inputClass =
  "mt-2 w-full rounded-2xl border-2 border-line bg-surface px-4 py-3 text-lg text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none";

const EMPTY: PaymentSettings = {
  bankName: "",
  bankCode: "",
  accountNumber: "",
  accountName: "",
  note: "",
};

export default function AdminSettingsPage() {
  return (
    <AdminGuard>
      <PaymentSettingsForm />
    </AdminGuard>
  );
}

function PaymentSettingsForm() {
  const [form, setForm] = useState<PaymentSettings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchPaymentSettings()
      .then((settings) => {
        if (!cancelled && settings) setForm(settings);
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

  function update(key: keyof PaymentSettings, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const cleaned: PaymentSettings = {
      bankName: form.bankName.trim(),
      bankCode: form.bankCode.trim(),
      accountNumber: form.accountNumber.replace(/[\s-]/g, ""),
      accountName: form.accountName.trim(),
      note: form.note.trim(),
    };
    if (!cleaned.bankName || !cleaned.accountNumber) {
      setError("請至少填寫銀行名稱和帳號。");
      return;
    }
    if (cleaned.bankCode && !/^\d{3}$/.test(cleaned.bankCode)) {
      setError("銀行代碼是 3 位數字，例如 822。");
      return;
    }
    if (!/^\d{6,20}$/.test(cleaned.accountNumber)) {
      setError("帳號請只填數字（6～20 位）。");
      return;
    }

    setBusy(true);
    try {
      await savePaymentSettings(cleaned);
      setForm(cleaned);
      setNotice("已儲存。客人的訂單頁會顯示新的匯款資訊。");
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-cream pb-28 text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <Link
            href="/admin"
            className="text-base font-bold underline decoration-brand decoration-2 underline-offset-4"
          >
            ← 後台
          </Link>
          <span className="text-lg font-black">🏦 匯款資訊</span>
        </div>
      </header>

      <section className="px-4 pt-5">
        <p className="text-base text-ink-soft">
          這裡的資料會顯示在客人「待匯款」的訂單頁。沒有填帳號時，客人會看到「匯款資訊請洽官方 LINE」。
        </p>

        {loading ? (
          <p className="mt-6 text-lg text-ink-soft">載入中…</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-5 rounded-2xl bg-surface p-5">
            <label className="block">
              <span className="text-lg font-bold">銀行名稱</span>
              <input
                maxLength={PAYMENT_LIMIT}
                value={form.bankName}
                onChange={(e) => update("bankName", e.target.value)}
                placeholder="例如：國泰世華銀行"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-lg font-bold">銀行代碼</span>
              <input
                inputMode="numeric"
                maxLength={3}
                value={form.bankCode}
                onChange={(e) => update("bankCode", e.target.value)}
                placeholder="3 位數字"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-lg font-bold">帳號</span>
              <input
                inputMode="numeric"
                maxLength={30}
                value={form.accountNumber}
                onChange={(e) => update("accountNumber", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-lg font-bold">戶名</span>
              <input
                maxLength={PAYMENT_LIMIT}
                value={form.accountName}
                onChange={(e) => update("accountName", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-lg font-bold">備註</span>
              <span className="ml-2 text-sm text-ink-muted">選填</span>
              <textarea
                rows={3}
                maxLength={PAYMENT_LIMIT}
                value={form.note}
                onChange={(e) => update("note", e.target.value)}
                placeholder="例如：匯款後請填寫末五碼"
                className={inputClass}
              />
            </label>

            {notice && (
              <p role="status" className="rounded-2xl border-2 border-brand px-4 py-3 text-base font-bold">
                ✅ {notice}
              </p>
            )}
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
              {busy ? "儲存中…" : "儲存"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
