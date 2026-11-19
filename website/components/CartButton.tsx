"use client";

import Link from "next/link";
import { useCartCount } from "@/lib/cart";

// 購物車入口：浮在畫面右下角（底部導覽列上方），顯示件數
export default function CartButton() {
  const count = useCartCount();

  return (
    <Link
      href="/cart"
      aria-label={`購物車，目前 ${count} 件`}
      className="fixed bottom-24 right-4 z-30 flex items-center gap-2 rounded-full bg-brand px-5 py-4 text-lg font-bold text-ink shadow-lg ring-2 ring-surface transition active:scale-95"
    >
      🛒 購物車
      <span className="min-w-7 rounded-full bg-ink px-2 py-0.5 text-center text-base text-surface">
        {count}
      </span>
    </Link>
  );
}
