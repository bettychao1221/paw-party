import Link from "next/link";

// 前台共用的頂部：品牌名稱（可選的返回連結）
export default function SiteHeader({
  backHref,
  backLabel,
}: {
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
      <div className="flex items-center justify-between px-4 py-3">
        {backHref ? (
          <Link
            href={backHref}
            className="text-base font-bold text-ink underline decoration-brand decoration-2 underline-offset-4"
          >
            ← {backLabel}
          </Link>
        ) : (
          <Link href="/" className="text-lg font-black tracking-wider">
            PAW PARTY
            <span className="ml-2 text-sm font-medium text-ink-soft">肉球派對</span>
          </Link>
        )}
        <span className="text-xl">🐾</span>
      </div>
    </header>
  );
}
