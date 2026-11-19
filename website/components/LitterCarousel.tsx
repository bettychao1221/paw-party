"use client";

import Link from "next/link";
import Price from "@/components/Price";
import AddToCartButton from "@/components/AddToCartButton";
import { useShopProducts } from "@/lib/useShopProducts";
import { productUrl } from "@/lib/urls";

// 首頁「貓砂系列」：從 Firestore 讀取已上架的貓砂商品
export default function LitterCarousel() {
  const { products, loading } = useShopProducts();
  const litters = products.filter((product) => product.category === "cat-litter");

  if (loading) {
    return <p className="mt-4 px-4 text-base text-ink-soft">載入中…</p>;
  }

  if (litters.length === 0) {
    return <p className="mt-4 px-4 text-base text-ink-soft">商品準備中，敬請期待。</p>;
  }

  return (
    <div className="mt-4 flex snap-x gap-3 overflow-x-auto px-4 [scrollbar-width:none]">
      {litters.map((product) => (
        <div
          key={product.id}
          className="flex w-48 shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-line bg-surface"
        >
        <Link href={productUrl(product.id)} className="block flex-1 transition active:scale-95">
          <div className="flex aspect-square items-center justify-center bg-brand-soft">
            <span className="text-6xl">{product.emoji}</span>
          </div>
          <div className="p-3">
            <h3 className="text-lg font-bold">{product.name}</h3>
            <p className="mt-1 text-sm leading-6 text-ink-soft">{product.tagline}</p>
            <div className="mt-2">
              <Price price={product.price} originalPrice={product.originalPrice} />
            </div>
          </div>
        </Link>
          <div className="px-3 pb-3">
            <AddToCartButton product={product} />
          </div>
        </div>
      ))}
    </div>
  );
}
