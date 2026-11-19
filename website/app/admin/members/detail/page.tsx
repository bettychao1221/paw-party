import { Suspense } from "react";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminMemberDetail from "@/components/admin/AdminMemberDetail";

// 後台會員寄倉詳細頁：網址是 /admin/members/detail/?uid=會員UID
export default function AdminMemberPage() {
  return (
    <AdminGuard>
      <Suspense
        fallback={
          <main className="min-h-screen bg-cream px-5 pb-28 pt-16 text-center text-ink">
            <p className="text-lg text-ink-soft">載入中…</p>
          </main>
        }
      >
        <AdminMemberDetail />
      </Suspense>
    </AdminGuard>
  );
}
