import { Suspense } from "react";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminOrderDetail from "@/components/admin/AdminOrderDetail";

// 後台訂單詳細頁：網址是 /admin/orders/detail/?id=訂單代碼
export default function AdminOrderPage() {
  return (
    <AdminGuard>
      <Suspense
        fallback={
          <main className="min-h-screen bg-cream px-5 pb-28 pt-16 text-center text-ink">
            <p className="text-lg text-ink-soft">載入中…</p>
          </main>
        }
      >
        <AdminOrderDetail />
      </Suspense>
    </AdminGuard>
  );
}
