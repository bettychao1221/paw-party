import { Suspense } from "react";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminShipmentDetail from "@/components/admin/AdminShipmentDetail";

// 後台出貨申請詳細頁：網址是 /admin/shipments/detail/?id=申請代碼
export default function AdminShipmentPage() {
  return (
    <AdminGuard>
      <Suspense
        fallback={
          <main className="min-h-screen bg-cream px-5 pb-28 pt-16 text-center text-ink">
            <p className="text-lg text-ink-soft">載入中…</p>
          </main>
        }
      >
        <AdminShipmentDetail />
      </Suspense>
    </AdminGuard>
  );
}
