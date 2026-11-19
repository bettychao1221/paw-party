"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import LineButton from "@/components/LineButton";
import { clearCart, saveLastOrderId, useCart } from "@/lib/cart";
import { LIMITS, priceCart, submitOrder, type PricedCart } from "@/lib/orders";
import { formatPrice } from "@/lib/products";

const inputClass =
  "mt-2 w-full rounded-2xl border-2 border-line bg-surface px-4 py-4 text-lg text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none";

export default function CheckoutPage() {
  const router = useRouter();
  const cart = useCart();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [shipping, setShipping] = useState("");
  const [note, setNote] = useState("");
  const [honeypot, setHoneypot] = useState(""); // 防機器人：真人看不到這個欄位

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState<PricedCart | null>(null);
  const submitting = useRef(false); // 防止連按兩次送出

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setError("");

    // 機器人通常會把所有欄位都填滿
    if (honeypot) {
      setError("送出失敗，請重新整理頁面後再試。");
      return;
    }

    const cleanName = name.trim();
    const cleanPhone = phone.replace(/[\s-]/g, "");
    const cleanShipping = shipping.trim();
    const cleanNote = note.trim();

    if (!cleanName) return setError("請填寫姓名。");
    if (cleanName.length > LIMITS.name) return setError(`姓名最多 ${LIMITS.name} 個字。`);
    if (!/^09\d{8}$/.test(cleanPhone))
      return setError("手機號碼格式不對，請填 09 開頭的 10 位數字，例如 0912345678。");
    if (!cleanShipping) return setError("請填寫收件資訊（地址，或超商店名與店號）。");
    if (cleanShipping.length > LIMITS.shipping)
      return setError(`收件資訊最多 ${LIMITS.shipping} 個字。`);
    if (cleanNote.length > LIMITS.note) return setError(`備註最多 ${LIMITS.note} 個字。`);
    if (cart.length === 0) return setError("購物車是空的。");
    if (cart.length > LIMITS.maxItems)
      return setError(`一張訂單最多 ${LIMITS.maxItems} 種商品。`);

    submitting.current = true;
    setBusy(true);
    try {
      // 送出前重新讀取最新價格
      const priced = await priceCart(cart);
      if (priced.unavailable.length > 0 || priced.lines.length === 0) {
        throw new Error("有商品已下架或暫停販售，請回購物車確認。");
      }
      // 價格和客人剛剛看到的不一樣 → 先讓客人確認一次
      if (confirmed === null || confirmed.total !== priced.total) {
        const changed = confirmed !== null;
        setConfirmed(priced);
        submitting.current = false;
        setBusy(false);
        if (changed) setError("價格有更新，請確認新的總金額後再按一次送出。");
        return;
      }

      const id = await submitOrder(
        { name: cleanName, phone: cleanPhone, shipping: cleanShipping, note: cleanNote },
        priced,
      );
      saveLastOrderId(id);
      clearCart();
      router.replace(`/order/${id}`);
    } catch (err) {
      setError(
        err instanceof Error && err.message.startsWith("有商品")
          ? err.message
          : "訂單送出失敗，請檢查網路後再試一次。若一直失敗，請問官方 LINE。",
      );
      submitting.current = false;
      setBusy(false);
    }
  }

  if (cart.length === 0 && !busy) {
    return (
      <main className="min-h-screen bg-surface pb-28 text-ink">
        <SiteHeader backHref="/shop" backLabel="商城" />
        <section className="px-4 pt-8 text-center">
          <p className="text-5xl">🛒</p>
          <p className="mt-4 text-lg font-bold">購物車是空的</p>
          <Link href="/shop" className="mt-6 block w-full rounded-full bg-brand py-4 text-lg font-bold text-ink">
            去逛商品
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface pb-28 text-ink">
      <SiteHeader backHref="/cart" backLabel="購物車" />

      <section className="px-4 pt-5">
        <h1 className="text-3xl font-bold">填寫收件資料</h1>
        <p className="mt-1 text-base text-ink-soft">不用註冊會員，填好就可以送出訂單。</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
          <label className="block">
            <span className="text-lg font-bold">姓名</span>
            <span className="ml-2 text-sm text-ink-muted">必填</span>
            <input
              autoComplete="name"
              maxLength={LIMITS.name}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="text-lg font-bold">手機</span>
            <span className="ml-2 text-sm text-ink-muted">必填</span>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={13}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0912345678"
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="text-lg font-bold">收件資訊</span>
            <span className="ml-2 text-sm text-ink-muted">必填</span>
            <textarea
              rows={3}
              maxLength={LIMITS.shipping}
              value={shipping}
              onChange={(e) => setShipping(e.target.value)}
              placeholder="寫地址，或超商店名＋店號"
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="text-lg font-bold">備註</span>
            <span className="ml-2 text-sm text-ink-muted">選填</span>
            <textarea
              rows={3}
              maxLength={LIMITS.note}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={inputClass}
            />
          </label>

          {/* 防機器人欄位：畫面上看不到，真人不會填 */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label>
              請勿填寫
              <input
                tabIndex={-1}
                autoComplete="off"
                name="website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </label>
          </div>

          {confirmed && (
            <div className="rounded-2xl bg-brand-soft p-5">
              <p className="text-lg font-bold">請確認訂單內容</p>
              <ul className="mt-3 space-y-1 text-base">
                {confirmed.lines.map((line) => (
                  <li key={line.productId} className="flex justify-between gap-3">
                    <span>
                      {line.emoji} {line.name} × {line.quantity}
                    </span>
                    <span className="shrink-0">{formatPrice(line.subtotal)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-end justify-between border-t border-line pt-3">
                <span className="text-lg font-bold">總金額</span>
                <span className="text-3xl font-bold">{formatPrice(confirmed.total)}</span>
              </div>
            </div>
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
            {busy ? "處理中，請稍候…" : confirmed ? "確認送出訂單" : "下一步：確認金額"}
          </button>
        </form>

        <div className="mt-6">
          <LineButton label="有問題？問官方 LINE" />
        </div>
      </section>
    </main>
  );
}
