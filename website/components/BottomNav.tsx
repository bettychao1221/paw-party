"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// href 為 null 代表功能還沒做好，會顯示成灰色、不能點
const items = [
  { href: "/", label: "首頁", icon: "🏠" },
  { href: "/shop", label: "商城", icon: "🛍️" },
  { href: null, label: "寄倉", icon: "📦" },
  { href: null, label: "LINE", icon: "💬" },
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
              : item.href !== null && pathname.startsWith(item.href);

          const content = (
            <>
              <span className="text-xl">{item.icon}</span>
              <span className="mt-0.5 text-sm font-semibold">{item.label}</span>
            </>
          );

          return (
            <li key={item.label}>
              {item.href ? (
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
