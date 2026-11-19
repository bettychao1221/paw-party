"use client";

import Link from "next/link";
import { useState } from "react";
import { products, categories } from "@/data/products";

export default function ShopPage() {
  const [active, setActive] = useState("all");

  const list =
    active === "all"
      ? products
      : products.filter((product) => product.category === active);

  return (
    <main className="min-h-screen bg-surface pb-24 text-ink">
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

        {/* 分類標籤：可左右滑動 */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none]">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActive(category.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-base font-semibold transition ${
                active === category.id
                  ? "border border-brand bg-brand text-ink"
                  : "border border-line bg-surface text-ink-soft"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </header>

      {/* 商品區 */}
      <section className="px-4 pt-5">
        <h1 className="text-2xl font-bold">逛商品</h1>
        <p className="mt-1 text-sm text-ink-muted">共 {list.length} 項商品</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {list.map((product) => (
            <Link
              key={product.id}
              href={`/shop/${product.id}`}
              className="overflow-hidden rounded-2xl border border-line bg-surface transition active:scale-95"
            >
              <div className="relative flex aspect-square items-center justify-center bg-cream">
                <span className="text-6xl">{product.emoji}</span>
                <span className="absolute left-2 top-2 rounded-full bg-brand px-2.5 py-0.5 text-xs font-bold text-ink">
                  {product.label}
                </span>
              </div>

              <div className="p-3">
                <h2 className="text-lg font-bold">{product.name}</h2>
                <p className="mt-1 text-sm leading-6 text-ink-soft">
                  {product.tagline}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
