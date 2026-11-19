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
    <main className="min-h-screen bg-[#faf7f1] pb-24 text-[#493b32]">
      {/* 頂部：品牌名稱 */}
      <header className="sticky top-0 z-20 border-b border-[#e9e0d4] bg-[#faf7f1]/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="text-base font-black tracking-wider">
            PAW PARTY
            <span className="ml-2 text-xs font-medium text-[#9a8069]">
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
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                active === category.id
                  ? "bg-[#80634f] text-white"
                  : "border border-[#d9caba] bg-white text-[#6b5848]"
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
        <p className="mt-1 text-xs text-[#9a8878]">共 {list.length} 項商品</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {list.map((product) => (
            <Link
              key={product.id}
              href={`/shop/${product.id}`}
              className="overflow-hidden rounded-2xl border border-[#eee5d9] bg-white transition active:scale-95"
            >
              <div className="relative flex aspect-square items-center justify-center bg-[#eee8de]">
                <span className="text-6xl">{product.emoji}</span>
                <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-[#80634f]">
                  {product.label}
                </span>
              </div>

              <div className="p-3">
                <h2 className="text-base font-bold">{product.name}</h2>
                <p className="mt-1 text-xs leading-5 text-[#8c7a6b]">
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