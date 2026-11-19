import Link from "next/link";

// 後台子頁面共用的頂部：返回連結＋標題
export default function AdminHeader({
  backHref,
  backLabel,
  title,
}: {
  backHref: string;
  backLabel: string;
  title: string;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
      <div className="flex items-center justify-between px-4 py-3">
        <Link
          href={backHref}
          className="text-base font-bold underline decoration-brand decoration-2 underline-offset-4"
        >
          ← {backLabel}
        </Link>
        <span className="text-lg font-black">{title}</span>
      </div>
    </header>
  );
}
