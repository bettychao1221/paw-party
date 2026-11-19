"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LINE_URL } from "@/components/LineButton";

// href 為 null 代表功能還沒做好，會顯示成灰色、不能點
// external 代表外部網址（官方 LINE），會開新分頁
const items: { href: string | null; label: string; icon: string; external?: boolean }[] = [
  { href: "/", label: "首頁", icon: "🏠" },
  { href: "/shop", label: "商城", icon: "🛍️" },
  { href: "/member", label: "寄倉", icon: "📦" },
  { href: LINE_URL || null, label: "LINE", icon: "💬", external: true },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="grid grid-cols-4 gap-1 px-2 py-1.5">
        {items.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : item.href === "/member"
                ? pathname.startsWith("/member") || pathname.startsWith("/login")
                : item.href !== null && !item.external && pathname.startsWith(item.href);

          const content = (
            <>
              <span className="text-xl">{item.icon}</span>
              <span className="mt-0.5 text-sm font-semibold">{item.label}</span>
            </>
          );

          return (
            <li key={item.label}>
              {item.href && item.external ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center rounded-xl py-1.5 text-ink-soft"
                >
                  {content}
                </a>
              ) : item.href ? (
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex flex-col items-center rounded-xl py-1.5 ${
                    isActive ? "bg-brand font-bold text-ink" : "text-ink-soft"
                  }`}
                >
                  {content}
                </Link>
              ) : (
                <span className="flex flex-col items-center py-1.5 text-ink-muted opacity-60">
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
