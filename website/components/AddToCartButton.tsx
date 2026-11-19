"use client";

import { useEffect, useState } from "react";
import { addToCart } from "@/lib/cart";
import type { ShopProduct } from "@/lib/products";

// 加入購物車按鈕：價格空白的商品不能加入，改顯示洽詢文字
export default function AddToCartButton({
  product,
  size = "md",
}: {
  product: ShopProduct;
  size?: "md" | "lg";
}) {
  const [added, setAdded] = useState(false);
  const big = size === "lg";

  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(false), 1500);
    return () => clearTimeout(timer);
  }, [added]);

  if (product.price === null) {
    return (
      <p
        className={`rounded-2xl bg-cream px-3 py-2 text-center font-semibold text-ink-soft ${
          big ? "text-base" : "text-sm"
        }`}
      >
        價格洽詢中，請問官方 LINE
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        addToCart(product.id);
        setAdded(true);
      }}
      className={`w-full rounded-full bg-brand font-bold text-ink shadow-sm transition active:scale-95 ${
        big ? "py-5 text-xl" : "py-3 text-base"
      }`}
    >
      {added ? "✓ 已加入" : "🛒 加入購物車"}
    </button>
  );
}
