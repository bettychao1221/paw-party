import { Suspense } from "react";
import OrderView from "@/components/OrderView";

// 訂單頁：訂單內容在瀏覽器端用訂單 ID 從 Firestore 讀取
export default function OrderPage({ params }: PageProps<"/order/[id]">) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-surface px-5 pb-28 pt-16 text-center text-ink">
          <p className="text-lg text-ink-soft">載入中…</p>
        </main>
      }
    >
      <OrderView params={params} />
    </Suspense>
  );
}
