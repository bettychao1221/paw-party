"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import LineButton from "@/components/LineButton";
import { MAX_QUANTITY, removeFromCart, setQuantity, useCart } from "@/lib/cart";
import { fetchAllProducts, formatPrice, type ShopProduct } from "@/lib/products";

export default function CartPage() {
  const cart = useCart();
  // 價格一律以 Firestore 最新資料為準
  const [products, setProducts] = useState<ShopProduct[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchAllProducts()
      .then((list) => {
        if (!cancelled) setProducts(list);
      })
      .catch(() => {
        if (!cancelled) setError("讀不到最新價格，請檢查網路後重新整理。");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const lines = cart.map((item) => {
    const product = products?.find((p) => p.id === item.productId) ?? null;
    const available = !!product && product.published && product.price !== null;
    return { item, product, available };
  });
  const total = lines.reduce(
    (sum, line) =>
      line.available && line.product?.price != null
        ? sum + line.product.price * line.item.quantity
        : sum,
    0,
  );
  const hasUnavailable = lines.some((line) => !line.available);

  return (
    <main className="min-h-screen bg-surface pb-28 text-ink">
      <SiteHeader backHref="/shop" backLabel="繼續逛" />

      <section className="px-4 pt-5">
        <h1 className="text-3xl font-bold">🛒 購物車</h1>

        {error && (
          <p role="alert" className="mt-4 rounded-2xl border-2 border-brand bg-brand-soft px-4 py-3 text-base font-bold">
            ⚠️ {error}
          </p>
        )}

        {cart.length === 0 ? (
          <div className="mt-8 rounded-2xl bg-cream p-6 text-center">
            <p className="text-5xl">🐾</p>
            <p className="mt-4 text-lg font-bold">購物車是空的</p>
            <Link
              href="/shop"
              className="mt-6 block w-full rounded-full bg-brand py-4 text-lg font-bold text-ink"
            >
              去逛商品
            </Link>
          </div>
        ) : !products && !error ? (
          <p className="mt-6 text-lg text-ink-soft">載入中…</p>
        ) : (
          <>
            <ul className="mt-5 space-y-3">
              {lines.map(({ item, product, available }) => (
                <li key={item.productId} className="rounded-2xl border border-line bg-surface p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-4xl">{product?.emoji ?? "📦"}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-bold">{product?.name ?? "找不到這個商品"}</p>
                      {available && product?.price != null ? (
                        <p className="text-base text-ink-soft">
                          單價 {formatPrice(product.price)}
                        </p>
                      ) : (
                        <p className="text-base font-bold text-ink">
                          ⚠️ 這個商品目前無法購買，請刪除
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    {available ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label="減少一個"
                          onClick={() => setQuantity(item.productId, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="h-12 w-12 rounded-full border-2 border-line text-2xl font-bold disabled:text-ink-muted"
                        >
                          −
                        </button>
                        <span className="w-10 text-center text-xl font-bold">{item.quantity}</span>
                        <button
                          type="button"
                          aria-label="增加一個"
                          onClick={() => setQuantity(item.productId, item.quantity + 1)}
                          disabled={item.quantity >= MAX_QUANTITY}
                          className="h-12 w-12 rounded-full border-2 border-line text-2xl font-bold disabled:text-ink-muted"
                        >
                          ＋
                        </button>
                      </div>
                    ) : (
                      <span />
                    )}
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.productId)}
                      className="rounded-full border-2 border-line px-4 py-3 text-base font-bold"
                    >
                      刪除
                    </button>
                  </div>

                  {available && product?.price != null && (
                    <p className="mt-3 text-right text-lg font-bold">
                      小計 {formatPrice(product.price * item.quantity)}
                    </p>
                  )}
                </li>
              ))}
            </ul>

            <div className="mt-5 rounded-2xl bg-brand-soft p-5">
              <div className="flex items-end justify-between">
                <span className="text-lg font-bold">總金額</span>
                <span className="text-3xl font-bold">{formatPrice(total)}</span>
              </div>            </div>

            {hasUnavailable && (
              <p className="mt-4 text-base font-bold">⚠️ 請先刪除無法購買的商品，再前往結帳。</p>
            )}

            {hasUnavailable || total === 0 ? (
              <span className="mt-5 block w-full rounded-full bg-disabled py-5 text-center text-xl font-bold text-ink-muted">
                前往結帳
              </span>
            ) : (
              <Link
                href="/checkout"
                className="mt-5 block w-full rounded-full bg-brand py-5 text-center text-xl font-bold text-ink shadow-sm transition active:scale-95"
              >
                前往結帳 →
              </Link>
            )}
          </>
        )}

        <div className="mt-6">
          <LineButton label="有問題？問官方 LINE" />
        </div>
      </section>
    </main>
  );
}
