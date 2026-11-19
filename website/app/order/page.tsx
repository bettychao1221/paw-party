"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import OrderView from "@/components/OrderView";
import OrderLookup from "@/components/OrderLookup";

// 訂單頁：
// - /order/?id=訂單代碼 → 顯示訂單內容
// - /order/ → 顯示查詢頁
function OrderPageContent() {
  const id = useSearchParams().get("id");
  return id ? <OrderView key={id} id={id} /> : <OrderLookup />;
}

export default function OrderPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-surface px-5 pb-28 pt-16 text-center text-ink">
          <p className="text-lg text-ink-soft">載入中…</p>
        </main>
      }
    >
      <OrderPageContent />
    </Suspense>
  );
}
