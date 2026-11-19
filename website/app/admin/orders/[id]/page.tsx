import { Suspense } from "react";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminOrderDetail from "@/components/admin/AdminOrderDetail";

// 後台訂單詳細頁：資料在瀏覽器端讀取（寫法同 components/OrderView.tsx）
export default function AdminOrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  return (
    <AdminGuard>
      <Suspense
        fallback={
          <main className="min-h-screen bg-cream px-5 pb-28 pt-16 text-center text-ink">
            <p className="text-lg text-ink-soft">載入中…</p>
          </main>
        }
      >
        <AdminOrderDetail params={params} />
      </Suspense>
    </AdminGuard>
  );
}
