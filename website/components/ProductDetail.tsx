"use client";

import Link from "next/link";
import Price from "@/components/Price";
import AddToCartButton from "@/components/AddToCartButton";
import CartButton from "@/components/CartButton";
import LineButton from "@/components/LineButton";
import { useShopProducts } from "@/lib/useShopProducts";

// 商品頁內容：從 Firestore 讀取，只顯示已上架的商品
export default function ProductDetail({ id }: { id: string }) {
  const { products, loading } = useShopProducts();
  const product = products.find((item) => item.id === id);

  if (loading) {
    return (
      <main className="min-h-screen bg-surface px-5 pb-28 pt-16 text-center text-ink">
        <p className="text-lg text-ink-soft">載入中…</p>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 pb-24 text-center text-ink">
        <p className="text-6xl">🐾</p>
        <h1 className="mt-6 text-2xl font-bold">找不到這個商品</h1>
        <Link
          href="/shop"
          className="mt-8 rounded-full bg-brand px-8 py-4 text-lg font-bold text-ink"
        >
          回到商城
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface pb-44 text-ink">
      {/* 頂部：返回商城 */}
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
        <div className="flex items-center px-4 py-3">
          <Link
            href="/shop"
            className="text-base font-bold text-ink underline decoration-brand decoration-2 underline-offset-4"
          >
            ← 商城
          </Link>
        </div>
      </header>

      {/* 商品展示區：之後圖片、影片、3D 模型會放在這裡 */}
      <div className="relative flex aspect-square items-center justify-center bg-cream">
        <span className="text-9xl">{product.emoji}</span>
        {product.label && (
          <span className="absolute left-4 top-4 rounded-full bg-brand px-3 py-1 text-sm font-bold text-ink">
            {product.label}
          </span>
        )}
      </div>

      {/* 商品資訊 */}
      <section className="px-5 pt-6">
        <p className="text-sm font-bold tracking-[0.15em] text-ink-muted">
          {product.english}
        </p>
        <h1 className="mt-2 text-3xl font-bold">{product.name}</h1>
        <p className="mt-2 text-lg font-semibold text-ink">{product.tagline}</p>

        <div className="mt-4">
          <Price price={product.price} originalPrice={product.originalPrice} size="lg" />
        </div>

        <p className="mt-5 whitespace-pre-line text-base leading-8 text-ink-soft">
          {product.description}
        </p>

        <div className="mt-6 space-y-3">
          <AddToCartButton product={product} size="lg" />
          <LineButton />
        </div>
      </section>

      <CartButton />
    </main>
  );
}
