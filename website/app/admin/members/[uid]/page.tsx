import { Suspense } from "react";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminMemberDetail from "@/components/admin/AdminMemberDetail";

// 後台會員寄倉詳細頁：資料在瀏覽器端讀取（寫法同 /admin/orders/[id]）
export default function AdminMemberPage({ params }: PageProps<"/admin/members/[uid]">) {
  return (
    <AdminGuard>
      <Suspense
        fallback={
          <main className="min-h-screen bg-cream px-5 pb-28 pt-16 text-center text-ink">
            <p className="text-lg text-ink-soft">載入中…</p>
          </main>
        }
      >
        <AdminMemberDetail params={params} />
      </Suspense>
    </AdminGuard>
  );
}
