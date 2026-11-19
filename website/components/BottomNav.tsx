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
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e9e0d4] bg-[#faf7f1]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="grid grid-cols-4">
        {items.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : item.href !== null && pathname.startsWith(item.href);

          const content = (
            <>
              <span className="text-xl">{item.icon}</span>
              <span className="mt-0.5 text-[11px] font-semibold">
                {item.label}
              </span>
            </>
          );

          return (
            <li key={item.label}>
              {item.href ? (
                <Link
                  href={item.href}
                  className={`flex flex-col items-center py-2 ${
                    isActive ? "text-[#80634f]" : "text-[#9a8878]"
                  }`}
                >
                  {content}
                </Link>
              ) : (
                <span className="flex flex-col items-center py-2 text-[#c4b8aa]">
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