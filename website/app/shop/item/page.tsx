import { Suspense } from "react";
import ProductDetail from "@/components/ProductDetail";

// 商品頁：網址是 /shop/item/?id=商品ID
// 靜態網站無法預先產生後台新增的商品頁，所以商品 ID 放在查詢參數，
// 由瀏覽器端從 Firestore 讀取（價格以資料庫為準）。
export default function ProductPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-surface px-5 pb-28 pt-16 text-center text-ink">
          <p className="text-lg text-ink-soft">載入中…</p>
        </main>
      }
    >
      <ProductDetail />
    </Suspense>
  );
}
